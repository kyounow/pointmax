import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { Currency } from "../domain/types";
import { styleOf } from "../domain/currencyKind";
import { CurrencyIcon } from "./CurrencyIcon";

export type CurrencyNodeData = {
  currency: Currency;
  selected?: boolean;
  dimmed?: boolean;
  // v4.0.0 ③: ルート検索の起点/終点ハイライト用。
  // "from" = 起点 (緑)、"to" = 終点 (赤)。selected (orange) よりも優先表示。
  routeRole?: "from" | "to";
};

export type CurrencyNodeType = Node<CurrencyNodeData, "currency">;

const ROUTE_ROLE_COLOR = {
  from: "#10b981", // emerald-500
  to: "#f43f5e", // rose-500
} as const;

export function CurrencyNode({ data }: NodeProps<CurrencyNodeType>) {
  const s = styleOf(data.currency.kind);
  const routeColor = data.routeRole ? ROUTE_ROLE_COLOR[data.routeRole] : null;
  // 背景塗りつぶし: currency 個別の iconColor (例: 楽天=#bf0000) があればそちらで塗る、
  // なければ kind 別の暗色 (s.bg) で fallback。塗った時の text 色は白で contrast を確保。
  const fillBg = data.currency.iconColor;
  const useIconFill = !!fillBg;
  const cls = [
    "currency-node",
    data.selected ? "selected" : "",
    data.dimmed ? "dimmed" : "",
    data.routeRole ? `route-${data.routeRole}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={cls}
      style={{
        // routeRole > selected > default の優先度で borderColor を決定
        borderColor: routeColor ?? (data.selected ? "#f59e0b" : s.border),
        borderWidth: data.routeRole ? 3 : undefined,
        background: useIconFill ? fillBg : s.bg,
        color: useIconFill ? "#ffffff" : s.text,
        position: "relative",
      }}
    >
      {data.routeRole && (
        <span
          style={{
            position: "absolute",
            top: -10,
            left: "50%",
            transform: "translateX(-50%)",
            background: routeColor!,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          {data.routeRole === "from" ? "起点" : "終点"}
        </span>
      )}
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
