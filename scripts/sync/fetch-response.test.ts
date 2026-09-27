import { afterEach, describe, it, expect, vi } from "vitest";
import {
  addUsage,
  classifyGeminiError,
  classifyResponse,
  decideWrite,
  DEFAULT_GEMINI_MODEL,
  extractUsage,
  FETCH_FAILURE_NOTE_KINDS,
  formatDiagLine,
  formatFailureNote,
  formatFetchError,
  MAX_ATTEMPTS_PER_SOURCE,
  parseFailureNoteKind,
  planNextAttempt,
  prefetchRawHtml,
  PrefetchError,
  resolveGeminiModel,
  resolveThinkingBudget,
  stripHtmlToText,
  isRetryable,
  detectCharset,
  summarizeGeminiDiag,
  ZERO_USAGE,
  type AttemptRecord,
  type GeminiErrorKind,
  type ResponseStatus,
} from "./fetch-response";
import {
  API_KEY_INVALID_400_BODY,
  QUOTA_DAILY_429_BODY,
  QUOTA_MINUTE_429_BODY,
  OVERLOADED_503_BODY,
  apiErrorLike,
} from "./fixtures/gemini-errors";

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

// ───────────────────────────────────────────────────────────────
// PR-0b-2: Gemini エラー分類 / prefetch timeout / 失敗 notes / usage / diag / attempt 計画
// ───────────────────────────────────────────────────────────────

describe("classifyGeminiError (ApiError 形: status + JSON 本文)", () => {
  it("9/20 実ログの 429 (PerDay) → quotaDaily。quotaId を拾い、retryAfterMs は付けない", () => {
    const c = classifyGeminiError(apiErrorLike(429, QUOTA_DAILY_429_BODY));
    expect(c.kind).toBe("quotaDaily");
    expect(c.httpStatus).toBe(429);
    expect(c.quotaId).toBe("GenerateRequestsPerDayPerProjectPerModel-FreeTier");
    expect(c.retryAfterMs).toBeUndefined();
    expect(c.message).toContain("You exceeded your current quota");
    expect(c.message).not.toContain("\n");
  });

  it("429 (PerMinute + RetryInfo 27s) → quotaMinute、retryAfterMs=27000", () => {
    const c = classifyGeminiError(apiErrorLike(429, QUOTA_MINUTE_429_BODY));
    expect(c.kind).toBe("quotaMinute");
    expect(c.quotaId).toBe("GenerateRequestsPerMinutePerProjectPerModel-FreeTier");
    expect(c.retryAfterMs).toBe(27_000);
  });

  it("JSON でない 429 → rateLimited", () => {
    const e = Object.assign(new Error("Too Many Requests"), { status: 429 });
    expect(classifyGeminiError(e).kind).toBe("rateLimited");
  });

  it("9/13 実ログの 503 → overloaded / 500 → serverError", () => {
    expect(classifyGeminiError(apiErrorLike(503, OVERLOADED_503_BODY)).kind).toBe("overloaded");
    expect(
      classifyGeminiError(apiErrorLike(500, { error: { code: 500, message: "Internal error" } })).kind,
    ).toBe("serverError");
  });

  it("402 → billing / 401・403・404 → config", () => {
    expect(classifyGeminiError(apiErrorLike(402, { error: { code: 402, message: "x" } })).kind).toBe("billing");
    for (const s of [401, 403, 404]) {
      expect(classifyGeminiError(apiErrorLike(s, { error: { code: s, message: "x" } })).kind, String(s)).toBe("config");
    }
  });

  it("400 + ErrorInfo.reason=API_KEY_INVALID → config (reason を保持)", () => {
    const c = classifyGeminiError(apiErrorLike(400, API_KEY_INVALID_400_BODY));
    expect(c.kind).toBe("config");
    expect(c.reason).toBe("API_KEY_INVALID");
  });

  it("それ以外の 400 → badRequest (run は打ち切らない)", () => {
    const c = classifyGeminiError(
      apiErrorLike(400, {
        error: {
          code: 400,
          message: "Tool use with a response mime type: 'application/json' is unsupported",
          status: "INVALID_ARGUMENT",
        },
      }),
    );
    expect(c.kind).toBe("badRequest");
  });
});

describe("classifyGeminiError (status 無し)", () => {
  it("TypeError('fetch failed') → network。formatFetchError は cause.code を添える", () => {
    const e = new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
    const c = classifyGeminiError(e);
    expect(c.kind).toBe("network");
    expect(formatFetchError(e)).toBe("fetch failed (ECONNRESET)");
    expect(classifyGeminiError(new TypeError("fetch failed")).kind).toBe("network");
  });

  it("cause.code=UND_ERR_HEADERS_TIMEOUT → timeout", () => {
    const e = new TypeError("fetch failed", { cause: { code: "UND_ERR_HEADERS_TIMEOUT" } });
    expect(classifyGeminiError(e).kind).toBe("timeout");
  });

  it("DOMException 形の TimeoutError → timeout", () => {
    const e = Object.assign(new Error("The operation was aborted due to timeout"), {
      name: "TimeoutError",
    });
    expect(classifyGeminiError(e).kind).toBe("timeout");
  });

  it("retryOptions 経路の Error('Retryable HTTP Error: Too Many Requests') → rateLimited", () => {
    expect(
      classifyGeminiError(new Error("Retryable HTTP Error: Too Many Requests")).kind,
    ).toBe("rateLimited");
  });

  it("{} / 文字列 → other (壊れない)", () => {
    expect(classifyGeminiError({}).kind).toBe("other");
    expect(classifyGeminiError("boom").kind).toBe("other");
    expect(classifyGeminiError(null).kind).toBe("other");
  });
});

describe("prefetchRawHtml (PrefetchError / timeout)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("403 → PrefetchError{httpStatus:403, reason:'http'}、message は従来の文言", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 403, statusText: "Forbidden" })),
    );
    const err = await prefetchRawHtml("https://example.com/").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PrefetchError);
    expect(err).toMatchObject({ httpStatus: 403, reason: "http" });
    expect((err as Error).message).toBe("prefetch HTTP 403: Forbidden");
  });

  it("signal を尊重して解決しない fetch + timeoutMs=30 (実タイマ) → reason:'timeout'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: { signal?: AbortSignal }) => {
        const signal = init?.signal;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(signal.reason));
        });
      }),
    );
    const err = await prefetchRawHtml("https://example.com/", 30).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PrefetchError);
    expect(err).toMatchObject({ httpStatus: null, reason: "timeout" });
  });

  it("TypeError (ネットワーク) → reason:'network'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
      }),
    );
    const err = await prefetchRawHtml("https://example.com/").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PrefetchError);
    expect(err).toMatchObject({ reason: "network" });
    expect((err as Error).message).toContain("ENOTFOUND");
  });
});

describe("失敗 notes (formatFailureNote / parseFailureNoteKind)", () => {
  it.each(FETCH_FAILURE_NOTE_KINDS)("%s は往復できる", (kind) => {
    expect(parseFailureNoteKind(formatFailureNote(kind, "detail text"))).toBe(kind);
  });

  it("prefix の無い notes / undefined / 未知 kind は undefined", () => {
    expect(parseFailureNoteKind("URL retrieval failed (URL_RETRIEVAL_STATUS_ERROR)")).toBeUndefined();
    expect(parseFailureNoteKind(undefined)).toBeUndefined();
    expect(parseFailureNoteKind("[fetch-failed:bogus] x")).toBeUndefined();
  });
});

describe("usage (extractUsage / addUsage)", () => {
  it("usageMetadata が無ければ calls=1 でトークン 0", () => {
    expect(extractUsage({})).toEqual({ ...ZERO_USAGE, calls: 1 });
    expect(extractUsage(undefined)).toEqual({ ...ZERO_USAGE, calls: 1 });
  });

  it("toolUse を別枠で数え、欠けたフィールドは 0", () => {
    const u = extractUsage({
      usageMetadata: {
        promptTokenCount: 1200,
        toolUsePromptTokenCount: 8000,
        candidatesTokenCount: 300,
      },
    });
    expect(u).toEqual({
      calls: 1,
      promptTokens: 1200,
      toolUseTokens: 8000,
      outputTokens: 300,
      thoughtTokens: 0,
    });
  });

  it("addUsage は結合的", () => {
    const a = { calls: 1, promptTokens: 1, toolUseTokens: 2, outputTokens: 3, thoughtTokens: 4 };
    const b = { calls: 2, promptTokens: 10, toolUseTokens: 20, outputTokens: 30, thoughtTokens: 40 };
    const c = { calls: 3, promptTokens: 100, toolUseTokens: 200, outputTokens: 300, thoughtTokens: 400 };
    expect(addUsage(addUsage(a, b), c)).toEqual(addUsage(a, addUsage(b, c)));
    expect(addUsage(ZERO_USAGE, a)).toEqual(a);
  });
});

describe("summarizeGeminiDiag / formatDiagLine", () => {
  it("candidates が無くても壊れない。brace は -1", () => {
    const d = summarizeGeminiDiag({}, "no json here");
    expect(d.finishReason).toBeUndefined();
    expect(d.partCount).toBe(0);
    expect(d.firstBrace).toBe(-1);
    expect(d.lastBrace).toBe(-1);
    expect(d.textLen).toBe(12);
  });

  it("thought の part を数え、finishReason / brace 位置 / usage を拾う", () => {
    const text = 'x {"a":1} y';
    const d = summarizeGeminiDiag(
      {
        candidates: [
          {
            finishReason: "MAX_TOKENS",
            content: { parts: [{ thought: true, text: "..." }, { text }] },
          },
        ],
        usageMetadata: { promptTokenCount: 5, thoughtsTokenCount: 1024 },
      },
      text,
    );
    expect(d).toMatchObject({
      finishReason: "MAX_TOKENS",
      partCount: 2,
      thoughtParts: 1,
      firstBrace: 2,
      lastBrace: 8,
    });
    expect(d.usage.thoughtTokens).toBe(1024);
    const line = formatDiagLine(2, "urlContext", d);
    expect(line).toContain("🔎 diag attempt=2 mode=urlContext finish=MAX_TOKENS");
    expect(line).toContain("brace=[2,8]");
    expect(line).toContain("tok in/tool/out/thoughts=5/0/0/1024");
  });
});

describe("planNextAttempt (Z5-3 遷移表)", () => {
  const uc = (status?: ResponseStatus, errorKind?: GeminiErrorKind): AttemptRecord => ({
    kind: "urlContext",
    ...(status ? { status } : {}),
    ...(errorKind ? { errorKind } : {}),
  });
  const pf = (prefetchFailed = false): AttemptRecord => ({
    kind: "prefetch",
    ...(prefetchFailed ? { prefetchFailed } : { status: "nonJson" as const }),
  });
  const next = (history: AttemptRecord[]) =>
    planNextAttempt({ strategy: "urlContextFirst", history });

  it.each<[string, AttemptRecord[], string]>([
    ["[] → urlContext", [], "urlContext"],
    ["[uc nonJson] → urlContext", [uc("nonJson")], "urlContext"],
    ["[uc allUrlsFailed] → prefetch", [uc("allUrlsFailed")], "prefetch"],
    ["[uc badRequest] → prefetch", [uc(undefined, "badRequest")], "prefetch"],
    ["[uc, uc] → prefetch", [uc("nonJson"), uc("empty")], "prefetch"],
    ["[uc, uc, prefetch] → stop", [uc("nonJson"), uc("nonJson"), pf()], "stop"],
    ["[uc quotaDaily] → stop", [uc(undefined, "quotaDaily")], "stop"],
    ["[uc billing] → stop", [uc(undefined, "billing")], "stop"],
    ["[uc config] → stop", [uc(undefined, "config")], "stop"],
    ["[uc allUrlsFailed, prefetch(prefetchFailed)] → stop", [uc("allUrlsFailed"), pf(true)], "stop"],
    ["[uc overloaded] → urlContext", [uc(undefined, "overloaded")], "urlContext"],
    ["[uc quotaMinute] → urlContext", [uc(undefined, "quotaMinute")], "urlContext"],
    ["[uc success] → stop", [uc("success")], "stop"],
  ])("%s", (_label, history, expected) => {
    expect(next(history)).toBe(expected);
  });

  it("性質: 計画どおりに進めると、どんな結果の列でも attempt は 3 回以下", () => {
    const outcomes: Array<(k: "urlContext" | "prefetch") => AttemptRecord> = [
      (k) => ({ kind: k, status: "nonJson" }),
      (k) => ({ kind: k, status: "empty" }),
      (k) => ({ kind: k, status: "allUrlsFailed" }),
      (k) => ({ kind: k, errorKind: "overloaded" }),
      (k) => ({ kind: k, errorKind: "badRequest" }),
      (k) => ({ kind: k, errorKind: "quotaMinute" }),
      (k) => ({ kind: k, errorKind: "quotaDaily" }),
      (k) => (k === "prefetch" ? { kind: k, prefetchFailed: true } : { kind: k, errorKind: "network" }),
    ];
    // 深さ 5 まで全列挙 (計画が stop を返したら打ち切り)
    const walk = (history: AttemptRecord[], depth: number): void => {
      const n = next(history);
      if (n === "stop" || depth === 0) {
        expect(history.length).toBeLessThanOrEqual(MAX_ATTEMPTS_PER_SOURCE);
        return;
      }
      for (const o of outcomes) walk([...history, o(n)], depth - 1);
    };
    walk([], 5);
  });
});

describe("decideWrite (Z5-2 keep-last-good)", () => {
  it("abort があれば応答があっても keepLastGood", () => {
    expect(decideWrite({ abort: "quotaDaily", gotResponse: true })).toBe("keepLastGood");
    expect(decideWrite({ abort: "billing", gotResponse: false })).toBe("keepLastGood");
  });
  it("応答ゼロ (全 attempt が例外) なら keepLastGood", () => {
    expect(decideWrite({ gotResponse: false })).toBe("keepLastGood");
  });
  it("それ以外は write (内容が原因の失敗は fallback を書く)", () => {
    expect(decideWrite({ gotResponse: true })).toBe("write");
  });
});

describe("resolveGeminiModel / resolveThinkingBudget", () => {
  it("undefined / '' / 空白 → 既定モデル", () => {
    expect(resolveGeminiModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel("")).toBe("gemini-2.5-flash");
    expect(resolveGeminiModel("  ")).toBe("gemini-2.5-flash");
  });
  it("gemini-* 形式はそのまま通す", () => {
    expect(resolveGeminiModel("gemini-3.6-flash")).toBe("gemini-3.6-flash");
    expect(resolveGeminiModel(" gemini-2.5-flash-lite ")).toBe("gemini-2.5-flash-lite");
  });
  it("形式外は throw", () => {
    expect(() => resolveGeminiModel("gemni-2.5")).toThrow(/GEMINI_MODEL/);
    expect(() => resolveGeminiModel("gpt-4")).toThrow(/GEMINI_MODEL/);
  });
  it("thinking 予算: '' → 1024 / '4096' / '-1' / 範囲外と非整数は throw", () => {
    expect(resolveThinkingBudget("")).toBe(1024);
    expect(resolveThinkingBudget(undefined)).toBe(1024);
    expect(resolveThinkingBudget("4096")).toBe(4096);
    expect(resolveThinkingBudget("-1")).toBe(-1);
    expect(resolveThinkingBudget("0")).toBe(0);
    expect(() => resolveThinkingBudget("abc")).toThrow(/GEMINI_THINKING_BUDGET/);
    expect(() => resolveThinkingBudget("-5")).toThrow(/GEMINI_THINKING_BUDGET/);
    expect(() => resolveThinkingBudget("24577")).toThrow(/GEMINI_THINKING_BUDGET/);
  });
});
