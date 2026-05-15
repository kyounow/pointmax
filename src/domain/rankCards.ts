import type {
  BenefitProgram,
  Card,
  ConversionEdge,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreProgramMembership,
} from "./types";
import { bestPath } from "./bestPath";
import { bestLoyalties, type LoyaltyResult } from "./loyalty";
import { evaluatePrograms } from "./programEvaluator";

// ResolvedRate は programEvaluator ベース。後方互換のため source フィールドを維持。
export type ResolvedRate =
  | { rate: number; currencyId: string; source: "default" }
  | { rate: number; currencyId: string; source: "charge" }
  | {
      rate: number;
      currencyId: string;
      source: "program";
      programId: string;
    };

export type RankInput = {
  payment: { storeId: string; amount: number };
  targetCurrencyId: string;
  cards: Card[];
  stores: Store[];
  edges: ConversionEdge[];
  pointCards?: PointCard[];
  loyaltyRules?: LoyaltyRule[];
  paymentApps?: PaymentApp[];
  programs?: BenefitProgram[];
  memberships?: StoreProgramMembership[];
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

// このカード × この支払アプリが使えるか判定
function isPaymentAppCompatible(card: Card, paymentApp: PaymentApp): boolean {
  if (!paymentApp.compatibleCardIds || paymentApp.compatibleCardIds.length === 0) {
    return true;
  }
  return paymentApp.compatibleCardIds.includes(card.id);
}

export function rankCards(
  input: RankInput,
  options: { includeDisabled?: boolean } = {},
): CardRanking[] {
  const { includeDisabled = false } = options;
  const {
    payment,
    targetCurrencyId,
    cards,
    stores,
    edges,
    pointCards = [],
    loyaltyRules = [],
    paymentApps = [],
    programs = [],
    memberships = [],
  } = input;

  const targetCards = includeDisabled
    ? cards
    : cards.filter((c) => c.enabled !== false);

  const enabledCards = cards.filter((c) => c.enabled !== false);
  const availableCardIds = new Set(enabledCards.map((c) => c.id));

  const store = stores.find((s) => s.id === payment.storeId);
  const maxStacks = Math.max(0, store?.maxLoyaltyStacks ?? 1);

  // ─── Loyalty (ポイントカード提示) 評価 ───
  // programEvaluator ベースの loyalty: pointCardId を持つ programs を評価
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
    programs,
    memberships,
  );
  const loyaltyTotal = loyalties.reduce(
    (sum, r) => sum + (r.reachable ? r.finalAmount : 0),
    0,
  );

  const DIRECT_PAYMENT_APP: PaymentApp = { id: "__direct__", name: "直接決済" };

  const ranked: CardRanking[] = targetCards.map((card) => {
    // PaymentApp なし: programEvaluator のみ
    if (paymentApps.length === 0 || !store) {
      const storeObj = store ?? null;
      const programResult = storeObj
        ? evaluatePrograms({
            card,
            store: storeObj,
            paymentApp: DIRECT_PAYMENT_APP,
            programs,
            memberships,
          })
        : null;

      const primary = programResult?.primary ?? null;
      const addOns = programResult?.addOns ?? [];

      // カード rate: primary program rate または defaultRate
      const cardRate = primary?.effectiveRate ?? card.defaultRate;
      const cardCurrencyId = primary?.effectiveCurrencyId ?? card.defaultCurrencyId;

      const resolved: ResolvedRate = primary
        ? { rate: cardRate, currencyId: cardCurrencyId, source: "program", programId: primary.program.id }
        : { rate: card.defaultRate, currencyId: card.defaultCurrencyId, source: "default" };

      const earnedAmount = payment.amount * cardRate;
      const path = bestPath(edges, cardCurrencyId, targetCurrencyId, earnedAmount, availableCardIds);
      const baseFinal = path?.finalAmount ?? 0;

      // addOn programs の合計 (paymentApp なし時は appBonus として表現)
      let appBonusTotal = 0;
      let appBonusRate = 0;
      let appBonusCurrencyId: string | null = null;
      for (const addOn of addOns) {
        const addOnEarned = payment.amount * addOn.effectiveRate;
        const addOnPath = bestPath(edges, addOn.effectiveCurrencyId, targetCurrencyId, addOnEarned, availableCardIds);
        if (addOnPath) {
          appBonusTotal += addOnPath.finalAmount;
          appBonusRate += addOn.effectiveRate;
          appBonusCurrencyId = appBonusCurrencyId ?? addOn.effectiveCurrencyId;
        }
      }

      return {
        card,
        resolved,
        earnedAmount,
        earnedCurrencyId: cardCurrencyId,
        pathSteps: path?.steps ?? [],
        pathProduct: path?.product ?? 0,
        finalAmount: baseFinal,
        reachable: path !== null,
        paymentApp: null,
        appBonusRate,
        appBonusFinalAmount: appBonusTotal,
        appBonusEarnedAmount: appBonusTotal,
        appBonusCurrencyId,
        appBonusReachable: appBonusTotal > 0,
        loyalties,
        totalFinalAmount: baseFinal + appBonusTotal + loyaltyTotal,
      };
    }

    // PaymentApp あり: 各 app を試算して最良を選択
    const compatibleApps = paymentApps.filter(
      (pa) => pa.enabled !== false && isPaymentAppCompatible(card, pa),
    );

    // PaymentApp なし (互換なし) → direct 評価にフォールバック
    if (compatibleApps.length === 0) {
      const programResult = evaluatePrograms({
        card,
        store,
        paymentApp: DIRECT_PAYMENT_APP,
        programs,
        memberships,
      });
      const primary = programResult.primary;
      const cardRate = primary?.effectiveRate ?? card.defaultRate;
      const cardCurrencyId = primary?.effectiveCurrencyId ?? card.defaultCurrencyId;
      const resolved: ResolvedRate = primary
        ? { rate: cardRate, currencyId: cardCurrencyId, source: "program", programId: primary.program.id }
        : { rate: card.defaultRate, currencyId: card.defaultCurrencyId, source: "default" };
      const earnedAmount = payment.amount * cardRate;
      const path = bestPath(edges, cardCurrencyId, targetCurrencyId, earnedAmount, availableCardIds);
      const baseFinal = path?.finalAmount ?? 0;
      return {
        card,
        resolved,
        earnedAmount,
        earnedCurrencyId: cardCurrencyId,
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

    // 各 PaymentApp について programEvaluator で評価
    type AppEval = {
      pa: PaymentApp;
      cardRate: number;
      cardCurrencyId: string;
      resolved: ResolvedRate;
      cardFinal: number;
      cardReachable: boolean;
      appBonusRate: number;
      appBonusFinal: number;
      appBonusCurrencyId: string | null;
      appBonusReachable: boolean;
      total: number;
    };

    const appEvals: AppEval[] = compatibleApps.map((pa) => {
      const programResult = evaluatePrograms({
        card,
        store,
        paymentApp: pa,
        programs,
        memberships,
      });

      const primary = programResult.primary;
      const addOns = programResult.addOns;

      // chargeBased=true: カード自身の還元は 0、bonus のみ (paymentApp program が全部カバー)
      let cardRate: number;
      let cardCurrencyId: string;
      let resolved: ResolvedRate;

      if (pa.chargeBased) {
        // chargeBased: primary program rate (paymentApp base bonus) or 0
        const baseRate = primary?.effectiveRate ?? 0;
        const baseCurrency = primary?.effectiveCurrencyId ?? card.defaultCurrencyId;
        cardRate = baseRate;
        cardCurrencyId = baseCurrency;
        resolved = { rate: 0, currencyId: card.defaultCurrencyId, source: "charge" };
      } else {
        // 通常: primary program rate (card × store) or defaultRate
        cardRate = primary?.effectiveRate ?? card.defaultRate;
        cardCurrencyId = primary?.effectiveCurrencyId ?? card.defaultCurrencyId;
        resolved = primary
          ? { rate: cardRate, currencyId: cardCurrencyId, source: "program", programId: primary.program.id }
          : { rate: card.defaultRate, currencyId: card.defaultCurrencyId, source: "default" };
      }

      const cardEarned = payment.amount * cardRate;
      const cardPath = bestPath(edges, cardCurrencyId, targetCurrencyId, cardEarned, availableCardIds);
      const cardFinal = cardPath?.finalAmount ?? 0;

      // addOn programs の合計
      let appBonusTotal = 0;
      let appBonusRateTotal = 0;
      let appBonusCurrencyId: string | null = null;
      for (const addOn of addOns) {
        const addOnEarned = payment.amount * addOn.effectiveRate;
        const addOnPath = bestPath(edges, addOn.effectiveCurrencyId, targetCurrencyId, addOnEarned, availableCardIds);
        if (addOnPath) {
          appBonusTotal += addOnPath.finalAmount;
          appBonusRateTotal += addOn.effectiveRate;
          appBonusCurrencyId = appBonusCurrencyId ?? addOn.effectiveCurrencyId;
        }
      }

      return {
        pa,
        cardRate,
        cardCurrencyId,
        resolved,
        cardFinal,
        cardReachable: cardPath !== null,
        appBonusRate: appBonusRateTotal,
        appBonusFinal: appBonusTotal,
        appBonusCurrencyId,
        appBonusReachable: appBonusTotal > 0,
        total: cardFinal + appBonusTotal,
      };
    });

    // 最良 app を選ぶ (reachable 優先 / total 降順)
    appEvals.sort((a, b) => {
      const aReach = a.cardReachable || a.appBonusReachable;
      const bReach = b.cardReachable || b.appBonusReachable;
      if (aReach !== bReach) return aReach ? -1 : 1;
      return b.total - a.total;
    });

    const best = appEvals[0];

    return {
      card,
      resolved: best.resolved,
      earnedAmount: payment.amount * best.cardRate,
      earnedCurrencyId: best.cardCurrencyId,
      pathSteps: [],
      pathProduct: 0,
      finalAmount: best.cardFinal,
      // reachable: target 通貨で何らかの earn (card primary / addOn / loyalty のいずれか) が
      // 発生する場合は true。以前は best.cardReachable のみだったため、chargeBased な
      // paymentApp (例: pa-waon) + 孤立通貨 target (waon-pt) で「addOn 単独で earn する
      // のに header は 対象外」という矛盾表示が出ていた (v3.6.0 で発覚した bug)。
      reachable:
        best.cardReachable ||
        best.appBonusReachable ||
        loyaltyTotal > 0,
      paymentApp: best.pa,
      appBonusRate: best.appBonusRate,
      appBonusFinalAmount: best.appBonusFinal,
      appBonusEarnedAmount: best.appBonusFinal,
      appBonusCurrencyId: best.appBonusCurrencyId,
      appBonusReachable: best.appBonusReachable,
      loyalties,
      totalFinalAmount: best.total + loyaltyTotal,
    };
  });

  ranked.sort((a, b) => {
    // 0次: reachable を優先
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;

    // 1次: totalFinalAmount 降順
    if (a.totalFinalAmount !== b.totalFinalAmount) {
      return b.totalFinalAmount - a.totalFinalAmount;
    }

    // 2次: 支払単独 (card + appBonus、loyalty 除く) 多い順
    const aPay = a.finalAmount + a.appBonusFinalAmount;
    const bPay = b.finalAmount + b.appBonusFinalAmount;
    if (aPay !== bPay) return bPay - aPay;

    // 3次: 構成要素少ない順
    const partCount = (r: CardRanking) =>
      (r.finalAmount > 0 ? 1 : 0) +
      (r.appBonusFinalAmount > 0 ? 1 : 0) +
      r.loyalties.filter((l) => l.reachable).length;
    return partCount(a) - partCount(b);
  });

  return ranked;
}
