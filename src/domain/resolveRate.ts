import type { Card, Store, StoreRule } from "./types";
import { isRuleActiveAt } from "./ruleActiveAt";

export type ResolvedRate =
  | { rate: number; currencyId: string; source: "default" }
  | {
      rate: number;
      currencyId: string;
      source: "rule";
      ruleId: string;
      validFrom?: string;
      validTo?: string;
      notes?: string;
    }
  | {
      rate: number;
      currencyId: string;
      source: "category";
      ruleId: string;
      validFrom?: string;
      validTo?: string;
      notes?: string;
    };

// カード × 店舗 (or カテゴリ) を解決して還元率と通貨を返す。
// 呼び出し側 (paymentApp.ts) は paymentApp 専用ルールを先に試した後、
// このメソッドには paymentAppId が無い汎用ルールだけを渡す。
// 優先順位: 直接ルール (storeId) > カテゴリルール > カード本来の defaultRate
// 同じ specificity でアクティブなルールが複数あれば最高 rate を採用
// (例: 通常 1% + キャンペーン 5% が両方アクティブ → 5%)。
export function resolveRate(
  card: Card,
  storeId: string,
  rules: StoreRule[],
  stores: Store[],
  now: Date = new Date(),
): ResolvedRate {
  // 1. 直接ルール (cardId × storeId) のうち active なもの
  const directMatches = rules.filter(
    (r) =>
      r.cardId === card.id &&
      r.storeId === storeId &&
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
      notes: best.notes,
    };
  }

  // 2. カテゴリルール (cardId × store.category) のうち active なもの
  const store = stores.find((s) => s.id === storeId);
  if (store?.category) {
    const catMatches = rules.filter(
      (r) =>
        r.cardId === card.id &&
        r.category === store.category &&
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
        notes: best.notes,
      };
    }
  }

  // 3. デフォルト
  return {
    rate: card.defaultRate,
    currencyId: card.defaultCurrencyId,
    source: "default",
  };
}

function pickHighestRate(rules: StoreRule[]): StoreRule {
  // rate 降順、tie-break は id 昇順 (決定論的)
  return [...rules].sort((a, b) => {
    if (b.rate !== a.rate) return b.rate - a.rate;
    return a.id.localeCompare(b.id);
  })[0];
}
