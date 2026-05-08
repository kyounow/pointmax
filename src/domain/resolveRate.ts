import type { Card, Store, StoreRule } from "./types";

export type ResolvedRate =
  | { rate: number; currencyId: string; source: "default" }
  | { rate: number; currencyId: string; source: "rule"; ruleId: string }
  | { rate: number; currencyId: string; source: "category"; ruleId: string };

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
