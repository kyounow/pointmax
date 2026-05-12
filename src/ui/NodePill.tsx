// 通貨を表すバッジ風 UI ('JALマイル' などをアイコン付きで表示)。
// CalculatorScreen の交換パス表示や EdgesScreen の凡例で再利用される。
import type { Currency } from "../domain/types";
import { styleOf } from "../domain/currencyKind";
import { CurrencyIcon } from "./CurrencyIcon";

type Props = {
  currency: Currency | undefined;
};

export function NodePill({ currency }: Props) {
  if (!currency) return <span className="node">?</span>;
  const s = styleOf(currency.kind);
  return (
    <span
      className="node node-with-icon"
      style={{
        background: s.bg,
        color: s.text,
        border: `1.5px solid ${s.border}`,
      }}
    >
      <CurrencyIcon currency={currency} size={20} />
      <span>{currency.name}</span>
    </span>
  );
}
