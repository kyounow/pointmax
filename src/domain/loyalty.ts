import type { ConversionEdge, LoyaltyRule, PointCard } from "./types";
import { bestPath } from "./bestPath";

export type LoyaltyResult = {
  pointCard: PointCard;
  rule: LoyaltyRule;
  earnedAmount: number;
  earnedCurrencyId: string;
  pathSteps: ConversionEdge[];
  pathProduct: number;
  finalAmount: number;
  reachable: boolean;
};

export function bestLoyalty(
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  ownedPointCards: PointCard[],
  loyaltyRules: LoyaltyRule[],
  edges: ConversionEdge[],
): LoyaltyResult | null {
  const ownedById = new Map(ownedPointCards.map((p) => [p.id, p]));
  const applicable = loyaltyRules.filter(
    (r) => r.storeId === storeId && ownedById.has(r.pointCardId),
  );
  if (applicable.length === 0) return null;

  const evaluated: LoyaltyResult[] = applicable.map((rule) => {
    const pc = ownedById.get(rule.pointCardId)!;
    const earnedAmount = amount * rule.rate;
    const earnedCurrencyId = rule.currencyId ?? pc.currencyId;
    const path = bestPath(
      edges,
      earnedCurrencyId,
      targetCurrencyId,
      earnedAmount,
    );
    if (path === null) {
      return {
        pointCard: pc,
        rule,
        earnedAmount,
        earnedCurrencyId,
        pathSteps: [],
        pathProduct: 0,
        finalAmount: 0,
        reachable: false,
      };
    }
    return {
      pointCard: pc,
      rule,
      earnedAmount,
      earnedCurrencyId,
      pathSteps: path.steps,
      pathProduct: path.product,
      finalAmount: path.finalAmount,
      reachable: true,
    };
  });

  // 1) reachable 優先 / 2) finalAmount 降順 / 3) ownedPointCards 配列順 (ユーザー優先順位) / 4) earnedAmount 降順
  const priorityIndex = new Map(ownedPointCards.map((p, i) => [p.id, i]));
  evaluated.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    if (a.finalAmount !== b.finalAmount) return b.finalAmount - a.finalAmount;
    const ai = priorityIndex.get(a.pointCard.id) ?? Number.POSITIVE_INFINITY;
    const bi = priorityIndex.get(b.pointCard.id) ?? Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return b.earnedAmount - a.earnedAmount;
  });

  return evaluated[0];
}
