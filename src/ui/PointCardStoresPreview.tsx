import { useState } from "react";

// 表示に必要な最小形 (旧 LoyaltyRule の代わり)。PointCardsScreen が program×
// membership から合成した「加盟店 × 還元率」の行を受け取る。
type StoreRateRow = {
  id: string;
  storeId: string;
  rate: number;
};

type Props = {
  rules: StoreRateRow[];
  storeName: (id: string) => string;
};

export function PointCardStoresPreview({ rules, storeName }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (rules.length === 0) {
    return <span className="pc-stores-empty">加盟店なし</span>;
  }
  const sorted = [...rules].sort((a, b) => b.rate - a.rate);
  return (
    <span className="pc-stores-preview">
      <button
        type="button"
        className="pc-stores-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
      >
        {expanded ? "▾" : "▸"} 加盟店 {rules.length} 件
      </button>
      {expanded && (
        <ul className="pc-stores-list">
          {sorted.map((r) => (
            <li key={r.id}>
              <span className="pc-store-name">{storeName(r.storeId)}</span>
              <span className="pc-store-rate">{(r.rate * 100).toFixed(2)}%</span>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
