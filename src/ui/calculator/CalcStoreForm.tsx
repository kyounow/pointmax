// CalculatorScreen から切り出した入力フォーム (店舗ピッカー + 金額 + 目標通貨フォールバック select)
// (Wave 6 B-2)。フォーム専用の派生 memo (categoryOptions / filteredStores / storesByCategory /
// currenciesByKind) もここに閉じ込めて親をスリム化。動作不変リファクタ。

import { useMemo } from "react";
import type { Currency, Store } from "../../domain/types";
import { groupBy } from "../../domain/groupBy";
import { recordStoreSelection } from "../../state/usageStats";

// PR-3a (UX-1): 店頭クイック入力の金額プリセット。ワンタップで amount に流し込む。
const AMOUNT_PRESETS = [500, 1000, 3000, 5000, 10000] as const;

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
  /** PR-3a: 直近選択順の店舗 id (親が usageStats.getRecentStoreIds から供給)。 */
  recentStoreIds: string[];
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
  recentStoreIds,
}: Props) {
  // 店舗選択の共通処理: state 更新 + 端末内利用統計への記録 (select / チップ 共用)。
  const selectStore = (id: string) => {
    setStoreId(id);
    // PR-0b: 端末内利用統計へ店舗選択を記録 (空選択は内部で無視・送信なし)
    recordStoreSelection(id);
  };

  // id → 店舗名の解決 (直近店舗チップ用)。
  const storeById = useMemo(() => {
    const m = new Map<string, Store>();
    for (const s of stores) m.set(s.id, s);
    return m;
  }, [stores]);

  // 直近店舗チップ: 存在する店舗だけに絞り、新しい順を維持 (最大 8 件)。
  const recentStores = useMemo(
    () =>
      recentStoreIds
        .map((id) => storeById.get(id))
        .filter((s): s is Store => s !== undefined)
        .slice(0, 8),
    [recentStoreIds, storeById],
  );

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
      {/* PR-3a (UX-1): 直近店舗チップ。店舗 select の上にワンタップで再選択。
          1 行横スクロールで高さを固定し、結果 1 位の above-the-fold を守る。 */}
      {recentStores.length > 0 && (
        <div
          className="quick-chips quick-chips-stores"
          role="group"
          aria-label="直近の店舗"
        >
          {recentStores.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`quick-chip${storeId === s.id ? " is-active" : ""}`}
              aria-pressed={storeId === s.id}
              onClick={() => selectStore(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
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
          <select
            value={storeId}
            onChange={(e) => selectStore(e.target.value)}
          >
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
          // type=number のスクロール誤変更・"e" 入力を根絶するため text 化。
          // 非数字を strip して整数のみ許容 (空文字はそのまま → 呼び出し側で未入力扱い)。
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
        />
        円
      </label>
      {/* PR-3a (UX-1): 金額プリセットチップ。既存 amount state に即設定。 */}
      <div
        className="quick-chips quick-chips-amounts"
        role="group"
        aria-label="金額プリセット"
      >
        {AMOUNT_PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            data-amount={v}
            className={`quick-chip${amount === String(v) ? " is-active" : ""}`}
            aria-pressed={amount === String(v)}
            onClick={() => setAmount(String(v))}
          >
            {v.toLocaleString("ja-JP")}円
          </button>
        ))}
      </div>
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
