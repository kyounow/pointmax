// 1ソース分のマスタ情報を Gemini で抽出するスクリプト。
//
// Usage:
//   npx tsx scripts/sync/fetch-source.ts <sourceId> [--dry-run] [--allow-disabled]
//
// 流れ:
//   1. .env.local / process.env から GEMINI_API_KEY / GEMINI_MODEL / GEMINI_THINKING_BUDGET を読み込み
//      (モデル名と thinking 予算はここで検証。不正なら Gemini を呼ばずに exit 1)
//   2. sources/registry.yaml から <sourceId> を探す (enabled:false は --allow-disabled 指定時のみ)
//   3. extractors/<extractor>.prompt.md を読み込み、INJECT マーカーを seed の現状で解決
//   4. (--dry-run なら) ここで停止
//   5. callGeminiWithRetry で最大 3 attempts (planNextAttempt が次の手を決める):
//        attempt 1: Gemini に URL Context Tool 経由で URL を渡し読み取り
//        attempt 2: 5 秒待機して URL Context 再試行 (混雑回避)
//        attempt 3: Node で URL を pre-fetch → HTML を plain text 化して
//                   15 秒待機後に Gemini に直渡し (URL Context Tool 不通時の最終手段)
//      allUrlsFailed / badRequest(400) の後は URL Context を再試行せず prefetch に進む。
//      429 の日次枠 (quotaDaily) / 402 (billing) / API キー・モデル不正 (config) は即打ち切り。
//   6. レスポンスを JSON parse (コードフェンス / 先頭 [...] ラッパに保険対応)
//   7. ajv で schema 検証
//   8. sources/extracted/<sourceId>.json に書き出し
//
// 失敗時:
//   - 内容が原因の失敗 (応答はあったが URL 全取得失敗 / 空 / 非 JSON / schema 違反):
//     `[fetch-failed:<kind>]` notes 付きの空の fallback ExtractedSource を書く。
//     propose (isFailedExtraction) がこの prefix を見て失敗として数え、skip する。
//   - API が原因の失敗 (quotaDaily / billing / config で打ち切り、または 1 度も応答が無い):
//     extracted を書かない (keep-last-good。残るのは checkout 時点の main 版)。
//   - crash (API キー欠落・registry / prompt / schema の読込失敗・モデル名不正など、main().catch に
//     落ちる環境・設定エラー): fallback も書かない (全ソースの last-good を空で潰さないため)。exit 1。
//   いずれも process は週次 cron 全体を止めない (fetch-all は常に exit 0)。
//   古いファイルの流用は propose の fetchedAt 鮮度ガード (14 日) で updateField を review に回す。
//
// fetch outcome: PM_FETCH_OUTCOME_DIR が渡された時だけ (fetch-all 経由)、終了時 (finally) に
//   <dir>/<sourceId>.outcome.json を書く (ok / empty / failed / quotaExhausted / crashed、
//   calls・tokens・keptLastGood・abortRun)。fetch-all はこれを読んで後続ソースを打ち切る。
//   dry-run では書かない。

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { GoogleGenAI } from "@google/genai";
import type {
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import { injectExistingEntities } from "./inject-prompt";
import { EXTRACTED_ARRAY_KEYS, SCOPE_DIRECTIVES } from "./types";
import type {
  ExtractedSource,
  RegistryFile,
  RegistrySource,
} from "./types";
import {
  addUsage,
  classifyGeminiError,
  classifyResponse,
  decideWrite,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_THINKING_BUDGET,
  extractUsage,
  formatDiagLine,
  formatFailureNote,
  formatFetchError,
  formatUsage,
  headAndTail,
  isRunAbortKind,
  planNextAttempt,
  prefetchAsPlainText,
  prefetchRawHtml,
  probeUrl,
  resolveGeminiModel,
  resolveThinkingBudget,
  summarizeGeminiDiag,
  type AttemptKind,
  type AttemptRecord,
  type FetchFailureNoteKind,
  type GeminiDiag,
  type GeminiErrorKind,
  type ResponseStatus,
  type RunAbortKind,
} from "./fetch-response";
import {
  countExtractedItems,
  createFetchStats,
  createOutcomeDraft,
  finalizeOutcome,
  resolveFetchOutcomeDir,
  writeFetchOutcome,
  type OutcomeDraft,
} from "./fetch-outcome";
import {
  CHILD_FETCH_SLEEP_MS,
  extractAnchors,
  mergeChildExtractions,
  normalizeChildUrls,
  parseIndexResponse,
  resolveMaxChildren,
  type ChildExtraction,
  type IndexUrlEntry,
  type ParsedIndexResponse,
} from "./crawl-index";

// attempt 間の待機。2 回目の URL Context の前は 5s、prefetch 経路で Gemini を呼ぶ前は 15s。
// 直前が quotaMinute (分間枠の 429) なら retryDelay を尊重して min(max(retryDelay, 既定), 60s)。
export const RETRY_DELAYS_MS = { urlContext: 5000, prefetch: 15000 } as const;
export const QUOTA_MINUTE_MAX_WAIT_MS = 60_000;

// ───────────────────────────────────────────────────────────────
// Paths
// ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const REGISTRY_PATH = resolve(REPO_ROOT, "sources/registry.yaml");
const SCHEMA_PATH = resolve(
  REPO_ROOT,
  "sources/schema/extracted-source.schema.json",
);
const EXTRACTORS_DIR = resolve(REPO_ROOT, "sources/extractors");
const OUTPUT_DIR = resolve(REPO_ROOT, "sources/extracted");

// ───────────────────────────────────────────────────────────────
// CLI parsing
// ───────────────────────────────────────────────────────────────

type CliArgs = {
  sourceId: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  let sourceId: string | undefined;
  let dryRun = false;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    } else if (!a.startsWith("--")) sourceId = a;
    else {
      console.error(`unknown flag: ${a}`);
      printUsage();
      process.exit(1);
    }
  }
  if (!sourceId) {
    printUsage();
    process.exit(1);
  }
  return { sourceId, dryRun };
}

function printUsage(): void {
  console.error(
    [
      "Usage: tsx scripts/sync/fetch-source.ts <sourceId> [options]",
      "",
      "Args:",
      "  <sourceId>   sources/registry.yaml で定義された id",
      "",
      "Options:",
      "  --dry-run    Gemini を呼び出さず、registry読込・prompt解決まで実施",
      "  --help, -h   この使い方を表示",
      "",
      "例:",
      "  npm run sync:fetch -- jal-card-tokuyaku-list --dry-run",
      "  npm run sync:fetch -- rakuten-point-partners",
    ].join("\n"),
  );
}

// ───────────────────────────────────────────────────────────────
// .env.local loader
// ───────────────────────────────────────────────────────────────

function loadDotEnvLocal(): void {
  const path = resolve(REPO_ROOT, ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf-8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    // 既に環境変数があれば上書きしない (CI が優先)
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY が未設定。.env.local か環境変数にセットしてください。",
    );
  }
  if (key.includes("PASTE_YOUR_KEY_HERE")) {
    throw new Error(
      ".env.local の GEMINI_API_KEY がプレースホルダのまま。実際のキーに置き換えてください。",
    );
  }
  return key;
}

// ───────────────────────────────────────────────────────────────
// Registry / prompt loading
// ───────────────────────────────────────────────────────────────

function loadRegistry(): RegistryFile {
  const text = readFileSync(REGISTRY_PATH, "utf-8");
  const data = parseYaml(text) as RegistryFile;
  if (!data || !Array.isArray(data.sources)) {
    throw new Error("registry.yaml の形式が不正 (sources[] が無い)");
  }
  return data;
}

function findSource(registry: RegistryFile, sourceId: string): RegistrySource {
  const s = registry.sources.find((x) => x.id === sourceId);
  if (!s) {
    const available = registry.sources.map((x) => x.id).join(", ");
    throw new Error(
      `registry.yaml に "${sourceId}" は無い。\n登録済み: ${available}`,
    );
  }
  if (!s.enabled) {
    throw new Error(`"${sourceId}" は enabled: false。registry を確認してください。`);
  }
  return s;
}

function loadResolvedPrompt(source: RegistrySource): string {
  const path = resolve(EXTRACTORS_DIR, `${source.extractor}.prompt.md`);
  if (!existsSync(path)) {
    throw new Error(`extractor プロンプトが見つからない: ${path}`);
  }
  const template = readFileSync(path, "utf-8");
  // 抽出スコープの指示を先頭に prepend。プロンプト本文より優先度高めに見せる。
  const scopeDirective = SCOPE_DIRECTIVES[source.extractionScope];
  const injected = injectExistingEntities(template);
  return `${scopeDirective}\n${injected}`;
}

// crawl: index の 1 段目 (子 URL 列挙) 専用プロンプト。INJECT もスコープ指示も
// 不要 (URL を列挙するだけで seed 文脈に依存しない)。
function loadIndexPrompt(): string {
  const path = resolve(EXTRACTORS_DIR, "campaign-index.prompt.md");
  if (!existsSync(path)) {
    throw new Error(`index クロール用プロンプトが見つからない: ${path}`);
  }
  return readFileSync(path, "utf-8");
}

// ───────────────────────────────────────────────────────────────
// Gemini call (URL Context Tool 経由)
// ───────────────────────────────────────────────────────────────
// 静的 fetch は廃止。Gemini に URL ごと渡し、url_context ツールで
// Gemini 側に動的レンダリング込みでページを読ませる。
// SPA や PDF を含むソースでも動作するメリット。
// 制約: responseSchema は URL Context と併用不可な場合があるため、
// MIME type のみ application/json に固定し、ajv 側で厳格検証する。

/**
 * Gemini クライアントを作る (main で 1 回だけ作り、各呼び出しに渡す)。
 *
 * httpOptions.retryOptions も timeout も渡さないこと。
 * - retryOptions: @google/genai 2.0.1 の ApiClient.apiCall は retryOptions があると p-retry 経由の
 *   runFetch に入り、429/5xx を本文なしの Error('Retryable HTTP Error: …')、400/404 を
 *   Error('Non-retryable exception … sending request') として投げる。status も JSON 本文
 *   (QuotaFailure.quotaId / ErrorInfo.reason) も失われ、classifyGeminiError の
 *   quotaDaily / billing / config 判定 (= 429 での run 打ち切り) が効かなくなる。
 *   渡さなければ ApiError{status, message=本文 JSON} が投げられ、fetch は 1 回だけ (1 呼び出し = 1 req)。
 * - timeout: 2.0.1 では undici のグローバル dispatcher の headers/body timeout を書き換え、
 *   abort 時の例外の形も変わる。1 呼び出しの上限は undici 既定と weekly-sync の step timeout に任せる。
 * 2.24 系でもこの形は保たれるが依存はせず、fetch-source.test.ts の SDK 契約テスト
 * (fetch スタブの 429 → ApiError status 429 / fetch 1 回) で SDK の版ごとに検証する。
 */
export function createGenAI(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

// 実行時設定。main() の冒頭で環境変数 GEMINI_MODEL / GEMINI_THINKING_BUDGET から解決する
// (import 時に throw すると main().catch を通らずテストの import も壊れるため、module 定数にしない)。
// 既定は gemini-2.5-flash (無料枠で JSON 抽出に十分) / thinking 1024。
// weekly-sync は repo の vars と workflow_dispatch 入力で切り替える (未設定は空文字 → 既定値)。
const runtime = {
  model: DEFAULT_GEMINI_MODEL,
  thinkingBudget: DEFAULT_THINKING_BUDGET,
};

// Gemini 呼び出しの統計 (outcome と 📈 usage ログ用)。generateWithStats が呼び出しの境界で加算する。
const stats = createFetchStats();

// generateContent の薄いラッパ: 呼ぶ前に calls を +1 (例外でも 1 call)、応答があれば token を加算、
// 例外は分類して errorKinds / quotaErrors に積んでから投げ直す (制御は呼び出し側)。
async function generateWithStats(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
): Promise<{ response: GenerateContentResponse; text: string; diag: GeminiDiag }> {
  stats.usage = { ...stats.usage, calls: stats.usage.calls + 1 };
  let response: GenerateContentResponse;
  try {
    response = await ai.models.generateContent(params);
  } catch (e) {
    const c = classifyGeminiError(e);
    stats.errorKinds.push(c.kind);
    if (c.httpStatus === 429) stats.quotaErrors += 1;
    throw e;
  }
  stats.usage = addUsage(stats.usage, { ...extractUsage(response), calls: 0 });
  // 空応答も上位の graceful fallback で扱うため、ここでは投げない
  const text = response.text ?? "";
  return { response, text, diag: summarizeGeminiDiag(response, text) };
}

type GeminiResult = {
  text: string;
  retrievedUrls: string[]; // URL Context が実際に取得した URL
};

export type GeminiCallResult = GeminiResult & { diag: GeminiDiag };

// success 以外の応答は先頭と末尾を 300 字ずつ出す (Q1b の salvage が要るかの判断材料)
function logNonSuccessBody(text: string): void {
  if (text.trim().length === 0) return;
  const { head, tail } = headAndTail(text, 300);
  console.log(`     head: ${head}`);
  if (tail !== undefined) console.log(`     tail: ${tail}`);
}

async function callGemini(
  ai: GoogleGenAI,
  args: {
    systemInstruction: string;
    url: string;
    sourceId: string;
  },
): Promise<GeminiCallResult> {
  const userPrompt =
    `以下の URL を読み、systemInstruction の指示に従って ExtractedSource JSON を返してください。\n\n` +
    `URL: ${args.url}\n` +
    `sourceId: ${args.sourceId}\n\n` +
    `**出力ルール (厳守)**:\n` +
    `1. 出力は ExtractedSource スキーマに準拠した**有効な JSON オブジェクト 1 件のみ**\n` +
    `2. 思考過程・解説・コードブロック ( \`\`\`json ) は**一切出力しない**\n` +
    `3. JSON を [ ] でラップしない。{ から始まり } で終わる単一オブジェクト\n` +
    `4. JSON は **compact 形式** で出力 (改行・余分なインデント無し、出力トークン節約のため)\n` +
    `5. ページから抽出できない場合も、最低限の必須フィールドだけ持つ JSON を返し、notes に理由を 1 行で書く\n\n` +
    `必須フィールド: sourceId, sourceUrl, fetchedAt (ISO8601), promptVersion, extractor, geminiModel`;

  // 注意:
  //  - URL Context Tool 使用時は responseMimeType: 'application/json' は併用不可
  //    (Gemini API 制約)。プロンプトと postprocess で JSON 抽出を担保。
  //  - gemini-2.5-flash は思考前提モデル。thinkingBudget=0 にすると空応答に
  //    なるので、適度な思考枠 (1024) を残しつつプロンプトで JSON 出力を強制。
  //  - maxOutputTokens は flash 上限の 8192 (デフォルト)。
  //  - thinkingBudget は GEMINI_THINKING_BUDGET (既定 1024) で A/B できる (Q1a)。
  const { response, text, diag } = await generateWithStats(ai, {
    model: runtime.model,
    contents: userPrompt,
    config: {
      systemInstruction: args.systemInstruction,
      tools: [{ urlContext: {} }],
      thinkingConfig: { thinkingBudget: runtime.thinkingBudget },
    },
  });

  // URL Context が実際にどの URL を取りに行ったかを (可能なら) 抽出
  const retrievedUrls: string[] = [];
  // 型 guard 経由で URL Context メタデータを探す (SDK バージョン非依存)
  const candidates = (response as { candidates?: Array<{ urlContextMetadata?: { urlMetadata?: Array<{ retrievedUrl?: string; urlRetrievalStatus?: string }> } }> }).candidates;
  if (candidates && candidates.length > 0) {
    const meta = candidates[0].urlContextMetadata;
    if (meta?.urlMetadata) {
      for (const m of meta.urlMetadata) {
        if (m.retrievedUrl) retrievedUrls.push(
          m.urlRetrievalStatus
            ? `${m.retrievedUrl} [${m.urlRetrievalStatus}]`
            : m.retrievedUrl,
        );
      }
    }
  }

  return { text, retrievedUrls, diag };
}

export type RetryCallArgs = {
  systemInstruction: string;
  url: string;
  sourceId: string;
};

// callGeminiWithRetry の外部依存 (テストでは偽物と即時 sleep を注入する)。
export type RetryDeps = {
  callUrlContext(a: RetryCallArgs): Promise<GeminiCallResult>;
  prefetchText(url: string): Promise<string>;
  callWithText(a: RetryCallArgs & { plainText: string }): Promise<GeminiCallResult>;
  sleep(ms: number): Promise<void>;
};

export type RetryResult = GeminiResult & {
  /** 実施した attempt 数 (prefetch 自体の失敗を含む) */
  attempts: number;
  finalStatus: ResponseStatus;
  /** Gemini 呼び出し回数 (= req 数。prefetch の失敗は数えない) */
  geminiCalls: number;
  /** 1 度でも応答があった (初期値 empty と「全 attempt が例外」を区別する) */
  gotResponse: boolean;
  errorKinds: GeminiErrorKind[];
  /** run 打ち切り (quotaDaily / billing / config)。後続ソースも止める */
  abort?: RunAbortKind;
  history: AttemptRecord[];
};

export function createRetryDeps(ai: GoogleGenAI): RetryDeps {
  return {
    callUrlContext: (a) => callGemini(ai, a),
    prefetchText: (url) => prefetchAsPlainText(url),
    callWithText: (a) => callGeminiWithText(ai, a),
    sleep: (ms) => new Promise((res) => setTimeout(res, ms)),
  };
}

// 1 ソース最大 3 attempts (MAX_ATTEMPTS_PER_SOURCE)。次の手は planNextAttempt が決める:
//   urlContext → (5s) urlContext → prefetch → (15s) Gemini に plain text 直渡し
//   allUrlsFailed / badRequest の後は URL Context を再試行せず prefetch へ。
//   quotaDaily / billing / config の例外は即 break し abort をセット (8/16 型は 1 call で止まる)。
// 応答があった時だけ last / lastStatus を更新する。
export async function callGeminiWithRetry(
  args: RetryCallArgs,
  deps: RetryDeps,
): Promise<RetryResult> {
  // 可変状態は 1 つのオブジェクトにまとめる (closure 内の代入で TS の narrowing が崩れないように)
  const st: {
    last: GeminiResult;
    lastStatus: ResponseStatus;
    gotResponse: boolean;
    geminiCalls: number;
    abort?: RunAbortKind;
    /** 直前の attempt が quotaMinute の時だけ入る */
    retryAfterMs?: number;
  } = {
    last: { text: "", retrievedUrls: [] },
    lastStatus: "empty",
    gotResponse: false,
    geminiCalls: 0,
  };
  const errorKinds: GeminiErrorKind[] = [];
  const history: AttemptRecord[] = [];

  const waitMs = (base: number): number =>
    st.retryAfterMs !== undefined
      ? Math.min(Math.max(st.retryAfterMs, base), QUOTA_MINUTE_MAX_WAIT_MS)
      : base;

  const runGemini = async (
    n: number,
    kind: AttemptKind,
    call: () => Promise<GeminiCallResult>,
  ): Promise<void> => {
    st.geminiCalls += 1;
    try {
      const r = await call();
      console.log(formatDiagLine(n, kind, r.diag));
      st.last = { text: r.text, retrievedUrls: r.retrievedUrls };
      st.lastStatus = classifyResponse(st.last);
      st.gotResponse = true;
      st.retryAfterMs = undefined;
      history.push({
        kind,
        status: st.lastStatus,
        ...(r.diag.finishReason !== undefined ? { finishReason: r.diag.finishReason } : {}),
      });
      if (st.lastStatus !== "success") {
        console.log(`   ⚠️ attempt ${n} (${kind}) status: ${st.lastStatus}`);
        logNonSuccessBody(st.last.text);
      }
    } catch (e) {
      const c = classifyGeminiError(e);
      errorKinds.push(c.kind);
      history.push({ kind, errorKind: c.kind });
      console.log(
        `   ⚠️ attempt ${n} (${kind}) error [${c.kind}${c.httpStatus !== undefined ? ` ${c.httpStatus}` : ""}${c.quotaId ? ` ${c.quotaId}` : ""}]: ${c.message}`,
      );
      if (isRunAbortKind(c.kind)) st.abort = c.kind;
      st.retryAfterMs = c.kind === "quotaMinute" ? c.retryAfterMs : undefined;
    }
  };

  for (;;) {
    const next = planNextAttempt({ strategy: "urlContextFirst", history });
    if (next === "stop") break;
    const n = history.length + 1;

    if (next === "urlContext") {
      if (history.length > 0) {
        const ms = waitMs(RETRY_DELAYS_MS.urlContext);
        console.log(`   ⏳ attempt ${n} (URL Context, 待機 ${ms / 1000}s)`);
        await deps.sleep(ms);
      }
      await runGemini(n, "urlContext", () => deps.callUrlContext(args));
    } else {
      // prefetch は Gemini 呼び出しとは別の try。失敗したら Gemini を呼ばずに終える (req を使わない)
      console.log(`   🌐 attempt ${n}: pre-fetch HTML → plain text 渡し`);
      let plainText: string;
      try {
        plainText = await deps.prefetchText(args.url);
      } catch (e) {
        history.push({ kind: "prefetch", prefetchFailed: true });
        console.log(`   ⚠️ attempt ${n} (prefetch) 取得失敗: ${formatFetchError(e)}`);
        continue; // 直前が prefetch なので planNextAttempt は stop を返す
      }
      const ms = waitMs(RETRY_DELAYS_MS.prefetch);
      console.log(
        `   ⏳ prefetch 成功 (${plainText.length.toLocaleString()} chars)、Gemini 直渡しの前に待機 ${ms / 1000}s`,
      );
      await deps.sleep(ms);
      await runGemini(n, "prefetch", () => deps.callWithText({ ...args, plainText }));
    }

    if (st.abort !== undefined) break;
  }

  return {
    ...st.last,
    attempts: history.length,
    finalStatus: st.lastStatus,
    geminiCalls: st.geminiCalls,
    gotResponse: st.gotResponse,
    errorKinds,
    ...(st.abort !== undefined ? { abort: st.abort } : {}),
    history,
  };
}

// pre-fetch 用: URL Context Tool を使わず、plain text を user message に注入
async function callGeminiWithText(
  ai: GoogleGenAI,
  args: {
    systemInstruction: string;
    sourceId: string;
    url: string;
    plainText: string;
  },
): Promise<GeminiCallResult> {
  // URL Context Tool を使わない代わりに、テキストを直接渡す
  const userPrompt =
    `以下は ${args.url} のページ本文 (pre-fetch 済 plain text) です。\n` +
    `systemInstruction の指示に従って ExtractedSource JSON を返してください。\n\n` +
    `sourceId: ${args.sourceId}\n\n` +
    `**出力ルール (厳守)**:\n` +
    `1. 出力は ExtractedSource スキーマに準拠した**有効な JSON オブジェクト 1 件のみ**\n` +
    `2. 思考過程・解説・コードブロック ( \`\`\`json ) は**一切出力しない**\n` +
    `3. JSON を [ ] でラップしない。{ から始まり } で終わる単一オブジェクト\n` +
    `4. ページから抽出できない場合は、必須フィールドだけ持つ JSON を返し notes に理由を 1 行で書く\n\n` +
    `必須フィールド: sourceId, sourceUrl, fetchedAt (ISO8601), promptVersion, extractor, geminiModel\n\n` +
    `=== ページ本文 ===\n${args.plainText}`;

  const { text, diag } = await generateWithStats(ai, {
    model: runtime.model,
    contents: userPrompt,
    config: {
      systemInstruction: args.systemInstruction,
      // pre-fetch モードでは responseMimeType を application/json に固定 (URL Context 非使用なので OK)
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: runtime.thinkingBudget },
    },
  });

  return {
    text,
    retrievedUrls: [`${args.url} [pre-fetch]`],
    diag,
  };
}

// ───────────────────────────────────────────────────────────────
// Schema validation
// ───────────────────────────────────────────────────────────────

function loadSchema(): object {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
}

function formatAjvErrors(errors: unknown[] | null | undefined): string[] {
  return (errors ?? []).map((e) => {
    const err = e as { instancePath?: string; message?: string };
    return `  ${err.instancePath || "/"} ${err.message ?? ""}`;
  });
}

// schema.properties から type:array かつ items を持つキーを列挙。
// ハードコードせず schema 追加に追従する。
function arrayPropertyKeys(schema: unknown): string[] {
  const props = (schema as { properties?: Record<string, { type?: string; items?: unknown }> })
    .properties;
  if (!props) return [];
  return Object.entries(props)
    .filter(([, v]) => v?.type === "array" && v?.items != null)
    .map(([k]) => k);
}

export type SalvageResult =
  | { ok: true; data: ExtractedSource; droppedByKey: Record<string, number> }
  | { ok: false; errors: string[] };

// schema 違反時の段階的降格:
//   1. オブジェクト全体が valid ならそのまま返す (ハッピーパス)
//   2. 各配列プロパティを「アイテム単位」で検証し、違反アイテムだけ落とす
//      (空になった配列はキー自体を削除)。残りで再検証して valid なら採用
//   3. それでも invalid (= 配列アイテム以外の構造破損) なら ok:false を返し、
//      呼び出し側が空 fallback を書く
//
// gemini-2.5-flash が稀に 1 アイテムだけ schema 外プロパティを足したり
// required を欠かす事象で、ソース全体の抽出を失わないための防御。
export function salvageBySchema(
  data: ExtractedSource,
  schema: object,
): SalvageResult {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const fullValidate = ajv.compile(schema);

  // `as unknown` で渡す: Ajv ValidateFunction の型述語 (data is unknown) により
  // false 分岐で data が never に狭まり、下の `{ ...data }` が TS2698 になるのを避ける
  // (実行時の挙動は同じ)。
  if (fullValidate(data as unknown)) {
    return { ok: true, data, droppedByKey: {} };
  }

  const cloned: ExtractedSource = { ...data };
  const droppedByKey: Record<string, number> = {};
  const props = (schema as { properties?: Record<string, { items?: object }> })
    .properties;

  for (const key of arrayPropertyKeys(schema)) {
    const arr = (cloned as unknown as Record<string, unknown>)[key];
    if (!Array.isArray(arr)) continue;
    const itemSchema = props?.[key]?.items;
    if (!itemSchema) continue;
    const itemValidate = ajv.compile(itemSchema);
    const kept = arr.filter((it) => itemValidate(it));
    const dropped = arr.length - kept.length;
    if (dropped > 0) {
      droppedByKey[key] = dropped;
      if (kept.length > 0) {
        (cloned as unknown as Record<string, unknown>)[key] = kept;
      } else {
        delete (cloned as unknown as Record<string, unknown>)[key];
      }
    }
  }

  if (fullValidate(cloned)) {
    return { ok: true, data: cloned, droppedByKey };
  }
  return { ok: false, errors: formatAjvErrors(fullValidate.errors) };
}

// ───────────────────────────────────────────────────────────────
// Gemini レスポンスの JSON parse (単発 fetch / index crawl の子ページで共用)
// ───────────────────────────────────────────────────────────────

// Gemini レスポンス文字列を ExtractedSource として parse する。
// コードフェンス (```json) 除去と、誤って [...] 配列でラップしてくる事例への
// 保険 (先頭要素を採用) 込み。失敗時は throw し、呼び出し側が fallback を書く。
export function parseExtractedJson(rawJson: string): ExtractedSource {
  const cleaned = rawJson
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (cleaned.startsWith("[")) {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error("配列が空 or 不正");
    }
    console.log("   注意: Gemini が配列でラップしてきたので 1 要素目を採用");
    return arr[0] as ExtractedSource;
  }
  return JSON.parse(cleaned) as ExtractedSource;
}

// 必須メタ情報を「スクリプトが知ってる事実」で上書きする。
// (Gemini はプロンプト例の値をコピーしてくることがあるため信用しない)
// sourceUrl は単発 fetch では source.url、index crawl の子ページでは子 URL。
function stampMeta(
  parsed: ExtractedSource,
  source: RegistrySource,
  sourceUrl: string,
): void {
  parsed.sourceId = source.id;
  parsed.sourceUrl = sourceUrl;
  parsed.fetchedAt = new Date().toISOString();
  parsed.extractor = source.extractor;
  parsed.geminiModel = runtime.model;
  // promptVersion だけは Gemini が読み取る値を尊重 (extractor のバージョン管理)
  parsed.promptVersion = parsed.promptVersion || `${source.extractor}-vUnknown`;
}

// ───────────────────────────────────────────────────────────────
// Fallback writer (内容が原因の失敗: URL 全取得失敗 / 空応答 / 非JSON / schema救済不能 / 索引失敗)
// ───────────────────────────────────────────────────────────────
// notes は `[fetch-failed:<kind>] <detail>` (formatFailureNote)。propose の isFailedExtraction は
// この prefix で失敗ファイルを判定する。API が原因の失敗 (quota / billing / config / 応答ゼロ) と
// crash ではこれを呼ばない (keep-last-good)。draft に「書いた / 失敗種別」を記録する。
function writeFallback(
  draft: OutcomeDraft,
  args: {
    source: RegistrySource;
    kind: FetchFailureNoteKind;
    detail: string;
    promptVersion: string;
    logSuffix: string;
  },
): void {
  const fallback: ExtractedSource = {
    sourceId: args.source.id,
    sourceUrl: args.source.url,
    fetchedAt: new Date().toISOString(),
    promptVersion: args.promptVersion,
    extractor: args.source.extractor,
    geminiModel: runtime.model,
    notes: formatFailureNote(args.kind, args.detail),
  };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = resolve(OUTPUT_DIR, `${args.source.id}.json`);
  writeFileSync(outPath, JSON.stringify(fallback, null, 2));
  console.log(`✓ wrote ${outPath} ${args.logSuffix}`);
  draft.wrote = true;
  draft.failKind = args.kind;
  draft.detail = args.detail;
}

// API が原因の失敗: extracted を上書きせず前回版を残す。後続ソースを止めるかは abort で決まる。
export function keepLastGood(
  draft: OutcomeDraft,
  source: Pick<RegistrySource, "id">,
  r: { abort?: RunAbortKind; errorKinds: readonly GeminiErrorKind[] },
): void {
  const reason = r.abort ?? "apiError";
  console.log(
    `⏸ keep-last-good (${reason}): ${source.id} は前回版を保持 (extracted を上書きしない)` +
      (r.errorKinds.length > 0 ? ` errors=[${r.errorKinds.join(",")}]` : ""),
  );
  draft.keptLastGood = true;
  draft.failKind = reason;
  if (r.abort !== undefined) draft.abortRun = r.abort;
  draft.detail =
    r.abort === "quotaDaily"
      ? "Gemini 日次枠 (429 PerDay) を使い切り。後続ソースは打ち切り"
      : r.abort === "billing"
        ? "Gemini 402 (billing)。後続ソースは打ち切り"
        : r.abort === "config"
          ? "API キー / モデル名 / 権限の不正 (401・403・404・API_KEY_INVALID)。後続ソースは打ち切り"
          : `応答ゼロ (errors=${r.errorKinds.join(",") || "-"})`;
}

// ───────────────────────────────────────────────────────────────
// Index crawl (crawl: { mode: index } のソース用 2 段階クロール)
// ───────────────────────────────────────────────────────────────
// 1 段目: campaign-index prompt で索引ページから子 URL を列挙
// 2 段目: 各子 URL を source 本来の extractor prompt で抽出 (子ごとに salvage)
// 3: mergeChildExtractions で 1 つの ExtractedSource に統合して書き出し。
// 1 子ページの失敗は notes に記録して他の子を続行 (1 ソース失敗で cron を
// 止めない既存方針と同じ)。

// 1 段目 (ground truth 選択モード): 索引 HTML から抽出した実在アンカー一覧を
// Gemini に渡し、「この中から個別キャンペーン詳細を選ぶ」選択タスクとして実行。
// ページ本文は渡さない (アンカーテキストで判断可能 + プロンプトサイズ節約)。
// URL Context 不使用なので responseMimeType を JSON に固定できる。
// 2026-06-10 の実 fetch で URL Context 直読みの Gemini が URL を捏造する事象を
// 確認したための設計 (crawl-index.ts の extractAnchors docblock 参照)。
// 例外は classifyGeminiError を通し、run 打ち切り種別なら 2 回目を打たずに abort 付きで返す。
type IndexSelectionResult = ParsedIndexResponse & {
  abort?: RunAbortKind;
  gotResponse: boolean;
  errorKinds: GeminiErrorKind[];
};

async function callGeminiIndexSelection(
  ai: GoogleGenAI,
  args: {
    indexPrompt: string;
    sourceId: string;
    indexUrl: string;
    candidates: IndexUrlEntry[];
  },
): Promise<IndexSelectionResult> {
  const list = args.candidates
    .map((c) => `- ${c.url}${c.title ? ` | ${c.title}` : ""}`)
    .join("\n");
  const userPrompt =
    `以下は ${args.indexUrl} (キャンペーン索引ページ) に実在するリンク一覧です。\n` +
    `systemInstruction の規則に従い、個別キャンペーン詳細ページに該当するものを選んで JSON で返してください。\n\n` +
    `**重要**: \`urls[].url\` は下の一覧から**逐語コピー**すること。一覧に無い URL の出力は禁止 (後段で機械的に破棄されます)。\n` +
    `\`urls[].title\` は一覧の "|" 以降のテキストを逐語コピー。\n\n` +
    `sourceId: ${args.sourceId}\n\n` +
    `=== リンク一覧 (${args.candidates.length} 件) ===\n${list}`;

  let lastError = "no attempt";
  let gotResponse = false;
  const errorKinds: GeminiErrorKind[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) {
      console.log(`   ⏳ index 選択 attempt ${attempt}/2 (待機 5s)`);
      await new Promise((r) => setTimeout(r, 5000));
    }
    try {
      const { text, diag } = await generateWithStats(ai, {
        model: runtime.model,
        contents: userPrompt,
        config: {
          systemInstruction: args.indexPrompt,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: runtime.thinkingBudget },
        },
      });
      gotResponse = true;
      console.log(formatDiagLine(attempt, "indexSelect", diag));
      const parsed = parseIndexResponse(text);
      stats.attempts.push({
        kind: "indexSelect",
        status: parsed.ok ? "success" : "nonJson",
        ...(diag.finishReason !== undefined ? { finishReason: diag.finishReason } : {}),
      });
      if (parsed.ok) return { ...parsed, gotResponse, errorKinds };
      lastError = parsed.error;
      console.log(`   ⚠️ index 選択 attempt ${attempt}/2 parse 失敗: ${parsed.error}`);
    } catch (e) {
      const c = classifyGeminiError(e);
      errorKinds.push(c.kind);
      stats.attempts.push({ kind: "indexSelect", errorKind: c.kind });
      lastError = `[${c.kind}] ${c.message}`;
      console.log(`   ⚠️ index 選択 attempt ${attempt}/2 error: ${lastError}`);
      if (isRunAbortKind(c.kind)) {
        return { ok: false, error: lastError, abort: c.kind, gotResponse, errorKinds };
      }
    }
  }
  return { ok: false, error: lastError, gotResponse, errorKinds };
}

// 索引段 / 子段のどちらかで run 打ち切り (quotaDaily / billing / config) を観測したら、
// 子ループを止めて何も書かない (部分 merge はしない = keep-last-good)。
// 2026-09 時点で enabled な crawl:index ソースは 0 本 (registry-consistency で固定) なので実装は最小限。
async function runIndexCrawl(
  ai: GoogleGenAI,
  draft: OutcomeDraft,
  args: {
    source: RegistrySource;
    childPrompt: string; // source.extractor の解決済み prompt (scope directive 込み)
    indexPrompt: string; // campaign-index prompt
  },
): Promise<void> {
  const { source, childPrompt, indexPrompt } = args;
  const deps = createRetryDeps(ai);
  const maxChildren = resolveMaxChildren(source.crawl?.maxChildren);

  // ── 1 段目: 索引ページから子 URL を列挙 ──
  // 優先: 索引 HTML を自前 prefetch → 実在アンカー抽出 → Gemini は選択のみ
  //       (出力 URL は実在集合との照合で強制検証 = 捏造 URL を遮断)
  // fallback: prefetch 不可 (JS レンダリング / IP block) なら従来の
  //       URL Context 直読み列挙 + 子ページ probe で防御
  console.log(`🕸️ [1/2] 索引ページから子 URL を列挙中 (maxChildren=${maxChildren})...`);
  let candidates: IndexUrlEntry[] | undefined;
  try {
    const html = await prefetchRawHtml(source.url);
    const anchors = extractAnchors(html, source.url);
    if (anchors.length > 0) {
      candidates = anchors;
      console.log(`   ✓ 索引 HTML prefetch 成功: 実在アンカー ${anchors.length} 件を抽出`);
    } else {
      console.log("   ⚠️ 索引 HTML にアンカーが見つからない (JS レンダリングの疑い)。URL Context 直読みに fallback");
    }
  } catch (e) {
    console.log(
      `   ⚠️ 索引 prefetch 失敗 (${formatFetchError(e)})。URL Context 直読みに fallback`,
    );
  }

  let parsedIndex: ParsedIndexResponse;
  if (candidates !== undefined) {
    const sel = await callGeminiIndexSelection(ai, {
      indexPrompt,
      sourceId: source.id,
      indexUrl: source.url,
      candidates,
    });
    if (decideWrite(sel) === "keepLastGood") {
      keepLastGood(draft, source, sel);
      return;
    }
    parsedIndex = sel;
  } else {
    const idx = await callGeminiWithRetry(
      {
        systemInstruction: indexPrompt,
        url: source.url,
        sourceId: source.id,
      },
      deps,
    );
    stats.attempts.push(...idx.history);
    console.log(
      `   ${idx.finalStatus === "success" ? "✓" : "⚠️"} attempts=${idx.attempts}, calls=${idx.geminiCalls}, status=${idx.finalStatus}`,
    );
    if (decideWrite(idx) === "keepLastGood") {
      keepLastGood(draft, source, idx);
      return;
    }
    parsedIndex =
      idx.finalStatus === "success"
        ? parseIndexResponse(idx.text)
        : { ok: false, error: `fetch status=${idx.finalStatus}` };
  }

  if (!parsedIndex.ok) {
    writeFallback(draft, {
      source,
      kind: "indexFailed",
      detail: `[crawl:index] 索引ページの子 URL 列挙に失敗: ${parsedIndex.error}。子ページ抽出は未実施。`,
      promptVersion: `${source.extractor}-vUnknown`,
      logSuffix: "(index 失敗)",
    });
    return;
  }
  const { accepted, rejected } = normalizeChildUrls(
    source.url,
    parsedIndex.urls,
    maxChildren,
    { candidates },
  );
  console.log(
    `   index 列挙: ${parsedIndex.urls.length} 件 → 採用 ${accepted.length} / 除外 ${rejected.length}` +
      (parsedIndex.droppedEntries > 0 ? ` (型不正 drop ${parsedIndex.droppedEntries})` : ""),
  );
  for (const r of rejected) console.log(`     - 除外 [${r.reason}] ${r.url}`);

  // ── 2 段目: 各子ページを本来の extractor で抽出 ──
  const schema = loadSchema();
  const children: ChildExtraction[] = [];
  for (let i = 0; i < accepted.length; i++) {
    const child = accepted[i];
    if (i > 0) {
      // Gemini free tier 10 RPM 対策 (fetch-all のソース間 5s sleep と同思想)
      await new Promise((r) => setTimeout(r, CHILD_FETCH_SLEEP_MS));
    }
    console.log(
      `🕸️ [2/2] 子ページ ${i + 1}/${accepted.length}: ${child.url}${child.title ? ` (${child.title})` : ""}`,
    );
    // Gemini を呼ぶ前に生存確認 (404/410 は捏造 or 終了済みページ → attempts を burn しない)
    const probe = await probeUrl(child.url);
    if (probe.verdict === "dead") {
      console.log(`   ⚠️ probe HTTP ${probe.status} (この子ページはスキップ)`);
      children.push({
        ...child,
        status: "failed",
        failReason: `notFound(${probe.status})`,
      });
      continue;
    }
    const res = await callGeminiWithRetry(
      {
        systemInstruction: childPrompt,
        url: child.url,
        sourceId: source.id,
      },
      deps,
    );
    stats.attempts.push(...res.history);
    if (res.abort !== undefined) {
      // 子ループを止め、部分 merge もしない (前回版を保持)
      keepLastGood(draft, source, res);
      return;
    }
    if (res.finalStatus !== "success") {
      const failReason = res.gotResponse ? res.finalStatus : "apiError";
      console.log(`   ⚠️ status=${failReason} (この子ページはスキップ)`);
      children.push({ ...child, status: "failed", failReason });
      continue;
    }
    let parsed: ExtractedSource;
    try {
      parsed = parseExtractedJson(res.text);
    } catch {
      console.log("   ⚠️ JSON parse 失敗 (この子ページはスキップ)");
      children.push({ ...child, status: "failed", failReason: "nonJson" });
      continue;
    }
    stampMeta(parsed, source, child.url);
    const salvage = salvageBySchema(parsed, schema);
    if (!salvage.ok) {
      console.log(`   ⚠️ schema 違反 (この子ページはスキップ): ${salvage.errors[0] ?? ""}`);
      children.push({ ...child, status: "failed", failReason: "schemaViolation" });
      continue;
    }
    const droppedEntries = Object.entries(salvage.droppedByKey);
    if (droppedEntries.length > 0) {
      console.log(
        `   ⚠️ schema 違反アイテムを除去: ${droppedEntries.map(([k, n]) => `${k}:${n}`).join(", ")}`,
      );
    }
    children.push({ ...child, status: "success", data: salvage.data });
  }

  // ── 統合して書き出し ──
  const merged = mergeChildExtractions({
    source: { id: source.id, url: source.url, extractor: source.extractor },
    geminiModel: runtime.model,
    fetchedAt: new Date().toISOString(),
    children,
    indexNotes: parsedIndex.notes,
  });
  // 子単位では salvage 済だが、merge ロジック退行の検知として統合結果も検証する
  const finalSalvage = salvageBySchema(merged, schema);
  if (!finalSalvage.ok) {
    writeFallback(draft, {
      source,
      kind: "mergeSchema",
      detail:
        `[crawl:index] merge 結果が schema 違反 (merge ロジック退行の疑い): ` +
        finalSalvage.errors.join("; ").slice(0, 300),
      promptVersion: merged.promptVersion,
      logSuffix: "(merge schema fallback)",
    });
    return;
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = resolve(OUTPUT_DIR, `${source.id}.json`);
  writeFileSync(outPath, JSON.stringify(finalSalvage.data, null, 2));
  console.log(`✓ wrote ${outPath}`);
  const counted = countExtractedItems(finalSalvage.data);
  draft.wrote = true;
  draft.itemCounts = counted.counts;
  draft.totalItems = counted.total;

  const summary = {
    programs: finalSalvage.data.programs?.length ?? 0,
    memberships: finalSalvage.data.memberships?.length ?? 0,
    stores: finalSalvage.data.stores?.length ?? 0,
    childrenOk: children.filter((c) => c.status === "success").length,
    childrenFailed: children.filter((c) => c.status === "failed").length,
  };
  console.log("📊 crawl summary:", JSON.stringify(summary));
}

// ───────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadDotEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  // outcome は fetch-all 経由 (PM_FETCH_OUTCOME_DIR あり) の本番実行だけ書く。dry-run では書かない。
  const outcomeDir = args.dryRun ? null : resolveFetchOutcomeDir(process.env);
  // 初期値のまま finally に達した (= 例外で抜けた) ら crashed。extracted は書かない (keep-last-good)。
  const draft = createOutcomeDraft(args.sourceId);
  try {
    await runSource(args, draft);
  } catch (e) {
    draft.detail = formatFetchError(e);
    throw e;
  } finally {
    if (outcomeDir !== null) {
      try {
        writeFetchOutcome(outcomeDir, finalizeOutcome(draft, stats, runtime.model, new Date()));
      } catch (we) {
        console.error(`⚠️ outcome の書き出しに失敗: ${formatFetchError(we)}`);
      }
    }
  }
}

async function runSource(args: CliArgs, draft: OutcomeDraft): Promise<void> {
  // モデル名 / thinking 予算は Gemini を呼ぶ前に解決する。不正なら throw → main().catch (exit 1、ファイルは書かない)
  runtime.model = resolveGeminiModel(process.env.GEMINI_MODEL);
  runtime.thinkingBudget = resolveThinkingBudget(process.env.GEMINI_THINKING_BUDGET);
  const registry = loadRegistry();
  const source = findSource(registry, args.sourceId);

  console.log(`📥 source: ${source.id}`);
  console.log(`   label:    ${source.label}`);
  console.log(`   url:      ${source.url}`);
  console.log(`   extractor:${source.extractor}`);
  console.log(`   produces: ${source.produces.join(", ")}`);
  console.log(`   scope:    ${source.extractionScope}`);

  const systemInstruction = loadResolvedPrompt(source);
  console.log(
    `🧩 prompt: 解決済み ${systemInstruction.length.toLocaleString()} chars (scope directive 込み)`,
  );

  // 索引ハブ型ソース (crawl: { mode: index }) は 2 段階クロールに分岐
  const isIndexCrawl = source.crawl?.mode === "index";
  let indexPrompt: string | undefined;
  if (isIndexCrawl) {
    indexPrompt = loadIndexPrompt();
    console.log(
      `🕸️ crawl: index モード (maxChildren=${resolveMaxChildren(source.crawl?.maxChildren)}, index prompt ${indexPrompt.length.toLocaleString()} chars)`,
    );
  }

  if (args.dryRun) {
    console.log("✋ --dry-run なのでここで停止 (Gemini 呼び出し無し)");
    return;
  }

  // --dry-run でなければ API キーが必要
  const ai = createGenAI(getApiKey());

  try {
    await runFetch(ai, draft, source, systemInstruction, indexPrompt);
  } finally {
    console.log(`📈 usage total ${formatUsage(stats.usage)}`);
  }
}

async function runFetch(
  ai: GoogleGenAI,
  draft: OutcomeDraft,
  source: RegistrySource,
  systemInstruction: string,
  indexPrompt: string | undefined,
): Promise<void> {
  if (indexPrompt !== undefined) {
    console.log(`🤖 Gemini ${runtime.model} 呼び出し中 (index crawl、各段 3 attempts, thinking ${runtime.thinkingBudget})...`);
    await runIndexCrawl(ai, draft, {
      source,
      childPrompt: systemInstruction,
      indexPrompt,
    });
    return;
  }

  console.log(`🤖 Gemini ${runtime.model} 呼び出し中 (最大 3 attempts, retry/pre-fetch 込み, thinking ${runtime.thinkingBudget})...`);
  const r = await callGeminiWithRetry(
    {
      systemInstruction,
      url: source.url,
      sourceId: source.id,
    },
    createRetryDeps(ai),
  );
  stats.attempts.push(...r.history);
  const { text: rawJson, retrievedUrls, attempts, finalStatus } = r;
  console.log(
    `   ${finalStatus === "success" ? "✓" : "⚠️"} attempts=${attempts}, calls=${r.geminiCalls}, status=${finalStatus}` +
      (r.abort !== undefined ? `, abort=${r.abort}` : ""),
  );

  // API が原因の失敗 (run 打ち切り / 応答ゼロ) は extracted を上書きしない。
  // annotation はここでは出さず fetch-all に任せる (outcome ファイル経由)。
  if (decideWrite(r) === "keepLastGood") {
    keepLastGood(draft, source, r);
    return;
  }

  if (retrievedUrls.length > 0) {
    console.log("   retrieved URLs:");
    for (const u of retrievedUrls) console.log(`     - ${u}`);
  } else {
    console.log("   ⚠️ retrievedUrls メタデータ無し (URL Context が動いてない可能性)");
  }

  // Gemini が空応答 or URL Context 全失敗 → fallback ExtractedSource
  const allFailed =
    retrievedUrls.length > 0 &&
    retrievedUrls.every((u) => u.includes("URL_RETRIEVAL_STATUS_ERROR"));
  const emptyResponse = rawJson.trim().length === 0;
  if (allFailed || emptyResponse) {
    const reason = allFailed
      ? "URL retrieval failed (URL_RETRIEVAL_STATUS_ERROR)"
      : "Gemini empty response (output cut or model refusal)";
    console.log(`⚠️ ${reason}。空の ExtractedSource を書き出します。`);
    writeFallback(draft, {
      source,
      kind: allFailed ? "allUrlsFailed" : "empty",
      detail: `${reason}. URL を確認するか、ソースを enabled: false に設定してください。`,
      promptVersion: `${source.extractor}-vUnknown`,
      logSuffix: "(空)",
    });
    return;
  }

  console.log("📋 JSON 解析中...");
  let parsed: ExtractedSource;
  try {
    parsed = parseExtractedJson(rawJson);
  } catch {
    // Gemini が JSON でなく散文で「ページから抽出できなかった」と返した場合。
    // crash せず空の ExtractedSource を書き出し、proposed-migrations 側で skip 判定。
    console.log("⚠️ Gemini レスポンスが JSON でない (取得には成功したが抽出失敗)");
    console.log(`     raw (first 300 chars): ${rawJson.slice(0, 300)}`);
    writeFallback(draft, {
      source,
      kind: "nonJson",
      detail:
        `Gemini could not extract structured data from this URL. ` +
        `Likely cause: page is a navigation hub, not the partner list itself. ` +
        `Raw response (first 300 chars): ${rawJson.slice(0, 300).replace(/\s+/g, " ")}`,
      promptVersion: `${source.extractor}-vUnknown`,
      logSuffix: "(空 + 失敗 notes)",
    });
    return;
  }

  stampMeta(parsed, source, source.url);

  console.log("✅ schema 検証中...");
  const schema = loadSchema();
  const salvage = salvageBySchema(parsed, schema);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = resolve(OUTPUT_DIR, `${source.id}.json`);

  // 配列アイテム以外の構造破損 → 空 fallback (空応答/非JSON と同じ降格)。
  // crash させず exit 0 で週次 cron を止めない。
  if (!salvage.ok) {
    console.log("⚠️ schema 違反 (アイテム除去後も不正)。空 fallback を書き出します。");
    for (const e of salvage.errors) console.log(`     ${e}`);
    writeFallback(draft, {
      source,
      kind: "schema",
      detail:
        `Schema validation failed even after per-item salvage; source skipped. ` +
        `Errors: ${salvage.errors.join("; ").slice(0, 400)}`,
      promptVersion: parsed.promptVersion || `${source.extractor}-vUnknown`,
      logSuffix: "(schema fallback)",
    });
    return;
  }

  const finalData = salvage.data;
  const droppedEntries = Object.entries(salvage.droppedByKey);
  if (droppedEntries.length > 0) {
    const summaryStr = droppedEntries.map(([k, n]) => `${k}:${n}`).join(", ");
    console.log(`⚠️ schema 違反アイテムを除去 (残りは保持): ${summaryStr}`);
    const dropNote = `[sync] schema 違反で除去したアイテム: ${summaryStr}。`;
    finalData.notes = finalData.notes
      ? `${finalData.notes} ${dropNote}`
      : dropNote;
  }

  writeFileSync(outPath, JSON.stringify(finalData, null, 2));
  console.log(`✓ wrote ${outPath}`);
  const counted = countExtractedItems(finalData);
  draft.wrote = true;
  draft.itemCounts = counted.counts;
  draft.totalItems = counted.total;

  // 抽出件数のサマリ (programs / memberships を含む全配列キー)
  const summary = Object.fromEntries(
    EXTRACTED_ARRAY_KEYS.map((k) => [k, finalData[k]?.length ?? 0]),
  );
  console.log("📊 summary:", JSON.stringify(summary));
}

// CLI として実行された場合のみ main を呼ぶ (テストからの import 時は呼ばない)
// crash (環境・設定エラー) では fallback を書かない: 空ファイルで全ソースの last-good を潰さないため。
// outcome=crashed は main の finally で書かれている。
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    console.error("💥 Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
