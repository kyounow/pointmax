import { useCallback, useMemo, useState } from "react";
import type { Connection, Edge as RFEdge, Node as RFNode } from "@xyflow/react";

import { useStore } from "../state/store";
import { useDialog } from "./dialog/DialogProvider";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { EdgesGraph } from "./edges/EdgesGraph";
import { EdgeDetailPanel } from "./edges/EdgeDetailPanel";
import { NodeDetailPanel } from "./edges/NodeDetailPanel";
import { NodePill } from "./NodePill";
import type { Selection } from "./edges/types";
import { bestPath } from "../domain/bestPath";
import { formatRatio } from "../domain/currencyKind";
import { formatNum } from "../domain/formatNum";

export function EdgesScreen() {
  const currencies = useStore((s) => s.currencies);
  const edges = useStore((s) => s.edges);
  const cards = useStore((s) => s.cards);
  const addEdge = useStore((s) => s.addEdge);
  const updateEdge = useStore((s) => s.updateEdge);
  const removeEdge = useStore((s) => s.removeEdge);

  const [sel, setSel] = useState<Selection>(null);
  const [showLabels, setShowLabels] = useState(false);
  const dialog = useDialog();

  // ルート検索 (v4.0.0 ③): 起点・終点を選ぶと bestPath で最効率 path を表示。
  // デフォルト startAmount=10000 で「10000 単位を交換したら何単位になるか」を可視化。
  // 起点・終点未選択時は path 計算しない。同一通貨選択時は変換不要 (rate 1.0)。
  const [routeFromId, setRouteFromId] = useState<string>("");
  const [routeToId, setRouteToId] = useState<string>("");
  const [routeAmountStr, setRouteAmountStr] = useState<string>("10000");

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

  // ルート検索 結果: 起点・終点が両方選択されているときに bestPath を実行。
  // accessibleCardIds を渡すことで「保有していないカード必須の edge」を除外する。
  const routeAmount = useMemo(() => {
    const n = Number(routeAmountStr);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [routeAmountStr]);

  const routeResult = useMemo(() => {
    if (!routeFromId || !routeToId || routeAmount <= 0) return null;
    return bestPath(
      edges,
      routeFromId,
      routeToId,
      routeAmount,
      accessibleCardIds,
    );
  }, [edges, routeFromId, routeToId, routeAmount, accessibleCardIds]);

  // ルート path に含まれる edge id 集合 (グラフでハイライト用)
  const routePathEdgeIds = useMemo(
    () => new Set(routeResult?.steps.map((s) => s.id) ?? []),
    [routeResult],
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

  return (
    <section>
      <h2>ポイント交換ルート</h2>
      <p className="hint">
        ノード／エッジをクリックで詳細表示。ノード選択時は関連ノードのみ表示され、
        入口は上・出口は下・双方向は左右に自動配置されます。
        端をドラッグして別ノードに接続で新しい交換ルートを作成。
      </p>

      {/* ─── ルート検索 (v4.0.0 ③) ───
          起点・終点を選ぶと bestPath で最効率 path を表示。
          requiredCardIds 付きの edge は保有カードのみ通過させる
          (accessibleCardIds を bestPath に渡しているので、UI 側で追加 filter 不要)。 */}
      <div className="route-finder">
        <h3 style={{ marginTop: 16, marginBottom: 8 }}>🔍 ルート検索</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          起点と終点の通貨を選ぶと、最も効率的な交換ルートを表示します。
          保有カードが必須の edge は自動で除外されます。
        </p>
        <div
          className="route-finder-form"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <label>
            起点:{" "}
            <select
              value={routeFromId}
              onChange={(e) => setRouteFromId(e.target.value)}
            >
              <option value="">通貨を選択</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            終点:{" "}
            <select
              value={routeToId}
              onChange={(e) => setRouteToId(e.target.value)}
            >
              <option value="">通貨を選択</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            金額:{" "}
            <input
              type="number"
              min="1"
              step="1"
              value={routeAmountStr}
              onChange={(e) => setRouteAmountStr(e.target.value)}
              style={{ width: 100 }}
            />
          </label>
          {(routeFromId || routeToId) && (
            <button
              onClick={() => {
                setRouteFromId("");
                setRouteToId("");
              }}
              style={{ fontSize: 12 }}
            >
              クリア
            </button>
          )}
        </div>

        {/* ルート検索 結果 */}
        {routeFromId && routeToId && (
          <div className="route-finder-result">
            {routeResult ? (
              <>
                <div className="path">
                  <div className="path-line">
                    <NodePill currency={currencyById.get(routeFromId)} />
                    {routeResult.steps.map((step) => (
                      <span key={step.id} className="path-segment">
                        <span className="arrow">
                          →<small>{formatRatio(step.rate)}</small>
                        </span>
                        <NodePill
                          currency={currencyById.get(step.toCurrencyId)}
                        />
                        {step.requiredCardIds?.length ? (
                          <small
                            className="step-required-card"
                            title="このステップはこのカード保有を前提とします"
                          >
                            (要 {step.requiredCardIds.map(cardName).join(" / ")})
                          </small>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  className="hint"
                  style={{ marginTop: 6, fontSize: 13 }}
                >
                  {routeResult.steps.length === 0 ? (
                    <>変換不要 (同一通貨): {formatNum(routeAmount)} {currencyName(routeFromId)}</>
                  ) : (
                    <>
                      {formatNum(routeAmount)} {currencyName(routeFromId)} →{" "}
                      <strong>
                        {formatNum(routeResult.finalAmount)} {currencyName(routeToId)}
                      </strong>{" "}
                      (合計 ×{formatRatio(routeResult.product)},{" "}
                      {routeResult.steps.length} ホップ)
                    </>
                  )}
                </div>
              </>
            ) : (
              <p className="hint">
                {currencyName(routeFromId)} から {currencyName(routeToId)}{" "}
                への交換ルートが見つかりません。
                保有カードが必須の edge をブロックしている場合があります — カード設定を確認してください。
              </p>
            )}
          </div>
        )}
      </div>

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
        routePathEdgeIds={routePathEdgeIds}
        routeFromId={routeFromId || undefined}
        routeToId={routeToId || undefined}
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
          isRouteFrom={selectedCurrency.id === routeFromId}
          isRouteTo={selectedCurrency.id === routeToId}
          onSetAsRouteFrom={() => setRouteFromId(selectedCurrency.id)}
          onSetAsRouteTo={() => setRouteToId(selectedCurrency.id)}
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

    </section>
  );
}
