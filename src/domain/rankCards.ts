import type {
  Card,
  ConversionEdge,
  LoyaltyRule,
  PointCard,
  Store,
  StoreRule,
} from "./types";
import { resolveRate, type ResolvedRate } from "./resolveRate";
import { bestPath } from "./bestPath";
import { bestLoyalty, type LoyaltyResult } from "./loyalty";

export type RankInput = {
  payment: { storeId: string; amount: number };
  targetCurrencyId: string;
  cards: Card[];
  stores: Store[];
  rules: StoreRule[];
  edges: ConversionEdge[];
  pointCards?: PointCard[];
  loyaltyRules?: LoyaltyRule[];
};

export type CardRanking = {
  card: Card;
  resolved: ResolvedRate;
  earnedAmount: number;
  earnedCurrencyId: string;
  pathSteps: ConversionEdge[];
  pathProduct: number;
  finalAmount: number;
  reachable: boolean;
  loyalty: LoyaltyResult | null; // 店舗ごとに共通(全カード同じ値)
  totalFinalAmount: number; // finalAmount + (loyalty?.finalAmount ?? 0)
};

export function rankCards(input: RankInput): CardRanking[] {
  const {
    payment,
    targetCurrencyId,
    cards,
    stores,
    rules,
    edges,
    pointCards = [],
    loyaltyRules = [],
  } = input;

  const loyalty = bestLoyalty(
    payment.storeId,
    payment.amount,
    targetCurrencyId,
    pointCards,
    loyaltyRules,
    edges,
  );

  const ranked: CardRanking[] = cards.map((card) => {
    const resolved = resolveRate(card, payment.storeId, rules, stores);
    const earnedAmount = payment.amount * resolved.rate;
    const earnedCurrencyId = resolved.currencyId;

    const path = bestPath(
      edges,
      earnedCurrencyId,
      targetCurrencyId,
      earnedAmount,
    );

    const baseFinal = path?.finalAmount ?? 0;
    const reachable = path !== null;
    const loyaltyFinal = loyalty?.reachable ? loyalty.finalAmount : 0;

    return {
      card,
      resolved,
      earnedAmount,
      earnedCurrencyId,
      pathSteps: path?.steps ?? [],
      pathProduct: path?.product ?? 0,
      finalAmount: baseFinal,
      reachable,
      loyalty,
      totalFinalAmount: baseFinal + loyaltyFinal,
    };
  });

  ranked.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    return b.totalFinalAmount - a.totalFinalAmount;
  });

  return ranked;
}
