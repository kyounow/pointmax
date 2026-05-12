import { describe, it, expect } from "vitest";
import { rankCards } from "./rankCards";
import type { Card, ConversionEdge, Store, StoreRule } from "./types";

const rakuten: Card = {
  id: "rakuten",
  name: "楽天カード",
  defaultRate: 0.01,
  defaultCurrencyId: "rakuten-pt",
};

const jcb: Card = {
  id: "jcb",
  name: "JCBカード",
  defaultRate: 0.005,
  defaultCurrencyId: "okidoki",
};

const edge = (
  id: string,
  from: string,
  to: string,
  rate: number,
): ConversionEdge => ({ id, fromCurrencyId: from, toCurrencyId: to, rate });

const baseStores: Store[] = [
  { id: "any", name: "any" },
  { id: "amazon", name: "Amazon", category: "ネット通販" },
];

describe("rankCards", () => {
  it("貯まる通貨が目標と一致するなら、変換ゼロホップでそのまま返す", () => {
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten],
      stores: baseStores,
      rules: [],
      edges: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].card.id).toBe("rakuten");
    expect(result[0].earnedAmount).toBe(100);
    expect(result[0].earnedCurrencyId).toBe("rakuten-pt");
    expect(result[0].finalAmount).toBe(100);
    expect(result[0].pathSteps).toEqual([]);
    expect(result[0].reachable).toBe(true);
  });

  it("変換が必要なときは bestPath を経由して最終量を計算する", () => {
    const edges = [edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5)];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten],
      stores: baseStores,
      rules: [],
      edges,
    });
    expect(result[0].earnedAmount).toBe(100);
    expect(result[0].finalAmount).toBe(50);
    expect(result[0].pathSteps).toHaveLength(1);
    expect(result[0].pathSteps[0].id).toBe("rakuten-to-ana");
  });

  it("複数カードを最終量の降順で並べる", () => {
    const edges = [
      edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5),
      edge("oki-to-ana", "okidoki", "ana-mile", 3),
    ];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten, jcb],
      stores: baseStores,
      rules: [],
      edges,
    });
    expect(result.map((r) => r.card.id)).toEqual(["jcb", "rakuten"]);
    expect(result[0].finalAmount).toBe(150);
    expect(result[1].finalAmount).toBe(50);
  });

  it("店舗ルールが還元率と通貨の両方を上書きする", () => {
    const rules: StoreRule[] = [
      {
        id: "amzn-rule",
        cardId: "rakuten",
        storeId: "amazon",
        rate: 0.02,
        currencyId: "amazon-pt",
      },
    ];
    const result = rankCards({
      payment: { storeId: "amazon", amount: 10000 },
      targetCurrencyId: "amazon-pt",
      cards: [rakuten],
      stores: baseStores,
      rules,
      edges: [],
    });
    expect(result[0].earnedCurrencyId).toBe("amazon-pt");
    expect(result[0].earnedAmount).toBe(200);
    expect(result[0].finalAmount).toBe(200);
    expect(result[0].resolved.source).toBe("rule");
  });

  it("目標通貨に到達できないカードは reachable=false で末尾に入る", () => {
    const edges = [edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5)];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten, jcb],
      stores: baseStores,
      rules: [],
      edges,
    });
    expect(result[0].card.id).toBe("rakuten");
    expect(result[0].reachable).toBe(true);
    expect(result[1].card.id).toBe("jcb");
    expect(result[1].reachable).toBe(false);
    expect(result[1].finalAmount).toBe(0);
  });

  it("複数の交換ルートがある場合、最大価値ルートが選ばれる", () => {
    const edges = [
      edge("direct", "rakuten-pt", "ana-mile", 0.5),
      edge("via-x-1", "rakuten-pt", "x-pt", 1),
      edge("via-x-2", "x-pt", "ana-mile", 0.7),
    ];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten],
      stores: baseStores,
      rules: [],
      edges,
    });
    expect(result[0].finalAmount).toBeCloseTo(70, 10);
    expect(result[0].pathSteps.map((e) => e.id)).toEqual([
      "via-x-1",
      "via-x-2",
    ]);
  });

  it("ポイントカード併用ボーナスが totalFinalAmount に加算される", () => {
    const dCard = {
      id: "d-card",
      name: "dポイントカード",
      currencyId: "d-pt",
    };
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: [rakuten],
      stores: baseStores,
      rules: [],
      edges: [
        edge("rakuten-to-d", "rakuten-pt", "d-pt", 1),
      ],
      pointCards: [dCard],
      loyaltyRules: [
        { id: "loy", storeId: "any", pointCardId: "d-card", rate: 0.01 },
      ],
    });
    // 楽天カード: 100 楽天pt → d-pt 100 (rate 1)
    // ロイヤリティ: 100 dpt direct
    // total: 200
    expect(result[0].finalAmount).toBe(100);
    expect(result[0].loyalties).toHaveLength(1);
    expect(result[0].loyalties[0].finalAmount).toBe(100);
    expect(result[0].totalFinalAmount).toBe(200);
  });

  it("Store.maxLoyaltyStacks=2 で2枚のポイントカードが同時加算される（三重取り）", () => {
    const dCard = {
      id: "d-card",
      name: "dカード",
      currencyId: "d-pt",
    };
    const rakutenCard = {
      id: "r-card",
      name: "楽天カード",
      currencyId: "rakuten-pt",
    };
    const stackStore: Store = {
      id: "stack-shop",
      name: "重ね取り店",
      maxLoyaltyStacks: 2,
    };
    const result = rankCards({
      payment: { storeId: "stack-shop", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: [rakuten],
      stores: [...baseStores, stackStore],
      rules: [],
      edges: [
        edge("rakuten-to-d", "rakuten-pt", "d-pt", 1),
      ],
      pointCards: [dCard, rakutenCard],
      loyaltyRules: [
        { id: "l1", storeId: "stack-shop", pointCardId: "d-card", rate: 0.01 },
        { id: "l2", storeId: "stack-shop", pointCardId: "r-card", rate: 0.005 },
      ],
    });
    // クレカ(楽天): 100 楽天pt → 100 d-pt
    // ロイヤリティ1: dカード 100 d-pt
    // ロイヤリティ2: 楽天カード 50 楽天pt → 50 d-pt
    // total: 100 + 100 + 50 = 250
    expect(result[0].loyalties).toHaveLength(2);
    expect(result[0].totalFinalAmount).toBe(250);
  });

  it("enabled=false のカードは順位付け結果に含まれない", () => {
    const disabledCard: Card = {
      id: "disabled-card",
      name: "無効カード",
      defaultRate: 0.05, // 高還元率でも除外される
      defaultCurrencyId: "rakuten-pt",
      enabled: false,
    };
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten, disabledCard],
      stores: baseStores,
      rules: [],
      edges: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].card.id).toBe("rakuten");
  });

  it("カテゴリルールが店舗のカテゴリ経由で適用される", () => {
    const rules: StoreRule[] = [
      {
        id: "cat-net",
        cardId: "rakuten",
        category: "ネット通販",
        rate: 0.015,
        currencyId: "rakuten-pt",
      },
    ];
    const result = rankCards({
      payment: { storeId: "amazon", amount: 10000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten],
      stores: baseStores,
      rules,
      edges: [],
    });
    expect(result[0].resolved.source).toBe("category");
    expect(result[0].earnedAmount).toBe(150);
    expect(result[0].finalAmount).toBe(150);
  });

  it("requiredCardIds: 必要なカードを持たないユーザーは制約エッジを経由したパスを取れない", () => {
    // 楽天カードのみ保有 (jal-suica 無し)
    const cards: Card[] = [rakuten];
    const edges: ConversionEdge[] = [
      {
        id: "jre-to-jal",
        fromCurrencyId: "jre",
        toCurrencyId: "jal-mile",
        rate: 0.5,
        requiredCardIds: ["jal-suica"],
      },
    ];
    // 楽天カードが JRE で貯まると仮定するルールを 1 件
    const rules: StoreRule[] = [
      {
        id: "r1",
        cardId: "rakuten",
        storeId: "any",
        rate: 0.01,
        currencyId: "jre",
      },
    ];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "jal-mile",
      cards,
      stores: baseStores,
      rules,
      edges,
    });
    expect(result).toHaveLength(1);
    expect(result[0].reachable).toBe(false); // パスが見つからない
  });
});
