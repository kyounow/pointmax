// paymentApp.ts - v3 PR 3
// PaymentApp の評価は programEvaluator.ts (evaluatePrograms) が担う。
// このファイルは後方互換のため PaymentEvalResult 型と
// evaluatePaymentApps / bestPaymentApp の シグネチャを維持するが、
// 実装は programEvaluator ベースに統一されている。
//
// 旧フィールド (defaultBonusRate / defaultBonusCurrencyId / cardSpecificBonusRates) は
// BenefitProgram に移行済み。PaymentApp 型からは削除された。

import type {
  BenefitProgram,
  Card,
  ConversionEdge,
  PaymentApp,
  Store,
  StoreProgramMembership,
} from "./types";
import type { ResolvedRate } from "./resolveRate";
import { bestPath } from "./bestPath";
import { evaluatePrograms } from "./programEvaluator";

export type PaymentEvalResult = {
  paymentApp: PaymentApp;
  resolved: ResolvedRate;
  // クレカ部分の還元
  cardEarnedAmount: number;
  cardEarnedCurrencyId: string;
  cardFinalAmount: number;
  cardPathSteps: ConversionEdge[];
  cardReachable: boolean;
  // 決済アプリ自体のbonus還元 (addOn programs の合計)
  appBonusRate: number;
  appBonusEarnedAmount: number;
  appBonusEarnedCurrencyId: string | null;
  appBonusFinalAmount: number;
  appBonusPathSteps: ConversionEdge[];
  appBonusReachable: boolean;
  // 合計
  totalFinalAmount: number;
  reachable: boolean;
};

function isPaymentAppCompatible(card: Card, paymentApp: PaymentApp): boolean {
  if (!paymentApp.compatibleCardIds || paymentApp.compatibleCardIds.length === 0) {
    return true;
  }
  return paymentApp.compatibleCardIds.includes(card.id);
}

// このカードで使える各 PaymentApp について試算
// programEvaluator ベース: programs / memberships から PaymentApp bonus を評価
export function evaluatePaymentApps(
  card: Card,
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  paymentApps: PaymentApp[],
  _rules: unknown[], // kept for backward compat (unused, programs handle this)
  stores: Store[],
  edges: ConversionEdge[],
  availableCardIds?: ReadonlySet<string>,
  now: Date = new Date(),
  programs?: BenefitProgram[],
  memberships?: StoreProgramMembership[],
): PaymentEvalResult[] {
  const compatible = paymentApps.filter(
    (pa) => pa.enabled !== false && isPaymentAppCompatible(card, pa),
  );

  const store = stores.find((s) => s.id === storeId);

  return compatible.map((pa) => {
    const resolved: ResolvedRate = pa.chargeBased
      ? { rate: 0, currencyId: card.defaultCurrencyId, source: "charge" as const }
      : { rate: card.defaultRate, currencyId: card.defaultCurrencyId, source: "default" as const };

    const cardEarned = amount * resolved.rate;
    const cardCurrency = resolved.currencyId;
    const cardPath = bestPath(edges, cardCurrency, targetCurrencyId, cardEarned, availableCardIds);

    // programEvaluator ベース: PaymentApp × card の addOn programs
    let appBonusRate = 0;
    let appBonusEarned = 0;
    let appBonusCurrency: string | null = null;
    let appBonusPath: { finalAmount: number; steps: ConversionEdge[]; product: number } | null = null;

    if (store && programs && memberships) {
      const result = evaluatePrograms({ card, store, paymentApp: pa, programs, memberships, now });
      // primary: カード rate (non-chargeBased の場合、更新する)
      if (!pa.chargeBased && result.primary) {
        // resolvedRate を更新 (参照型なので new object)
        const primaryRate = result.primary.effectiveRate;
        const primaryCurrency = result.primary.effectiveCurrencyId;
        // update cardEarned with program rate
        const programEarned = amount * primaryRate;
        const programPath = bestPath(edges, primaryCurrency, targetCurrencyId, programEarned, availableCardIds);
        // addOns on top
        for (const addOn of result.addOns) {
          const ae = amount * addOn.effectiveRate;
          const ap = bestPath(edges, addOn.effectiveCurrencyId, targetCurrencyId, ae, availableCardIds);
          if (ap) {
            appBonusRate += addOn.effectiveRate;
            appBonusEarned += ae;
            appBonusCurrency = appBonusCurrency ?? addOn.effectiveCurrencyId;
            if (!appBonusPath) {
              appBonusPath = ap;
            } else {
              appBonusPath = {
                finalAmount: appBonusPath.finalAmount + ap.finalAmount,
                steps: [...appBonusPath.steps, ...ap.steps],
                product: appBonusPath.product,
              };
            }
          }
        }
        const cardFinal = programPath?.finalAmount ?? 0;
        const appFinal = appBonusPath?.finalAmount ?? 0;
        return {
          paymentApp: pa,
          resolved: { rate: primaryRate, currencyId: primaryCurrency, source: "rule" as const, ruleId: result.primary.program.id },
          cardEarnedAmount: programEarned,
          cardEarnedCurrencyId: primaryCurrency,
          cardFinalAmount: cardFinal,
          cardPathSteps: programPath?.steps ?? [],
          cardReachable: programPath !== null,
          appBonusRate,
          appBonusEarnedAmount: appBonusEarned,
          appBonusEarnedCurrencyId: appBonusCurrency,
          appBonusFinalAmount: appFinal,
          appBonusPathSteps: appBonusPath?.steps ?? [],
          appBonusReachable: appBonusPath !== null,
          totalFinalAmount: cardFinal + appFinal,
          reachable: programPath !== null || appBonusPath !== null,
        };
      }
      // chargeBased or no primary: addOns only
      for (const addOn of result.addOns) {
        const ae = amount * addOn.effectiveRate;
        const ap = bestPath(edges, addOn.effectiveCurrencyId, targetCurrencyId, ae, availableCardIds);
        if (ap) {
          appBonusRate += addOn.effectiveRate;
          appBonusEarned += ae;
          appBonusCurrency = appBonusCurrency ?? addOn.effectiveCurrencyId;
          if (!appBonusPath) {
            appBonusPath = ap;
          } else {
            appBonusPath = {
              finalAmount: appBonusPath.finalAmount + ap.finalAmount,
              steps: [...appBonusPath.steps, ...ap.steps],
              product: appBonusPath.product,
            };
          }
        }
      }
      // For chargeBased: primary is the app base bonus (paymentApp base rate)
      if (pa.chargeBased && result.primary) {
        const primaryRate = result.primary.effectiveRate;
        const primaryCurrency = result.primary.effectiveCurrencyId;
        const primaryEarned = amount * primaryRate;
        const primaryPath = bestPath(edges, primaryCurrency, targetCurrencyId, primaryEarned, availableCardIds);
        const cardFinal = primaryPath?.finalAmount ?? 0;
        const appFinal = appBonusPath?.finalAmount ?? 0;
        return {
          paymentApp: pa,
          resolved,
          cardEarnedAmount: primaryEarned,
          cardEarnedCurrencyId: primaryCurrency,
          cardFinalAmount: cardFinal,
          cardPathSteps: primaryPath?.steps ?? [],
          cardReachable: primaryPath !== null,
          appBonusRate,
          appBonusEarnedAmount: appBonusEarned,
          appBonusEarnedCurrencyId: appBonusCurrency,
          appBonusFinalAmount: appFinal,
          appBonusPathSteps: appBonusPath?.steps ?? [],
          appBonusReachable: appBonusPath !== null,
          totalFinalAmount: cardFinal + appFinal,
          reachable: primaryPath !== null || appBonusPath !== null,
        };
      }
    }

    const cardFinal = cardPath?.finalAmount ?? 0;
    const appFinal = appBonusPath?.finalAmount ?? 0;

    return {
      paymentApp: pa,
      resolved,
      cardEarnedAmount: cardEarned,
      cardEarnedCurrencyId: cardCurrency,
      cardFinalAmount: cardFinal,
      cardPathSteps: cardPath?.steps ?? [],
      cardReachable: cardPath !== null,
      appBonusRate,
      appBonusEarnedAmount: appBonusEarned,
      appBonusEarnedCurrencyId: appBonusCurrency,
      appBonusFinalAmount: appFinal,
      appBonusPathSteps: appBonusPath?.steps ?? [],
      appBonusReachable: appBonusPath !== null,
      totalFinalAmount: cardFinal + appFinal,
      reachable: cardPath !== null || appBonusPath !== null,
    };
  });
}

// このカードで使える PaymentApp の中で最良を返す
export function bestPaymentApp(
  card: Card,
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  paymentApps: PaymentApp[],
  rules: unknown[],
  stores: Store[],
  edges: ConversionEdge[],
  availableCardIds?: ReadonlySet<string>,
  now: Date = new Date(),
  programs?: BenefitProgram[],
  memberships?: StoreProgramMembership[],
): PaymentEvalResult | null {
  const results = evaluatePaymentApps(
    card, storeId, amount, targetCurrencyId, paymentApps, rules, stores, edges,
    availableCardIds, now, programs, memberships,
  );
  if (results.length === 0) return null;
  results.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    return b.totalFinalAmount - a.totalFinalAmount;
  });
  return results[0];
}
