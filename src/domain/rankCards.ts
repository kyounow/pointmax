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
import { bestLoyalties, type LoyaltyResult } from "./loyalty";

export type RankInput = {
  payment: { storeId: string; amount: number; paymentMethod?: string };
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
  loyalties: LoyaltyResult[]; // 三重取り対応で配列化
  totalFinalAmount: number; // finalAmount + Σ(loyalties[].finalAmount where reachable)
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

  const store = stores.find((s) => s.id === payment.storeId);
  const maxStacks = Math.max(0, store?.maxLoyaltyStacks ?? 1);
  const loyalties = bestLoyalties(
    payment.storeId,
    payment.amount,
    targetCurrencyId,
    pointCards,
    loyaltyRules,
    edges,
    maxStacks,
  );
  const loyaltyTotal = loyalties.reduce(
    (sum, r) => sum + (r.reachable ? r.finalAmount : 0),
    0,
  );

  const ranked: CardRanking[] = cards.map((card) => {
    const resolved = resolveRate(
      card,
      payment.storeId,
      rules,
      stores,
      payment.paymentMethod,
    );
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

    return {
      card,
      resolved,
      earnedAmount,
      earnedCurrencyId,
      pathSteps: path?.steps ?? [],
      pathProduct: path?.product ?? 0,
      finalAmount: baseFinal,
      reachable,
      loyalties,
      totalFinalAmount: baseFinal + loyaltyTotal,
    };
  });

  ranked.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    return b.totalFinalAmount - a.totalFinalAmount;
  });

  return ranked;
}
