import type {
  Card,
  ConversionEdge,
  PaymentApp,
  Store,
  StoreRule,
} from "./types";
import { resolveRate, type ResolvedRate } from "./resolveRate";
import { bestPath } from "./bestPath";

export type PaymentEvalResult = {
  paymentApp: PaymentApp;
  resolved: ResolvedRate;
  // クレカ部分の還元
  cardEarnedAmount: number;
  cardEarnedCurrencyId: string;
  cardFinalAmount: number; // target通貨換算
  cardPathSteps: ConversionEdge[];
  cardReachable: boolean;
  // 決済アプリ自体のbonus還元
  appBonusRate: number; // 実際に適用された bonus 還元率 (cardSpecific があれば反映)
  appBonusEarnedAmount: number;
  appBonusEarnedCurrencyId: string | null;
  appBonusFinalAmount: number; // target通貨換算
  appBonusPathSteps: ConversionEdge[];
  appBonusReachable: boolean;
  // 合計
  totalFinalAmount: number;
  reachable: boolean; // どちらか一方でも到達可能なら true
};

// このカード × この支払アプリが使えるか判定
function isPaymentAppCompatible(
  card: Card,
  paymentApp: PaymentApp,
): boolean {
  if (
    !paymentApp.compatibleCardIds ||
    paymentApp.compatibleCardIds.length === 0
  ) {
    return true; // 互換制約なし = 全カードOK
  }
  return paymentApp.compatibleCardIds.includes(card.id);
}

// 指定の paymentApp に紐づくルールを優先的に解決
// (paymentAppId 一致 > 汎用 > デフォルト)
function resolveRateForPaymentApp(
  card: Card,
  storeId: string,
  rules: StoreRule[],
  stores: Store[],
  paymentApp: PaymentApp,
): ResolvedRate {
  // paymentAppId が一致する直接ルール (storeId)
  const directWithApp = rules.find(
    (r) =>
      r.cardId === card.id &&
      r.storeId === storeId &&
      r.paymentAppId === paymentApp.id,
  );
  if (directWithApp) {
    return {
      rate: directWithApp.rate,
      currencyId: directWithApp.currencyId,
      source: "rule",
      ruleId: directWithApp.id,
    };
  }
  // paymentAppId が一致するカテゴリルール
  const store = stores.find((s) => s.id === storeId);
  if (store?.category) {
    const catWithApp = rules.find(
      (r) =>
        r.cardId === card.id &&
        r.category === store.category &&
        r.paymentAppId === paymentApp.id,
    );
    if (catWithApp) {
      return {
        rate: catWithApp.rate,
        currencyId: catWithApp.currencyId,
        source: "category",
        ruleId: catWithApp.id,
      };
    }
  }
  // paymentAppId 指定なし (汎用) ルールにフォールバック
  // paymentAppId を持つルールは「特定支払方法専用」なので除外
  const universalRules = rules.filter((r) => !r.paymentAppId);
  return resolveRate(card, storeId, universalRules, stores);
}

// このカードで使える各 PaymentApp について試算
// chargeBased=true (楽天Pay/d払い/PayPay 等) はカード直接決済ではないため、
// JAL特約店2% 等の店舗別ルール/カテゴリルールは適用されない。カード本来の還元率のみ。
export function evaluatePaymentApps(
  card: Card,
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  paymentApps: PaymentApp[],
  rules: StoreRule[],
  stores: Store[],
  edges: ConversionEdge[],
): PaymentEvalResult[] {
  const compatible = paymentApps.filter((pa) =>
    isPaymentAppCompatible(card, pa),
  );
  return compatible.map((pa) => {
    const resolved: ResolvedRate = pa.chargeBased
      ? {
          rate: card.defaultRate,
          currencyId: card.defaultCurrencyId,
          source: "default",
        }
      : resolveRateForPaymentApp(card, storeId, rules, stores, pa);
    // クレカ部分
    const cardEarned = amount * resolved.rate;
    const cardCurrency = resolved.currencyId;
    const cardPath = bestPath(edges, cardCurrency, targetCurrencyId, cardEarned);

    // アプリ自体のbonus還元
    // 紐付けカード (card) に対応する cardSpecificBonusRates があればそれを使用
    // (例: d払い × dカードは 1%、他社カードは 0%)
    const cardSpecific = pa.cardSpecificBonusRates?.find(
      (b) => b.cardId === card.id,
    );
    const bonusRate = cardSpecific?.rate ?? pa.defaultBonusRate ?? 0;
    const bonusCurrency =
      cardSpecific?.currencyId ?? pa.defaultBonusCurrencyId ?? null;
    const bonusEarned = amount * bonusRate;
    const bonusPath =
      bonusRate > 0 && bonusCurrency
        ? bestPath(edges, bonusCurrency, targetCurrencyId, bonusEarned)
        : null;

    const cardFinal = cardPath?.finalAmount ?? 0;
    const appFinal = bonusPath?.finalAmount ?? 0;
    const cardReachable = cardPath !== null;
    const appReachable = bonusPath !== null;

    return {
      paymentApp: pa,
      resolved,
      cardEarnedAmount: cardEarned,
      cardEarnedCurrencyId: cardCurrency,
      cardFinalAmount: cardFinal,
      cardPathSteps: cardPath?.steps ?? [],
      cardReachable,
      appBonusRate: bonusRate,
      appBonusEarnedAmount: bonusEarned,
      appBonusEarnedCurrencyId: bonusCurrency,
      appBonusFinalAmount: appFinal,
      appBonusPathSteps: bonusPath?.steps ?? [],
      appBonusReachable: appReachable,
      totalFinalAmount: cardFinal + appFinal,
      reachable: cardReachable || appReachable,
    };
  });
}

// このカードで使える PaymentApp の中で最良 (totalFinalAmount 最大) を返す
export function bestPaymentApp(
  card: Card,
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  paymentApps: PaymentApp[],
  rules: StoreRule[],
  stores: Store[],
  edges: ConversionEdge[],
): PaymentEvalResult | null {
  const results = evaluatePaymentApps(
    card,
    storeId,
    amount,
    targetCurrencyId,
    paymentApps,
    rules,
    stores,
    edges,
  );
  if (results.length === 0) return null;
  // reachable 優先 / totalFinalAmount 降順
  results.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    return b.totalFinalAmount - a.totalFinalAmount;
  });
  return results[0];
}
