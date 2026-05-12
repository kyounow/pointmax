import { formatRatio } from "../../domain/currencyKind";
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
  return (
    <div className="edge-panel">
      <div className="edge-panel-head">
        <span>選択中のエッジ</span>
        <button onClick={onDismiss}>選択解除</button>
      </div>
      <div className="edge-panel-body">
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
        <label>
          レート (1単位 → ?単位):
          <input
            type="number"
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
              <span className="hint-inline">カードが登録されていません</span>
            ) : (
              cards.map((c) => {
                const checked = edge.requiredCardIds?.includes(c.id) ?? false;
                return (
                  <label key={c.id} className="edge-required-card-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const cur = edge.requiredCardIds ?? [];
                        const next = e.target.checked
                          ? [...cur, c.id]
                          : cur.filter((x) => x !== c.id);
                        onUpdate({
                          requiredCardIds: next.length > 0 ? next : undefined,
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
      </div>
    </div>
  );
}
