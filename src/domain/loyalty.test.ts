import { describe, it, expect } from "vitest";
import { bestLoyalty } from "./loyalty";
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
    // target=d-pt: dカードは50pt, 楽天は100ptだが d-pt 到達不可で0
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
    // 両方とも 100 ana-mile に到達するレートで設定
    const rules: LoyaltyRule[] = [
      { id: "r-d", storeId: "lawson", pointCardId: "d-card", rate: 0.005 },
      { id: "r-r", storeId: "lawson", pointCardId: "r-card", rate: 0.005 },
    ];
    const edges = [
      edge("d-to-ana", "d-pt", "ana-mile", 1),
      edge("r-to-ana", "rakuten-pt", "ana-mile", 1),
    ];
    // 楽天が先頭の場合
    const r1 = bestLoyalty(
      "lawson",
      10000,
      "ana-mile",
      [rakutenCard, dCard],
      rules,
      edges,
    );
    expect(r1!.pointCard.id).toBe("r-card");

    // dを先頭に並べ替え
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
