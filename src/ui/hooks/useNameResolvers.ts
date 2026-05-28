import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../../state/store";

/**
 * 「id を name に変換する」よくあるヘルパ 3 種を一つの hook で提供。
 * 各画面で重複してた currencyName/cardName/storeName を集約。
 *
 * - 戻り値の関数は useCallback で安定化されているので、useMemo の依存配列に
 *   入れても再評価ループにならない。
 * - id が見つからない時は id 自体を返す (fallback, 既存挙動と一致)。
 *
 * Usage:
 *   const { cardName, currencyName, storeName } = useNameResolvers();
 *   <span>{cardName(rule.cardId)}</span>
 */
export function useNameResolvers() {
  // Wave 5 B-1: 3 個別 subscribe → 単一 useShallow
  const { cards, currencies, stores } = useStore(
    useShallow((s) => ({
      cards: s.cards,
      currencies: s.currencies,
      stores: s.stores,
    })),
  );

  const cardName = useCallback(
    (id: string) => cards.find((c) => c.id === id)?.name ?? id,
    [cards],
  );
  const currencyName = useCallback(
    (id: string) => currencies.find((c) => c.id === id)?.name ?? id,
    [currencies],
  );
  const storeName = useCallback(
    (id: string) => stores.find((s) => s.id === id)?.name ?? id,
    [stores],
  );

  return { cardName, currencyName, storeName };
}
