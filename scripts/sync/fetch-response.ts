// scripts/sync/fetch-response.ts
//
// Gemini レスポンスを「成功 / 各種失敗カテゴリ」に分類する純関数群と、
// pre-fetch (URL → plain text) ヘルパ。fetch-source.ts から import して使う。

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
  // 普通のブラウザを装ってブロック回避
  "User-Agent":
    "Mozilla/5.0 (compatible; PointMax-Sync/1.0; +https://github.com/kyounow/pointmax)",
  "Accept-Language": "ja,en;q=0.8",
} as const;

// Pre-fetch helper (生 HTML): URL から HTML を取り、charset (Shift_JIS 等) を
// 検出して正しく decode した文字列を返す。タグはそのまま (index crawl の
// アンカー抽出が href を必要とするため)。
export async function prefetchRawHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: PREFETCH_HEADERS });
  if (!res.ok) {
    throw new Error(`prefetch HTTP ${res.status}: ${res.statusText}`);
  }

  // 一度 ArrayBuffer で受けて charset 検出→decode の順で処理する。
  // res.text() を使うと fetch 実装が UTF-8 で勝手に decode してしまい、
  // Shift_JIS 等のページが mojibake になる (smbc.co.jp で実害確認 2026-05-20)。
  const buf = await res.arrayBuffer();
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
): Promise<string> {
  const html = await prefetchRawHtml(url);
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
