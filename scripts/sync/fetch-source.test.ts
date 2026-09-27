import { afterEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createGenAI, salvageBySchema } from "./fetch-source";
import type { ExtractedSource } from "./types";
import { classifyGeminiError } from "./fetch-response";
import {
  QUOTA_DAILY_429_BODY,
  jsonErrorResponse,
} from "./fixtures/gemini-errors";

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
