// CalculatorScreen から切り出した入力フォーム (店舗ピッカー + 金額 + 目標通貨フォールバック select)
// (Wave 6 B-2)。フォーム専用の派生 memo (categoryOptions / filteredStores / storesByCategory /
// currenciesByKind) もここに閉じ込めて親をスリム化。動作不変リファクタ。

import { useMemo } from "react";
import type { Currency, Store } from "../../domain/types";
import { groupBy } from "../../domain/groupBy";

type Props = {
  stores: Store[];
  currencies: Currency[];
  storeId: string;
  setStoreId: (v: string) => void;
  storeSearch: string;
  setStoreSearch: (v: string) => void;
  storeCategory: string;
  setStoreCategory: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  activeCurrencyId: string;
  setActiveCurrencyId: (v: string) => void;
  /** 優先通貨が空のときだけ目標通貨 select を表示する */
  showCurrencyFallback: boolean;
};

export function CalcStoreForm({
  stores,
  currencies,
  storeId,
  setStoreId,
  storeSearch,
  setStoreSearch,
  storeCategory,
  setStoreCategory,
  amount,
  setAmount,
  activeCurrencyId,
  setActiveCurrencyId,
  showCurrencyFallback,
}: Props) {
  // 利用可能なカテゴリ一覧 (件数付き)
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stores) {
      const c = s.category ?? "(未分類)";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [stores]);

  // カテゴリ絞り込み + 文字検索 (AND)。どちらも空ならデフォルトで全件表示
  const filteredStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    return stores.filter((s) => {
      if (storeCategory) {
        const cat = s.category ?? "(未分類)";
        if (cat !== storeCategory) return false;
      }
      if (q) {
        const inName = s.name.toLowerCase().includes(q);
        const inCat = (s.category ?? "").toLowerCase().includes(q);
        if (!inName && !inCat) return false;
      }
      return true;
    });
  }, [stores, storeSearch, storeCategory]);

  // 店舗をカテゴリ別にグループ化 (検索フィルタ後)
  const storesByCategory = useMemo(
    () => groupBy(filteredStores, (s) => s.category ?? "その他"),
    [filteredStores],
  );

  // 通貨を kind 別にグループ化（マイル/ポイント/現金相当/未分類）
  const currenciesByKind = useMemo(() => {
    const kindLabel = (k?: string) => {
      switch (k) {
        case "mile":
          return "マイル";
        case "point":
          return "ポイント";
        case "cashlike":
          return "現金相当";
        default:
          return "その他";
      }
    };
    return groupBy(currencies, (c) => kindLabel(c.kind));
  }, [currencies]);

  return (
    <form className="row" onSubmit={(e) => e.preventDefault()}>
      <label>
        店舗:
        <span className="store-picker">
          <select
            className="store-category-filter"
            value={storeCategory}
            onChange={(e) => setStoreCategory(e.target.value)}
            aria-label="カテゴリで絞り込み"
            title="カテゴリで絞り込み"
          >
            <option value="">全カテゴリ ({stores.length})</option>
            {categoryOptions.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
          <input
            type="search"
            className="store-search"
            placeholder="検索..."
            value={storeSearch}
            onChange={(e) => setStoreSearch(e.target.value)}
            aria-label="店舗を絞り込み検索"
          />
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">選択</option>
            {storesByCategory.map((g) => (
              <optgroup key={g.key} label={g.key}>
                {g.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {(storeSearch || storeCategory) && (
            <small className="store-search-hint">
              {filteredStores.length} 件
            </small>
          )}
        </span>
      </label>
      <label>
        金額:
        <input
          type="number"
          min="0"
          step="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        円
      </label>
      {showCurrencyFallback && (
        // 優先通貨 未設定時の fallback: 従来どおり都度選択
        <label>
          目標通貨:
          <select
            value={activeCurrencyId}
            onChange={(e) => setActiveCurrencyId(e.target.value)}
          >
            <option value="">選択</option>
            {currenciesByKind.map((g) => (
              <optgroup key={g.key} label={g.key}>
                {g.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}
    </form>
  );
}
