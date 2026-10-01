// scripts/sync/fetch-response.ts
//
// Gemini レスポンスを「成功 / 各種失敗カテゴリ」に分類する純関数群と、
// pre-fetch (URL → plain text) ヘルパ。fetch-source.ts から import して使う。
// PR-0b-2 で追加: Gemini API エラーの分類 (429 日次枠 / billing / config で run を打ち切る)、
// attempt 計画 (planNextAttempt)、usage / 診断 (Q1a / Q4a)、失敗 notes の定数、
// モデル名 / thinking 予算の解決。SDK (@google/genai) は import しない (duck typing で扱う)。

export type ResponseStatus =
  | "success"           // JSON として解釈可能
  | "empty"             // text が空
  | "allUrlsFailed"     // URL Context が全 URL 取得失敗
  | "refusal"           // 「申し訳ありません」等の refusal 文
  | "truncatedJson"     // { で始まるが } で閉じてない
  | "nonJson";          // それ以外の散文

export type GeminiResponse = {
  text: string;
  retrievedUrls: string[];
};

const REFUSAL_PATTERNS = [
  /申し訳/,
  /抽出できません/,
  /情報がありません/,
  /該当する.{0,10}が見つか/,
  /I (cannot|can'?t|am unable)/i,
  /I'?m sorry/i,
  /I do not have/i,
];

// classifyResponse の判定順 (early-return で短絡、上にあるほど優先):
//   1. empty            : text 完全に空 → リトライ価値あり
//   2. allUrlsFailed    : URL Context が全 URL 取得失敗 (URL/IP 側問題、attempt 3 で pre-fetch fallback に進む)
//   3. refusal          : 散文に「申し訳ありません」「対象外」等あり、かつ JSON 構造を持たない
//                          (= LLM が抽出を拒否。リトライしても同じ可能性が高い)
//   4. truncatedJson    : { で始まるが } で閉じてない (= context window 超過、maxOutputTokens 不足)
//   5. success          : コードフェンス除去後 JSON.parse 成功し object になる (= ハッピーパス)
//   6. nonJson          : それ以外の散文 / JSON 以外 / parse 失敗
// fetch-source.ts は success 以外を全てリトライ価値ありと扱う (isRetryable 参照)。
export function classifyResponse(r: GeminiResponse): ResponseStatus {
  const trimmed = r.text.trim();
  if (trimmed.length === 0) return "empty";

  const allFailed =
    r.retrievedUrls.length > 0 &&
    r.retrievedUrls.every((u) => u.includes("URL_RETRIEVAL_STATUS_ERROR"));
  if (allFailed) return "allUrlsFailed";

  // refusal check: 散文に refusal pattern が含まれ、かつ JSON 構造を持たない
  if (REFUSAL_PATTERNS.some((p) => p.test(trimmed)) && !/{[\s\S]*}/.test(trimmed)) {
    return "refusal";
  }

  // JSON として解釈可能か (コードフェンス除去後)
  const cleaned = trimmed
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (cleaned.startsWith("{") && !cleaned.endsWith("}")) {
    return "truncatedJson";
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === "object" && parsed !== null) return "success";
    return "nonJson";
  } catch {
    return "nonJson";
  }
}

export function isRetryable(status: ResponseStatus): boolean {
  // success 以外は基本リトライ価値あり (時間が経てば変わる可能性)
  return status !== "success";
}

// Charset 検出ヘルパ。Content-Type ヘッダ → HTML 先頭の <meta charset> の順で
// 優先解決し、見つからなければ utf-8 を返す。値は TextDecoder に渡せるよう
// 小文字化 + Shift_JIS / Shift-JIS のような表記揺れを正規化する。
// 公開して unit test 可能 (実 fetch せずに引数だけで網羅できる)。
export function detectCharset(
  contentTypeHeader: string | null | undefined,
  htmlHead: string,
): string {
  // 1. Content-Type ヘッダ: charset=xxx
  const headerMatch = (contentTypeHeader ?? "").match(/charset=([^;\s]+)/i);
  const fromHeader = headerMatch?.[1];

  // 2. <meta charset="xxx"> または <meta http-equiv="Content-Type" content="...; charset=xxx">
  const metaMatch =
    htmlHead.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i) ||
    htmlHead.match(/<meta[^>]+content=["'][^"']*charset=([\w-]+)/i);
  const fromMeta = metaMatch?.[1];

  const raw = (fromHeader ?? fromMeta ?? "utf-8").toLowerCase().trim();
  // 表記揺れの正規化 (TextDecoder は shift_jis を受けるが shift-jis は受けない等の互換性配慮)
  if (raw === "shift-jis" || raw === "x-sjis" || raw === "sjis") return "shift_jis";
  if (raw === "euc-jp" || raw === "x-euc-jp") return "euc-jp";
  return raw;
}

const PREFETCH_HEADERS = {
  // bot として正直に名乗り、連絡先 (リポジトリ URL) を示す User-Agent。
  // 「PointMax-Sync/1.0」+ リポジトリ URL で「これは何者か・どこへ連絡すればよいか」を
  // 明示する (ブラウザ偽装ではない)。Mozilla/5.0 プレフィックスは UA を素朴に弾く
  // フィルタとの互換性のためだけの慣習で、compatible トークン以降が実体。
  "User-Agent":
    "Mozilla/5.0 (compatible; PointMax-Sync/1.0; +https://github.com/kyounow/pointmax)",
  "Accept-Language": "ja,en;q=0.8",
} as const;

// prefetch の失敗。reason で HTTP エラー / ネットワーク / timeout を区別する (PR-0b-2 の fetch-source が
// prefetch 失敗を attempt 履歴に積むため、PR-5c-1 の率カナリアが 404・403・timeout を見分けるため)。
// message は従来の `prefetch HTTP <status>: <statusText>` のまま。
// (tsconfig の erasableSyntaxOnly によりパラメータプロパティは使わず、フィールドを明示宣言する)
// PR-0b-2 と PR-5c-1 が同名・同形で別々に足した定義を、main 追従 (2026-10-01) で PR-0b-2 側の実装
// (AbortSignal.timeout + isTimeoutLike / formatFetchError) に 1 つにまとめた。rate-watch.ts もこれを import する。
export type PrefetchFailReason = "http" | "network" | "timeout";

export class PrefetchError extends Error {
  readonly httpStatus: number | null;
  readonly reason: PrefetchFailReason;

  constructor(
    message: string,
    httpStatus: number | null,
    reason: PrefetchFailReason,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "PrefetchError";
    this.httpStatus = httpStatus;
    this.reason = reason;
  }
}

/**
 * prefetch 1 回 (fetch + body 受信) の上限。無応答のサーバで fetch step 全体 (fetch-source) や
 * 率カナリア (rate-watch) が止まるのを防ぐ。
 */
export const PREFETCH_TIMEOUT_MS = 20_000;

// prefetchRawHtml の signal は自前の AbortSignal.timeout だけなので、Abort/TimeoutError は timeout とみなす。
function wrapPrefetchError(e: unknown): PrefetchError {
  const timeout = isTimeoutLike(e);
  return new PrefetchError(
    `prefetch ${timeout ? "timeout" : "network error"}: ${formatFetchError(e)}`,
    null,
    timeout ? "timeout" : "network",
    { cause: e },
  );
}

// Pre-fetch helper (生 HTML): URL から HTML を取り、charset (Shift_JIS 等) を
// 検出して正しく decode した文字列を返す。タグはそのまま (index crawl の
// アンカー抽出が href を必要とするため)。
// 失敗は PrefetchError (http / network / timeout)。timeoutMs は fetch と body 受信の合計で、
// AbortSignal.timeout で打ち切る (既定 20 秒。テストは fake timers ではなく実タイマ + signal を尊重する fetch スタブで)。
export async function prefetchRawHtml(
  url: string,
  timeoutMs: number = PREFETCH_TIMEOUT_MS,
): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { headers: PREFETCH_HEADERS, signal });
  } catch (e) {
    throw wrapPrefetchError(e);
  }
  if (!res.ok) {
    // body は読まない (接続を早く返す。PR-5c-1)。破棄の失敗は無視
    await res.body?.cancel().catch(() => undefined);
    throw new PrefetchError(
      `prefetch HTTP ${res.status}: ${res.statusText}`,
      res.status,
      "http",
    );
  }

  // 一度 ArrayBuffer で受けて charset 検出→decode の順で処理する。
  // res.text() を使うと fetch 実装が UTF-8 で勝手に decode してしまい、
  // Shift_JIS 等のページが mojibake になる (smbc.co.jp で実害確認 2026-05-20)。
  let buf: ArrayBuffer;
  try {
    buf = await res.arrayBuffer();
  } catch (e) {
    throw wrapPrefetchError(e);
  }
  // 先頭 4KB を ASCII レンジで peek して meta charset を読む
  // (charset 宣言は ASCII 範囲のはずなので utf-8 として safely decode 可能)
  const head = new TextDecoder("utf-8", { fatal: false }).decode(
    buf.slice(0, 4096),
  );
  const charset = detectCharset(res.headers.get("content-type"), head);

  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    // 未知の charset は utf-8 fallback (Node の TextDecoder は不明 encoding で throw)
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
}

// Pre-fetch helper (plain text): 生 HTML から script/style/comment を削って
// plain text 化。50KB で truncate (Gemini context window 配慮)。
export async function prefetchAsPlainText(
  url: string,
  maxBytes: number = 50_000,
  timeoutMs: number = PREFETCH_TIMEOUT_MS,
): Promise<string> {
  const html = await prefetchRawHtml(url, timeoutMs);
  const stripped = stripHtmlToText(html);
  return stripped.slice(0, maxBytes);
}

// 子 URL の生存確認。index crawl で Gemini が URL を捏造した場合 (2026-06-10 の
// rakuten-pay 実 fetch で 4/4 件の捏造 URL を確認)、Gemini 呼び出し (最大 3
// attempts) を burn する前に安価な GET で弾く。
//   - dead    : HTTP 404/410。確実に存在しない → 子ページ抽出をスキップ
//   - alive   : 2xx
//   - unknown : 403 / ネットワークエラー / timeout 等。当方 IP がブロックされていても
//               Gemini URL Context (Google egress) からは読める可能性があるので続行
export type ProbeVerdict = {
  verdict: "alive" | "dead" | "unknown";
  status: number | null;
};

export async function probeUrl(
  url: string,
  timeoutMs = 15_000,
): Promise<ProbeVerdict> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: PREFETCH_HEADERS,
      });
    } finally {
      clearTimeout(timer);
    }
    try {
      await res.body?.cancel();
    } catch {
      // body 破棄失敗は無視 (生存判定には不要)
    }
    if (res.ok) return { verdict: "alive", status: res.status };
    if (res.status === 404 || res.status === 410) {
      return { verdict: "dead", status: res.status };
    }
    return { verdict: "unknown", status: res.status };
  } catch {
    return { verdict: "unknown", status: null };
  }
}

export function stripHtmlToText(html: string): string {
  return (
    html
      // script / style ブロック全体を除去
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      // HTML コメント
      .replace(/<!--[\s\S]*?-->/g, "")
      // 残りのタグ
      .replace(/<[^>]+>/g, " ")
      // HTML entity 一部復号
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      // 数値文字参照 (例: &#65374; = 〜)。リンクテキストの期間表記等に頻出
      .replace(/&#x([0-9a-f]+);/gi, (m, hex: string) => {
        const cp = Number.parseInt(hex, 16);
        return Number.isFinite(cp) && cp > 0 && cp < 0x110000
          ? String.fromCodePoint(cp)
          : m;
      })
      .replace(/&#(\d+);/g, (m, dec: string) => {
        const cp = Number(dec);
        return Number.isFinite(cp) && cp > 0 && cp < 0x110000
          ? String.fromCodePoint(cp)
          : m;
      })
      // &amp; は最後 (二重エスケープ &amp;#39; 等を誤復号しないため)
      .replace(/&amp;/g, "&")
      // 連続空白圧縮
      .replace(/\s+/g, " ")
      .trim()
  );
}

// ───────────────────────────────────────────────────────────────
// (1) Gemini API エラーの分類 (PR-0b-2 / Z5)
// ───────────────────────────────────────────────────────────────
// @google/genai は HTTP エラーを ApiError { status, message = JSON.stringify(応答本文) } で投げる。
// これは createGenAI に httpOptions.retryOptions を渡さない場合に限る (渡すと SDK 内部の
// p-retry 経路に入り、429 が本文なしの Error('Retryable HTTP Error: …') になって quotaId も
// status も失われる。fetch-source.ts の createGenAI docblock と SDK 契約テスト参照)。
// instanceof ApiError には頼らず、status が number かどうかの duck typing で判定する。
//
// run を打ち切る (後続ソースも skipped にする) のは RUN_ABORT_KINDS だけ:
//   quotaDaily = 429 かつ quotaId に PerDay (無料枠の日次上限。当日中は回復しない)
//   billing    = 402 (Prepay 残高 0 等)
//   config     = 401 / 403 / 404、または 400 のうち API キー無効 (ErrorInfo.reason=API_KEY_INVALID)
// それ以外の 400 は badRequest (プロンプト過大・tool と MIME の組合せ等、ソース固有の可能性が高い)。
// そのソースの URL Context 再試行だけを止めて prefetch に進み、run は続ける。

export type GeminiErrorKind =
  | "quotaDaily"
  | "quotaMinute"
  | "rateLimited"
  | "overloaded"
  | "serverError"
  | "network"
  | "timeout"
  | "billing"
  | "config"
  | "badRequest"
  | "other";

/** run 全体 (後続ソース) を打ち切るエラー種別。 */
export type RunAbortKind = "quotaDaily" | "billing" | "config";

export const RUN_ABORT_KINDS: ReadonlySet<GeminiErrorKind> = new Set<GeminiErrorKind>([
  "quotaDaily",
  "billing",
  "config",
]);

export function isRunAbortKind(
  kind: GeminiErrorKind | undefined,
): kind is RunAbortKind {
  return kind !== undefined && RUN_ABORT_KINDS.has(kind);
}

export type ClassifiedGeminiError = {
  kind: GeminiErrorKind;
  httpStatus?: number;
  /** QuotaFailure.violations[].quotaId (429 のみ) */
  quotaId?: string;
  /** ErrorInfo.reason (例: API_KEY_INVALID) */
  reason?: string;
  /** RetryInfo.retryDelay。quotaMinute のときだけ付ける (日次枠の retryDelay は分境界を指すだけで回復しない) */
  retryAfterMs?: number;
  /** 1 行に畳んだメッセージ (ログ・outcome の detail 用) */
  message: string;
};

type GoogleRpcDetail = {
  "@type"?: unknown;
  violations?: unknown;
  retryDelay?: unknown;
  reason?: unknown;
};

function parseApiErrorBody(
  message: string,
): { message?: string; details: GoogleRpcDetail[] } | null {
  try {
    const body = JSON.parse(message) as { error?: unknown } | null;
    const err = body?.error as { message?: unknown; details?: unknown } | undefined;
    if (!err || typeof err !== "object") return null;
    return {
      message: typeof err.message === "string" ? err.message : undefined,
      details: Array.isArray(err.details) ? (err.details as GoogleRpcDetail[]) : [],
    };
  } catch {
    return null;
  }
}

/** RetryInfo.retryDelay ('27s' / '1.5s') → ms。形式外は undefined。 */
function parseRetryDelayMs(raw: unknown): number | undefined {
  if (typeof raw !== "string") return undefined;
  const m = raw.trim().match(/^(\d+(?:\.\d+)?)s$/);
  if (!m) return undefined;
  return Math.round(Number(m[1]) * 1000);
}

function errorMessageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e !== null && typeof e === "object") {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(e);
}

function errorCauseCode(e: unknown): string | undefined {
  if (e === null || typeof e !== "object") return undefined;
  const cause = (e as { cause?: unknown }).cause;
  if (cause === null || typeof cause !== "object") return undefined;
  const code = (cause as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isTimeoutLike(e: unknown): boolean {
  if (e === null || typeof e !== "object") return false;
  const name = (e as { name?: unknown }).name;
  if (name === "TimeoutError" || name === "AbortError") return true;
  const code = errorCauseCode(e) ?? (e as { code?: unknown }).code;
  return typeof code === "string" && /TIMEOUT/i.test(code);
}

function oneLine(s: string, max = 300): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function classifyGeminiError(e: unknown): ClassifiedGeminiError {
  const rawMessage = errorMessageOf(e);
  const status =
    e !== null && typeof e === "object" ? (e as { status?: unknown }).status : undefined;

  if (typeof status === "number") {
    const body = parseApiErrorBody(rawMessage);
    const details = body?.details ?? [];
    const quotaIds: string[] = [];
    for (const d of details) {
      if (!Array.isArray(d.violations)) continue;
      for (const v of d.violations as { quotaId?: unknown }[]) {
        if (typeof v?.quotaId === "string") quotaIds.push(v.quotaId);
      }
    }
    const retryAfterMs = details
      .map((d) => parseRetryDelayMs(d.retryDelay))
      .find((v) => v !== undefined);
    const reason = details
      .map((d) => d.reason)
      .find((r): r is string => typeof r === "string");
    const message = oneLine(body?.message ?? rawMessage);
    const base = {
      httpStatus: status,
      message,
      ...(reason !== undefined ? { reason } : {}),
    };

    if (status === 429) {
      const daily = quotaIds.find((q) => /PerDay/.test(q));
      if (daily !== undefined) return { kind: "quotaDaily", ...base, quotaId: daily };
      const minute = quotaIds.find((q) => /PerMinute/.test(q));
      if (minute !== undefined) {
        return {
          kind: "quotaMinute",
          ...base,
          quotaId: minute,
          ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
        };
      }
      return {
        kind: "rateLimited",
        ...base,
        ...(quotaIds[0] !== undefined ? { quotaId: quotaIds[0] } : {}),
      };
    }
    if (status === 503) return { kind: "overloaded", ...base };
    if (status >= 500) return { kind: "serverError", ...base };
    if (status === 402) return { kind: "billing", ...base };
    if (status === 401 || status === 403 || status === 404) {
      return { kind: "config", ...base };
    }
    if (status === 400) {
      if (reason === "API_KEY_INVALID" || /API key/i.test(message)) {
        return { kind: "config", ...base };
      }
      return { kind: "badRequest", ...base };
    }
    if (status === 408) return { kind: "timeout", ...base };
    return { kind: "other", ...base };
  }

  // status が無い: SDK 外の例外 (ネットワーク / timeout) か、retryOptions を渡した時の SDK 内部 Error
  const message = oneLine(formatFetchError(e));
  if (/^Retryable HTTP Error/.test(rawMessage)) return { kind: "rateLimited", message };
  if (isTimeoutLike(e)) return { kind: "timeout", message };
  if (/fetch failed/i.test(rawMessage) || errorCauseCode(e) !== undefined) {
    return { kind: "network", message };
  }
  return { kind: "other", message };
}

/** エラーの 1 行表示。cause.code (ECONNRESET / UND_ERR_* 等) を括弧で添える ('fetch failed' の切り分け用)。 */
export function formatFetchError(e: unknown): string {
  const msg = errorMessageOf(e);
  const code = errorCauseCode(e);
  return code !== undefined ? `${msg} (${code})` : msg;
}

// ───────────────────────────────────────────────────────────────
// (3) 内容が原因の失敗を示す fallback notes
// ───────────────────────────────────────────────────────────────
// fetch-source が空の fallback ExtractedSource を書くとき notes の先頭に付ける。
// propose (isFailedExtraction) はこの prefix で失敗ファイルを判定する (英文 notes の正規表現に頼らない)。

export const FETCH_FAILURE_NOTE_PREFIX = "[fetch-failed:";

export const FETCH_FAILURE_NOTE_KINDS = [
  "allUrlsFailed",
  "empty",
  "nonJson",
  "schema",
  "indexFailed",
  "mergeSchema",
] as const;

export type FetchFailureNoteKind = (typeof FETCH_FAILURE_NOTE_KINDS)[number];

export function formatFailureNote(kind: FetchFailureNoteKind, detail: string): string {
  return `${FETCH_FAILURE_NOTE_PREFIX}${kind}] ${detail}`;
}

export function hasFailureNotePrefix(notes: string | undefined): boolean {
  return notes !== undefined && notes.trimStart().startsWith(FETCH_FAILURE_NOTE_PREFIX);
}

export function parseFailureNoteKind(notes?: string): FetchFailureNoteKind | undefined {
  if (!hasFailureNotePrefix(notes)) return undefined;
  const rest = (notes as string).trimStart().slice(FETCH_FAILURE_NOTE_PREFIX.length);
  const end = rest.indexOf("]");
  if (end < 0) return undefined;
  const kind = rest.slice(0, end);
  return (FETCH_FAILURE_NOTE_KINDS as readonly string[]).includes(kind)
    ? (kind as FetchFailureNoteKind)
    : undefined;
}

// ───────────────────────────────────────────────────────────────
// (4) Q4a: usage (トークン消費の観測)
// ───────────────────────────────────────────────────────────────

export type GeminiUsage = {
  /** generateContent の呼び出し回数 (例外になった呼び出しも 1 と数える) */
  calls: number;
  promptTokens: number;
  /** URL Context 等の tool が取り込んだ分 (toolUsePromptTokenCount) */
  toolUseTokens: number;
  outputTokens: number;
  thoughtTokens: number;
};

export const ZERO_USAGE: Readonly<GeminiUsage> = Object.freeze({
  calls: 0,
  promptTokens: 0,
  toolUseTokens: 0,
  outputTokens: 0,
  thoughtTokens: 0,
});

function tokenCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
}

/** 1 応答分の usage (calls=1)。usageMetadata が欠けていてもトークン 0 で返す。 */
export function extractUsage(resp: unknown): GeminiUsage {
  const m =
    resp !== null && typeof resp === "object"
      ? ((resp as { usageMetadata?: unknown }).usageMetadata as
          | Record<string, unknown>
          | undefined)
      : undefined;
  return {
    calls: 1,
    promptTokens: tokenCount(m?.promptTokenCount),
    toolUseTokens: tokenCount(m?.toolUsePromptTokenCount),
    outputTokens: tokenCount(m?.candidatesTokenCount),
    thoughtTokens: tokenCount(m?.thoughtsTokenCount),
  };
}

export function addUsage(a: GeminiUsage, b: GeminiUsage): GeminiUsage {
  return {
    calls: a.calls + b.calls,
    promptTokens: a.promptTokens + b.promptTokens,
    toolUseTokens: a.toolUseTokens + b.toolUseTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    thoughtTokens: a.thoughtTokens + b.thoughtTokens,
  };
}

export function formatUsage(u: GeminiUsage): string {
  return `calls=${u.calls} in=${u.promptTokens} tool=${u.toolUseTokens} out=${u.outputTokens} thoughts=${u.thoughtTokens}`;
}

// ───────────────────────────────────────────────────────────────
// (6) Z5-3: attempt 計画 (1 ソース最大 3 attempts)
// ───────────────────────────────────────────────────────────────

export type AttemptKind = "urlContext" | "prefetch";
/** Q2 で 'prefetchFirst' を足す想定 */
export type FetchStrategy = "urlContextFirst";

export type AttemptRecord = {
  kind: AttemptKind;
  /** 応答があった attempt の classifyResponse 結果 */
  status?: ResponseStatus;
  /** Gemini 呼び出しが例外になった attempt の分類 */
  errorKind?: GeminiErrorKind;
  /** prefetch 自体が失敗し Gemini を呼ばなかった attempt */
  prefetchFailed?: boolean;
  finishReason?: string;
};

export const MAX_ATTEMPTS_PER_SOURCE = 3;

// 上から順に判定:
//   0. success の応答がある → stop
//   1. run 打ち切り種別 (quotaDaily / billing / config) のエラーがある → stop
//   2. attempt が 3 回に達した → stop
//   3. まだ何もしていない → urlContext
//   4. 直前が prefetch → stop (prefetch は最終手段)
//   5. 直前の urlContext が allUrlsFailed か badRequest → prefetch (URL Context の再試行は無駄)
//   6. urlContext を 2 回使った → prefetch
//   7. それ以外 (nonJson / empty / 503 / network 等) → urlContext (待機して再試行)
export function planNextAttempt(args: {
  strategy: FetchStrategy;
  history: readonly AttemptRecord[];
}): AttemptKind | "stop" {
  const { history } = args;
  if (history.some((h) => h.status === "success")) return "stop";
  if (history.some((h) => isRunAbortKind(h.errorKind))) return "stop";
  if (history.length >= MAX_ATTEMPTS_PER_SOURCE) return "stop";
  if (history.length === 0) return "urlContext";
  const last = history[history.length - 1];
  if (last.kind === "prefetch") return "stop";
  if (last.status === "allUrlsFailed" || last.errorKind === "badRequest") {
    return "prefetch";
  }
  const urlContextCount = history.filter((h) => h.kind === "urlContext").length;
  if (urlContextCount >= 2) return "prefetch";
  return "urlContext";
}

// ───────────────────────────────────────────────────────────────
// (7) Z5-2: keep-last-good の判定
// ───────────────────────────────────────────────────────────────
// API が原因の失敗 (run 打ち切り / 1 度も応答が無い) では extracted を上書きしない。
// 内容が原因の失敗 (応答はあったが nonJson / allUrlsFailed / schema 違反) は従来どおり
// prefix 付きの fallback を書く (propose が失敗として数える)。
export function decideWrite(args: {
  abort?: RunAbortKind;
  gotResponse: boolean;
}): "write" | "keepLastGood" {
  if (args.abort !== undefined) return "keepLastGood";
  if (!args.gotResponse) return "keepLastGood";
  return "write";
}

// ───────────────────────────────────────────────────────────────
// (5) Q1a: 応答の診断 (nonJson の原因切り分け用)
// ───────────────────────────────────────────────────────────────

export type GeminiDiag = {
  finishReason?: string;
  partCount: number;
  thoughtParts: number;
  textLen: number;
  firstBrace: number;
  lastBrace: number;
  usage: GeminiUsage;
};

export function summarizeGeminiDiag(resp: unknown, text: string): GeminiDiag {
  const candidates =
    resp !== null && typeof resp === "object"
      ? (resp as { candidates?: unknown }).candidates
      : undefined;
  const first = Array.isArray(candidates)
    ? (candidates[0] as { finishReason?: unknown; content?: { parts?: unknown } } | undefined)
    : undefined;
  const rawParts = first?.content?.parts;
  const parts = Array.isArray(rawParts) ? (rawParts as { thought?: unknown }[]) : [];
  return {
    ...(typeof first?.finishReason === "string"
      ? { finishReason: first.finishReason }
      : {}),
    partCount: parts.length,
    thoughtParts: parts.filter((p) => p?.thought === true).length,
    textLen: text.length,
    firstBrace: text.indexOf("{"),
    lastBrace: text.lastIndexOf("}"),
    usage: extractUsage(resp),
  };
}

export function formatDiagLine(
  attempt: number,
  mode: AttemptKind | "indexSelect",
  d: GeminiDiag,
): string {
  const u = d.usage;
  return (
    `   🔎 diag attempt=${attempt} mode=${mode} finish=${d.finishReason ?? "-"}` +
    ` parts=${d.partCount}(thought ${d.thoughtParts}) len=${d.textLen}` +
    ` brace=[${d.firstBrace},${d.lastBrace}]` +
    ` tok in/tool/out/thoughts=${u.promptTokens}/${u.toolUseTokens}/${u.outputTokens}/${u.thoughtTokens}`
  );
}

/** success 以外の応答の先頭と末尾 (salvage 要否の判断材料)。短い本文は head だけ。 */
export function headAndTail(text: string, n = 300): { head: string; tail?: string } {
  const flat = text.replace(/\s+/g, " ");
  if (flat.length <= n * 2) return { head: flat };
  return { head: flat.slice(0, n), tail: flat.slice(-n) };
}

// ───────────────────────────────────────────────────────────────
// (8) モデル名 / thinking 予算の解決 (Q4a / Q1a)
// ───────────────────────────────────────────────────────────────
// weekly-sync は `${{ vars.GEMINI_MODEL }}` を渡すので、未設定の repo では空文字が来る。
// 空は既定値に倒し、形式外 (typo / 他社モデル名) は Gemini を呼ぶ前に throw する。

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function resolveGeminiModel(raw?: string): string {
  const v = (raw ?? "").trim();
  if (v === "") return DEFAULT_GEMINI_MODEL;
  if (!/^gemini-[0-9a-z][0-9a-z.-]*$/.test(v)) {
    throw new Error(
      `GEMINI_MODEL が不正: "${v}" (gemini-<版>-<種別> 形式。例: ${DEFAULT_GEMINI_MODEL})`,
    );
  }
  return v;
}

export const DEFAULT_THINKING_BUDGET = 1024;
/** gemini-2.5-flash の thinkingBudget 上限 (0〜24576、-1 = dynamic) */
export const MAX_THINKING_BUDGET = 24576;

export function resolveThinkingBudget(raw?: string): number {
  const v = (raw ?? "").trim();
  if (v === "") return DEFAULT_THINKING_BUDGET;
  if (!/^-?\d+$/.test(v)) {
    throw new Error(`GEMINI_THINKING_BUDGET が不正: "${v}" (整数。-1 = dynamic、0〜${MAX_THINKING_BUDGET})`);
  }
  const n = Number(v);
  if (n !== -1 && (n < 0 || n > MAX_THINKING_BUDGET)) {
    throw new Error(`GEMINI_THINKING_BUDGET が範囲外: ${n} (-1 = dynamic、0〜${MAX_THINKING_BUDGET})`);
  }
  return n;
}
