import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  callGeminiWithRetry,
  createGenAI,
  keepLastGood,
  RETRY_DELAYS_MS,
  salvageBySchema,
  type GeminiCallResult,
  type RetryDeps,
} from "./fetch-source";
import type { ExtractedSource } from "./types";
import {
  classifyGeminiError,
  decideWrite,
  MAX_ATTEMPTS_PER_SOURCE,
  PrefetchError,
  summarizeGeminiDiag,
} from "./fetch-response";
import {
  createFetchStats,
  createOutcomeDraft,
  finalizeOutcome,
} from "./fetch-outcome";
import {
  API_KEY_INVALID_400_BODY,
  OVERLOADED_503_BODY,
  QUOTA_DAILY_429_BODY,
  QUOTA_MINUTE_429_BODY,
  apiErrorLike,
  jsonErrorResponse,
} from "./fixtures/gemini-errors";

// ───────────────────────────────────────────────────────────────
// callGeminiWithRetry (Z5): 偽の deps と即時 sleep で実ログの経路を再現する
// ───────────────────────────────────────────────────────────────

type FakeCall =
  | "success"
  | "nonJson"
  | "empty"
  | "allUrlsFailed"
  | { throws: unknown };

function fakeResult(c: Exclude<FakeCall, { throws: unknown }>): GeminiCallResult {
  const text =
    c === "success" ? '{"sourceId":"x"}' : c === "nonJson" ? "抽出結果は次のとおりです" : c === "empty" ? "" : "x";
  const retrievedUrls =
    c === "allUrlsFailed" ? ["https://example.com/ [URL_RETRIEVAL_STATUS_ERROR]"] : [];
  return { text, retrievedUrls, diag: summarizeGeminiDiag({}, text) };
}

/** Gemini 呼び出し (URL Context / 直渡し共通の列) と prefetch の結果を台本どおりに返す偽 deps */
function fakeDeps(script: { gemini: FakeCall[]; prefetch?: Array<"ok" | { throws: unknown }> }) {
  const gemini = [...script.gemini];
  const prefetch = [...(script.prefetch ?? [])];
  const calls = { urlContext: 0, withText: 0, prefetch: 0 };
  const sleeps: number[] = [];
  const next = async (): Promise<GeminiCallResult> => {
    const c = gemini.shift();
    if (c === undefined) throw new Error("台本外の Gemini 呼び出し");
    if (typeof c === "object") throw c.throws;
    return fakeResult(c);
  };
  const deps: RetryDeps = {
    callUrlContext: async () => {
      calls.urlContext += 1;
      return next();
    },
    callWithText: async () => {
      calls.withText += 1;
      return next();
    },
    prefetchText: async () => {
      calls.prefetch += 1;
      const p = prefetch.shift() ?? "ok";
      if (typeof p === "object") throw p.throws;
      return "本文";
    },
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  };
  return { deps, calls, sleeps };
}

const ARGS = { systemInstruction: "sys", url: "https://example.com/", sourceId: "d-pay-campaigns" };
const E429_DAY = { throws: apiErrorLike(429, QUOTA_DAILY_429_BODY) };
const E429_MIN = { throws: apiErrorLike(429, QUOTA_MINUTE_429_BODY) };
const E503 = { throws: apiErrorLike(503, OVERLOADED_503_BODY) };
const E402 = { throws: apiErrorLike(402, { error: { code: 402, message: "billing" } }) };
const E400_KEY = { throws: apiErrorLike(400, API_KEY_INVALID_400_BODY) };
const E400_BAD = {
  throws: apiErrorLike(400, { error: { code: 400, message: "Request payload size exceeds the limit" } }),
};
const PREFETCH_403 = { throws: new PrefetchError("prefetch HTTP 403: Forbidden", 403, "http") };
const PREFETCH_NET = { throws: new PrefetchError("prefetch network error: fetch failed", null, "network") };

describe("callGeminiWithRetry (実ログの再現)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("(a) 9/20 d-pay: 429 PerDay → Gemini 1 回で打ち切り、応答ゼロ → keep-last-good", async () => {
    const { deps, calls, sleeps } = fakeDeps({ gemini: [E429_DAY] });
    const r = await callGeminiWithRetry(ARGS, deps);
    expect(r.geminiCalls).toBe(1);
    expect(r.abort).toBe("quotaDaily");
    expect(r.gotResponse).toBe(false);
    expect(decideWrite(r)).toBe("keepLastGood");
    expect(calls.prefetch).toBe(0);
    expect(sleeps).toEqual([]);
  });

  it("(b) 9/06: nonJson → nonJson → prefetch → 429 → 3 回、応答はあったが abort なので keep-last-good", async () => {
    const { deps, sleeps } = fakeDeps({ gemini: ["nonJson", "nonJson", E429_DAY] });
    const r = await callGeminiWithRetry(ARGS, deps);
    expect(r.geminiCalls).toBe(3);
    expect(r.abort).toBe("quotaDaily");
    expect(r.gotResponse).toBe(true);
    expect(decideWrite(r)).toBe("keepLastGood");
    expect(sleeps).toEqual([RETRY_DELAYS_MS.urlContext, RETRY_DELAYS_MS.prefetch]);
    expect(r.history.map((h) => h.kind)).toEqual(["urlContext", "urlContext", "prefetch"]);
  });

  it("(c) 8/16: 429 の後の漏れ成功は取りに行かない (1 回で停止)", async () => {
    const { deps, calls } = fakeDeps({ gemini: [E429_DAY, "success"] });
    const r = await callGeminiWithRetry(ARGS, deps);
    expect(r.geminiCalls).toBe(1);
    expect(calls.urlContext).toBe(1);
    expect(r.finalStatus).not.toBe("success");
  });

  it("(d) jre 子ページ: allUrlsFailed → prefetch 403 → Gemini 1 回、内容の失敗なので write (fallback)", async () => {
    const { deps, calls, sleeps } = fakeDeps({ gemini: ["allUrlsFailed"], prefetch: [PREFETCH_403] });
    const r = await callGeminiWithRetry(ARGS, deps);
    expect(r.geminiCalls).toBe(1);
    expect(calls.prefetch).toBe(1);
    expect(calls.withText).toBe(0);
    expect(r.finalStatus).toBe("allUrlsFailed");
    expect(r.gotResponse).toBe(true);
    expect(decideWrite(r)).toBe("write");
    expect(r.history).toEqual([
      { kind: "urlContext", status: "allUrlsFailed" },
      { kind: "prefetch", prefetchFailed: true },
    ]);
    expect(sleeps).toEqual([]);
  });

  it("(e) 503 → 503 → prefetch がネットワーク失敗 → 2 回、応答ゼロ → keep-last-good (打ち切りはしない)", async () => {
    const { deps, sleeps } = fakeDeps({ gemini: [E503, E503], prefetch: [PREFETCH_NET] });
    const r = await callGeminiWithRetry(ARGS, deps);
    expect(r.geminiCalls).toBe(2);
    expect(r.gotResponse).toBe(false);
    expect(r.abort).toBeUndefined();
    expect(r.errorKinds).toEqual(["overloaded", "overloaded"]);
    expect(decideWrite(r)).toBe("keepLastGood");
    expect(sleeps).toEqual([RETRY_DELAYS_MS.urlContext]);
  });

  it("(f) nonJson → success → 2 回で success", async () => {
    const { deps, sleeps } = fakeDeps({ gemini: ["nonJson", "success"] });
    const r = await callGeminiWithRetry(ARGS, deps);
    expect(r.geminiCalls).toBe(2);
    expect(r.finalStatus).toBe("success");
    expect(r.text).toBe('{"sourceId":"x"}');
    expect(sleeps).toEqual([5000]);
  });

  it("(g) 402 → 1 回で abort=billing / 400 API_KEY_INVALID → 1 回で abort=config", async () => {
    const billing = await callGeminiWithRetry(ARGS, fakeDeps({ gemini: [E402] }).deps);
    expect(billing.geminiCalls).toBe(1);
    expect(billing.abort).toBe("billing");
    const config = await callGeminiWithRetry(ARGS, fakeDeps({ gemini: [E400_KEY] }).deps);
    expect(config.geminiCalls).toBe(1);
    expect(config.abort).toBe("config");
  });

  it("(h) 400 badRequest → URL Context を再試行せず prefetch へ。prefetch 自体は geminiCalls に数えない", async () => {
    const { deps, calls, sleeps } = fakeDeps({ gemini: [E400_BAD, "success"] });
    const r = await callGeminiWithRetry(ARGS, deps);
    expect(r.abort).toBeUndefined();
    expect(r.geminiCalls).toBe(2);
    expect(calls.urlContext).toBe(1);
    expect(calls.prefetch).toBe(1);
    expect(calls.withText).toBe(1);
    expect(r.finalStatus).toBe("success");
    expect(sleeps).toEqual([15000]);
  });

  it("quotaMinute (retryDelay 27s) の後は既定 5s より長く待つ (上限 60s)", async () => {
    const { deps, sleeps } = fakeDeps({ gemini: [E429_MIN, "success"] });
    const r = await callGeminiWithRetry(ARGS, deps);
    expect(r.abort).toBeUndefined();
    expect(r.finalStatus).toBe("success");
    expect(sleeps).toEqual([27_000]);
  });

  it("性質: どの偽 deps の組み合わせでも Gemini 呼び出しは 3 回以下", async () => {
    const outcomes: FakeCall[] = ["success", "nonJson", "empty", "allUrlsFailed", E503, E400_BAD, E429_DAY, E429_MIN];
    const prefetches: Array<"ok" | { throws: unknown }> = ["ok", PREFETCH_403];
    for (const a of outcomes)
      for (const b of outcomes)
        for (const c of outcomes)
          for (const p of prefetches) {
            const { deps } = fakeDeps({ gemini: [a, b, c, "success"], prefetch: [p] });
            const r = await callGeminiWithRetry(ARGS, deps);
            expect(r.geminiCalls).toBeLessThanOrEqual(MAX_ATTEMPTS_PER_SOURCE);
            expect(r.history.length).toBeLessThanOrEqual(MAX_ATTEMPTS_PER_SOURCE);
          }
  });

  it("keep-last-good の outcome は keptLastGood=true と abortRun を持つ (finalizeOutcome)", async () => {
    const r = await callGeminiWithRetry(ARGS, fakeDeps({ gemini: [E429_DAY] }).deps);
    const draft = createOutcomeDraft(ARGS.sourceId);
    keepLastGood(draft, { id: ARGS.sourceId }, r);
    const stats = createFetchStats();
    stats.usage = { ...stats.usage, calls: r.geminiCalls };
    stats.errorKinds = [...r.errorKinds];
    const o = finalizeOutcome(draft, stats, "gemini-2.5-flash", new Date());
    expect(o).toMatchObject({
      outcome: "quotaExhausted",
      keptLastGood: true,
      abortRun: "quotaDaily",
      failKind: "quotaDaily",
      geminiCalls: 1,
    });
  });

  it("応答ゼロ (503 のみ) の keep-last-good は abortRun 無しの failed (apiError) = 後続を止めない", async () => {
    const r = await callGeminiWithRetry(
      ARGS,
      fakeDeps({ gemini: [E503, E503], prefetch: [PREFETCH_NET] }).deps,
    );
    const draft = createOutcomeDraft(ARGS.sourceId);
    keepLastGood(draft, { id: ARGS.sourceId }, r);
    const o = finalizeOutcome(draft, createFetchStats(), "m", new Date());
    expect(o.outcome).toBe("failed");
    expect(o.failKind).toBe("apiError");
    expect(o.abortRun).toBeUndefined();
    expect(o.keptLastGood).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────
// SDK 契約 (@google/genai): createGenAI に retryOptions を渡していないこと、
// 429 が ApiError{status, message=本文 JSON} のまま届き 1 呼び出し = 1 req であることを固定する。
// SDK の版上げ (0c-2 の 2.24 等) で形が変わったらここで落ちる。
// ───────────────────────────────────────────────────────────────
describe("SDK 契約: createGenAI の generateContent エラー形", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("429 (9/20 実ログ本文) → ApiError status 429 / message に PerDay / fetch は 1 回 / quotaDaily に分類", async () => {
    const fetchMock = vi.fn(async () =>
      jsonErrorResponse(429, "Too Many Requests", QUOTA_DAILY_429_BODY),
    );
    vi.stubGlobal("fetch", fetchMock);
    const ai = createGenAI("test-key");
    const err = await ai.models
      .generateContent({ model: "gemini-2.5-flash", contents: "hi" })
      .then(
        () => undefined,
        (e: unknown) => e,
      );
    expect(err).toMatchObject({ status: 429 });
    expect((err as Error).message).toContain("PerDay");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(classifyGeminiError(err).kind).toBe("quotaDaily");
  });

  it("404 → ApiError status 404 (config) / fetch は 1 回", async () => {
    const fetchMock = vi.fn(async () =>
      jsonErrorResponse(404, "Not Found", {
        error: { code: 404, message: "models/gemini-x is not found", status: "NOT_FOUND" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const ai = createGenAI("test-key");
    const err = await ai.models
      .generateContent({ model: "gemini-x", contents: "hi" })
      .then(
        () => undefined,
        (e: unknown) => e,
      );
    expect(err).toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(classifyGeminiError(err).kind).toBe("config");
  });
});

const schema = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../sources/schema/extracted-source.schema.json"),
    "utf-8",
  ),
) as object;

// 必須メタは fetch-source 側でスクリプトが上書きするので、salvage に渡る時点で
// 常に揃っている前提。テストでも valid な値を入れる。
function baseSource(): ExtractedSource {
  return {
    sourceId: "test-source",
    sourceUrl: "https://example.com/page",
    fetchedAt: new Date().toISOString(),
    promptVersion: "card-v1.1",
    extractor: "card",
    geminiModel: "gemini-2.5-flash",
  };
}

const validCard = {
  cardId: "rakuten-card",
  defaultRate: 0.01,
  defaultCurrencyId: "rakuten-pt",
  evidenceQuote: "100円で1ポイント",
  explicitness: 0.9,
  ambiguity: 0.1,
};

// additionalProperties:false 違反 (Gemini が schema 外プロパティを足す事象)
const cardWithExtraProp = {
  ...validCard,
  cardId: "smbc-v",
  bogusGeminiField: "これは schema に無い",
};

// required 違反 (explicitness 欠落: rakuten-point-partners/69 で観測した型)
const cardMissingExplicitness = {
  cardId: "jal-suica",
  evidenceQuote: "200円で1マイル",
  ambiguity: 0.1,
};

describe("salvageBySchema", () => {
  it("既に valid なオブジェクトはそのまま ok で返る (ハッピーパス)", () => {
    const data: ExtractedSource = { ...baseSource(), cards: [validCard] };
    const r = salvageBySchema(data, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.droppedByKey).toEqual({});
      expect(r.data.cards).toHaveLength(1);
    }
  });

  it("(a) 違反アイテムが混在 → valid だけ残し違反のみ落とす", () => {
    const data: ExtractedSource = {
      ...baseSource(),
      cards: [validCard, cardWithExtraProp, cardMissingExplicitness as never /* 意図的な schema 違反 fixture */],
    };
    const r = salvageBySchema(data, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.cards).toHaveLength(1);
      expect(r.data.cards?.[0].cardId).toBe("rakuten-card");
      expect(r.droppedByKey).toEqual({ cards: 2 });
    }
  });

  it("(b) 配列の全アイテムが違反 → 配列キーごと除去し graceful に ok (exit 0 相当)", () => {
    const data: ExtractedSource = {
      ...baseSource(),
      loyaltyRules: [
        // どちらも item schema 違反
        { storeId: "x", rate: 0.005 } as never,
        { pointCardId: "p", storeId: "y", rate: 0 } as never,
      ],
    };
    const r = salvageBySchema(data, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.droppedByKey).toEqual({ loyaltyRules: 2 });
      // 空になった配列はキーごと消える (diff-propose が no-op できる)
      expect(r.data.loyaltyRules).toBeUndefined();
    }
  });

  it("複数配列の違反を独立に salvage する", () => {
    const data: ExtractedSource = {
      ...baseSource(),
      cards: [validCard, cardWithExtraProp],
      stores: [
        {
          storeId: "kura-sushi",
          name: "くら寿司",
          category: "飲食",
          evidenceQuote: "くら寿司 加盟店",
          explicitness: 0.9,
          ambiguity: 0.1,
        },
        { storeId: "broken" } as never,
      ],
    };
    const r = salvageBySchema(data, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.cards).toHaveLength(1);
      expect(r.data.stores).toHaveLength(1);
      expect(r.droppedByKey).toEqual({ cards: 1, stores: 1 });
    }
  });

  it("(c) アイテム除去では直せない構造破損 → ok:false (呼び出し側が空 fallback)", () => {
    const data = {
      ...baseSource(),
      cards: [validCard],
      garbageTopLevelKey: 123, // top-level additionalProperties:false 違反
    } as unknown as ExtractedSource;
    const r = salvageBySchema(data, schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it("campaign extractor + 期間付き loyaltyRule が schema 通過 (#B JRE)", () => {
    const data: ExtractedSource = {
      ...baseSource(),
      extractor: "campaign",
      promptVersion: "campaign-v1.0",
      loyaltyRules: [
        {
          pointCardId: "jre-pointcard",
          storeId: "newdays",
          rate: 0.03,
          validFrom: "2026-06-01",
          validTo: "2026-06-30",
          evidenceQuote:
            "キャンペーン期間：2026年6月1日〜6月30日、NewDaysでJRE POINT提示で3%",
          explicitness: 0.9,
          ambiguity: 0.1,
        },
      ],
    };
    const r = salvageBySchema(data, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.droppedByKey).toEqual({});
      expect(r.data.loyaltyRules?.[0].validTo).toBe("2026-06-30");
    }
  });

  it("campaign extractor + programs/memberships が schema 通過 (PR-D1 正準モデル)", () => {
    const data: ExtractedSource = {
      ...baseSource(),
      extractor: "campaign",
      promptVersion: "campaign-v2.0",
      stores: [
        {
          storeId: "newdays",
          name: "NewDays",
          category: "コンビニ",
          evidenceQuote: "対象店舗 NewDays",
          explicitness: 0.9,
          ambiguity: 0.1,
        },
      ],
      programs: [
        {
          programId: "prog-jre-campaign-newdays-2026-06",
          name: "JRE POINT NewDays 3%",
          pointCardId: "jre-pointcard",
          rate: 0.03,
          currencyId: "jre",
          bonusType: "addOn",
          validFrom: "2026-06-01",
          validTo: "2026-06-30",
          evidenceQuote:
            "キャンペーン期間：2026年6月1日〜6月30日、NewDaysでJRE POINT3%",
          explicitness: 0.9,
          ambiguity: 0.1,
        },
      ],
      memberships: [
        {
          programId: "prog-jre-campaign-newdays-2026-06",
          storeId: "newdays",
          evidenceQuote: "対象店舗：NewDays",
          explicitness: 0.9,
          ambiguity: 0.1,
        },
      ],
    };
    const r = salvageBySchema(data, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.droppedByKey).toEqual({});
      expect(r.data.programs?.[0].bonusType).toBe("addOn");
      expect(r.data.memberships?.[0].storeId).toBe("newdays");
    }
  });
});
