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

// Pre-fetch helper: URL から HTML を取り、script/style/comment を削って plain text 化。
// 50KB で truncate (Gemini context window 配慮)。
export async function prefetchAsPlainText(
  url: string,
  maxBytes: number = 50_000,
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // 普通のブラウザを装ってブロック回避
      "User-Agent":
        "Mozilla/5.0 (compatible; PointMax-Sync/1.0; +https://github.com/kyounow/pointmax)",
      "Accept-Language": "ja,en;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`prefetch HTTP ${res.status}: ${res.statusText}`);
  }
  const html = await res.text();
  const stripped = stripHtmlToText(html);
  return stripped.slice(0, maxBytes);
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
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // 連続空白圧縮
      .replace(/\s+/g, " ")
      .trim()
  );
}
