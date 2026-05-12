import { describe, it, expect } from "vitest";
import type { SeedShape } from "../../src/domain/mergeSeed";
import {
  applyCategoryCap,
  dedupeAcrossProposals,
  isFailedExtraction,
  proposeCards,
  proposeCategoryRules,
  proposeLoyaltyRules,
  proposePaymentApps,
  proposeStoreRules,
  proposeStores,
} from "./diff-and-propose";
import type { ExtractedSource, Proposal } from "./types";

// テスト用の最小 SeedShape
const emptySeed: SeedShape = {
  cards: [],
  currencies: [],
  stores: [],
  rules: [],
  edges: [],
  pointCards: [],
  loyaltyRules: [],
  paymentApps: [],
};

const baseSource = (overrides: Partial<ExtractedSource>): ExtractedSource => ({
  sourceId: "test-src",
  sourceUrl: "https://example.com",
  fetchedAt: "2026-05-11T00:00:00Z",
  promptVersion: "test-v1",
  extractor: "point-partner",
  geminiModel: "gemini-2.5-flash",
  ...overrides,
});

describe("isFailedExtraction", () => {
  it("notes 無しは成功扱い", () => {
    expect(isFailedExtraction(baseSource({}))).toBe(false);
  });
  it("could not be fetched で失敗扱い", () => {
    expect(
      isFailedExtraction(
        baseSource({ notes: "Source URL could not be fetched." }),
      ),
    ).toBe(true);
  });
  it("Unable to extract で失敗扱い", () => {
    expect(
      isFailedExtraction(
        baseSource({ notes: "Unable to extract any information" }),
      ),
    ).toBe(true);
  });
  it("取得できませんでした で失敗扱い", () => {
    expect(
      isFailedExtraction(baseSource({ notes: "ページが取得できませんでした" })),
    ).toBe(true);
  });
});

describe("proposeStores", () => {
  it("新規 store は addRecord として提案される", () => {
    const data = baseSource({
      stores: [
        {
          storeId: "new-store",
          name: "新店舗",
          category: "飲食",
          evidenceQuote: "明示的な引用",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStores(data, emptySeed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("addRecord");
    expect(ps[0].reviewReason).toBeUndefined();
  });

  it("既存 ID と衝突したら idCollision", () => {
    const data = baseSource({
      stores: [
        {
          storeId: "existing",
          name: "別名",
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const seed: SeedShape = {
      ...emptySeed,
      stores: [{ id: "existing", name: "既存", category: "飲食" }],
    };
    const ps = proposeStores(data, seed);
    expect(ps[0].reviewReason).toBe("idCollision");
  });

  it("低 confidence は lowConfidence", () => {
    const data = baseSource({
      stores: [
        {
          storeId: "x",
          name: "y",
          evidenceQuote: "x",
          explicitness: 0.5,
          ambiguity: 0.3, // → 0.5 * 0.7 = 0.35
        },
      ],
    });
    const ps = proposeStores(data, emptySeed);
    expect(ps[0].reviewReason).toBe("lowConfidence");
  });

  it("Policy B: 金融カテゴリは excludedCategory", () => {
    const data = baseSource({
      stores: [
        {
          storeId: "some-bank",
          name: "Some銀行",
          category: "金融",
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStores(data, emptySeed);
    expect(ps[0].reviewReason).toBe("excludedCategory");
  });

  it("Policy B: ギャンブル/保険/医療/葬儀/ネットサービス/サービス/その他 すべて除外", () => {
    const excluded = [
      "ギャンブル",
      "保険",
      "医療",
      "葬儀",
      "ネットサービス",
      "サービス",
      "その他",
      "不動産・住宅",
    ];
    for (const cat of excluded) {
      const data = baseSource({
        stores: [
          {
            storeId: `id-${cat}`,
            name: `name-${cat}`,
            category: cat,
            evidenceQuote: "x",
            explicitness: 0.95,
            ambiguity: 0.05,
          },
        ],
      });
      const ps = proposeStores(data, emptySeed);
      expect(ps[0].reviewReason, cat).toBe("excludedCategory");
    }
  });

  it("Policy B: 通常カテゴリは auto (excludedCategory 不発火)", () => {
    const data = baseSource({
      stores: [
        {
          storeId: "ok-store",
          name: "OK店",
          category: "飲食",
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStores(data, emptySeed);
    expect(ps[0].reviewReason).toBeUndefined();
  });

  it("userBlocked: seed-blocklist にある storeId は強制 review", () => {
    // 'ana' は seed-blocklist にある (A.店舗じゃない)
    const data = baseSource({
      stores: [
        {
          storeId: "ana",
          name: "ANA",
          category: "交通",
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStores(data, emptySeed);
    expect(ps[0].reviewReason).toBe("userBlocked");
  });

  it("category alias: 全部の旧名が新名に正規化される", () => {
    const cases: Array<[string, string]> = [
      ["鉄道・交通", "交通"],
      ["本・電子書籍・新聞", "書店"],
      ["電子書籍", "書店"],
      ["書籍/ゲーム", "書店"],
      ["ネット買取", "買取"],
      ["リサイクル/買取", "買取"],
      ["エンターテイメント", "エンタメ・チケット"],
    ];
    for (const [oldCat, newCat] of cases) {
      const data = baseSource({
        stores: [
          {
            storeId: `test-${oldCat}`,
            name: `テスト ${oldCat}`,
            category: oldCat,
            evidenceQuote: "x",
            explicitness: 0.95,
            ambiguity: 0.05,
          },
        ],
      });
      const ps = proposeStores(data, emptySeed);
      expect(
        (ps[0] as { record: { category: string } }).record.category,
        oldCat,
      ).toBe(newCat);
    }
  });

  it("userBlocked は excludedCategory より優先 (順序確認)", () => {
    // blocked かつ excluded カテゴリ
    const data = baseSource({
      stores: [
        {
          storeId: "telasa",
          name: "TELASA",
          category: "ネットサービス", // EXCLUDED にも該当
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStores(data, emptySeed);
    expect(ps[0].reviewReason).toBe("userBlocked");
  });
});

describe("proposeStoreRules", () => {
  it("新規ルールは addRecord", () => {
    const data = baseSource({
      storeRules: [
        {
          cardId: "smbc-v",
          storeId: "lawson",
          rate: 0.07,
          currencyId: "v-pt",
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStoreRules(data, emptySeed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("addRecord");
  });

  it("既存ルールの rate 変動 (微小) は auto", () => {
    const seed: SeedShape = {
      ...emptySeed,
      rules: [
        {
          id: "r1",
          cardId: "smbc-v",
          storeId: "lawson",
          rate: 0.07,
          currencyId: "v-pt",
        },
      ],
    };
    const data = baseSource({
      storeRules: [
        {
          cardId: "smbc-v",
          storeId: "lawson",
          rate: 0.075, // +0.5pp, ratio 1.07x → 両方OK
          currencyId: "v-pt",
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStoreRules(data, seed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("updateField");
    expect(ps[0].reviewReason).toBeUndefined(); // auto
  });

  it("大幅な rate 変動 (1% → 50%) は要レビュー (pp 超過)", () => {
    const seed: SeedShape = {
      ...emptySeed,
      rules: [
        { id: "r1", cardId: "c", storeId: "s", rate: 0.01, currencyId: "p" },
      ],
    };
    const data = baseSource({
      storeRules: [
        {
          cardId: "c",
          storeId: "s",
          rate: 0.5,
          currencyId: "p",
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStoreRules(data, seed);
    expect(ps[0].reviewReason).toBe("rateDeltaTooLarge");
  });

  it("通貨変更 (currencyId) は referenceChange", () => {
    const seed: SeedShape = {
      ...emptySeed,
      rules: [
        { id: "r1", cardId: "c", storeId: "s", rate: 0.01, currencyId: "old" },
      ],
    };
    const data = baseSource({
      storeRules: [
        {
          cardId: "c",
          storeId: "s",
          rate: 0.01,
          currencyId: "new",
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeStoreRules(data, seed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("referenceChange");
    expect(ps[0].reviewReason).toBe("referenceChange");
  });
});

describe("proposeCategoryRules", () => {
  it("新規カテゴリルール", () => {
    const data = baseSource({
      categoryRules: [
        {
          cardId: "jal-suica",
          category: "JAL特約店",
          rate: 0.02,
          currencyId: "jal-mile",
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeCategoryRules(data, emptySeed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("addRecord");
  });
});

describe("proposeCards / proposeLoyaltyRules / proposePaymentApps", () => {
  it("既存 cardId に defaultRate 変動: auto", () => {
    const seed: SeedShape = {
      ...emptySeed,
      cards: [
        {
          id: "jal-suica",
          name: "JALカードSuica",
          defaultRate: 0.01,
          defaultCurrencyId: "jal-mile",
        },
      ],
    };
    const data = baseSource({
      cards: [
        {
          cardId: "jal-suica",
          defaultRate: 0.012, // +0.2pp, 1.2x → ok
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeCards(data, seed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("updateField");
    expect(ps[0].reviewReason).toBeUndefined();
  });

  it("新規 loyaltyRule は addRecord", () => {
    const data = baseSource({
      loyaltyRules: [
        {
          pointCardId: "rakuten-pointcard",
          storeId: "kura-sushi",
          rate: 0.005,
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeLoyaltyRules(data, emptySeed);
    expect(ps[0].type).toBe("addRecord");
  });

  it("paymentApp の chargeBased 変更は要レビュー", () => {
    const seed: SeedShape = {
      ...emptySeed,
      paymentApps: [
        { id: "pa-foo", name: "FooPay", chargeBased: false },
      ],
    };
    const data = baseSource({
      paymentApps: [
        {
          paymentAppId: "pa-foo",
          chargeBased: true,
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePaymentApps(data, seed);
    expect(ps).toHaveLength(1);
    expect(ps[0].reviewReason).toBe("referenceChange");
  });
});

describe("applyCategoryCap", () => {
  const makeStore = (id: string, category: string): Proposal => ({
    type: "addRecord",
    collection: "stores",
    record: { id, name: id, category },
    sourceId: "s",
    confidence: 0.95,
    evidence: {
      evidenceQuote: "x",
      explicitness: 0.95,
      ambiguity: 0.05,
    },
  });

  it("category 別に top N に絞る", () => {
    const props: Proposal[] = [
      makeStore("foo-1", "飲食"),
      makeStore("foo-2", "飲食"),
      makeStore("foo-3", "飲食"),
      makeStore("foo-4", "飲食"),
      makeStore("bar-1", "ファッション"),
      makeStore("bar-2", "ファッション"),
    ];
    const { kept, deferred } = applyCategoryCap(props, 2);
    expect(kept).toHaveLength(4); // 飲食 2 + ファッション 2
    expect(deferred).toHaveLength(2); // 飲食 の foo-3, foo-4
    expect(deferred.every((d) => (d as { record: { category: string } }).record.category === "飲食")).toBe(true);
  });

  it("cap より少ない時は全件 kept", () => {
    const props: Proposal[] = [
      makeStore("a", "飲食"),
      makeStore("b", "ファッション"),
    ];
    const { kept, deferred } = applyCategoryCap(props, 10);
    expect(kept).toHaveLength(2);
    expect(deferred).toHaveLength(0);
  });

  it("stores 以外の proposal は cap 対象外", () => {
    const props: Proposal[] = [
      makeStore("foo", "飲食"),
      {
        type: "updateField",
        collection: "rules",
        id: "r1",
        field: "rate",
        from: 0.01,
        to: 0.02,
        sourceId: "s",
        confidence: 0.95,
        evidence: {
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      },
    ];
    const { kept, deferred } = applyCategoryCap(props, 0); // cap=0 でも non-stores は通る
    expect(kept).toHaveLength(1); // updateField のみ
    expect(deferred).toHaveLength(1); // store は cap=0 で先送り
  });

  it("storeId 昇順で安定的に top N が決まる", () => {
    const props: Proposal[] = [
      makeStore("z-last", "飲食"),
      makeStore("a-first", "飲食"),
      makeStore("m-mid", "飲食"),
    ];
    const { kept } = applyCategoryCap(props, 2);
    const ids = kept.map((p) =>
      String((p as { record: { id: string } }).record.id),
    );
    expect(ids).toContain("a-first");
    expect(ids).toContain("m-mid");
    expect(ids).not.toContain("z-last");
  });
});

describe("dedupeAcrossProposals", () => {
  const makeStore = (id: string, name: string): Proposal => ({
    type: "addRecord",
    collection: "stores",
    record: { id, name, category: "飲食" },
    sourceId: "src",
    confidence: 0.95,
    evidence: { evidenceQuote: "x", explicitness: 0.95, ambiguity: 0.05 },
  });

  it("同 id の重複は 2 件目を idCollision に格下げ", () => {
    const props: Proposal[] = [
      makeStore("shabu-yo", "しゃぶ葉"),
      makeStore("shabu-yo", "しゃぶ葉 (別ソース)"),
    ];
    const { proposals, collisions } = dedupeAcrossProposals(props);
    expect(collisions).toBe(1);
    expect(proposals[0].reviewReason).toBeUndefined();
    expect(proposals[1].reviewReason).toBe("idCollision");
  });

  it("同 name で id 違いの重複も idCollision に格下げ", () => {
    const props: Proposal[] = [
      makeStore("lawson-store100", "ローソンストア100"),
      makeStore("lawson-store-100", "ローソンストア100"),
    ];
    const { proposals, collisions } = dedupeAcrossProposals(props);
    expect(collisions).toBe(1);
    expect(proposals[0].reviewReason).toBeUndefined();
    expect(proposals[1].reviewReason).toBe("idCollision");
  });

  it("3 件以上の連続重複も全部 idCollision に", () => {
    const props: Proposal[] = [
      makeStore("a", "Same"),
      makeStore("b", "Same"),
      makeStore("c", "Same"),
    ];
    const { proposals, collisions } = dedupeAcrossProposals(props);
    expect(collisions).toBe(2);
    expect(proposals[0].reviewReason).toBeUndefined();
    expect(proposals[1].reviewReason).toBe("idCollision");
    expect(proposals[2].reviewReason).toBe("idCollision");
  });

  it("addRecord/stores 以外は触らない", () => {
    const props: Proposal[] = [
      makeStore("a", "店A"),
      {
        type: "updateField",
        collection: "rules",
        id: "r1",
        field: "rate",
        from: 0.01,
        to: 0.02,
        sourceId: "x",
        confidence: 0.95,
        evidence: { evidenceQuote: "x", explicitness: 1, ambiguity: 0 },
      },
    ];
    const { proposals, collisions } = dedupeAcrossProposals(props);
    expect(collisions).toBe(0);
    expect(proposals[1].type).toBe("updateField");
    expect(proposals[1].reviewReason).toBeUndefined();
  });

  it("既に idCollision の proposal も判定対象 (上書きされない)", () => {
    const a = makeStore("x", "店X");
    const b = makeStore("y", "別店");
    const { proposals, collisions } = dedupeAcrossProposals([a, b]);
    expect(collisions).toBe(0);
    expect(proposals[0].reviewReason).toBeUndefined();
    expect(proposals[1].reviewReason).toBeUndefined();
  });
});
