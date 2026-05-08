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

// 単一の最良ロイヤリティ結果（後方互換）
export function bestLoyalty(
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  ownedPointCards: PointCard[],
  loyaltyRules: LoyaltyRule[],
  edges: ConversionEdge[],
): LoyaltyResult | null {
  const top = bestLoyalties(
    storeId,
    amount,
    targetCurrencyId,
    ownedPointCards,
    loyaltyRules,
    edges,
    1,
  );
  return top[0] ?? null;
}

// Top-N の重ね取り結果。同一 pointCard は1要素にまとめ、最終量降順で上位 maxStacks 件返す。
export function bestLoyalties(
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  ownedPointCards: PointCard[],
  loyaltyRules: LoyaltyRule[],
  edges: ConversionEdge[],
  maxStacks: number,
): LoyaltyResult[] {
  if (maxStacks <= 0) return [];

  const ownedById = new Map(ownedPointCards.map((p) => [p.id, p]));
  const applicable = loyaltyRules.filter(
    (r) => r.storeId === storeId && ownedById.has(r.pointCardId),
  );
  if (applicable.length === 0) return [];

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

  // 1) reachable 優先 / 2) finalAmount 降順 / 3) ownedPointCards 配列順 / 4) earnedAmount 降順
  const priorityIndex = new Map(ownedPointCards.map((p, i) => [p.id, i]));
  evaluated.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    if (a.finalAmount !== b.finalAmount) return b.finalAmount - a.finalAmount;
    const ai = priorityIndex.get(a.pointCard.id) ?? Number.POSITIVE_INFINITY;
    const bi = priorityIndex.get(b.pointCard.id) ?? Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return b.earnedAmount - a.earnedAmount;
  });

  // 同一 pointCard は最初に出てくる(=最良)1件のみ採用
  const seen = new Set<string>();
  const dedup: LoyaltyResult[] = [];
  for (const r of evaluated) {
    if (seen.has(r.pointCard.id)) continue;
    seen.add(r.pointCard.id);
    dedup.push(r);
    if (dedup.length >= maxStacks) break;
  }
  return dedup;
}
