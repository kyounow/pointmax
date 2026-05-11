import type { Card, Store, StoreRule } from "./types";

export type ResolvedRate =
  | { rate: number; currencyId: string; source: "default" }
  | { rate: number; currencyId: string; source: "rule"; ruleId: string }
  | { rate: number; currencyId: string; source: "category"; ruleId: string };

// カード × 店舗 (or カテゴリ) を解決して還元率と通貨を返す。
// 呼び出し側 (paymentApp.ts) は paymentApp 専用ルールを先に試した後、
// このメソッドには paymentAppId が無い汎用ルールだけを渡す。
// 優先順位: 直接ルール (storeId) > カテゴリルール > カード本来の defaultRate
export function resolveRate(
  card: Card,
  storeId: string,
  rules: StoreRule[],
  stores: Store[],
): ResolvedRate {
  // 1. 直接ルール (cardId × storeId)
  const direct = rules.find(
    (r) => r.cardId === card.id && r.storeId === storeId,
  );
  if (direct) {
    return {
      rate: direct.rate,
      currencyId: direct.currencyId,
      source: "rule",
      ruleId: direct.id,
    };
  }

  // 2. カテゴリルール (cardId × store.category)
  const store = stores.find((s) => s.id === storeId);
  if (store?.category) {
    const cat = rules.find(
      (r) => r.cardId === card.id && r.category === store.category,
    );
    if (cat) {
      return {
        rate: cat.rate,
        currencyId: cat.currencyId,
        source: "category",
        ruleId: cat.id,
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
