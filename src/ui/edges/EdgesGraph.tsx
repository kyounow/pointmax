import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { formatRatio, styleOf } from "../../domain/currencyKind";
import type { ConversionEdge, Currency, CurrencyKind } from "../../domain/types";
import { nodeTypes, type CurrencyNodeType } from "../CurrencyNode";
import { edgeTypes } from "../PointMaxEdge";
import type { Selection } from "../EdgesScreen";

// kind 別に行を分けて配置 (point上段 / mile中段 / cashlike下段 / 未分類最下段)
function layoutByKind(
  currencies: Currency[],
): Map<string, { x: number; y: number }> {
  const buckets: Record<CurrencyKind | "other", Currency[]> = {
    point: [],
    mile: [],
    cashlike: [],
    other: [],
  };
  for (const c of currencies) {
    buckets[c.kind ?? "other"].push(c);
  }
  const rows: { items: Currency[]; y: number }[] = [
    { items: buckets.point, y: 30 },
    { items: buckets.mile, y: 220 },
    { items: buckets.cashlike, y: 380 },
    { items: buckets.other, y: 540 },
  ];
  const map = new Map<string, { x: number; y: number }>();
  for (const row of rows) {
    if (row.items.length === 0) continue;
    row.items.forEach((c, i) => {
      map.set(c.id, { x: 30 + i * 150, y: row.y });
    });
  }
  return map;
}

// ノード選択時のフォーカスレイアウト
// 選択ノードを中心に、入口=上 / 出口=下 / 双方向=左右に配置
// 戻り値: 表示すべきノードIDのみ含むマップ
function computeFocusedLayout(
  selectedId: string,
  edges: ConversionEdge[],
): Map<string, { x: number; y: number }> {
  const incomingSet = new Set<string>();
  const outgoingSet = new Set<string>();
  for (const e of edges) {
    if (e.toCurrencyId === selectedId) incomingSet.add(e.fromCurrencyId);
    if (e.fromCurrencyId === selectedId) outgoingSet.add(e.toCurrencyId);
  }
  const bidirSet = new Set<string>();
  for (const id of incomingSet) {
    if (outgoingSet.has(id)) bidirSet.add(id);
  }
  const inputOnly = [...incomingSet].filter((id) => !bidirSet.has(id));
  const outputOnly = [...outgoingSet].filter((id) => !bidirSet.has(id));
  const bidir = [...bidirSet];

  const layout = new Map<string, { x: number; y: number }>();

  const centerX = 400;
  const centerY = 260;
  const spacing = 150;
  layout.set(selectedId, { x: centerX, y: centerY });

  // 入口 (selected の上、y=40)
  inputOnly.forEach((id, i) => {
    const x = centerX + (i - (inputOnly.length - 1) / 2) * spacing;
    layout.set(id, { x, y: 40 });
  });

  // 出口 (selected の下、y=480)
  outputOnly.forEach((id, i) => {
    const x = centerX + (i - (outputOnly.length - 1) / 2) * spacing;
    layout.set(id, { x, y: 480 });
  });

  // 双方向: 左右に振り分け (半分ずつ)
  const leftCount = Math.ceil(bidir.length / 2);
  const rightCount = bidir.length - leftCount;
  bidir.slice(0, leftCount).forEach((id, i) => {
    const y = centerY + (i - (leftCount - 1) / 2) * 120;
    layout.set(id, { x: centerX - 280, y });
  });
  bidir.slice(leftCount).forEach((id, i) => {
    const y = centerY + (i - (rightCount - 1) / 2) * 120;
    layout.set(id, { x: centerX + 280, y });
  });

  return layout;
}

type Props = {
  currencies: Currency[];
  edges: ConversionEdge[];
  currencyById: Map<string, Currency>;
  sel: Selection;
  showLabels: boolean;
  accessibleCardIds: ReadonlySet<string>;
  onConnect: (conn: Connection) => void;
  onEdgeClick: (evt: React.MouseEvent, e: RFEdge) => void;
  onNodeClick: (evt: React.MouseEvent, n: RFNode) => void;
  onPaneClick: () => void;
};

export function EdgesGraph({
  currencies,
  edges,
  currencyById,
  sel,
  showLabels,
  accessibleCardIds,
  onConnect,
  onEdgeClick,
  onNodeClick,
  onPaneClick,
}: Props) {
  const focusedNodeId = sel?.type === "node" ? sel.id : null;

  const positions = useMemo(() => {
    if (focusedNodeId) {
      return computeFocusedLayout(focusedNodeId, edges);
    }
    return layoutByKind(currencies);
  }, [currencies, edges, focusedNodeId]);

  const isEdgeRelated = useCallback(
    (e: { fromCurrencyId: string; toCurrencyId: string }) => {
      if (focusedNodeId)
        return (
          e.fromCurrencyId === focusedNodeId || e.toCurrencyId === focusedNodeId
        );
      return false;
    },
    [focusedNodeId],
  );

  const rfNodes: CurrencyNodeType[] = useMemo(() => {
    // フォーカス時は positions に含まれるノードのみ表示（無関係ノードは完全に隠す）
    const visibleCurrencies = focusedNodeId
      ? currencies.filter((c) => positions.has(c.id))
      : currencies;
    return visibleCurrencies.map((c) => {
      const pos = positions.get(c.id) ?? { x: 0, y: 0 };
      const isSelected = focusedNodeId === c.id;
      return {
        id: c.id,
        type: "currency",
        position: pos,
        data: { currency: c, selected: isSelected, dimmed: false },
      };
    });
  }, [currencies, positions, focusedNodeId]);

  const rfEdges: RFEdge[] = useMemo(() => {
    // フォーカス時は関連エッジのみ表示
    const visibleEdges = focusedNodeId
      ? edges.filter((e) => isEdgeRelated(e))
      : edges;
    return visibleEdges.map((e) => {
      const isSelectedEdge = sel?.type === "edge" && sel.id === e.id;
      const related = isEdgeRelated(e);
      const locked =
        !!e.requiredCardIds?.length &&
        !e.requiredCardIds.some((id) => accessibleCardIds.has(id));
      const baseStroke = isSelectedEdge || related ? "#f59e0b" : "#4ea1ff";
      const stroke = locked ? "#6b7280" : baseStroke;
      return {
        id: e.id,
        source: e.fromCurrencyId,
        target: e.toCurrencyId,
        type: "pointmax",
        label: showLabels ? formatRatio(e.rate) : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
        style: {
          stroke,
          strokeWidth: isSelectedEdge || related ? 2.5 : 1.5,
          strokeDasharray: locked ? "6 4" : undefined,
          opacity: locked ? 0.55 : 1,
        },
        labelStyle: {
          fill: "#e6e6e6",
          fontSize: 12,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: isSelectedEdge || related ? "#3a2a10" : "#181b22",
        },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
        zIndex: isSelectedEdge || related ? 100 : 0,
      };
    });
  }, [edges, sel, isEdgeRelated, focusedNodeId, showLabels, accessibleCardIds]);

  return (
    <div className="graph-wrap" style={{ height: 580 }}>
      {currencies.length === 0 ? (
        <div className="empty">先に通貨を登録してください。</div>
      ) : (
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#2a2f39" />
          <MiniMap
            pannable
            zoomable
            nodeStrokeColor={(n) => {
              const c = currencyById.get(n.id);
              return styleOf(c?.kind).border;
            }}
            nodeColor={(n) => {
              const c = currencyById.get(n.id);
              return styleOf(c?.kind).bg;
            }}
            style={{
              background: "#181b22",
              border: "1px solid #2a2f39",
            }}
          />
          <Controls />
          <Panel position="top-left">
            <div className="legend">
              <Chip kind="point" />
              <Chip kind="mile" />
              <Chip kind="cashlike" />
            </div>
          </Panel>
        </ReactFlow>
      )}
    </div>
  );
}

function Chip({ kind }: { kind: CurrencyKind }) {
  const s = styleOf(kind);
  return (
    <span className="legend-chip">
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: s.border,
          display: "inline-block",
          marginRight: 6,
        }}
      />
      {s.label}
    </span>
  );
}
