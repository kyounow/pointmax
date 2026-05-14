import type {
  BenefitProgram,
  Card,
  ConversionEdge,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreProgramMembership,
  StoreRule,
} from "./types";
import { resolveRate, type ResolvedRate } from "./resolveRate";
import { bestPath } from "./bestPath";
import { bestLoyalties, type LoyaltyResult } from "./loyalty";
import { bestPaymentApp, type PaymentEvalResult } from "./paymentApp";
import { evaluatePrograms } from "./programEvaluator";

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
    rules,
    edges,
    pointCards = [],
    loyaltyRules = [],
    paymentApps = [],
    programs = [],
    memberships = [],
  } = input;

  // enabled === false のカードは Calculator 順位付けから除外する。
  // undefined / true はそのまま通す（後方互換）
  // includeDisabled: true なら disabled card も含める
  const targetCards = includeDisabled
    ? cards
    : cards.filter((c) => c.enabled !== false);

  // enabled なカード id の集合。ConversionEdge.requiredCardIds のゲート判定に使う。
  // 「カード保有 = state.cards にあり、かつ enabled !== false」と定義 (v2 step 1 と整合)。
  // NOTE: availableCardIds は常に enabled カードのみ (requiredCardIds ゲートは実保有カードで判定)
  const enabledCards = cards.filter((c) => c.enabled !== false);
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

  // programs/memberships 評価用のダミー PaymentApp (paymentApp 引数が必要だが未選択の場合)
  const DIRECT_PAYMENT_APP: PaymentApp = { id: "__direct__", name: "直接決済" };

  const ranked: CardRanking[] = targetCards.map((card) => {
    // PaymentApp が登録されていない場合は従来通り (resolveRate のみ) + program 評価
    if (paymentApps.length === 0) {
      const resolved = resolveRate(card, payment.storeId, rules, stores);

      // PR 1 並行運用: 旧 resolveRate rate と新 program rate を比較して大きい方を採用
      const storeObj = stores.find((s) => s.id === payment.storeId);
      const programResult = storeObj
        ? evaluatePrograms({
            card,
            store: storeObj,
            paymentApp: DIRECT_PAYMENT_APP,
            programs,
            memberships,
          })
        : null;
      const programRate = programResult?.primary?.effectiveRate ?? 0;
      const programCurrencyId = programResult?.primary?.effectiveCurrencyId;

      const effectiveRate =
        programRate > resolved.rate ? programRate : resolved.rate;
      const effectiveCurrencyId =
        programRate > resolved.rate
          ? (programCurrencyId ?? resolved.currencyId)
          : resolved.currencyId;

      const earnedAmount = payment.amount * effectiveRate;
      const earnedCurrencyId = effectiveCurrencyId;
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
      // 互換 PaymentApp 無し（例外的）→ resolveRate のみ + program 評価
      const resolved = resolveRate(card, payment.storeId, rules, stores);

      const storeObj = stores.find((s) => s.id === payment.storeId);
      const programResult = storeObj
        ? evaluatePrograms({
            card,
            store: storeObj,
            paymentApp: DIRECT_PAYMENT_APP,
            programs,
            memberships,
          })
        : null;
      const programRate = programResult?.primary?.effectiveRate ?? 0;
      const programCurrencyId = programResult?.primary?.effectiveCurrencyId;

      const effectiveRate =
        programRate > resolved.rate ? programRate : resolved.rate;
      const effectiveCurrencyId =
        programRate > resolved.rate
          ? (programCurrencyId ?? resolved.currencyId)
          : resolved.currencyId;

      const earnedAmount = payment.amount * effectiveRate;
      const earnedCurrencyId = effectiveCurrencyId;
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

    // PaymentApp あり: program rate を best.cardEarnedRate と比較
    // chargeBased=true の場合は JAL特約店 等の店舗 program は bypass しない
    // (program は paymentApp に依存しない rate として別途評価)
    const storeObj = stores.find((s) => s.id === payment.storeId);
    const programResult = storeObj
      ? evaluatePrograms({
          card,
          store: storeObj,
          paymentApp: best.paymentApp,
          programs,
          memberships,
        })
      : null;
    const programRate = programResult?.primary?.effectiveRate ?? 0;
    const programCurrencyId = programResult?.primary?.effectiveCurrencyId;

    // chargeBased=true の場合、best.resolved.rate=0 なので program rate があれば採用
    const cardBaseRate = best.resolved.rate;
    const useProgram = programRate > cardBaseRate;
    const finalCardRate = useProgram ? programRate : cardBaseRate;
    const finalCardCurrencyId = useProgram
      ? (programCurrencyId ?? best.cardEarnedCurrencyId)
      : best.cardEarnedCurrencyId;

    if (useProgram) {
      // program rate 採用: cardEarnedAmount を再計算
      const earnedAmount = payment.amount * finalCardRate;
      const path = bestPath(
        edges,
        finalCardCurrencyId,
        targetCurrencyId,
        earnedAmount,
        availableCardIds,
      );
      const cardFinal = path?.finalAmount ?? 0;
      return {
        card,
        resolved: best.resolved,
        earnedAmount,
        earnedCurrencyId: finalCardCurrencyId,
        pathSteps: path?.steps ?? [],
        pathProduct: 0,
        finalAmount: cardFinal,
        reachable: path !== null,
        paymentApp: best.paymentApp,
        appBonusRate: best.appBonusRate,
        appBonusFinalAmount: best.appBonusFinalAmount,
        appBonusEarnedAmount: best.appBonusEarnedAmount,
        appBonusCurrencyId: best.appBonusEarnedCurrencyId,
        appBonusReachable: best.appBonusReachable,
        loyalties,
        totalFinalAmount: cardFinal + best.appBonusFinalAmount + loyaltyTotal,
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
    // 0次: reachable を優先 (既存)
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;

    // 1次: totalFinalAmount 降順
    if (a.totalFinalAmount !== b.totalFinalAmount) {
      return b.totalFinalAmount - a.totalFinalAmount;
    }

    // 2次: 支払単独 (card + appBonus、loyalty 除く) 多い順
    // 「支払単独で稼げる量」を優先 (loyalty に依存しない方がシンプル)
    const aPay = a.finalAmount + a.appBonusFinalAmount;
    const bPay = b.finalAmount + b.appBonusFinalAmount;
    if (aPay !== bPay) return bPay - aPay;

    // 3次: 構成要素少ない順 (シンプル優先)
    // 計算に絡む要素が少ない方を上位に
    const partCount = (r: CardRanking) =>
      (r.finalAmount > 0 ? 1 : 0) +
      (r.appBonusFinalAmount > 0 ? 1 : 0) +
      r.loyalties.filter((l) => l.reachable).length;
    return partCount(a) - partCount(b);
  });

  return ranked;
}
