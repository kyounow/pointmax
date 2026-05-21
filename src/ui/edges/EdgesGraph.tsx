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
import { computeFocusedRadialLayout } from "./radialLayout";
import type { Selection } from "./types";

// kind 別に行を分けて配置 (point上段 / mile中段 / cashlike下段 / 未分類最下段)。
// 各 kind 内のノードが多い場合は MAX_PER_ROW で折り返して縦に積み、
// 1 つの kind の subrow 数に応じて次の kind の y 位置を動的に決める。
// これにより、ノードが多くても横スクロールが大幅に減って fitView の縮尺が改善される。
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
  const MAX_PER_ROW = 6;
  const COL_GAP = 140;
  const SUBROW_GAP = 110;
  const KIND_GAP = 70;
  const X_BASE = 30;
  const orderedKinds: (keyof typeof buckets)[] = [
    "point",
    "mile",
    "cashlike",
    "other",
  ];
  const map = new Map<string, { x: number; y: number }>();
  let currentY = 30;
  for (const kind of orderedKinds) {
    const items = buckets[kind];
    if (items.length === 0) continue;
    items.forEach((c, i) => {
      const row = Math.floor(i / MAX_PER_ROW);
      const col = i % MAX_PER_ROW;
      map.set(c.id, {
        x: X_BASE + col * COL_GAP,
        y: currentY + row * SUBROW_GAP,
      });
    });
    const subrows = Math.ceil(items.length / MAX_PER_ROW);
    currentY += subrows * SUBROW_GAP + KIND_GAP;
  }
  return map;
}

// v4.0.0 ③: ルート選択時のレイアウト。
// 起点 → step1 → step2 → ... → 終点 を一直線に並べる。
// path 以外のノードは map に含まれず、呼び出し側で非表示にする。
function computeRouteLayout(
  fromId: string,
  steps: ConversionEdge[],
): Map<string, { x: number; y: number }> {
  const path = [fromId, ...steps.map((s) => s.toCurrencyId)];
  const xStart = 80;
  const xSpacing = 220;
  const y = 260;
  const map = new Map<string, { x: number; y: number }>();
  path.forEach((id, i) => {
    map.set(id, { x: xStart + i * xSpacing, y });
  });
  return map;
}

// ノード選択時のレイアウトは radialLayout.ts の computeFocusedRadialLayout に移行。
// 入口=上半円 / 出口=下半円 / 双方向=左右 の円形配置 + CSS transition でアニメ。
// 旧「十字」配置 (入口=上行 y=40、出口=下行 y=480、双方向=固定 x=±280) は削除。

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
  // v4.0.0 ③: ルート検索結果との連動。
  // routePathEdgeIds に含まれる edge id は紫でハイライト、太さ増。
  // routeFromId / routeToId が一致するノードに「起点」「終点」バッジ表示。
  // routeResultSteps があれば「ルート表示モード」が発動し、path を一直線に
  // 配置 + path 以外のノード/edge を非表示にして視認性を最大化する。
  routePathEdgeIds?: ReadonlySet<string>;
  routeFromId?: string;
  routeToId?: string;
  routeResultSteps?: ConversionEdge[];
};

const ROUTE_PATH_STROKE = "#a855f7"; // purple-500

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
  routePathEdgeIds,
  routeFromId,
  routeToId,
  routeResultSteps,
}: Props) {
  const focusedNodeId = sel?.type === "node" ? sel.id : null;

  // ルート表示モード: 起点・終点が両方セットされて、bestPath が steps を返したとき
  // 発動。focus mode より優先される (= path 表示が一番見たい情報)。
  const isRouteMode = !!(
    routeFromId &&
    routeResultSteps &&
    routeResultSteps.length > 0
  );

  const positions = useMemo(() => {
    if (isRouteMode && routeFromId && routeResultSteps) {
      return computeRouteLayout(routeFromId, routeResultSteps);
    }
    if (focusedNodeId) {
      return computeFocusedRadialLayout(focusedNodeId, edges);
    }
    return layoutByKind(currencies);
  }, [currencies, edges, focusedNodeId, isRouteMode, routeFromId, routeResultSteps]);

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
    // フォーカス時 / ルート表示モード時は positions に含まれるノードのみ表示
    // (= 関係ない通貨は非表示にして視認性を最大化)
    const visibleCurrencies =
      isRouteMode || focusedNodeId
        ? currencies.filter((c) => positions.has(c.id))
        : currencies;
    return visibleCurrencies.map((c) => {
      const pos = positions.get(c.id) ?? { x: 0, y: 0 };
      const isSelected = focusedNodeId === c.id;
      const routeRole =
        c.id === routeFromId
          ? ("from" as const)
          : c.id === routeToId
            ? ("to" as const)
            : undefined;
      return {
        id: c.id,
        type: "currency",
        position: pos,
        data: { currency: c, selected: isSelected, dimmed: false, routeRole },
      };
    });
  }, [currencies, positions, focusedNodeId, routeFromId, routeToId, isRouteMode]);

  const rfEdges: RFEdge[] = useMemo(() => {
    // ルート表示モード: path に含まれる edge のみ表示
    // フォーカス時: 関連 edge のみ表示
    // それ以外: 全 edge 表示
    const visibleEdges = isRouteMode
      ? edges.filter((e) => routePathEdgeIds?.has(e.id))
      : focusedNodeId
        ? edges.filter((e) => isEdgeRelated(e))
        : edges;
    return visibleEdges.map((e) => {
      const isSelectedEdge = sel?.type === "edge" && sel.id === e.id;
      const related = isEdgeRelated(e);
      const inRoutePath = routePathEdgeIds?.has(e.id) ?? false;
      const locked =
        !!e.requiredCardIds?.length &&
        !e.requiredCardIds.some((id) => accessibleCardIds.has(id));
      // 優先度: routePath (紫、最強調) > selected/related (橙) > locked (灰) > default (青)
      let stroke: string;
      let strokeWidth: number;
      if (inRoutePath) {
        stroke = ROUTE_PATH_STROKE;
        strokeWidth = 3.5;
      } else if (locked) {
        stroke = "#6b7280";
        strokeWidth = isSelectedEdge || related ? 2.5 : 1.5;
      } else if (isSelectedEdge || related) {
        stroke = "#f59e0b";
        strokeWidth = 2.5;
      } else {
        stroke = "#4ea1ff";
        strokeWidth = 1.5;
      }
      return {
        id: e.id,
        source: e.fromCurrencyId,
        target: e.toCurrencyId,
        type: "pointmax",
        label: showLabels ? formatRatio(e.rate) : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
        style: {
          stroke,
          strokeWidth,
          strokeDasharray: locked && !inRoutePath ? "6 4" : undefined,
          opacity: locked && !inRoutePath ? 0.55 : 1,
        },
        labelStyle: {
          fill: "#e6e6e6",
          fontSize: 12,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: inRoutePath
            ? "#2a1a3a"
            : isSelectedEdge || related
              ? "#3a2a10"
              : "#181b22",
        },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
        zIndex: inRoutePath ? 200 : isSelectedEdge || related ? 100 : 0,
      };
    });
  }, [
    edges,
    sel,
    isEdgeRelated,
    focusedNodeId,
    showLabels,
    accessibleCardIds,
    routePathEdgeIds,
    isRouteMode,
  ]);

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
