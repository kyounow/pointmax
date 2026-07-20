import { useState } from "react";
import { formatRatio } from "../../domain/currencyKind";
import { isMonthStale } from "../../domain/edgeFreshness";
import type { Card, ConversionEdge, Currency } from "../../domain/types";
import { CurrencyIcon } from "../CurrencyIcon";

type Props = {
  edge: ConversionEdge;
  cards: Card[];
  currencyById: Map<string, Currency>;
  currencyName: (id: string) => string;
  isEdgeAccessible: (e: { requiredCardIds?: string[] }) => boolean;
  onUpdate: (patch: Partial<Omit<ConversionEdge, "id">>) => void;
  onDelete: () => void;
  onDismiss: () => void;
};

export function EdgeDetailPanel({
  edge,
  cards,
  currencyById,
  currencyName,
  isEdgeAccessible,
  onUpdate,
  onDelete,
  onDismiss,
}: Props) {
  // 閲覧モード ↔ 編集モードの 2 段階。デフォルトは閲覧モード。
  // 別の edge に切り替わったら閲覧モードに戻す (誤編集を防ぐため)。
  // render 中に直前の edge.id と比較してリセットする (effect 内 setState を避ける
  // React 公認の「prop 変化時に state を調整」パターン)。
  const [isEditing, setIsEditing] = useState(false);
  const [prevEdgeId, setPrevEdgeId] = useState(edge.id);
  if (prevEdgeId !== edge.id) {
    setPrevEdgeId(edge.id);
    setIsEditing(false);
  }

  const requiredCardNames = edge.requiredCardIds
    ?.map((id) => cards.find((c) => c.id === id)?.name ?? id)
    .filter(Boolean) ?? [];

  return (
    <div className="edge-panel">
      <div className="edge-panel-head">
        <span>
          選択中のエッジ
          {isEditing && (
            <span
              className="badge"
              style={{ background: "#f59e0b", marginLeft: 6 }}
              title="編集モード"
            >
              編集中
            </span>
          )}
        </span>
        <span style={{ display: "inline-flex", gap: 6 }}>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{ fontSize: 12 }}
              title="このエッジのレートや必要カードを編集"
            >
              ✏️ 編集
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              style={{ fontSize: 12 }}
              title="編集をやめて閲覧モードに戻る"
            >
              ← 閲覧に戻る
            </button>
          )}
          <button onClick={onDismiss}>選択解除</button>
        </span>
      </div>
      <div className="edge-panel-body">
        {/* 起点 → 終点 表示 (両モード共通) */}
        <div className="path-line">
          <span className="node-with-icon">
            {(() => {
              const c = currencyById.get(edge.fromCurrencyId);
              return c ? <CurrencyIcon currency={c} size={24} /> : null;
            })()}
            <span>{currencyName(edge.fromCurrencyId)}</span>
          </span>
          <span className="arrow-large">→</span>
          <span className="node-with-icon">
            {(() => {
              const c = currencyById.get(edge.toCurrencyId);
              return c ? <CurrencyIcon currency={c} size={24} /> : null;
            })()}
            <span>{currencyName(edge.toCurrencyId)}</span>
          </span>
        </div>

        {!isEditing ? (
          // ─── 閲覧モード ───
          <>
            <div className="ratio-hint" style={{ fontSize: 14, marginTop: 8 }}>
              <strong>レート:</strong> {formatRatio(edge.rate)} (
              {currencyName(edge.fromCurrencyId)} →{" "}
              {currencyName(edge.toCurrencyId)})
            </div>
            {edge.notes && (
              <div className="ratio-hint" style={{ marginTop: 4 }}>
                <strong>メモ:</strong> {edge.notes}
              </div>
            )}
            {/* REM-#2: 最終確認月 (メンテ用ビュー)。6ヶ月超は ⚠ で棚卸し対象を示す。
                未記入は「未確認」表示 (未検証を古いと誤警告しない = ⚠ は出さない)。 */}
            <div className="ratio-hint" style={{ marginTop: 4 }}>
              <strong>最終確認:</strong>{" "}
              {edge.lastVerifiedAt ? (
                isMonthStale(edge.lastVerifiedAt, new Date()) ? (
                  <span
                    style={{ color: "#d4a017" }}
                    title="最終確認から6ヶ月以上経過。公式ページでレートを再確認し lastVerifiedAt を更新してください (四半期棚卸し対象)。"
                  >
                    ⚠ {edge.lastVerifiedAt} (要確認)
                  </span>
                ) : (
                  <span>{edge.lastVerifiedAt}</span>
                )
              ) : (
                <span className="hint-inline">未確認 (未記入)</span>
              )}
            </div>
            {(edge.requiredCardIds?.length ?? 0) > 0 && (
              <>
                <div
                  className={`edge-access-status${
                    isEdgeAccessible(edge) ? " is-open" : " is-locked"
                  }`}
                >
                  {isEdgeAccessible(edge)
                    ? "✓ 現在のカード保有状況でこのルートは利用可能"
                    : "🔒 必要なカードを保有していないため、このルートは Calculator で除外されます"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span className="edge-panel-section-label">
                    保有必要カード:{" "}
                  </span>
                  <span className="hint-inline">
                    {requiredCardNames.join(" / ")}
                  </span>
                </div>
              </>
            )}
            {!edge.notes && (edge.requiredCardIds?.length ?? 0) === 0 && (
              <p
                className="hint"
                style={{ marginTop: 8, fontSize: 12 }}
              >
                メモ・保有必要カードの設定はありません。
                「✏️ 編集」で追加できます。
              </p>
            )}
          </>
        ) : (
          // ─── 編集モード ───
          <>
            <label>
              レート (1単位 → ?単位):
              <input
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0"
                value={edge.rate}
                onChange={(e) => onUpdate({ rate: Number(e.target.value) })}
              />
            </label>
            <div className="ratio-hint">
              {formatRatio(edge.rate)}（{currencyName(edge.fromCurrencyId)} →{" "}
              {currencyName(edge.toCurrencyId)}）
            </div>
            <label>
              メモ:
              <input
                value={edge.notes ?? ""}
                onChange={(e) =>
                  onUpdate({ notes: e.target.value || undefined })
                }
                placeholder="(任意)"
              />
            </label>
            {(edge.requiredCardIds?.length ?? 0) > 0 && (
              <div
                className={`edge-access-status${
                  isEdgeAccessible(edge) ? " is-open" : " is-locked"
                }`}
              >
                {isEdgeAccessible(edge)
                  ? "✓ 現在のカード保有状況でこのルートは利用可能"
                  : "🔒 必要なカードを保有していないため、このルートは Calculator で除外されます"}
              </div>
            )}
            <div>
              <div className="edge-panel-section-label">
                保有が必要なカード{" "}
                <span className="hint-inline">(任意・複数可)</span>
              </div>
              <div className="edge-required-cards-picker">
                {cards.length === 0 ? (
                  <span className="hint-inline">
                    カードが登録されていません
                  </span>
                ) : (
                  cards.map((c) => {
                    const checked =
                      edge.requiredCardIds?.includes(c.id) ?? false;
                    return (
                      <label
                        key={c.id}
                        className="edge-required-card-item"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const cur = edge.requiredCardIds ?? [];
                            const next = e.target.checked
                              ? [...cur, c.id]
                              : cur.filter((x) => x !== c.id);
                            onUpdate({
                              requiredCardIds:
                                next.length > 0 ? next : undefined,
                            });
                          }}
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <button className="danger" onClick={onDelete}>
              このエッジを削除
            </button>
          </>
        )}
      </div>
    </div>
  );
}
