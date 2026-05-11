import { useCallback, useMemo, useState } from "react";
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

import { useStore } from "../state/store";
import { formatRatio, styleOf } from "../domain/currencyKind";
import type {
  ConversionEdge,
  Currency,
  CurrencyKind,
} from "../domain/types";
import { CurrencyIcon } from "./CurrencyIcon";
import { nodeTypes, type CurrencyNodeType } from "./CurrencyNode";
import { useDialog } from "./dialog/DialogProvider";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";

type Selection =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | null;

// kind 別に行を分けて配置 (point上段 / mile中段 / cashlike下段 / 未分類最下段)
function layoutByKind(currencies: Currency[]): Map<
  string,
  { x: number; y: number }
> {
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

export function EdgesScreen() {
  const currencies = useStore((s) => s.currencies);
  const edges = useStore((s) => s.edges);
  const addEdge = useStore((s) => s.addEdge);
  const updateEdge = useStore((s) => s.updateEdge);
  const removeEdge = useStore((s) => s.removeEdge);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rate, setRate] = useState("1");
  const [notes, setNotes] = useState("");
  const [sel, setSel] = useState<Selection>(null);
  const dialog = useDialog();

  const currencyById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );
  const currencyName = useCallback(
    (id: string) => currencyById.get(id)?.name ?? id,
    [currencyById],
  );

  const positions = useMemo(() => layoutByKind(currencies), [currencies]);

  // ノード選択時、フォーカス対象（隣接ノードと自分）
  const focusedNodes = useMemo(() => {
    if (sel?.type !== "node") return null;
    const set = new Set<string>([sel.id]);
    for (const e of edges) {
      if (e.fromCurrencyId === sel.id) set.add(e.toCurrencyId);
      if (e.toCurrencyId === sel.id) set.add(e.fromCurrencyId);
    }
    return set;
  }, [sel, edges]);

  const isEdgeRelated = useCallback(
    (e: { fromCurrencyId: string; toCurrencyId: string }) => {
      if (sel?.type === "node")
        return e.fromCurrencyId === sel.id || e.toCurrencyId === sel.id;
      return false;
    },
    [sel],
  );

  const rfNodes: CurrencyNodeType[] = useMemo(
    () =>
      currencies.map((c) => {
        const pos = positions.get(c.id) ?? { x: 0, y: 0 };
        const isSelected = sel?.type === "node" && sel.id === c.id;
        const dimmed = focusedNodes ? !focusedNodes.has(c.id) : false;
        return {
          id: c.id,
          type: "currency",
          position: pos,
          data: { currency: c, selected: isSelected, dimmed },
        };
      }),
    [currencies, positions, sel, focusedNodes],
  );

  const rfEdges: RFEdge[] = useMemo(
    () =>
      edges.map((e) => {
        const isSelectedEdge = sel?.type === "edge" && sel.id === e.id;
        const related = isEdgeRelated(e);
        const focusing = sel?.type === "node";
        const dimmed = focusing && !related;
        const stroke = isSelectedEdge
          ? "#f59e0b"
          : related
            ? "#f59e0b"
            : "#4ea1ff";
        return {
          id: e.id,
          source: e.fromCurrencyId,
          target: e.toCurrencyId,
          label: formatRatio(e.rate),
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
          style: {
            stroke,
            strokeWidth: isSelectedEdge || related ? 2.5 : 1.5,
            opacity: dimmed ? 0.18 : 1,
          },
          labelStyle: {
            fill: "#e6e6e6",
            fontSize: 12,
            fontWeight: 600,
            opacity: dimmed ? 0.3 : 1,
          },
          labelBgStyle: {
            fill: isSelectedEdge || related ? "#3a2a10" : "#181b22",
            fillOpacity: dimmed ? 0.3 : 1,
          },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 4,
          zIndex: isSelectedEdge || related ? 100 : 0,
        };
      }),
    [edges, sel, isEdgeRelated],
  );

  const onConnect = useCallback(
    async (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      if (conn.source === conn.target) return;
      const r = await dialog.prompt({
        title: "新しい交換レートを追加",
        message: `${currencyName(conn.source)} → ${currencyName(conn.target)}\n1単位 → ?単位`,
        defaultValue: "1",
        inputType: "number",
        step: "0.0001",
        min: 0,
      });
      if (r == null) return;
      const num = Number(r);
      if (!Number.isFinite(num) || num <= 0) {
        await dialog.alert({
          title: "不正なレート",
          message: "正の数値を入れてください",
          level: "error",
        });
        return;
      }
      addEdge({
        fromCurrencyId: conn.source,
        toCurrencyId: conn.target,
        rate: num,
      });
    },
    [addEdge, currencyName, dialog],
  );

  const onEdgeClick = useCallback((_evt: React.MouseEvent, e: RFEdge) => {
    setSel({ type: "edge", id: e.id });
  }, []);

  const onNodeClick = useCallback((_evt: React.MouseEvent, n: RFNode) => {
    setSel({ type: "node", id: n.id });
  }, []);

  const onPaneClick = useCallback(() => setSel(null), []);

  const selectedEdge =
    sel?.type === "edge" ? edges.find((e) => e.id === sel.id) ?? null : null;

  const edgeColumns: ColumnDef<ConversionEdge>[] = [
    {
      key: "from",
      label: "from",
      view: (e) => currencyName(e.fromCurrencyId),
    },
    {
      key: "to",
      label: "to",
      view: (e) => currencyName(e.toCurrencyId),
    },
    {
      key: "rate",
      label: "レート",
      view: (e) => formatRatio(e.rate),
      edit: (e, set) => (
        <input
          type="number"
          step="0.0001"
          min="0"
          value={e.rate}
          onChange={(ev) => set({ rate: Number(ev.target.value) })}
        />
      ),
    },
    {
      key: "notes",
      label: "メモ",
      view: (e) => e.notes ?? "-",
      edit: (e, set) => (
        <input
          value={e.notes ?? ""}
          onChange={(ev) =>
            set({ notes: ev.target.value || undefined })
          }
        />
      ),
    },
  ];
  const selectedCurrency =
    sel?.type === "node" ? currencyById.get(sel.id) ?? null : null;

  const outgoing = useMemo(
    () =>
      sel?.type === "node"
        ? edges.filter((e) => e.fromCurrencyId === sel.id)
        : [],
    [edges, sel],
  );
  const incoming = useMemo(
    () =>
      sel?.type === "node"
        ? edges.filter((e) => e.toCurrencyId === sel.id)
        : [],
    [edges, sel],
  );

  return (
    <section>
      <h2>ポイント交換ルート</h2>
      <p className="hint">
        ノード／エッジをクリックで詳細表示。ノード選択時は関連エッジが強調されます。
        端をドラッグして別ノードに接続で新しい交換ルートを作成。
      </p>

      <div className="graph-wrap" style={{ height: 580 }}>
        {currencies.length === 0 ? (
          <div className="empty">先に通貨を登録してください。</div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
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

      {/* ===== ノード選択時: 関連ルート一覧 ===== */}
      {selectedCurrency && (
        <div className="edge-panel">
          <div className="edge-panel-head">
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <CurrencyIcon currency={selectedCurrency} size={22} />
              <strong>{selectedCurrency.name}</strong> の関連ルート
            </span>
            <button onClick={() => setSel(null)}>選択解除</button>
          </div>
          <div className="edge-panel-body">
            {outgoing.length === 0 && incoming.length === 0 && (
              <p className="empty">関連エッジがありません。</p>
            )}
            {outgoing.length > 0 && (
              <div>
                <h4 className="route-section-title">
                  出口（このポイントから交換できる先）
                </h4>
                <div className="route-list">
                  {outgoing.map((e) => {
                    const to = currencyById.get(e.toCurrencyId);
                    if (!to) return null;
                    return (
                      <button
                        key={e.id}
                        className="route-item"
                        onClick={() => setSel({ type: "edge", id: e.id })}
                      >
                        <span className="route-arrow">→</span>
                        <CurrencyIcon currency={to} size={26} />
                        <span className="route-name">{to.name}</span>
                        <span className="route-ratio">
                          {formatRatio(e.rate)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {incoming.length > 0 && (
              <div>
                <h4 className="route-section-title">
                  入口（このポイントへ変換できる元）
                </h4>
                <div className="route-list">
                  {incoming.map((e) => {
                    const fr = currencyById.get(e.fromCurrencyId);
                    if (!fr) return null;
                    return (
                      <button
                        key={e.id}
                        className="route-item"
                        onClick={() => setSel({ type: "edge", id: e.id })}
                      >
                        <CurrencyIcon currency={fr} size={26} />
                        <span className="route-name">{fr.name}</span>
                        <span className="route-arrow">→</span>
                        <span className="route-ratio">
                          {formatRatio(e.rate)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== エッジ選択時: レート編集 ===== */}
      {selectedEdge && (
        <div className="edge-panel">
          <div className="edge-panel-head">
            <span>選択中のエッジ</span>
            <button onClick={() => setSel(null)}>選択解除</button>
          </div>
          <div className="edge-panel-body">
            <div className="path-line">
              <span className="node-with-icon">
                {(() => {
                  const c = currencyById.get(selectedEdge.fromCurrencyId);
                  return c ? <CurrencyIcon currency={c} size={24} /> : null;
                })()}
                <span>{currencyName(selectedEdge.fromCurrencyId)}</span>
              </span>
              <span className="arrow-large">→</span>
              <span className="node-with-icon">
                {(() => {
                  const c = currencyById.get(selectedEdge.toCurrencyId);
                  return c ? <CurrencyIcon currency={c} size={24} /> : null;
                })()}
                <span>{currencyName(selectedEdge.toCurrencyId)}</span>
              </span>
            </div>
            <label>
              レート (1単位 → ?単位):
              <input
                type="number"
                step="0.0001"
                min="0"
                value={selectedEdge.rate}
                onChange={(e) =>
                  updateEdge(selectedEdge.id, { rate: Number(e.target.value) })
                }
              />
            </label>
            <div className="ratio-hint">
              {formatRatio(selectedEdge.rate)}（
              {currencyName(selectedEdge.fromCurrencyId)} →{" "}
              {currencyName(selectedEdge.toCurrencyId)}）
            </div>
            <label>
              メモ:
              <input
                value={selectedEdge.notes ?? ""}
                onChange={(e) =>
                  updateEdge(selectedEdge.id, {
                    notes: e.target.value || undefined,
                  })
                }
                placeholder="(任意)"
              />
            </label>
            <button
              className="danger"
              onClick={async () => {
                const ok = await dialog.confirm({
                  title: "このエッジを削除しますか？",
                  message: `${currencyName(selectedEdge.fromCurrencyId)} → ${currencyName(selectedEdge.toCurrencyId)}`,
                  okText: "削除",
                  danger: true,
                });
                if (ok) {
                  removeEdge(selectedEdge.id);
                  setSel(null);
                }
              }}
            >
              このエッジを削除
            </button>
          </div>
        </div>
      )}

      <details style={{ marginTop: 18 }}>
        <summary>フォームから追加 / 一覧</summary>

        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!from || !to || from === to) return;
            addEdge({
              fromCurrencyId: from,
              toCurrencyId: to,
              rate: Number(rate),
              notes: notes.trim() || undefined,
            });
            setFrom("");
            setTo("");
            setRate("1");
            setNotes("");
          }}
        >
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">from</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span>→</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">to</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.0001"
            min="0"
            placeholder="レート"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <input
            placeholder="メモ (任意)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit">追加</button>
        </form>

        <ResponsiveTable
          rows={edges}
          columns={edgeColumns}
          onSave={(id, patch) => updateEdge(id, patch)}
          onDelete={removeEdge}
        />
      </details>
    </section>
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
