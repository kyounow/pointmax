import { useCallback, useMemo, useState } from "react";
import type { Connection, Edge as RFEdge, Node as RFNode } from "@xyflow/react";

import { useStore } from "../state/store";
import { formatRatio } from "../domain/currencyKind";
import { groupBy } from "../domain/groupBy";
import type { ConversionEdge } from "../domain/types";
import { useDialog } from "./dialog/DialogProvider";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { EdgesGraph } from "./edges/EdgesGraph";
import { EdgeDetailPanel } from "./edges/EdgeDetailPanel";
import { NodeDetailPanel } from "./edges/NodeDetailPanel";

export type Selection =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | null;

export function EdgesScreen() {
  const currencies = useStore((s) => s.currencies);
  const edges = useStore((s) => s.edges);
  const cards = useStore((s) => s.cards);
  const addEdge = useStore((s) => s.addEdge);
  const updateEdge = useStore((s) => s.updateEdge);
  const removeEdge = useStore((s) => s.removeEdge);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rate, setRate] = useState("1");
  const [notes, setNotes] = useState("");
  const [sel, setSel] = useState<Selection>(null);
  const [showLabels, setShowLabels] = useState(false);
  const dialog = useDialog();

  const currencyById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );
  const currencyName = useCallback(
    (id: string) => currencyById.get(id)?.name ?? id,
    [currencyById],
  );
  const { cardName } = useNameResolvers();

  // 「保有 = state.cards にあり、かつ enabled !== false」(v2 step 1 整合)。
  // bestPath の availableCardIds と同じ定義。
  const accessibleCardIds = useMemo(
    () => new Set(cards.filter((c) => c.enabled !== false).map((c) => c.id)),
    [cards],
  );

  // edge が現状ユーザーで実際に利用可能か。requiredCardIds が無ければ常に true。
  const isEdgeAccessible = useCallback(
    (e: { requiredCardIds?: string[] }) => {
      if (!e.requiredCardIds?.length) return true;
      return e.requiredCardIds.some((id) => accessibleCardIds.has(id));
    },
    [accessibleCardIds],
  );

  const focusedNodeId = sel?.type === "node" ? sel.id : null;

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
      key: "requiredCards",
      label: "保有必須",
      view: (e) =>
        e.requiredCardIds?.length
          ? e.requiredCardIds.map(cardName).join(" / ")
          : "-",
      // edit は edge-panel (グラフ上の選択) で行う。テーブル直編集は対応しない (UI が膨らむため)
    },
    {
      key: "notes",
      label: "メモ",
      view: (e) => e.notes ?? "-",
      edit: (e, set) => (
        <input
          value={e.notes ?? ""}
          onChange={(ev) => set({ notes: ev.target.value || undefined })}
        />
      ),
    },
  ];

  return (
    <section>
      <h2>ポイント交換ルート</h2>
      <p className="hint">
        ノード／エッジをクリックで詳細表示。ノード選択時は関連ノードのみ表示され、
        入口は上・出口は下・双方向は左右に自動配置されます。
        端をドラッグして別ノードに接続で新しい交換ルートを作成。
      </p>

      <div className="graph-toolbar">
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          レート表示
        </label>
        {focusedNodeId && (
          <button onClick={() => setSel(null)} style={{ fontSize: 12 }}>
            ✕ 全体表示に戻る
          </button>
        )}
      </div>

      <EdgesGraph
        currencies={currencies}
        edges={edges}
        currencyById={currencyById}
        sel={sel}
        showLabels={showLabels}
        accessibleCardIds={accessibleCardIds}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
      />

      {/* ===== ノード選択時: 関連ルート一覧 ===== */}
      {selectedCurrency && (
        <NodeDetailPanel
          currency={selectedCurrency}
          outgoing={outgoing}
          incoming={incoming}
          currencyById={currencyById}
          cardName={cardName}
          isEdgeAccessible={isEdgeAccessible}
          onSelectEdge={(id) => setSel({ type: "edge", id })}
          onDismiss={() => setSel(null)}
        />
      )}

      {/* ===== エッジ選択時: レート編集 ===== */}
      {selectedEdge && (
        <EdgeDetailPanel
          edge={selectedEdge}
          cards={cards}
          currencyById={currencyById}
          currencyName={currencyName}
          isEdgeAccessible={isEdgeAccessible}
          onUpdate={(patch) => updateEdge(selectedEdge.id, patch)}
          onDelete={async () => {
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
          onDismiss={() => setSel(null)}
        />
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
          <span>→</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">to</option>
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
