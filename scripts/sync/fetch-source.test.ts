import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { salvageBySchema } from "./fetch-source";
import type { ExtractedSource } from "./types";

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
      cards: [validCard, cardWithExtraProp, cardMissingExplicitness],
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
});
