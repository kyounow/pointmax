import { describe, it, expect } from "vitest";
import { bestLoyalty, bestLoyalties } from "./loyalty";
import type { ConversionEdge, LoyaltyRule, PointCard } from "./types";

const edge = (
  id: string,
  from: string,
  to: string,
  rate: number,
): ConversionEdge => ({
  id,
  fromCurrencyId: from,
  toCurrencyId: to,
  rate,
});

const dCard: PointCard = {
  id: "d-card",
  name: "dポイントカード",
  currencyId: "d-pt",
};
const rakutenCard: PointCard = {
  id: "r-card",
  name: "楽天ポイントカード",
  currencyId: "rakuten-pt",
};
const pontaCard: PointCard = {
  id: "p-card",
  name: "Pontaカード",
  currencyId: "ponta-pt",
};

describe("bestLoyalty", () => {
  it("ルール無しなら null", () => {
    expect(bestLoyalty("any", 1000, "d-pt", [], [], [])).toBeNull();
  });

  it("該当店舗ルールが無いなら null", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "lawson", pointCardId: "d-card", rate: 0.01 },
    ];
    expect(
      bestLoyalty("starbucks", 1000, "d-pt", [dCard], rules, []),
    ).toBeNull();
  });

  it("所有していないポイントカードのルールは無視する", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "lawson", pointCardId: "ponta", rate: 0.01 },
    ];
    expect(bestLoyalty("lawson", 1000, "ponta", [dCard], rules, [])).toBeNull();
  });

  it("適用可能ルールが1つあれば、そのレート×金額分を獲得", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "lawson", pointCardId: "d-card", rate: 0.01 },
    ];
    const result = bestLoyalty("lawson", 10000, "d-pt", [dCard], rules, []);
    expect(result).not.toBeNull();
    expect(result!.earnedAmount).toBe(100);
    expect(result!.earnedCurrencyId).toBe("d-pt");
    expect(result!.finalAmount).toBe(100);
    expect(result!.reachable).toBe(true);
    expect(result!.pointCard.id).toBe("d-card");
  });

  it("複数候補から最終量(target通貨)が最大のものを選ぶ", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "famima", pointCardId: "d-card", rate: 0.005 },
      { id: "r2", storeId: "famima", pointCardId: "r-card", rate: 0.01 },
    ];
    const result = bestLoyalty(
      "famima",
      10000,
      "d-pt",
      [dCard, rakutenCard],
      rules,
      [],
    );
    expect(result!.pointCard.id).toBe("d-card");
    expect(result!.finalAmount).toBe(50);
  });

  it("交換が必要な場合は bestPath で最終量を計算する", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "lawson", pointCardId: "d-card", rate: 0.01 },
    ];
    const edges = [edge("e1", "d-pt", "ana-mile", 0.5)];
    const result = bestLoyalty(
      "lawson",
      10000,
      "ana-mile",
      [dCard],
      rules,
      edges,
    );
    expect(result!.earnedAmount).toBe(100);
    expect(result!.finalAmount).toBe(50);
    expect(result!.pathSteps).toHaveLength(1);
  });

  it("到達可能候補があれば、到達不能候補より優先される", () => {
    const rules: LoyaltyRule[] = [
      {
        id: "high-unreachable",
        storeId: "famima",
        pointCardId: "r-card",
        rate: 0.05,
      },
      {
        id: "low-reachable",
        storeId: "famima",
        pointCardId: "d-card",
        rate: 0.01,
      },
    ];
    const edges = [edge("e1", "d-pt", "ana-mile", 0.5)];
    const result = bestLoyalty(
      "famima",
      10000,
      "ana-mile",
      [dCard, rakutenCard],
      rules,
      edges,
    );
    expect(result!.pointCard.id).toBe("d-card");
    expect(result!.reachable).toBe(true);
  });

  it("最終量が同点の場合、ownedPointCards の配列順で先頭に近いカードが優先される", () => {
    const rules: LoyaltyRule[] = [
      { id: "r-d", storeId: "lawson", pointCardId: "d-card", rate: 0.005 },
      { id: "r-r", storeId: "lawson", pointCardId: "r-card", rate: 0.005 },
    ];
    const edges = [
      edge("d-to-ana", "d-pt", "ana-mile", 1),
      edge("r-to-ana", "rakuten-pt", "ana-mile", 1),
    ];
    const r1 = bestLoyalty(
      "lawson",
      10000,
      "ana-mile",
      [rakutenCard, dCard],
      rules,
      edges,
    );
    expect(r1!.pointCard.id).toBe("r-card");

    const r2 = bestLoyalty(
      "lawson",
      10000,
      "ana-mile",
      [dCard, rakutenCard],
      rules,
      edges,
    );
    expect(r2!.pointCard.id).toBe("d-card");
  });

  it("店舗の preferredPointCardIds が指定されている場合、ownedPointCards より優先される", () => {
    // 全カードが同じ rate で同じ finalAmount に到達するシナリオ
    const rules: LoyaltyRule[] = [
      {
        id: "loy-d",
        storeId: "famima",
        pointCardId: "d-card",
        rate: 0.005,
      },
      {
        id: "loy-r",
        storeId: "famima",
        pointCardId: "r-card",
        rate: 0.005,
      },
      {
        id: "loy-v",
        storeId: "famima",
        pointCardId: "v-card",
        rate: 0.005,
      },
    ];
    const vCard: PointCard = {
      id: "v-card",
      name: "Vポイントカード",
      currencyId: "v-pt",
    };
    // ユーザー優先順: dカード > 楽天 > V
    const owned = [dCard, rakutenCard, vCard];
    // 店舗指定なし → ユーザー優先順で dカードが選ばれる
    const noStorePref = bestLoyalty(
      "famima",
      10000,
      "d-pt",
      owned,
      rules,
      [
        edge("r-to-d", "rakuten-pt", "d-pt", 1),
        edge("v-to-d", "v-pt", "d-pt", 1),
      ],
    );
    expect(noStorePref!.pointCard.id).toBe("d-card");

    // 店舗指定 ["v-card"] → 同点でも Vポイントが優先される
    const withStorePref = bestLoyalty(
      "famima",
      10000,
      "d-pt",
      owned,
      rules,
      [
        edge("r-to-d", "rakuten-pt", "d-pt", 1),
        edge("v-to-d", "v-pt", "d-pt", 1),
      ],
      ["v-card"],
    );
    expect(withStorePref!.pointCard.id).toBe("v-card");
  });

  it("ルールの currencyId 上書きが効く", () => {
    const rules: LoyaltyRule[] = [
      {
        id: "r1",
        storeId: "lawson",
        pointCardId: "d-card",
        rate: 0.01,
        currencyId: "rakuten-pt",
      },
    ];
    const result = bestLoyalty(
      "lawson",
      10000,
      "rakuten-pt",
      [dCard],
      rules,
      [],
    );
    expect(result!.earnedCurrencyId).toBe("rakuten-pt");
    expect(result!.finalAmount).toBe(100);
  });
});

describe("bestLoyalties (Top-N stack)", () => {
  it("ルール無しなら []", () => {
    expect(bestLoyalties("any", 1000, "d-pt", [], [], [], 2)).toEqual([]);
  });

  it("max=1 は bestLoyalty 1件と同じ結果", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "famima", pointCardId: "d-card", rate: 0.005 },
      { id: "r2", storeId: "famima", pointCardId: "r-card", rate: 0.01 },
    ];
    const single = bestLoyalty(
      "famima",
      10000,
      "d-pt",
      [dCard, rakutenCard],
      rules,
      [],
    );
    const top = bestLoyalties(
      "famima",
      10000,
      "d-pt",
      [dCard, rakutenCard],
      rules,
      [],
      1,
    );
    expect(top).toHaveLength(1);
    expect(top[0].pointCard.id).toBe(single!.pointCard.id);
  });

  it("max=2 で異なる2枚が適用可能なら両方返す", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "shop", pointCardId: "d-card", rate: 0.01 },
      { id: "r2", storeId: "shop", pointCardId: "r-card", rate: 0.01 },
    ];
    const top = bestLoyalties(
      "shop",
      10000,
      "d-pt",
      [dCard, rakutenCard],
      rules,
      [edge("r-to-d", "rakuten-pt", "d-pt", 1)],
      2,
    );
    expect(top).toHaveLength(2);
    expect(top.map((r) => r.pointCard.id).sort()).toEqual(["d-card", "r-card"]);
  });

  it("max=2 でも適用可能が1枚なら1要素", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "shop", pointCardId: "d-card", rate: 0.01 },
    ];
    const top = bestLoyalties(
      "shop",
      10000,
      "d-pt",
      [dCard, rakutenCard],
      rules,
      [],
      2,
    );
    expect(top).toHaveLength(1);
  });

  it("同一カードに複数ルールがあっても、そのカードは1スタック分のみ採用", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "shop", pointCardId: "d-card", rate: 0.01 },
      { id: "r2", storeId: "shop", pointCardId: "d-card", rate: 0.005 },
    ];
    const top = bestLoyalties("shop", 10000, "d-pt", [dCard], rules, [], 2);
    expect(top).toHaveLength(1);
    expect(top[0].pointCard.id).toBe("d-card");
    expect(top[0].rule.id).toBe("r1"); // 高レートが採用
  });

  it("max=0 は []", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "shop", pointCardId: "d-card", rate: 0.01 },
    ];
    expect(
      bestLoyalties("shop", 10000, "d-pt", [dCard], rules, [], 0),
    ).toEqual([]);
  });

  it("3枚適用可能 + max=2 なら最終量上位2枚を選ぶ", () => {
    const rules: LoyaltyRule[] = [
      { id: "r1", storeId: "shop", pointCardId: "d-card", rate: 0.01 },
      { id: "r2", storeId: "shop", pointCardId: "r-card", rate: 0.005 },
      { id: "r3", storeId: "shop", pointCardId: "p-card", rate: 0.02 },
    ];
    const edges = [
      edge("r-to-d", "rakuten-pt", "d-pt", 1),
      edge("p-to-d", "ponta-pt", "d-pt", 1),
    ];
    const top = bestLoyalties(
      "shop",
      10000,
      "d-pt",
      [dCard, rakutenCard, pontaCard],
      rules,
      edges,
      2,
    );
    // d=100, r=50, p=200 → 上位2件は p, d
    expect(top.map((r) => r.pointCard.id)).toEqual(["p-card", "d-card"]);
  });
});
