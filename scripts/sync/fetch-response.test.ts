import { describe, it, expect } from "vitest";
import {
  classifyResponse,
  stripHtmlToText,
  isRetryable,
  detectCharset,
} from "./fetch-response";

describe("classifyResponse", () => {
  it("空文字列 → empty", () => {
    expect(classifyResponse({ text: "", retrievedUrls: [] })).toBe("empty");
    expect(classifyResponse({ text: "   \n\n  ", retrievedUrls: [] })).toBe("empty");
  });

  it("全 URL retrieval 失敗 → allUrlsFailed", () => {
    expect(classifyResponse({
      text: "any",
      retrievedUrls: ["https://x.com [URL_RETRIEVAL_STATUS_ERROR]"],
    })).toBe("allUrlsFailed");
  });

  it("refusal 文 (JSON 構造なし) → refusal", () => {
    expect(classifyResponse({
      text: "申し訳ありませんが、このページからは抽出できませんでした。",
      retrievedUrls: ["https://x.com [URL_RETRIEVAL_STATUS_SUCCESS]"],
    })).toBe("refusal");
    expect(classifyResponse({
      text: "I'm sorry, I cannot extract data from this page.",
      retrievedUrls: ["https://x.com [URL_RETRIEVAL_STATUS_SUCCESS]"],
    })).toBe("refusal");
  });

  it("途中で切れた JSON → truncatedJson", () => {
    expect(classifyResponse({
      text: '{"sourceId":"x","cards":[',
      retrievedUrls: ["https://x.com [URL_RETRIEVAL_STATUS_SUCCESS]"],
    })).toBe("truncatedJson");
  });

  it("有効な JSON → success", () => {
    expect(classifyResponse({
      text: '{"sourceId":"x"}',
      retrievedUrls: [],
    })).toBe("success");
  });

  it("コードフェンス付き JSON → success (除去して成功扱い)", () => {
    expect(classifyResponse({
      text: '```json\n{"sourceId":"x"}\n```',
      retrievedUrls: [],
    })).toBe("success");
  });

  it("散文 (JSON でない) → nonJson", () => {
    expect(classifyResponse({
      text: "このページから抽出した結果、3つの店舗があります: マクドナルド、KFC、すき家。",
      retrievedUrls: ["https://x.com [URL_RETRIEVAL_STATUS_SUCCESS]"],
    })).toBe("nonJson");
  });

  it("isRetryable: success のみ false", () => {
    expect(isRetryable("success")).toBe(false);
    expect(isRetryable("empty")).toBe(true);
    expect(isRetryable("refusal")).toBe(true);
    expect(isRetryable("truncatedJson")).toBe(true);
    expect(isRetryable("nonJson")).toBe(true);
    expect(isRetryable("allUrlsFailed")).toBe(true);
  });
});

describe("stripHtmlToText", () => {
  it("script タグを除去", () => {
    expect(stripHtmlToText("<script>evil()</script>hello")).toBe("hello");
  });
  it("style タグを除去", () => {
    expect(stripHtmlToText("<style>body{}</style>hi")).toBe("hi");
  });
  it("コメントを除去", () => {
    expect(stripHtmlToText("<!-- hidden -->visible")).toBe("visible");
  });
  it("HTML entity を復号", () => {
    expect(stripHtmlToText("Tom &amp; Jerry &lt;3")).toBe("Tom & Jerry <3");
  });
  it("連続空白を圧縮", () => {
    expect(stripHtmlToText("a   b\n\nc")).toBe("a b c");
  });
  it("複雑な HTML をまとめて処理", () => {
    const html = `
      <html>
        <head><style>.x{}</style></head>
        <body>
          <h1>店舗一覧</h1>
          <!-- TODO -->
          <p>セブン-イレブン: 7%</p>
          <script>var x = 1;</script>
        </body>
      </html>
    `;
    const out = stripHtmlToText(html);
    expect(out).toContain("店舗一覧");
    expect(out).toContain("セブン-イレブン: 7%");
    expect(out).not.toContain("var x");
    expect(out).not.toContain(".x{}");
    expect(out).not.toContain("TODO");
  });
});

describe("detectCharset", () => {
  it("Content-Type ヘッダの charset が最優先", () => {
    expect(
      detectCharset("text/html; charset=Shift_JIS", '<meta charset="UTF-8">'),
    ).toBe("shift_jis");
  });

  it("ヘッダに charset 無 → <meta charset> を採用", () => {
    expect(detectCharset("text/html", '<meta charset="Shift_JIS">')).toBe(
      "shift_jis",
    );
    expect(detectCharset(null, '<meta charset="UTF-8">')).toBe("utf-8");
  });

  it("<meta http-equiv> 形式の charset も読める", () => {
    expect(
      detectCharset(
        null,
        '<meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS">',
      ),
    ).toBe("shift_jis");
  });

  it("どちらも無ければ utf-8 にフォールバック", () => {
    expect(detectCharset(null, "<html><body></body></html>")).toBe("utf-8");
    expect(detectCharset("text/html", "")).toBe("utf-8");
  });

  it("表記揺れ (Shift-JIS / shift_jis / sjis) を正規化", () => {
    expect(detectCharset(null, '<meta charset="Shift-JIS">')).toBe("shift_jis");
    expect(detectCharset(null, '<meta charset="shift_jis">')).toBe("shift_jis");
    expect(detectCharset(null, '<meta charset="SJIS">')).toBe("shift_jis");
  });

  it("euc-jp も正規化対象", () => {
    expect(detectCharset(null, '<meta charset="EUC-JP">')).toBe("euc-jp");
    expect(detectCharset(null, '<meta charset="x-euc-jp">')).toBe("euc-jp");
  });

  it("先頭 4KB の中の charset を拾える (実 SMBC ページの形を模倣)", () => {
    const head =
      "<!DOCTYPE html>\n" +
      "<!-- Updated 2026/05/18.T -->\n".repeat(20) +
      '<meta charset="Shift_JIS">\n' +
      "<title>Vポイント アップ</title>";
    expect(detectCharset("text/html", head)).toBe("shift_jis");
  });
});
