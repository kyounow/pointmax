// 1ソース分のマスタ情報を Gemini で抽出するスクリプト。
//
// Usage:
//   npx tsx scripts/sync/fetch-source.ts <sourceId> [--dry-run]
//
// 流れ:
//   1. .env.local / process.env から GEMINI_API_KEY を読み込み
//   2. sources/registry.yaml から <sourceId> を探す
//   3. extractors/<extractor>.prompt.md を読み込み、INJECT マーカーを seed の現状で解決
//   4. (--dry-run なら) ここで停止
//   5. callGeminiWithRetry で 3 段階試行 (詳細は同関数の docblock 参照):
//        attempt 1: Gemini に URL Context Tool 経由で URL を渡し読み取り
//        attempt 2: 5 秒待機して URL Context 再試行 (混雑回避)
//        attempt 3: Node で URL を pre-fetch → HTML を plain text 化して
//                   Gemini に直渡し (URL Context Tool 不通時の最終手段)
//      各 attempt は classifyResponse で評価し、success なら即返却。
//   6. レスポンスを JSON parse (コードフェンス / 先頭 [...] ラッパに保険対応)
//   7. ajv で schema 検証
//   8. sources/extracted/<sourceId>.json に書き出し
//
// 失敗時 (全 attempt が success にならなかった、JSON 解析失敗、schema 違反):
//   - process は exit code 1 でなく fallback ExtractedSource を書き出して終了
//   - 後段の sync:propose が "URL retrieval failed" notes を見て gracefully skip する
//   - これにより 1 ソース失敗で週次 cron 全体を停止させない

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { GoogleGenAI } from "@google/genai";
import { injectExistingEntities } from "./inject-prompt";
import { SCOPE_DIRECTIVES } from "./types";
import type {
  ExtractedSource,
  RegistryFile,
  RegistrySource,
} from "./types";
import {
  classifyResponse,
  prefetchAsPlainText,
  type ResponseStatus,
} from "./fetch-response";

const RETRY_DELAYS_MS = [5000, 15000];  // attempt 2: +5s, attempt 3: +15s (合計 max 20s wait)

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

// ───────────────────────────────────────────────────────────────
// Gemini call (URL Context Tool 経由)
// ───────────────────────────────────────────────────────────────
// 静的 fetch は廃止。Gemini に URL ごと渡し、url_context ツールで
// Gemini 側に動的レンダリング込みでページを読ませる。
// SPA や PDF を含むソースでも動作するメリット。
// 制約: responseSchema は URL Context と併用不可な場合があるため、
// MIME type のみ application/json に固定し、ajv 側で厳格検証する。

// デフォルトは Flash (無料枠が緩く JSON 抽出に十分)。
// 高精度が必要なら GEMINI_MODEL=gemini-2.5-pro で上書き可能 (要 Pro クォータ)。
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

type GeminiResult = {
  text: string;
  retrievedUrls: string[]; // URL Context が実際に取得した URL
};

async function callGemini(args: {
  apiKey: string;
  systemInstruction: string;
  url: string;
  sourceId: string;
}): Promise<GeminiResult> {
  const ai = new GoogleGenAI({ apiKey: args.apiKey });
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
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: args.systemInstruction,
      tools: [{ urlContext: {} }],
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  // 空応答も上位の graceful fallback で扱うため、ここでは投げない
  const text = response.text ?? "";

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

  return { text, retrievedUrls };
}

// callGemini を 3 段階で試す:
//   attempt 1: URL Context Tool (現行)
//   attempt 2: URL Context + 5s 待機
//   attempt 3: pre-fetch → plain text を user prompt に注入 + 15s 待機
// それぞれ classifyResponse で評価し、success なら即返却。
// すべて失敗したら最後の (text, retrievedUrls, lastStatus) を返す。
async function callGeminiWithRetry(args: {
  apiKey: string;
  systemInstruction: string;
  url: string;
  sourceId: string;
}): Promise<GeminiResult & { attempts: number; finalStatus: ResponseStatus }> {
  let last: GeminiResult = { text: "", retrievedUrls: [] };
  let lastStatus: ResponseStatus = "empty";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt === 3) {
        // pre-fetch fallback strategy
        console.log(`   🌐 attempt ${attempt}/3: pre-fetch HTML → plain text 渡し`);
        const text = await prefetchAsPlainText(args.url);
        last = await callGeminiWithText({
          apiKey: args.apiKey,
          systemInstruction: args.systemInstruction,
          sourceId: args.sourceId,
          url: args.url,
          plainText: text,
        });
      } else {
        if (attempt > 1) {
          console.log(`   ⏳ attempt ${attempt}/3 (URL Context, 待機 ${RETRY_DELAYS_MS[attempt - 2] / 1000}s)`);
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 2]));
        }
        last = await callGemini(args);
      }

      lastStatus = classifyResponse(last);
      if (lastStatus === "success") {
        return { ...last, attempts: attempt, finalStatus: "success" };
      }
      console.log(`   ⚠️ attempt ${attempt}/3 status: ${lastStatus}`);
    } catch (e) {
      console.log(`   ⚠️ attempt ${attempt}/3 error: ${e instanceof Error ? e.message : String(e)}`);
      // 429 は特に retry 価値が高いが、他のエラーも次の attempt に進む
    }
  }

  return { ...last, attempts: 3, finalStatus: lastStatus };
}

// pre-fetch 用: URL Context Tool を使わず、plain text を user message に注入
async function callGeminiWithText(args: {
  apiKey: string;
  systemInstruction: string;
  sourceId: string;
  url: string;
  plainText: string;
}): Promise<GeminiResult> {
  const ai = new GoogleGenAI({ apiKey: args.apiKey });
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

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: args.systemInstruction,
      // pre-fetch モードでは responseMimeType を application/json に固定 (URL Context 非使用なので OK)
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  return {
    text: response.text ?? "",
    retrievedUrls: [`${args.url} [pre-fetch]`],
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

  if (fullValidate(data)) {
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
// Fallback writer (空応答 / 非JSON / schema救済不能 で共通)
// ───────────────────────────────────────────────────────────────
// 旧: 3 箇所で同形の ExtractedSource リテラル + mkdir + write + log を
// コピペしていた。生成 JSON は呼出側が notes/promptVersion を渡すため
// 各サイトでバイト不変 (mkdirSync は recursive で冪等、outPath 同値)。
function writeFallback(args: {
  source: RegistrySource;
  notes: string;
  promptVersion: string;
  logSuffix: string;
}): void {
  const fallback: ExtractedSource = {
    sourceId: args.source.id,
    sourceUrl: args.source.url,
    fetchedAt: new Date().toISOString(),
    promptVersion: args.promptVersion,
    extractor: args.source.extractor,
    geminiModel: GEMINI_MODEL,
    notes: args.notes,
  };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = resolve(OUTPUT_DIR, `${args.source.id}.json`);
  writeFileSync(outPath, JSON.stringify(fallback, null, 2));
  console.log(`✓ wrote ${outPath} ${args.logSuffix}`);
}

// ───────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadDotEnvLocal();
  const args = parseArgs(process.argv.slice(2));
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

  if (args.dryRun) {
    console.log("✋ --dry-run なのでここで停止 (Gemini 呼び出し無し)");
    return;
  }

  // --dry-run でなければ API キーが必要
  const apiKey = getApiKey();

  console.log(`🤖 Gemini ${GEMINI_MODEL} 呼び出し中 (最大 3 attempts, retry/pre-fetch 込み)...`);
  const { text: rawJson, retrievedUrls, attempts, finalStatus } = await callGeminiWithRetry({
    apiKey,
    systemInstruction,
    url: source.url,
    sourceId: source.id,
  });
  console.log(`   ${finalStatus === "success" ? "✓" : "⚠️"} attempts=${attempts}, status=${finalStatus}`);
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
    writeFallback({
      source,
      notes: `${reason}. URL を確認するか、ソースを enabled: false に設定してください。`,
      promptVersion: `${source.extractor}-vUnknown`,
      logSuffix: "(空)",
    });
    return;
  }

  console.log("📋 JSON 解析中...");
  let parsed: ExtractedSource;
  try {
    // Gemini が ```json コードフェンスでラップしてくることがあるので除去 (保険)
    const cleaned = rawJson
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    // Gemini が誤って [...] 配列でラップしてくる事例あり。先頭が [ なら要素 0 を取る
    if (cleaned.startsWith("[")) {
      const arr = JSON.parse(cleaned);
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error("配列が空 or 不正");
      }
      parsed = arr[0] as ExtractedSource;
      console.log("   注意: Gemini が配列でラップしてきたので 1 要素目を採用");
    } else {
      parsed = JSON.parse(cleaned) as ExtractedSource;
    }
  } catch {
    // Gemini が JSON でなく散文で「ページから抽出できなかった」と返した場合。
    // crash せず空の ExtractedSource を書き出し、proposed-migrations 側で skip 判定。
    console.log("⚠️ Gemini レスポンスが JSON でない (取得には成功したが抽出失敗)");
    console.log(`     raw (first 300 chars): ${rawJson.slice(0, 300)}`);
    writeFallback({
      source,
      notes:
        `Gemini could not extract structured data from this URL. ` +
        `Likely cause: page is a navigation hub, not the partner list itself. ` +
        `Raw response (first 300 chars): ${rawJson.slice(0, 300).replace(/\s+/g, " ")}`,
      promptVersion: `${source.extractor}-vUnknown`,
      logSuffix: "(空 + 失敗 notes)",
    });
    return;
  }

  // 必須メタ情報を「スクリプトが知ってる事実」で上書き。
  // (Gemini はプロンプト例の値をコピーしてくることがあるため信用しない)
  parsed.sourceId = source.id;
  parsed.sourceUrl = source.url;
  parsed.fetchedAt = new Date().toISOString();
  parsed.extractor = source.extractor;
  parsed.geminiModel = GEMINI_MODEL;
  // promptVersion だけは Gemini が読み取る値を尊重 (extractor のバージョン管理)
  parsed.promptVersion = parsed.promptVersion || `${source.extractor}-vUnknown`;

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
    writeFallback({
      source,
      notes:
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

  // 抽出件数のサマリ
  const summary = {
    cards: finalData.cards?.length ?? 0,
    storeRules: finalData.storeRules?.length ?? 0,
    categoryRules: finalData.categoryRules?.length ?? 0,
    stores: finalData.stores?.length ?? 0,
    loyaltyRules: finalData.loyaltyRules?.length ?? 0,
    paymentApps: finalData.paymentApps?.length ?? 0,
  };
  console.log("📊 summary:", JSON.stringify(summary));
}

// CLI として実行された場合のみ main を呼ぶ (テストからの import 時は呼ばない)
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    console.error("💥 Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
