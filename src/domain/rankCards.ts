import type {
  Card,
  ConversionEdge,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreRule,
} from "./types";
import { resolveRate, type ResolvedRate } from "./resolveRate";
import { bestPath } from "./bestPath";
import { bestLoyalties, type LoyaltyResult } from "./loyalty";
import { bestPaymentApp, type PaymentEvalResult } from "./paymentApp";

export type RankInput = {
  payment: { storeId: string; amount: number };
  targetCurrencyId: string;
  cards: Card[];
  stores: Store[];
  rules: StoreRule[];
  edges: ConversionEdge[];
  pointCards?: PointCard[];
  loyaltyRules?: LoyaltyRule[];
  paymentApps?: PaymentApp[];
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
  // 採用された支払アプリ (paymentApps が渡されない場合は null)
  paymentApp: PaymentApp | null;
  // 支払アプリのbonus還元結果
  appBonusRate: number; // 実際に適用された bonus 還元率
  appBonusFinalAmount: number; // target通貨換算
  appBonusEarnedAmount: number; // bonus額 (アプリ通貨)
  appBonusCurrencyId: string | null;
  appBonusReachable: boolean;
  // ポイントカード提示の二重取り
  loyalties: LoyaltyResult[];
  totalFinalAmount: number;
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
    paymentApps = [],
  } = input;

  // enabled === false のカードは Calculator 順位付けから除外する。
  // undefined / true はそのまま通す（後方互換）
  const enabledCards = cards.filter((c) => c.enabled !== false);

  // enabled なカード id の集合。ConversionEdge.requiredCardIds のゲート判定に使う。
  // 「カード保有 = state.cards にあり、かつ enabled !== false」と定義 (v2 step 1 と整合)。
  const availableCardIds = new Set(enabledCards.map((c) => c.id));

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
    store?.preferredPointCardIds,
    new Date(),
    availableCardIds,
  );
  const loyaltyTotal = loyalties.reduce(
    (sum, r) => sum + (r.reachable ? r.finalAmount : 0),
    0,
  );

  const ranked: CardRanking[] = enabledCards.map((card) => {
    // PaymentApp が登録されていない場合は従来通り (resolveRate のみ)
    if (paymentApps.length === 0) {
      const resolved = resolveRate(card, payment.storeId, rules, stores);
      const earnedAmount = payment.amount * resolved.rate;
      const earnedCurrencyId = resolved.currencyId;
      const path = bestPath(
        edges,
        earnedCurrencyId,
        targetCurrencyId,
        earnedAmount,
        availableCardIds,
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
        paymentApp: null,
        appBonusRate: 0,
        appBonusFinalAmount: 0,
        appBonusEarnedAmount: 0,
        appBonusCurrencyId: null,
        appBonusReachable: false,
        loyalties,
        totalFinalAmount: baseFinal + loyaltyTotal,
      };
    }

    // PaymentApp 登録あり: 各PaymentAppを試算してbest選択
    const best: PaymentEvalResult | null = bestPaymentApp(
      card,
      payment.storeId,
      payment.amount,
      targetCurrencyId,
      paymentApps,
      rules,
      stores,
      edges,
      availableCardIds,
    );
    if (!best) {
      // 互換 PaymentApp 無し（例外的）→ resolveRate のみ
      const resolved = resolveRate(card, payment.storeId, rules, stores);
      const earnedAmount = payment.amount * resolved.rate;
      const earnedCurrencyId = resolved.currencyId;
      const path = bestPath(
        edges,
        earnedCurrencyId,
        targetCurrencyId,
        earnedAmount,
        availableCardIds,
      );
      const baseFinal = path?.finalAmount ?? 0;
      return {
        card,
        resolved,
        earnedAmount,
        earnedCurrencyId,
        pathSteps: path?.steps ?? [],
        pathProduct: path?.product ?? 0,
        finalAmount: baseFinal,
        reachable: path !== null,
        paymentApp: null,
        appBonusRate: 0,
        appBonusFinalAmount: 0,
        appBonusEarnedAmount: 0,
        appBonusCurrencyId: null,
        appBonusReachable: false,
        loyalties,
        totalFinalAmount: baseFinal + loyaltyTotal,
      };
    }

    return {
      card,
      resolved: best.resolved,
      earnedAmount: best.cardEarnedAmount,
      earnedCurrencyId: best.cardEarnedCurrencyId,
      pathSteps: best.cardPathSteps,
      pathProduct: 0,
      finalAmount: best.cardFinalAmount,
      reachable: best.cardReachable,
      paymentApp: best.paymentApp,
      appBonusRate: best.appBonusRate,
      appBonusFinalAmount: best.appBonusFinalAmount,
      appBonusEarnedAmount: best.appBonusEarnedAmount,
      appBonusCurrencyId: best.appBonusEarnedCurrencyId,
      appBonusReachable: best.appBonusReachable,
      loyalties,
      totalFinalAmount:
        best.cardFinalAmount + best.appBonusFinalAmount + loyaltyTotal,
    };
  });

  ranked.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    return b.totalFinalAmount - a.totalFinalAmount;
  });

  return ranked;
}
