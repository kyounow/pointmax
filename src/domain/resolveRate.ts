import type { Card, Store, StoreRule } from "./types";

export type ResolvedRate =
  | { rate: number; currencyId: string; source: "default" }
  | { rate: number; currencyId: string; source: "rule"; ruleId: string }
  | { rate: number; currencyId: string; source: "category"; ruleId: string };

// paymentMethod が指定されたら、ルールの paymentMethod と一致したものだけマッチする。
// ルール側の paymentMethod が undefined なら、どの支払い方法でもマッチ（汎用ルール）。
// 優先順位: storeId+pm一致 > storeId汎用 > category+pm一致 > category汎用 > default
export function resolveRate(
  card: Card,
  storeId: string,
  rules: StoreRule[],
  stores: Store[],
  paymentMethod?: string,
): ResolvedRate {
  const matchesPm = (rulePm: string | undefined) => {
    if (!rulePm) return true; // 汎用ルール
    if (!paymentMethod) return false; // ルールが特定支払い方法だが指定無し
    return rulePm === paymentMethod;
  };

  // 1. 直接ルール (cardId × storeId)、paymentMethod 一致を優先
  const directMatches = rules.filter(
    (r) => r.cardId === card.id && r.storeId === storeId && matchesPm(r.paymentMethod),
  );
  // pm一致を最優先
  const directSpecific = directMatches.find((r) => r.paymentMethod);
  const directGeneric = directMatches.find((r) => !r.paymentMethod);
  const direct = directSpecific ?? directGeneric;
  if (direct) {
    return {
      rate: direct.rate,
      currencyId: direct.currencyId,
      source: "rule",
      ruleId: direct.id,
    };
  }

  // 2. カテゴリルール (cardId × store.category)、同じ優先順位
  const store = stores.find((s) => s.id === storeId);
  if (store?.category) {
    const catMatches = rules.filter(
      (r) =>
        r.cardId === card.id &&
        r.category === store.category &&
        matchesPm(r.paymentMethod),
    );
    const catSpecific = catMatches.find((r) => r.paymentMethod);
    const catGeneric = catMatches.find((r) => !r.paymentMethod);
    const cat = catSpecific ?? catGeneric;
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
