import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import type { Connection, Edge as RFEdge, Node as RFNode } from "@xyflow/react";

import { useStore } from "../state/store";
import { useDialog } from "./dialog/useDialog";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { EdgesGraph } from "./edges/EdgesGraph";
import { EdgeDetailPanel } from "./edges/EdgeDetailPanel";
import { NodeDetailPanel } from "./edges/NodeDetailPanel";
import { NodePill } from "./NodePill";
import type { Selection } from "./edges/types";
import { bestPath } from "../domain/bestPath";
import { computeStrictBlockedCurrencyIds } from "../domain/currencyGating";
import { formatRatio } from "../domain/currencyKind";
import { formatNum } from "../domain/formatNum";

export function EdgesScreen() {
  // Wave 5 B-1 / v6.0.0: useShallow に集約 (pointCards は strict blockedCurrencyIds 用)
  const {
    currencies,
    edges,
    cards,
    pointCards,
    addEdge,
    updateEdge,
    removeEdge,
  } = useStore(
    useShallow((s) => ({
      currencies: s.currencies,
      edges: s.edges,
      cards: s.cards,
      pointCards: s.pointCards,
      addEdge: s.addEdge,
      updateEdge: s.updateEdge,
      removeEdge: s.removeEdge,
    })),
  );

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

  // v6.0.0: 全カード集合 (SUB ルート = 全資産解放での最良ルート計算用)
  const allCardIds = useMemo(() => new Set(cards.map((c) => c.id)), [cards]);

  // v6.0.0 / 強い除外: ユーザーが「使わない」にしたポイント通貨 (MAIN ルートの起点・経由から除外)。
  // EdgesScreen は探索ツールなので strict 版 = 有効クレカが同通貨を貯めても除外する
  // (有効な別 pointCard が同通貨を持つ場合のみ救済)。Calculator は通常版を使い続ける。
  const blockedCurrencyIds = useMemo(
    () => computeStrictBlockedCurrencyIds(pointCards),
    [pointCards],
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

  // MAIN ルート: 使うカード + 使うポイント (blockedCurrencyIds で起点・経由を制限)。
  const routeResult = useMemo(() => {
    if (!routeFromId || !routeToId || routeAmount <= 0) return null;
    return bestPath(
      edges,
      routeFromId,
      routeToId,
      routeAmount,
      accessibleCardIds,
      blockedCurrencyIds,
    );
  }, [edges, routeFromId, routeToId, routeAmount, accessibleCardIds, blockedCurrencyIds]);

  // SUB ルート (v6.0.0): 全カード + 全ポイント解放での最良ルート。
  // MAIN より高レートのとき「使い始めればより良いルートが開く」提案を出す。
  const betterRoute = useMemo(() => {
    if (!routeFromId || !routeToId || routeAmount <= 0) return null;
    const full = bestPath(edges, routeFromId, routeToId, routeAmount, allCardIds, undefined);
    if (!full) return null;
    const mainProduct = routeResult?.product ?? 0;
    if (full.product <= mainProduct + 1e-9) return null; // MAIN と同等以下なら提案しない

    // 不足資産を抽出: SUB path の step から
    //  - blocked な fromCurrency (= 使い始めるべきポイント通貨)
    //  - requiredCardIds が accessible に無い (= 有効化すべきクレカ)
    const unlockCurrencyIds = new Set<string>();
    const unlockCardIds = new Set<string>();
    for (const s of full.steps) {
      if (blockedCurrencyIds.has(s.fromCurrencyId)) {
        unlockCurrencyIds.add(s.fromCurrencyId);
      }
      if (
        s.requiredCardIds?.length &&
        !s.requiredCardIds.some((id) => accessibleCardIds.has(id))
      ) {
        for (const id of s.requiredCardIds) unlockCardIds.add(id);
      }
    }
    return {
      result: full,
      deltaFinal: full.finalAmount - (routeResult?.finalAmount ?? 0),
      unlockCurrencyIds: [...unlockCurrencyIds],
      unlockCardIds: [...unlockCardIds],
    };
  }, [
    edges,
    routeFromId,
    routeToId,
    routeAmount,
    allCardIds,
    accessibleCardIds,
    blockedCurrencyIds,
    routeResult,
  ]);

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
                        {step.requiredCardIds?.length ? (
                          <small
                            className="step-required-card"
                            title="この交換ステップにこのカード保有が必要です"
                          >
                            (要 {step.requiredCardIds.map(cardName).join(" / ")})
                          </small>
                        ) : null}
                        <NodePill
                          currency={currencyById.get(step.toCurrencyId)}
                        />
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
                {blockedCurrencyIds.has(routeFromId) ? (
                  <>
                    {" "}起点「{currencyName(routeFromId)}」は「使わない」設定です。
                    「ポイントカード」画面で「使う」に戻すと交換ルートが表示されます。
                  </>
                ) : (
                  <>
                    {" "}保有カードが必須の edge
                    をブロックしている場合があります — カード設定を確認してください。
                  </>
                )}
              </p>
            )}

            {/* v6.0.0: 使っていない資産を有効化すれば開くより良いルート (SUB) */}
            {betterRoute && (
              <div className="route-finder-better">
                <div className="route-finder-better-title">
                  ✨ 使っていない資産を有効化すると、より良いルートが開きます (+
                  {formatNum(betterRoute.deltaFinal)} {currencyName(routeToId)})
                </div>
                <div className="path">
                  <div className="path-line">
                    <NodePill currency={currencyById.get(routeFromId)} />
                    {betterRoute.result.steps.map((step) => (
                      <span key={step.id} className="path-segment">
                        <span className="arrow">
                          →<small>{formatRatio(step.rate)}</small>
                        </span>
                        <NodePill currency={currencyById.get(step.toCurrencyId)} />
                      </span>
                    ))}
                  </div>
                </div>
                <div className="hint" style={{ marginTop: 6, fontSize: 13 }}>
                  {formatNum(routeAmount)} {currencyName(routeFromId)} →{" "}
                  <strong>
                    {formatNum(betterRoute.result.finalAmount)}{" "}
                    {currencyName(routeToId)}
                  </strong>{" "}
                  (合計 ×{formatRatio(betterRoute.result.product)})
                </div>
                {betterRoute.unlockCurrencyIds.length > 0 && (
                  <div className="route-finder-better-unlock">
                    使い始めるポイント:{" "}
                    {betterRoute.unlockCurrencyIds
                      .map((id) => currencyName(id))
                      .join(" / ")}
                    {" "}(「ポイントカード」画面で「使う」を ON に)
                  </div>
                )}
                {betterRoute.unlockCardIds.length > 0 && (
                  <div className="route-finder-better-unlock">
                    有効化するカード:{" "}
                    {betterRoute.unlockCardIds.map(cardName).join(" / ")}
                    {" "}(「カード」画面で「使う」を ON に)
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== 選択中の詳細パネル (グラフより上に配置: グラフの下まで
              スクロールせずに済むよう、選択直後にすぐ見られる位置に置く) ===== */}
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
        blockedCurrencyIds={blockedCurrencyIds}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        routePathEdgeIds={routePathEdgeIds}
        routeFromId={routeFromId || undefined}
        routeToId={routeToId || undefined}
        routeResultSteps={routeResult?.steps}
      />

    </section>
  );
}
