import type {
  Card,
  ConversionEdge,
  PaymentApp,
  Store,
  StoreRule,
} from "./types";
import { resolveRate, type ResolvedRate } from "./resolveRate";
import { bestPath } from "./bestPath";
import { isRuleActiveAt } from "./ruleActiveAt";

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
// active なルールが複数あれば最高 rate を採用
function resolveRateForPaymentApp(
  card: Card,
  storeId: string,
  rules: StoreRule[],
  stores: Store[],
  paymentApp: PaymentApp,
  now: Date = new Date(),
): ResolvedRate {
  // paymentAppId が一致する直接ルール (storeId) のうち active なもの
  const directMatches = rules.filter(
    (r) =>
      r.cardId === card.id &&
      r.storeId === storeId &&
      r.paymentAppId === paymentApp.id &&
      isRuleActiveAt(r, now),
  );
  if (directMatches.length > 0) {
    const best = pickHighestRate(directMatches);
    return {
      rate: best.rate,
      currencyId: best.currencyId,
      source: "rule",
      ruleId: best.id,
      validFrom: best.validFrom,
      validTo: best.validTo,
    };
  }
  // paymentAppId が一致するカテゴリルール
  const store = stores.find((s) => s.id === storeId);
  if (store?.category) {
    const catMatches = rules.filter(
      (r) =>
        r.cardId === card.id &&
        r.category === store.category &&
        r.paymentAppId === paymentApp.id &&
        isRuleActiveAt(r, now),
    );
    if (catMatches.length > 0) {
      const best = pickHighestRate(catMatches);
      return {
        rate: best.rate,
        currencyId: best.currencyId,
        source: "category",
        ruleId: best.id,
        validFrom: best.validFrom,
        validTo: best.validTo,
      };
    }
  }
  // paymentAppId 指定なし (汎用) ルールにフォールバック
  // paymentAppId を持つルールは「特定支払方法専用」なので除外
  const universalRules = rules.filter((r) => !r.paymentAppId);
  return resolveRate(card, storeId, universalRules, stores, now);
}

function pickHighestRate(rules: StoreRule[]): StoreRule {
  return [...rules].sort((a, b) => {
    if (b.rate !== a.rate) return b.rate - a.rate;
    return a.id.localeCompare(b.id);
  })[0];
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
  availableCardIds?: ReadonlySet<string>,
  now: Date = new Date(),
): PaymentEvalResult[] {
  const compatible = paymentApps.filter((pa) =>
    isPaymentAppCompatible(card, pa),
  );
  return compatible.map((pa) => {
    const resolved: ResolvedRate = pa.chargeBased
      ? {
          // chargeBased=true (= チャージ式) はカード自身の還元が乗らない。
          // 0 を入れて、bonus 計算で全てカバー。
          rate: 0,
          currencyId: card.defaultCurrencyId,
          source: "charge" as const,
        }
      : resolveRateForPaymentApp(card, storeId, rules, stores, pa, now);

    // クレカ部分 (chargeBased=true なら 0)
    const cardEarned = amount * resolved.rate;
    const cardCurrency = resolved.currencyId;
    const cardPath = bestPath(edges, cardCurrency, targetCurrencyId, cardEarned, availableCardIds);

    // アプリ bonus = ベース (defaultBonusRate) + 上乗せ (cardSpecific.rate)
    // chargeBased=true: bonus = defaultBonusRate + cardSpecific.rate の累積で全てカバー
    // chargeBased=false: bonus は追加ボーナス (カード還元との二重取り)
    // 有効期間 (validFrom/validTo) が設定されている場合は now 時点での active なエントリのみ参照
    const cardSpecific = pa.cardSpecificBonusRates?.find(
      (b) => b.cardId === card.id && isRuleActiveAt(b, now),
    );
    const baseBonus = pa.defaultBonusRate ?? 0;
    const addOnBonus = cardSpecific?.rate ?? 0;
    const bonusRate = baseBonus + addOnBonus;
    // bonusCurrency は cardSpecific 優先、なければ defaultBonusCurrencyId
    const bonusCurrency =
      cardSpecific?.currencyId ?? pa.defaultBonusCurrencyId ?? null;
    const bonusEarned = amount * bonusRate;
    const bonusPath =
      bonusRate > 0 && bonusCurrency
        ? bestPath(edges, bonusCurrency, targetCurrencyId, bonusEarned, availableCardIds)
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
  // ConversionEdge.requiredCardIds によるゲート判定に使う enabled なカード id の集合。
  // 渡された場合のみ制約チェックが行われる (未指定 = 後方互換で全エッジ使用)。
  availableCardIds?: ReadonlySet<string>,
  now: Date = new Date(),
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
    availableCardIds,
    now,
  );
  if (results.length === 0) return null;
  // reachable 優先 / totalFinalAmount 降順
  results.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    return b.totalFinalAmount - a.totalFinalAmount;
  });
  return results[0];
}
