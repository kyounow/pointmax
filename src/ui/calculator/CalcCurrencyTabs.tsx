// CalculatorScreen から切り出した「優先通貨タブ切替」(Wave 6 B-2)。
// 優先通貨が設定されているときだけ表示。動作不変リファクタ。

import type { Currency } from "../../domain/types";

type Props = {
  preferredCurrencyIds: string[];
  activeCurrencyId: string;
  onSelect: (id: string) => void;
  currencyById: Map<string, Currency>;
};

export function CalcCurrencyTabs({
  preferredCurrencyIds,
  activeCurrencyId,
  onSelect,
  currencyById,
}: Props) {
  return (
    <div
      className="campaign-tabs currency-tabs"
      style={{ marginBottom: 12 }}
      role="tablist"
      aria-label="目標通貨"
    >
      {preferredCurrencyIds.map((cid) => {
        const c = currencyById.get(cid);
        if (!c) return null;
        const active = cid === activeCurrencyId;
        return (
          <button
            key={cid}
            role="tab"
            aria-selected={active}
            className={active ? "active" : ""}
            onClick={() => onSelect(cid)}
            title={`${c.name} で表示`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
