import type { ConversionEdge, LoyaltyRule, PointCard } from "./types";
import { bestPath } from "./bestPath";
import { isRuleActiveAt } from "./ruleActiveAt";

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
  preferredPointCardIds?: string[],
  now: Date = new Date(),
): LoyaltyResult | null {
  const top = bestLoyalties(
    storeId,
    amount,
    targetCurrencyId,
    ownedPointCards,
    loyaltyRules,
    edges,
    1,
    preferredPointCardIds,
    now,
  );
  return top[0] ?? null;
}

// Top-N の重ね取り結果。同一 pointCard は1要素にまとめ、最終量降順で上位 maxStacks 件返す。
// preferredPointCardIds: 店舗の優先指定。同点還元時にこの順で優先採用される。
// now: キャンペーン期間判定の基準時刻 (テスト容易化のため引数化)
// availableCardIds: ConversionEdge.requiredCardIds のゲート判定に使う enabled なカード id の集合。
//   渡された場合のみ制約チェックが行われる (未指定 = 後方互換で全エッジ使用)。
// 同一 (pointCard, store) で複数 rule active なら最高 rate を採用。
export function bestLoyalties(
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  ownedPointCards: PointCard[],
  loyaltyRules: LoyaltyRule[],
  edges: ConversionEdge[],
  maxStacks: number,
  preferredPointCardIds?: string[],
  now: Date = new Date(),
  availableCardIds?: ReadonlySet<string>,
): LoyaltyResult[] {
  if (maxStacks <= 0) return [];

  const ownedById = new Map(ownedPointCards.map((p) => [p.id, p]));
  // 店舗一致 + 保有 pointCard + active な (キャンペーン期間内 or 期間指定なし) ルールのみ
  const applicable = loyaltyRules.filter(
    (r) =>
      r.storeId === storeId &&
      ownedById.has(r.pointCardId) &&
      isRuleActiveAt(r, now),
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
      availableCardIds,
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

  // 1) reachable 優先 / 2) finalAmount 降順
  // 3) 店舗の preferredPointCardIds 順 (店舗別優先)
  // 4) ownedPointCards 配列順 (ユーザー全体優先順)
  // 5) earnedAmount 降順
  const userPriorityIndex = new Map(ownedPointCards.map((p, i) => [p.id, i]));
  const storePriorityIndex = new Map(
    (preferredPointCardIds ?? []).map((id, i) => [id, i]),
  );
  evaluated.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    if (a.finalAmount !== b.finalAmount) return b.finalAmount - a.finalAmount;
    const aStore =
      storePriorityIndex.get(a.pointCard.id) ?? Number.POSITIVE_INFINITY;
    const bStore =
      storePriorityIndex.get(b.pointCard.id) ?? Number.POSITIVE_INFINITY;
    if (aStore !== bStore) return aStore - bStore;
    const aUser =
      userPriorityIndex.get(a.pointCard.id) ?? Number.POSITIVE_INFINITY;
    const bUser =
      userPriorityIndex.get(b.pointCard.id) ?? Number.POSITIVE_INFINITY;
    if (aUser !== bUser) return aUser - bUser;
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
