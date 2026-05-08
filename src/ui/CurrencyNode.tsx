import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { Currency } from "../domain/types";
import { styleOf } from "../domain/currencyKind";
import { CurrencyIcon } from "./CurrencyIcon";

export type CurrencyNodeData = {
  currency: Currency;
  selected?: boolean;
  dimmed?: boolean;
};

export type CurrencyNodeType = Node<CurrencyNodeData, "currency">;

export function CurrencyNode({ data }: NodeProps<CurrencyNodeType>) {
  const s = styleOf(data.currency.kind);
  const cls = [
    "currency-node",
    data.selected ? "selected" : "",
    data.dimmed ? "dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={cls}
      style={{
        borderColor: data.selected ? "#f59e0b" : s.border,
        background: s.bg,
        color: s.text,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: s.border, width: 8, height: 8 }}
      />
      <CurrencyIcon currency={data.currency} size={36} />
      <div className="currency-node-name">{data.currency.name}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: s.border, width: 8, height: 8 }}
      />
    </div>
  );
}

export const nodeTypes = { currency: CurrencyNode };
