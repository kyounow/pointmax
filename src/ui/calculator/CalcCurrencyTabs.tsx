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
    // UX-8(1) / PR-2e: role=tablist/tab は tabpanel を伴わない orphan ARIA だったため撤去。
    // 「選択中」は aria-current で表現する (通貨選択 = ページ内の現在項目)。
    <div
      className="campaign-tabs currency-tabs"
      style={{ marginBottom: 12 }}
      role="group"
      aria-label="目標通貨"
    >
      {preferredCurrencyIds.map((cid) => {
        const c = currencyById.get(cid);
        if (!c) return null;
        const active = cid === activeCurrencyId;
        return (
          <button
            key={cid}
            type="button"
            aria-current={active ? "true" : undefined}
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
