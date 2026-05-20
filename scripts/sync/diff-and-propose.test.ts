import { describe, it, expect } from "vitest";
import type { SeedShape } from "../../src/domain/mergeSeed";
import {
  applyCategoryCap,
  dedupeAcrossProposals,
  isFailedExtraction,
  proposeCards,
  proposeJalTokuyakuMemberships,
  proposeLoyaltyRules,
  proposeMemberships,
  proposePaymentApps,
  proposePrograms,
  proposeStores,
} from "./diff-and-propose";
import {
  deriveLoyaltyProgramId,
  rateToProgramSlug,
} from "./propose-helpers";
import type { ExtractedSource, Proposal } from "./types";

// テスト用の最小 SeedShape
const emptySeed: SeedShape = {
  cards: [],
  currencies: [],
  stores: [],
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

  // 「Policy B: 金融カテゴリ excludedCategory」は単体ケース。
  // 下のパラメタライズドテスト (金融 / ギャンブル / 保険 / 医療 / 葬儀 / ネット
  // サービス / サービス / その他 / 不動産・住宅) で全カテゴリを網羅するため統合。
  it("Policy B: 金融/ギャンブル/保険/医療/葬儀/ネットサービス/サービス/その他/不動産・住宅 すべて除外", () => {
    const excluded = [
      "金融",
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

  it("PR-D2a: 未存在 rate バケツ → 新規 program(idCollision) + membership", () => {
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
    expect(ps).toHaveLength(2);
    const prog = ps.find((p) => p.collection === "programs");
    const mem = ps.find((p) => p.collection === "memberships");
    expect(prog?.type).toBe("addRecord");
    // 決定論 slug 規約: prog-{pointCardId}-{rate%}pc
    expect((prog as { record: { id: string } }).record.id).toBe(
      "prog-rakuten-pointcard-0.5pc",
    );
    // 新規 program はライブ計算に効くため必ず needsReview
    expect(prog?.reviewReason).toBe("idCollision");
    expect(mem?.type).toBe("addRecord");
    expect((mem as { record: { programId: string; storeId: string } }).record)
      .toEqual({ programId: "prog-rakuten-pointcard-0.5pc", storeId: "kura-sushi" });
    // clean・高 confidence の membership は auto 可 (reviewReason なし)
    expect(mem?.reviewReason).toBeUndefined();
  });

  it("PR-D2a: 既存 rate バケツ program あり → membership のみ (program 重複なし)", () => {
    const seed: SeedShape = {
      ...emptySeed,
      pointCards: [
        { id: "rakuten-pointcard", name: "楽天ポイントカード", currencyId: "rakuten-pt" },
      ],
      programs: [
        {
          id: "prog-rakuten-pointcard-0.5pc",
          name: "楽天ポイントカード提示 0.5%",
          pointCardId: "rakuten-pointcard",
          rate: 0.005,
          currencyId: "rakuten-pt",
          bonusType: "primary",
        },
      ],
      memberships: [],
    };
    const data = baseSource({
      loyaltyRules: [
        {
          pointCardId: "rakuten-pointcard",
          storeId: "kura-sushi",
          rate: 0.005,
          evidenceQuote: "明示 0.5%",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeLoyaltyRules(data, seed);
    expect(ps).toHaveLength(1);
    expect(ps[0].collection).toBe("memberships");
    expect(ps[0].reviewReason).toBeUndefined();
  });

  it("PR-D2a: 既存 membership は重複提案しない", () => {
    const seed: SeedShape = {
      ...emptySeed,
      pointCards: [
        { id: "rakuten-pointcard", name: "楽天ポイントカード", currencyId: "rakuten-pt" },
      ],
      programs: [
        {
          id: "prog-rakuten-pointcard-0.5pc",
          name: "x",
          pointCardId: "rakuten-pointcard",
          rate: 0.005,
          currencyId: "rakuten-pt",
          bonusType: "primary",
        },
      ],
      memberships: [
        { programId: "prog-rakuten-pointcard-0.5pc", storeId: "kura-sushi" },
      ],
    };
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
    expect(proposeLoyaltyRules(data, seed)).toEqual([]);
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

describe("rate=0 guard: zeroOrInvalidRate", () => {
  it("loyaltyRule rate=0 → reviewReason zeroOrInvalidRate", () => {
    const data = baseSource({
      loyaltyRules: [
        {
          pointCardId: "d-point",
          storeId: "some-store",
          rate: 0,
          evidenceQuote: "dポイント加盟店",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeLoyaltyRules(data, emptySeed);
    // rate 不正 → 迷子 membership を作らず program 1件で可視化 (auto 不可)
    expect(ps).toHaveLength(1);
    expect(ps[0].collection).toBe("programs");
    expect(ps[0].reviewReason).toBe("zeroOrInvalidRate");
  });

  it("loyaltyRule rate=0.005 → membership は reviewReason なし (正常抽出)", () => {
    const data = baseSource({
      loyaltyRules: [
        {
          pointCardId: "d-point",
          storeId: "some-store",
          rate: 0.005,
          evidenceQuote: "0.5%還元",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeLoyaltyRules(data, emptySeed);
    // 未存在バケツなので program(idCollision) + membership(clean)
    const mem = ps.find((p) => p.collection === "memberships");
    expect(mem).toBeDefined();
    expect(mem?.reviewReason).toBeUndefined();
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
        collection: "cards",
        id: "c1",
        field: "defaultRate",
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
        collection: "cards",
        id: "c1",
        field: "defaultRate",
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

describe("proposePrograms (PR-D1)", () => {
  it("programs 無しは空配列", () => {
    expect(proposePrograms(baseSource({}), emptySeed)).toEqual([]);
  });

  it("新規 program は addRecord + base idCollision (ライブ評価系のため要レビュー)", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-jre-camp-x",
          name: "JREキャンペX",
          pointCardId: "jre-pointcard",
          rate: 0.03,
          currencyId: "jre",
          bonusType: "addOn",
          validFrom: "2026-06-01",
          validTo: "2026-06-30",
          evidenceQuote: "期間 2026年6月1日〜6月30日 対象店で3%",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePrograms(data, emptySeed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("addRecord");
    expect(ps[0].collection).toBe("programs");
    expect(ps[0].reviewReason).toBe("idCollision");
    expect(
      (ps[0] as { record: { validTo: string } }).record.validTo,
    ).toBe("2026-06-30");
  });

  it("rate=0 の program は zeroOrInvalidRate", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-bad",
          rate: 0,
          currencyId: "jre",
          evidenceQuote: "JRE POINT 加盟",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePrograms(data, emptySeed);
    expect(ps[0].reviewReason).toBe("zeroOrInvalidRate");
  });

  it("entryUrl は addRecord の record に伝播 (V5 新フィールド)", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-with-entry",
          name: "エントリー要キャンペーン",
          cardIds: ["sample-card"],
          rate: 0.02,
          currencyId: "jre",
          bonusType: "primary",
          entryUrl: "https://example.com/entry",
          officialUrl: "https://example.com/about",
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePrograms(data, emptySeed);
    expect(ps).toHaveLength(1);
    const record = (ps[0] as { record: Record<string, unknown> }).record;
    expect(record.entryUrl).toBe("https://example.com/entry");
    expect(record.officialUrl).toBe("https://example.com/about");
  });

  it("既存 program の rate 変動は updateField", () => {
    const seed: SeedShape = {
      ...emptySeed,
      programs: [
        {
          id: "prog-existing",
          name: "既存",
          pointCardId: "jre-pointcard",
          rate: 0.01,
          currencyId: "jre",
        },
      ],
    };
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-existing",
          rate: 0.012, // +0.2pp, 1.2x → auto
          currencyId: "jre",
          evidenceQuote: "明示",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePrograms(data, seed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("updateField");
    expect(ps[0].reviewReason).toBeUndefined();
  });
});

describe("proposeMemberships (PR-D1)", () => {
  it("memberships 無しは空配列", () => {
    expect(proposeMemberships(baseSource({}), emptySeed)).toEqual([]);
  });

  it("新規 membership は addRecord/memberships", () => {
    const data = baseSource({
      extractor: "campaign",
      memberships: [
        {
          programId: "prog-jre-camp-x",
          storeId: "newdays",
          evidenceQuote: "対象店舗 NewDays",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, emptySeed);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("addRecord");
    expect(ps[0].collection).toBe("memberships");
    expect(ps[0].reviewReason).toBeUndefined();
  });

  it("既存 (programId+storeId 一致) membership は提案しない", () => {
    const seed: SeedShape = {
      ...emptySeed,
      memberships: [{ programId: "prog-a", storeId: "store-a" }],
    };
    const data = baseSource({
      extractor: "campaign",
      memberships: [
        {
          programId: "prog-a",
          storeId: "store-a",
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    expect(proposeMemberships(data, seed)).toEqual([]);
  });
});

describe("rateToProgramSlug / deriveLoyaltyProgramId (PR-D2a 決定論採番)", () => {
  // seed の既存 10 program で確認した規約を固定するベクタ。
  // ここが seed と 1 文字でもズレると迷子 membership が発生するため最重要。
  it.each([
    [0.005, "0.5pc"],
    [0.01, "1pc"],
    [0.015, "1.5pc"],
    [0.02, "2pc"],
    [0.025, "2.5pc"],
    [0.1, "10pc"],
  ] as const)("rate %s → slug %s", (rate, slug) => {
    expect(rateToProgramSlug(rate)).toBe(slug);
  });

  it.each([0, -0.01, NaN, Infinity] as const)(
    "不正 rate %s は null",
    (rate) => {
      expect(rateToProgramSlug(rate)).toBeNull();
      expect(deriveLoyaltyProgramId("rakuten-pointcard", rate)).toBeNull();
    },
  );

  it("seed の既存 program id と一致する (回帰固定)", () => {
    expect(deriveLoyaltyProgramId("rakuten-pointcard", 0.005)).toBe(
      "prog-rakuten-pointcard-0.5pc",
    );
    expect(deriveLoyaltyProgramId("rakuten-pointcard", 0.01)).toBe(
      "prog-rakuten-pointcard-1pc",
    );
    expect(deriveLoyaltyProgramId("jre-pointcard", 0.005)).toBe(
      "prog-jre-pointcard-0.5pc",
    );
    expect(deriveLoyaltyProgramId("nanaco-card", 0.01)).toBe(
      "prog-nanaco-card-1pc",
    );
  });
});

describe("proposeJalTokuyakuMemberships (PR-D2b)", () => {
  const jalSeed: SeedShape = {
    ...emptySeed,
    programs: [
      {
        id: "prog-jal-tokuyaku",
        name: "JALカード特約店",
        cardIds: ["jal-suica", "jal-card"],
        rate: 0.02,
        currencyId: "jal-mile",
        bonusType: "primary",
      },
    ],
    memberships: [],
  };
  const jalStore = (storeId: string) => ({
    storeId,
    name: storeId,
    category: "飲食",
    evidenceQuote: "JALカード特約店",
    explicitness: 0.95,
    ambiguity: 0.05,
  });

  it("jal 以外の extractor は対象外 ([])", () => {
    const data = baseSource({
      extractor: "point-partner",
      stores: [jalStore("kura-sushi")],
    });
    expect(proposeJalTokuyakuMemberships(data, jalSeed)).toEqual([]);
  });

  it("新規特約店 store → prog-jal-tokuyaku への membership (clean=auto)", () => {
    const data = baseSource({
      extractor: "jal-tokuyaku",
      categoryRules: [
        {
          cardId: "jal-suica",
          category: "JAL特約店",
          rate: 0.02,
          currencyId: "jal-mile",
          evidenceQuote: "2倍",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
      stores: [jalStore("royal-host"), jalStore("orix-rentacar")],
    });
    const ps = proposeJalTokuyakuMemberships(data, jalSeed);
    expect(ps).toHaveLength(2);
    expect(ps.every((p) => p.collection === "memberships")).toBe(true);
    expect(
      ps.map(
        (p) => (p as { record: { programId: string } }).record.programId,
      ),
    ).toEqual(["prog-jal-tokuyaku", "prog-jal-tokuyaku"]);
    expect(ps.every((p) => p.reviewReason === undefined)).toBe(true);
  });

  it("迷子防止: prog-jal-tokuyaku が seed に無ければ [] ", () => {
    const data = baseSource({
      extractor: "jal-tokuyaku",
      stores: [jalStore("royal-host")],
    });
    expect(proposeJalTokuyakuMemberships(data, emptySeed)).toEqual([]);
  });

  it("基本レート乖離 (categoryRule 1.5% ≠ program 2%) → 一括リンクしない", () => {
    const data = baseSource({
      extractor: "jal-tokuyaku",
      categoryRules: [
        {
          cardId: "jal-suica",
          category: "JAL特約店",
          rate: 0.015,
          currencyId: "jal-mile",
          evidenceQuote: "x",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
      stores: [jalStore("royal-host")],
    });
    expect(proposeJalTokuyakuMemberships(data, jalSeed)).toEqual([]);
  });

  it("例外レート店 (storeRules rate≠2%) は対象外", () => {
    const data = baseSource({
      extractor: "jal-tokuyaku",
      storeRules: [
        {
          cardId: "jal-suica",
          storeId: "eneos",
          rate: 0.01,
          currencyId: "jal-mile",
          evidenceQuote: "ENEOS 1%",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
      stores: [jalStore("eneos"), jalStore("royal-host")],
    });
    const ps = proposeJalTokuyakuMemberships(data, jalSeed);
    expect(ps).toHaveLength(1);
    expect(
      (ps[0] as { record: { storeId: string } }).record.storeId,
    ).toBe("royal-host");
  });

  it("既存 membership は重複提案しない", () => {
    const seed: SeedShape = {
      ...jalSeed,
      memberships: [
        { programId: "prog-jal-tokuyaku", storeId: "royal-host" },
      ],
    };
    const data = baseSource({
      extractor: "jal-tokuyaku",
      stores: [jalStore("royal-host")],
    });
    expect(proposeJalTokuyakuMemberships(data, seed)).toEqual([]);
  });
});
