import { describe, it, expect } from "vitest";
import type { SeedShape } from "../../src/domain/mergeSeed";
import {
  applyCategoryCap,
  dedupeAcrossProposals,
  demoteChildlessMemberStorePrograms,
  downgradeOrphanMemberships,
  isFailedExtraction,
  promoteChainStoreAutoMerge,
  proposeCards,
  proposeJalTokuyakuMemberships,
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
  it("新規 store は addRecord として提案される、ただし PR #56 ポリシーで storeAdditionsDisabled needsReview に降格", () => {
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
    expect(ps[0].reviewReason).toBe("storeAdditionsDisabled");
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

  it("Policy B: 通常カテゴリは excludedCategory 不発火、PR #56 で storeAdditionsDisabled に降格", () => {
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
    expect(ps[0].reviewReason).toBe("storeAdditionsDisabled");
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

describe("proposeCards / proposePaymentApps", () => {
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

  // v6: scope の derive-on-missing (extracted に scope が無ければ memberships 有無から導出)。
  it("scope 欠落 + memberships に programId あり → member-stores を補完", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-derive-member",
          name: "加盟店キャンペ",
          cardIds: ["sample-card"],
          rate: 0.02,
          currencyId: "jre",
          bonusType: "primary",
          evidenceQuote: "対象店で2%",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
      memberships: [
        {
          programId: "prog-derive-member",
          storeId: "s1",
          evidenceQuote: "s1 が対象",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePrograms(data, emptySeed);
    const record = (ps[0] as { record: Record<string, unknown> }).record;
    expect(record.scope).toBe("member-stores");
  });

  it("scope 欠落 + memberships に programId 無し → all-stores を補完", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-derive-global",
          name: "全店キャンペ",
          paymentAppId: "pa-d-pay",
          rate: 0.01,
          currencyId: "d-pt",
          bonusType: "primary",
          evidenceQuote: "全店で1%",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
      memberships: [], // 当該 programId の membership 無し
    });
    const ps = proposePrograms(data, emptySeed);
    const record = (ps[0] as { record: Record<string, unknown> }).record;
    expect(record.scope).toBe("all-stores");
  });

  it("scope 明示あり → derive せずそのまま尊重 (membership 有無に依らない)", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-explicit-scope",
          name: "明示 scope",
          cardIds: ["sample-card"],
          scope: "member-stores",
          rate: 0.02,
          currencyId: "jre",
          bonusType: "primary",
          evidenceQuote: "対象店で2%",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
      memberships: [], // membership 無しでも explicit の member-stores を維持
    });
    const ps = proposePrograms(data, emptySeed);
    const record = (ps[0] as { record: Record<string, unknown> }).record;
    expect(record.scope).toBe("member-stores");
  });

  it("recurringWeekdays は addRecord の record に伝播する (C-6 曜日キャンペーン)", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-sunday-camp",
          name: "毎週日曜 +3%",
          paymentAppId: "pa-d-pay",
          rate: 0.03,
          currencyId: "d-pt",
          validFrom: "2026-06-01",
          recurringWeekdays: [0],
          evidenceQuote: "2026年6月1日から、期間中の毎週日曜は対象店で+3%",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePrograms(data, emptySeed);
    expect(ps).toHaveLength(1);
    const record = (ps[0] as { record: Record<string, unknown> }).record;
    expect(record.recurringWeekdays).toEqual([0]);
  });

  it("既存 program の rate 変動は updateField", () => {
    const seed: SeedShape = {
      ...emptySeed,
      programs: [
        {
          id: "prog-existing",
          name: "既存",
          scope: "member-stores",
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

  // ─── Phase 4 (B-2): 既存 program の期間変更検知 ───
  describe("期間変更 (periodChange)", () => {
    const seedWithCampaign: SeedShape = {
      ...emptySeed,
      programs: [
        {
          id: "prog-camp",
          name: "既存キャンペーン",
          scope: "member-stores",
          pointCardId: "jre-pointcard",
          rate: 0.03,
          currencyId: "jre",
          validFrom: "2026-06-01",
          validTo: "2026-06-30",
        },
      ],
    };

    it("validTo の延長は updateField + periodChange (必ず要レビュー)", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-camp",
            rate: 0.03,
            currencyId: "jre",
            validFrom: "2026-06-01",
            validTo: "2026-07-31", // 1 ヶ月延長
            evidenceQuote: "期間延長: 2026年7月31日まで",
            explicitness: 0.95,
            ambiguity: 0.05,
          },
        ],
      });
      const ps = proposePrograms(data, seedWithCampaign);
      expect(ps).toHaveLength(1);
      const up = ps[0] as {
        type: string;
        field: string;
        from: unknown;
        to: unknown;
        reviewReason?: string;
      };
      expect(up.type).toBe("updateField");
      expect(up.field).toBe("validTo");
      expect(up.from).toBe("2026-06-30");
      expect(up.to).toBe("2026-07-31");
      expect(up.reviewReason).toBe("periodChange");
    });

    it("validFrom / validTo 両方変更は 2 件の updateField", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-camp",
            rate: 0.03,
            currencyId: "jre",
            validFrom: "2026-07-01",
            validTo: "2026-07-31",
            evidenceQuote: "期間: 2026年7月1日〜7月31日",
            explicitness: 0.95,
            ambiguity: 0.05,
          },
        ],
      });
      const ps = proposePrograms(data, seedWithCampaign);
      expect(ps.map((p) => (p as { field?: string }).field).sort()).toEqual([
        "validFrom",
        "validTo",
      ]);
      expect(ps.every((p) => p.reviewReason === "periodChange")).toBe(true);
    });

    it("evidence に日付根拠が無い期間変更は unsupportedDateClaim を優先", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-camp",
            rate: 0.03,
            currencyId: "jre",
            validFrom: "2026-06-01",
            validTo: "2026-07-31",
            evidenceQuote: "対象店で3%還元", // 日付の逐語根拠なし
            explicitness: 0.95,
            ambiguity: 0.05,
          },
        ],
      });
      const ps = proposePrograms(data, seedWithCampaign);
      expect(ps).toHaveLength(1);
      expect(ps[0].reviewReason).toBe("unsupportedDateClaim");
    });

    it("抽出側に期間が無い (省略) 場合は変更提案しない (省略 = 言及なし)", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-camp",
            rate: 0.03,
            currencyId: "jre",
            evidenceQuote: "対象店で3%",
            explicitness: 0.95,
            ambiguity: 0.05,
          },
        ],
      });
      expect(proposePrograms(data, seedWithCampaign)).toHaveLength(0);
    });

    it("期間が同値なら提案なし", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-camp",
            rate: 0.03,
            currencyId: "jre",
            validFrom: "2026-06-01",
            validTo: "2026-06-30",
            evidenceQuote: "期間 2026年6月1日〜6月30日 3%",
            explicitness: 0.95,
            ambiguity: 0.05,
          },
        ],
      });
      expect(proposePrograms(data, seedWithCampaign)).toHaveLength(0);
    });
  });

  // ─── PR #60 (B): campaign 高品質 auto-merge ───
  describe("campaign auto-merge (PR #60)", () => {
    // 全条件を満たした seed (pointCard + paymentApp + currency が揃ったテスト用)
    const richSeed: SeedShape = {
      ...emptySeed,
      pointCards: [
        { id: "jre-pointcard", name: "JRE POINTカード", currencyId: "jre" },
      ],
      paymentApps: [{ id: "pa-d-pay", name: "d払い" }],
      cards: [
        { id: "smbc-v", name: "三井住友カード", defaultRate: 0.005, defaultCurrencyId: "v-pt" },
      ],
      currencies: [
        { id: "jre", name: "JRE POINT", kind: "point" },
        { id: "d-pt", name: "dポイント", kind: "point" },
        { id: "v-pt", name: "Vポイント", kind: "point" },
      ],
    };

    const futureValidTo = "2099-12-31"; // 期限切れ防止用 (固定値)

    it("全条件パス: campaign extractor + 未来 validTo + 既存参照 + 高 confidence + lifestyle 無し → auto", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-jre-camp-newdays-future",
            name: "JRE POINT NewDays 3%還元キャンペーン",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            bonusType: "addOn",
            validFrom: "2026-06-01",
            validTo: futureValidTo,
            evidenceQuote: "キャンペーン期間：2026年6月1日〜2099年12月31日、NewDaysでJRE POINT提示で3%",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps).toHaveLength(1);
      expect(ps[0].reviewReason).toBeUndefined(); // ← auto-merge OK
    });

    it("ongoing-program extractor は除外 (lifestyle 系の入口を遮断)", () => {
      const data = baseSource({
        extractor: "ongoing-program", // ← campaign 以外
        programs: [
          {
            programId: "prog-ongoing-x",
            name: "常設プログラム",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            bonusType: "addOn",
            validTo: futureValidTo,
            evidenceQuote: "常設 3%、期間 2099年12月31日まで",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("validTo 無しは auto 不可", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-no-validto",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            evidenceQuote: "3%、期間 2099年12月31日まで",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("malformed 期間 (validFrom > validTo) は auto 不可 (B-5: 死にデータの混入防止)", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-malformed-period",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            validFrom: "2099-12-31", // validTo より後
            validTo: "2099-01-01",
            evidenceQuote: "期間 2099年1月1日〜2099年12月31日、3%",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("validTo が過去なら auto 不可 (既に終了)", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-expired",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            validTo: "2020-01-01",
            evidenceQuote: "期間 2020年1月1日まで、3%還元",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("rate > CAMPAIGN_AUTO_RATE_MAX (30%) なら auto 不可", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-toohigh",
            pointCardId: "jre-pointcard",
            rate: 0.5, // 50% は誤抽出疑い
            currencyId: "jre",
            validTo: futureValidTo,
            evidenceQuote: "50%還元、期間 2099年12月31日まで",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("confidence ≥ 0.90 (逐語根拠の健全 campaign) は auto 可 (閾値 0.95→0.90 緩和)", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-midconf",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            validTo: futureValidTo,
            evidenceQuote: "3%、期間 2099年12月31日まで",
            explicitness: 0.95, // 0.95 * (1 - 0.05) = 0.9025 ≥ 0.90 → auto
            ambiguity: 0.05,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBeUndefined(); // ← 旧 0.95 では idCollision だった
    });

    it("confidence < 0.90 なら auto 不可 (曖昧な抽出は従来どおり review)", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-lowconf",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            validTo: futureValidTo,
            evidenceQuote: "3%、期間 2099年12月31日まで",
            explicitness: 0.9, // 0.9 * (1 - 0.1) = 0.81 < 0.90
            ambiguity: 0.1,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("pointCardId が seed に存在しない → auto 不可", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-unknown-ref",
            pointCardId: "unknown-pointcard", // ← richSeed に居ない
            rate: 0.03,
            currencyId: "jre",
            validTo: futureValidTo,
            evidenceQuote: "3%、期間 2099年12月31日まで",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("lifestyle 系キーワードを含む program は auto 不可 (defense-in-depth)", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-lifestyle",
            name: "給与振込で +3%",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            validTo: futureValidTo,
            conditions: "給与振込口座を当行に指定すること",
            evidenceQuote: "給与振込で3%、期間 2099年12月31日まで",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("integrity issue (selfReportedExclusion) は auto より優先", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-self-excluded",
            pointCardId: "jre-pointcard",
            rate: 0.03,
            currencyId: "jre",
            validTo: futureValidTo,
            evidenceQuote: "対象外: このキャンペーンは記載なし", // ← selfReported pattern
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      // selfReportedExclusion / idCollision 等が優先される
      expect(ps[0].reviewReason).not.toBeUndefined();
    });

    it("cardIds 配列の 1 つでも未登録なら auto 不可", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-multi-card",
            cardIds: ["smbc-v", "unknown-card"], // ← 後者が未登録
            rate: 0.03,
            currencyId: "v-pt",
            validTo: futureValidTo,
            evidenceQuote: "3%、期間 2099年12月31日まで",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBe("idCollision");
    });

    it("paymentAppId 経由でも全条件 OK なら auto", () => {
      const data = baseSource({
        extractor: "campaign",
        programs: [
          {
            programId: "prog-d-pay-camp",
            name: "d払い 5% 還元",
            paymentAppId: "pa-d-pay",
            rate: 0.05,
            currencyId: "d-pt",
            validTo: futureValidTo,
            evidenceQuote: "d払いで5%、期間 2099/12/31 まで",
            explicitness: 1.0,
            ambiguity: 0.0,
          },
        ],
      });
      const ps = proposePrograms(data, richSeed);
      expect(ps[0].reviewReason).toBeUndefined();
    });
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

  it("#103 回帰: storeId=general への membership は pseudoStoreTarget で needsReview に降格", () => {
    const data = baseSource({
      extractor: "jcb-jpoint",
      memberships: [
        {
          programId: "prog-jcb-jpoint-20x",
          storeId: "general",
          evidenceQuote: "クレカ乗車 ポイント20倍",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, emptySeed);
    expect(ps).toHaveLength(1);
    expect(ps[0].reviewReason).toBe("pseudoStoreTarget");
  });

  it("通常 storeId (general 以外) は従来どおり auto (reviewReason なし)", () => {
    const data = baseSource({
      extractor: "jcb-jpoint",
      memberships: [
        {
          programId: "prog-jcb-jpoint-20x",
          storeId: "starbucks",
          evidenceQuote: "スターバックス J-POINT 20倍",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, emptySeed);
    expect(ps).toHaveLength(1);
    expect(ps[0].reviewReason).toBeUndefined();
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
        scope: "member-stores",
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

// ───────────────────────────────────────────────────────────────
// downgradeOrphanMemberships
// ───────────────────────────────────────────────────────────────

describe("downgradeOrphanMemberships", () => {
  const ev = { evidenceQuote: "x", explicitness: 1, ambiguity: 0 };
  // テストの簡潔さのため、デフォルトで「programId は existingPrograms に居る」前提。
  // program 側のテスト時には programId を明示する。
  const baseMembership = (storeId: string, programId = "prog-existing"): Proposal => ({
    type: "addRecord",
    collection: "memberships",
    record: { programId, storeId },
    sourceId: "src",
    confidence: 0.95,
    evidence: ev,
  });
  const baseStore = (id: string): Proposal => ({
    type: "addRecord",
    collection: "stores",
    record: { id, name: id, category: "コンビニ" },
    sourceId: "src",
    confidence: 0.95,
    evidence: ev,
  });
  const baseProgram = (id: string): Proposal => ({
    type: "addRecord",
    collection: "programs",
    record: { id, name: id, rate: 0.01, currencyId: "v-pt" },
    sourceId: "src",
    confidence: 0.95,
    evidence: ev,
  });
  const existingProgs = new Set(["prog-existing"]);

  // ─── store 側の整合性 ───
  it("既存 store + 既存 program を参照する membership は通過", () => {
    const { proposals, downgradedStore, downgradedProgram } = downgradeOrphanMemberships(
      [baseMembership("store-existing")],
      new Set(["store-existing"]),
      existingProgs,
    );
    expect(downgradedStore).toBe(0);
    expect(downgradedProgram).toBe(0);
    expect(proposals[0].reviewReason).toBeUndefined();
  });

  it("同 run の auto store を参照する membership は通過", () => {
    const { proposals, downgradedStore } = downgradeOrphanMemberships(
      [baseStore("store-new"), baseMembership("store-new")],
      new Set(),
      existingProgs,
    );
    expect(downgradedStore).toBe(0);
    expect(proposals[1].reviewReason).toBeUndefined();
  });

  it("seed にも auto にも無い store を参照する membership は missingStoreBody で降格", () => {
    const { proposals, downgradedStore } = downgradeOrphanMemberships(
      [baseMembership("store-orphan")],
      new Set(),
      existingProgs,
    );
    expect(downgradedStore).toBe(1);
    expect(proposals[0].reviewReason).toBe("missingStoreBody");
  });

  it("deferred (reviewReason 付き) の store は同 run auto に含めない", () => {
    const deferredStore: Proposal = {
      ...baseStore("store-deferred"),
      reviewReason: "excludedCategory",
    };
    const { proposals, downgradedStore } = downgradeOrphanMemberships(
      [deferredStore, baseMembership("store-deferred")],
      new Set(),
      existingProgs,
    );
    expect(downgradedStore).toBe(1);
    expect(proposals[1].reviewReason).toBe("missingStoreBody");
  });

  // ─── program 側の整合性 (PR #55 で追加) ───
  it("seed にも auto にも無い program を参照する membership は missingProgramBody で降格", () => {
    const { proposals, downgradedProgram } = downgradeOrphanMemberships(
      [baseMembership("store-existing", "prog-orphan")],
      new Set(["store-existing"]),
      new Set(), // 既存 program に prog-orphan は無い
    );
    expect(downgradedProgram).toBe(1);
    expect(proposals[0].reviewReason).toBe("missingProgramBody");
  });

  it("同 run の auto program を参照する membership は通過", () => {
    const { proposals, downgradedProgram } = downgradeOrphanMemberships(
      [
        baseProgram("prog-new"),
        baseMembership("store-existing", "prog-new"),
      ],
      new Set(["store-existing"]),
      new Set(), // 既存 program 0、ただし同 run auto に prog-new
    );
    expect(downgradedProgram).toBe(0);
    expect(proposals[1].reviewReason).toBeUndefined();
  });

  it("proposePrograms が idCollision を付けた program は同 run auto に含めない (membership は missingProgramBody)", () => {
    const reviewedProgram: Proposal = {
      ...baseProgram("prog-reviewed"),
      reviewReason: "idCollision",
    };
    const { proposals, downgradedProgram } = downgradeOrphanMemberships(
      [reviewedProgram, baseMembership("store-existing", "prog-reviewed")],
      new Set(["store-existing"]),
      new Set(),
    );
    expect(downgradedProgram).toBe(1);
    expect(proposals[1].reviewReason).toBe("missingProgramBody");
  });

  it("store と program 両方 orphan の場合は store 側を優先 (UX 影響大)", () => {
    const { proposals, downgradedStore, downgradedProgram } = downgradeOrphanMemberships(
      [baseMembership("store-orphan", "prog-orphan")],
      new Set(),
      new Set(),
    );
    expect(downgradedStore).toBe(1);
    expect(downgradedProgram).toBe(0);
    expect(proposals[0].reviewReason).toBe("missingStoreBody");
  });

  // ─── 共通: 他理由優先 + 非 membership ───
  it("既に他理由で降格済 membership は触らない (idCollision 等が優先される)", () => {
    const existing: Proposal = {
      ...baseMembership("store-orphan", "prog-orphan"),
      reviewReason: "idCollision",
    };
    const { proposals, downgradedStore, downgradedProgram } = downgradeOrphanMemberships(
      [existing],
      new Set(),
      new Set(),
    );
    expect(downgradedStore).toBe(0);
    expect(downgradedProgram).toBe(0);
    expect(proposals[0].reviewReason).toBe("idCollision");
  });

  it("memberships 以外の proposal はそのまま通す", () => {
    const storeProp = baseStore("store-x");
    const { proposals, downgradedStore, downgradedProgram } = downgradeOrphanMemberships(
      [storeProp],
      new Set(),
      new Set(),
    );
    expect(downgradedStore).toBe(0);
    expect(downgradedProgram).toBe(0);
    expect(proposals[0]).toBe(storeProp);
  });
});

// ───────────────────────────────────────────────────────────────
// demoteChildlessMemberStorePrograms (原子性ガード)
// ───────────────────────────────────────────────────────────────

describe("demoteChildlessMemberStorePrograms", () => {
  const ev = { evidenceQuote: "x", explicitness: 1, ambiguity: 0 };
  // auto (reviewReason 無し) の member-stores program addRecord。
  const memberStoreProgram = (
    id: string,
    reviewReason?: Proposal["reviewReason"],
  ): Proposal => ({
    type: "addRecord",
    collection: "programs",
    record: { id, name: id, scope: "member-stores", rate: 0.05, currencyId: "v-pt" },
    sourceId: "src",
    confidence: 0.95,
    evidence: ev,
    ...(reviewReason ? { reviewReason } : {}),
  });
  const allStoreProgram = (id: string): Proposal => ({
    type: "addRecord",
    collection: "programs",
    record: { id, name: id, scope: "all-stores", rate: 0.05, currencyId: "v-pt" },
    sourceId: "src",
    confidence: 0.95,
    evidence: ev,
  });
  const membership = (
    programId: string,
    storeId: string,
    reviewReason?: Proposal["reviewReason"],
  ): Proposal => ({
    type: "addRecord",
    collection: "memberships",
    record: { programId, storeId },
    sourceId: "src",
    confidence: 0.95,
    evidence: ev,
    ...(reviewReason ? { reviewReason } : {}),
  });

  // 木曜 run 29453709908 の再現: 新規 member-stores program は auto だが、
  // その membership が全て missingStoreBody で review 降格 → program 単独が死にデータ。
  it("回帰: membership 全件が review 降格した member-stores program は orphanedProgram に降格", () => {
    const { proposals, demoted } = demoteChildlessMemberStorePrograms(
      [
        memberStoreProgram("prog-paypay-korea-2026-07"),
        // orphan guard で missingStoreBody 降格済 (store が storeAdditionsDisabled)
        membership("prog-paypay-korea-2026-07", "store-korea-a", "missingStoreBody"),
        membership("prog-paypay-korea-2026-07", "store-korea-b", "missingStoreBody"),
      ],
      new Set(), // 既存 seed に当該 program の membership 無し
    );
    expect(demoted).toBe(1);
    expect(proposals[0].reviewReason).toBe("orphanedProgram");
    // membership 側は元の降格理由のまま (触らない)
    expect(proposals[1].reviewReason).toBe("missingStoreBody");
    expect(proposals[2].reviewReason).toBe("missingStoreBody");
  });

  // 正常系: program + membership 両方 auto → 両方そのまま。
  it("正常系: program も membership も auto なら降格しない", () => {
    const { proposals, demoted } = demoteChildlessMemberStorePrograms(
      [
        memberStoreProgram("prog-new"),
        membership("prog-new", "store-a"), // auto (reviewReason 無し)
      ],
      new Set(),
    );
    expect(demoted).toBe(0);
    expect(proposals[0].reviewReason).toBeUndefined();
  });

  // 既存 seed に membership がある programId は、同 run auto membership が無くても降格しない
  // (OR 条件の existing 側をテスト)。
  it("既存 seed に当該 program の membership があれば降格しない", () => {
    const { proposals, demoted } = demoteChildlessMemberStorePrograms(
      [
        memberStoreProgram("prog-has-seed-membership"),
        membership("prog-has-seed-membership", "store-a", "missingStoreBody"),
      ],
      new Set(["prog-has-seed-membership"]), // 既存 seed に membership あり
    );
    expect(demoted).toBe(0);
    expect(proposals[0].reviewReason).toBeUndefined();
  });

  // 既存 program (seed に membership あり) への新 membership 降格では program に影響なし。
  // 既存 program は addRecord proposal として現れないため、そもそも降格対象にならない。
  it("既存 program への新 membership 降格では program (proposal 非在) に影響なし", () => {
    const onlyMembership = membership("prog-existing", "store-a", "missingStoreBody");
    const { proposals, demoted } = demoteChildlessMemberStorePrograms(
      [onlyMembership],
      new Set(["prog-existing"]),
    );
    expect(demoted).toBe(0);
    expect(proposals[0]).toBe(onlyMembership);
  });

  // all-stores program は membership 0 でも自身で発火するので対象外。
  it("all-stores program は membership 0 でも降格しない", () => {
    const prog = allStoreProgram("prog-all");
    const { proposals, demoted } = demoteChildlessMemberStorePrograms(
      [prog],
      new Set(),
    );
    expect(demoted).toBe(0);
    expect(proposals[0]).toBe(prog);
  });

  // 既に他理由 (idCollision 等) で降格済の member-stores program は触らない。
  it("既に review 済の member-stores program は触らない", () => {
    const { proposals, demoted } = demoteChildlessMemberStorePrograms(
      [memberStoreProgram("prog-reviewed", "idCollision")],
      new Set(),
    );
    expect(demoted).toBe(0);
    expect(proposals[0].reviewReason).toBe("idCollision");
  });
});

// ───────────────────────────────────────────────────────────────
// promoteChainStoreAutoMerge (C-9、PR #56 部分解除)
// ───────────────────────────────────────────────────────────────

describe("promoteChainStoreAutoMerge", () => {
  const ev = { evidenceQuote: "x", explicitness: 1, ambiguity: 0 };
  const disabledStore = (id: string, name: string, category = "飲食"): Proposal => ({
    type: "addRecord",
    collection: "stores",
    record: { id, name, category },
    sourceId: "src",
    confidence: 0.95,
    evidence: ev,
    reviewReason: "storeAdditionsDisabled",
  });
  const campaignProgram = (id: string, validTo = "2030-12-31"): Proposal => ({
    type: "addRecord",
    collection: "programs",
    record: { id, name: id, rate: 0.05, currencyId: "paypay", validTo },
    sourceId: "src",
    confidence: 0.97,
    evidence: ev,
  });
  const membership = (storeId: string, programId: string): Proposal => ({
    type: "addRecord",
    collection: "memberships",
    record: { programId, storeId },
    sourceId: "src",
    confidence: 0.97,
    evidence: ev,
  });

  it("チェーン名 + 同 run campaign 参照 → auto に復帰", () => {
    const props = [
      disabledStore("store-mcd-shibuya", "マクドナルド 渋谷店"),
      campaignProgram("prog-paypay-mcd-2026"),
      membership("store-mcd-shibuya", "prog-paypay-mcd-2026"),
    ];
    const { proposals, promoted } = promoteChainStoreAutoMerge(props, {
      stores: [],
      cards: [], currencies: [], edges: [], pointCards: [], paymentApps: [],
    });
    expect(promoted).toBe(1);
    expect(proposals[0].reviewReason).toBeUndefined();
  });

  it("チェーン名でも campaign 参照なしなら 据え置き (storeAdditionsDisabled)", () => {
    const props = [disabledStore("store-mcd", "マクドナルド")];
    const { proposals, promoted } = promoteChainStoreAutoMerge(props, {
      stores: [],
      cards: [], currencies: [], edges: [], pointCards: [], paymentApps: [],
    });
    expect(promoted).toBe(0);
    expect(proposals[0].reviewReason).toBe("storeAdditionsDisabled");
  });

  it("campaign 参照あっても非チェーン (個人店) なら 据え置き", () => {
    const props = [
      disabledStore("store-localcafe", "近所のカフェ"),
      campaignProgram("prog-x"),
      membership("store-localcafe", "prog-x"),
    ];
    const { proposals, promoted } = promoteChainStoreAutoMerge(props, {
      stores: [],
      cards: [], currencies: [], edges: [], pointCards: [], paymentApps: [],
    });
    expect(promoted).toBe(0);
    expect(proposals[0].reviewReason).toBe("storeAdditionsDisabled");
  });

  it("validTo なしの program (常設) を参照しても campaign 扱いされず据え置き", () => {
    const ongoingProg: Proposal = {
      type: "addRecord",
      collection: "programs",
      record: { id: "prog-ongoing", name: "常設", rate: 0.02, currencyId: "v-pt" },
      sourceId: "src",
      confidence: 0.97,
      evidence: ev,
    };
    const props = [
      disabledStore("store-mcd", "マクドナルド"),
      ongoingProg,
      membership("store-mcd", "prog-ongoing"),
    ];
    const { proposals, promoted } = promoteChainStoreAutoMerge(props, {
      stores: [],
      cards: [], currencies: [], edges: [], pointCards: [], paymentApps: [],
    });
    expect(promoted).toBe(0);
    expect(proposals[0].reviewReason).toBe("storeAdditionsDisabled");
  });

  it("chain-heavy category (飲食に既存 3 店あり) + campaign 参照 → promote", () => {
    const props = [
      disabledStore("store-newrestaurant", "ニュー業態食堂", "飲食"),
      campaignProgram("prog-paypay-c"),
      membership("store-newrestaurant", "prog-paypay-c"),
    ];
    const { proposals, promoted } = promoteChainStoreAutoMerge(props, {
      stores: [
        { id: "s1", name: "既存1", category: "飲食" },
        { id: "s2", name: "既存2", category: "飲食" },
        { id: "s3", name: "既存3", category: "飲食" },
      ] as never,
      cards: [], currencies: [], edges: [], pointCards: [], paymentApps: [],
    });
    expect(promoted).toBe(1);
    expect(proposals[0].reviewReason).toBeUndefined();
  });

  it("storeAdditionsDisabled 以外の理由は触らない", () => {
    const idCollisionStore: Proposal = {
      ...disabledStore("store-x", "マクドナルド"),
      reviewReason: "idCollision",
    };
    const props = [
      idCollisionStore,
      campaignProgram("prog-x"),
      membership("store-x", "prog-x"),
    ];
    const { proposals, promoted } = promoteChainStoreAutoMerge(props, {
      stores: [],
      cards: [], currencies: [], edges: [], pointCards: [], paymentApps: [],
    });
    expect(promoted).toBe(0);
    expect(proposals[0].reviewReason).toBe("idCollision");
  });
});

// ───────────────────────────────────────────────────────────────
// proposeExpiredCampaignDeletions
// ───────────────────────────────────────────────────────────────

import { proposeExpiredCampaignDeletions } from "./propose-helpers";

describe("proposeExpiredCampaignDeletions", () => {
  const now = new Date("2026-05-27T00:00:00Z");

  const makeSeed = (programs: SeedShape["programs"], memberships: SeedShape["memberships"] = []): SeedShape => ({
    ...emptySeed,
    programs,
    memberships,
  });

  const baseProgram = {
    id: "prog-test",
    name: "テスト",
    scope: "member-stores" as const,
    rate: 0.05,
    currencyId: "v-pt",
  };

  it("validTo なしの program は対象外 (常時 campaign)", () => {
    const s = makeSeed([{ ...baseProgram, validFrom: "2024-01-01" }]);
    expect(proposeExpiredCampaignDeletions(s, now)).toEqual([]);
  });

  it("validTo が grace 内 (30日未満) は対象外", () => {
    const s = makeSeed([{ ...baseProgram, validTo: "2026-05-01" }]); // 26日前
    expect(proposeExpiredCampaignDeletions(s, now)).toEqual([]);
  });

  it("validTo が grace 超過 (30日以上前) は自動削除 DeleteProposal (reviewReason 無し)", () => {
    const s = makeSeed([{ ...baseProgram, validTo: "2026-04-01" }]); // 56日前
    const ps = proposeExpiredCampaignDeletions(s, now);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("delete");
    expect(ps[0].collection).toBe("programs");
    expect((ps[0] as { id: string }).id).toBe("prog-test");
    expect(ps[0].reviewReason).toBeUndefined(); // ← 自動削除 (auto)
    expect(ps[0].evidence.evidenceQuote).toContain("validTo=2026-04-01");
    expect(ps[0].evidence.evidenceQuote).toMatch(/5[0-9]日前/); // TZ 差で 55-56 のレンジ
  });

  it("延長ガード: 同 run で期間変更がある program は自動削除せず review (expiredCampaign)", () => {
    const s = makeSeed([{ ...baseProgram, validTo: "2026-04-01" }]); // 56日前
    const extended = new Set(["prog-test"]);
    const ps = proposeExpiredCampaignDeletions(s, now, undefined, extended);
    expect(ps).toHaveLength(1);
    expect(ps[0].type).toBe("delete");
    expect((ps[0] as { id: string }).id).toBe("prog-test");
    expect(ps[0].reviewReason).toBe("expiredCampaign"); // ← 延長中の誤削除防止で人手判断へ
    expect(ps[0].evidence.evidenceQuote).toContain("期間変更提案あり");
  });

  it("延長ガードは対象 id のみ: 別 id の延長は当該 program の自動削除を妨げない", () => {
    const s = makeSeed([{ ...baseProgram, validTo: "2026-04-01" }]); // 56日前
    const extended = new Set(["prog-other"]); // prog-test とは別
    const ps = proposeExpiredCampaignDeletions(s, now, undefined, extended);
    expect(ps).toHaveLength(1);
    expect(ps[0].reviewReason).toBeUndefined(); // ← 自動削除のまま
  });

  it("関連 memberships が evidence に列挙される (5 件まで)", () => {
    const s = makeSeed(
      [{ ...baseProgram, validTo: "2026-04-01" }],
      [
        { programId: "prog-test", storeId: "store-1" },
        { programId: "prog-test", storeId: "store-2" },
        { programId: "prog-test", storeId: "store-3" },
        { programId: "prog-test", storeId: "store-4" },
        { programId: "prog-test", storeId: "store-5" },
        { programId: "prog-test", storeId: "store-6" },
        { programId: "prog-test", storeId: "store-7" },
      ],
    );
    const ps = proposeExpiredCampaignDeletions(s, now);
    const quote = ps[0].evidence.evidenceQuote;
    expect(quote).toContain("関連 memberships 7 件");
    expect(quote).toContain("store-1, store-2, store-3, store-4, store-5");
    expect(quote).toContain("他 2 件");
  });

  it("graceDays をカスタムで指定できる (テスト容易性)", () => {
    const s = makeSeed([{ ...baseProgram, validTo: "2026-05-20" }]); // 7日前
    // grace=30: 対象外
    expect(proposeExpiredCampaignDeletions(s, now, 30)).toHaveLength(0);
    // grace=3: 対象 (7日 > 3日)
    expect(proposeExpiredCampaignDeletions(s, now, 3)).toHaveLength(1);
  });

  it("不正な validTo フォーマットは無視 (削除しない、安全側)", () => {
    const s = makeSeed([{ ...baseProgram, validTo: "invalid-date" }]);
    expect(proposeExpiredCampaignDeletions(s, now)).toEqual([]);
  });
});

// ─── 監査由来の auto-merge ガード強化 (H1-H3 / M1 / M2) ───

describe("H1: entryUrl/officialUrl の URL スキーム検証", () => {
  it("entryUrl=javascript:... の campaign は rec から entryUrl が drop されるが program 自体は auto 可", () => {
    const richSeed: SeedShape = {
      ...emptySeed,
      currencies: [{ id: "jre", name: "JRE POINT", kind: "point" }],
    };
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-xss-entry",
          name: "怪しいキャンペーン",
          rate: 0.03,
          currencyId: "jre",
          validTo: "2099-12-31",
          entryUrl: "javascript:alert(1)",
          officialUrl: "https://example.com/official",
          evidenceQuote: "期間 2099年12月31日まで、3%還元",
          explicitness: 1.0,
          ambiguity: 0.0,
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps).toHaveLength(1);
    const record = (ps[0] as { record: Record<string, unknown> }).record;
    expect(record.entryUrl).toBeUndefined();
    expect(record.officialUrl).toBe("https://example.com/official");
    // program 自体は auto-merge 可能 (URL 以外は健全)
    expect(ps[0].reviewReason).toBeUndefined();
  });

  it("officialUrl=data:... も drop される", () => {
    const richSeed: SeedShape = {
      ...emptySeed,
      currencies: [{ id: "jre", name: "JRE POINT", kind: "point" }],
    };
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-xss-official",
          rate: 0.03,
          currencyId: "jre",
          validTo: "2099-12-31",
          officialUrl: "data:text/html,<script>alert(1)</script>",
          evidenceQuote: "期間 2099年12月31日まで、3%還元",
          explicitness: 1.0,
          ambiguity: 0.0,
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    const record = (ps[0] as { record: Record<string, unknown> }).record;
    expect(record.officialUrl).toBeUndefined();
  });

  it("正常な https:// URL は drop されない", () => {
    const richSeed: SeedShape = {
      ...emptySeed,
      currencies: [{ id: "jre", name: "JRE POINT", kind: "point" }],
    };
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-safe-url",
          rate: 0.03,
          currencyId: "jre",
          validTo: "2099-12-31",
          entryUrl: "https://example.com/entry",
          evidenceQuote: "期間 2099年12月31日まで、3%還元",
          explicitness: 1.0,
          ambiguity: 0.0,
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    const record = (ps[0] as { record: Record<string, unknown> }).record;
    expect(record.entryUrl).toBe("https://example.com/entry");
  });
});

describe("H2: membership overrideRate / overrideCurrencyId ガード", () => {
  const seedWithCurrency: SeedShape = {
    ...emptySeed,
    currencies: [{ id: "jre", name: "JRE POINT", kind: "point" }],
  };

  it("overrideRate=5.0 (500%) の membership → zeroOrInvalidRate", () => {
    const data = baseSource({
      extractor: "campaign",
      memberships: [
        {
          programId: "prog-a",
          storeId: "store-a",
          overrideRate: 5.0,
          evidenceQuote: "特別に500%還元 (誤抽出想定)",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, seedWithCurrency);
    expect(ps).toHaveLength(1);
    expect(ps[0].reviewReason).toBe("zeroOrInvalidRate");
  });

  it("overrideRate=0.02 (2%) は従来どおり auto", () => {
    const data = baseSource({
      extractor: "campaign",
      memberships: [
        {
          programId: "prog-a",
          storeId: "store-a",
          overrideRate: 0.02,
          evidenceQuote: "この店舗限定 2%",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, seedWithCurrency);
    expect(ps).toHaveLength(1);
    expect(ps[0].reviewReason).toBeUndefined();
  });

  it("overrideRate=0 は zeroOrInvalidRate", () => {
    const data = baseSource({
      extractor: "campaign",
      memberships: [
        {
          programId: "prog-a",
          storeId: "store-a",
          overrideRate: 0,
          evidenceQuote: "0%表記 (誤抽出想定)",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, seedWithCurrency);
    expect(ps[0].reviewReason).toBe("zeroOrInvalidRate");
  });

  it("overrideRate が負の値は zeroOrInvalidRate", () => {
    const data = baseSource({
      extractor: "campaign",
      memberships: [
        {
          programId: "prog-a",
          storeId: "store-a",
          overrideRate: -0.01,
          evidenceQuote: "負の値 (誤抽出想定)",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, seedWithCurrency);
    expect(ps[0].reviewReason).toBe("zeroOrInvalidRate");
  });

  it("overrideCurrencyId 未知 → referenceChange", () => {
    const data = baseSource({
      extractor: "campaign",
      memberships: [
        {
          programId: "prog-a",
          storeId: "store-a",
          overrideCurrencyId: "unknown-currency",
          evidenceQuote: "この店舗は別通貨",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, seedWithCurrency);
    expect(ps[0].reviewReason).toBe("referenceChange");
  });

  it("overrideCurrencyId が既知なら reviewReason は付かない", () => {
    const data = baseSource({
      extractor: "campaign",
      memberships: [
        {
          programId: "prog-a",
          storeId: "store-a",
          overrideCurrencyId: "jre",
          evidenceQuote: "この店舗は同一通貨",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposeMemberships(data, seedWithCurrency);
    expect(ps[0].reviewReason).toBeUndefined();
  });
});

describe("H3: pa-default (通常クレカ決済) の受け皿ガード", () => {
  it("paymentAppId=pa-default の campaign program → pseudoStoreTarget", () => {
    const richSeed: SeedShape = {
      ...emptySeed,
      currencies: [{ id: "jre", name: "JRE POINT", kind: "point" }],
      paymentApps: [{ id: "pa-default", name: "通常クレカ決済" }],
    };
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-pseudo-payment",
          rate: 0.03,
          currencyId: "jre",
          paymentAppId: "pa-default",
          validTo: "2099-12-31",
          evidenceQuote: "期間 2099年12月31日まで、通常決済で3%",
          explicitness: 1.0,
          ambiguity: 0.0,
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps[0].reviewReason).toBe("pseudoStoreTarget");
  });

  it("既存 paymentApp=pa-default への defaultBonusRate 更新は pseudoStoreTarget に降格", () => {
    const seed: SeedShape = {
      ...emptySeed,
      paymentApps: [{ id: "pa-default", name: "通常クレカ決済", defaultBonusRate: 0.01 }],
    };
    const data = baseSource({
      extractor: "payment-app",
      paymentApps: [
        {
          paymentAppId: "pa-default",
          defaultBonusRate: 0.02,
          evidenceQuote: "通常クレカ決済は2%還元に改定",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePaymentApps(data, seed);
    expect(ps).toHaveLength(1);
    expect(ps[0].reviewReason).toBe("pseudoStoreTarget");
  });
});

describe("M1: rate の逐語根拠検証 (unsupportedRateClaim)", () => {
  it("rate 根拠なし (「最大◯◯ポイントプレゼント」) → unsupportedRateClaim", () => {
    const richSeed: SeedShape = {
      ...emptySeed,
      currencies: [{ id: "d-pt", name: "dポイント", kind: "point" }],
      pointCards: [{ id: "d-pointcard", name: "dポイントカード", currencyId: "d-pt" }],
    };
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-d-pointcard-nojima-10000",
          name: "ノジマで最大10,000ポイントプレゼント",
          pointCardId: "d-pointcard",
          rate: 0.01,
          currencyId: "d-pt",
          bonusType: "addOn",
          validTo: "2099-12-31",
          evidenceQuote: "ノジマで最大10,000ポイントプレゼント",
          explicitness: 0.95,
          ambiguity: 0.05,
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps[0].reviewReason).toBe("unsupportedRateClaim");
  });

  it("evidence に「3%」根拠あれば通常どおり auto 判定に進む", () => {
    const richSeed: SeedShape = {
      ...emptySeed,
      currencies: [{ id: "jre", name: "JRE POINT", kind: "point" }],
      pointCards: [{ id: "jre-pointcard", name: "JRE POINTカード", currencyId: "jre" }],
    };
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-with-rate-evidence",
          name: "対象店舗3%還元",
          pointCardId: "jre-pointcard",
          rate: 0.03,
          currencyId: "jre",
          validTo: "2099-12-31",
          evidenceQuote: "対象店舗で3%還元、2099年12月31日まで",
          explicitness: 1.0,
          ambiguity: 0.0,
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps[0].reviewReason).toBeUndefined();
  });
});

describe("M2: isCampaignAutoMergeable 値域ガードパック", () => {
  const richSeed: SeedShape = {
    ...emptySeed,
    currencies: [{ id: "jre", name: "JRE POINT", kind: "point" }],
  };
  const baseProgramFields = {
    rate: 0.03,
    currencyId: "jre",
    validTo: "2099-12-31",
    explicitness: 1.0,
    ambiguity: 0.0,
  };

  it("monthlyCapAmountYen=-100 は auto 不可", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-neg-cap",
          ...baseProgramFields,
          monthlyCapAmountYen: -100,
          evidenceQuote: "月上限あり、期間 2099年12月31日まで 3%",
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps[0].reviewReason).toBe("idCollision");
  });

  it("bonusType='bonus' (不正値) は auto 不可", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-bad-bonustype",
          ...baseProgramFields,
          bonusType: "bonus" as unknown as "primary" | "addOn",
          evidenceQuote: "期間 2099年12月31日まで 3%",
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps[0].reviewReason).toBe("idCollision");
  });

  it("recurringDays=[32] (範囲外) は auto 不可", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-bad-recurring-days",
          ...baseProgramFields,
          recurringDays: [32],
          evidenceQuote: "毎月32日 (誤抽出想定)、期間 2099年12月31日まで 3%",
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps[0].reviewReason).toBe("idCollision");
  });

  it("recurringWeekdays=[7] (範囲外) は auto 不可", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-bad-recurring-weekdays",
          ...baseProgramFields,
          recurringWeekdays: [7],
          evidenceQuote: "曜日限定 (誤抽出想定)、期間 2099年12月31日まで 3%",
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps[0].reviewReason).toBe("idCollision");
  });

  it("正常な monthlyCapAmountYen / bonusType / recurringDays / recurringWeekdays は auto 可", () => {
    const data = baseSource({
      extractor: "campaign",
      programs: [
        {
          programId: "prog-valid-fields",
          ...baseProgramFields,
          monthlyCapAmountYen: 5000,
          bonusType: "addOn",
          recurringDays: [1, 15],
          recurringWeekdays: [0, 6],
          evidenceQuote: "毎月1日・15日の週末は3%、期間 2099年12月31日まで",
        },
      ],
    });
    const ps = proposePrograms(data, richSeed);
    expect(ps[0].reviewReason).toBeUndefined();
  });
});
