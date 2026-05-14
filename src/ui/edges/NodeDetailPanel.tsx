import { formatRatio } from "../../domain/currencyKind";
import type { ConversionEdge, Currency } from "../../domain/types";
import { CurrencyIcon } from "../CurrencyIcon";

type Props = {
  currency: Currency;
  outgoing: ConversionEdge[];
  incoming: ConversionEdge[];
  currencyById: Map<string, Currency>;
  cardName: (id: string) => string;
  isEdgeAccessible: (e: { requiredCardIds?: string[] }) => boolean;
  onSelectEdge: (id: string) => void;
  onDismiss: () => void;
};

export function NodeDetailPanel({
  currency,
  outgoing,
  incoming,
  currencyById,
  cardName,
  isEdgeAccessible,
  onSelectEdge,
  onDismiss,
}: Props) {
  return (
    <div className="edge-panel">
      <div className="edge-panel-head">
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <CurrencyIcon currency={currency} size={22} />
          <strong>{currency.name}</strong> の関連ルート
        </span>
        <button onClick={onDismiss}>選択解除</button>
      </div>
      <div className="edge-panel-body node-routes">
        {outgoing.length === 0 && incoming.length === 0 && (
          <p className="empty">関連エッジがありません。</p>
        )}
        {outgoing.length > 0 && (
          <div className="node-routes-col">
            <h4 className="route-section-title">
              出口（このポイントから交換できる先）
            </h4>
            <div className="route-list">
              {outgoing.map((e) => {
                const to = currencyById.get(e.toCurrencyId);
                if (!to) return null;
                const locked = !isEdgeAccessible(e);
                return (
                  <button
                    key={e.id}
                    className={`route-item${locked ? " is-locked" : ""}`}
                    onClick={() => onSelectEdge(e.id)}
                  >
                    <span className="route-arrow">→</span>
                    <CurrencyIcon currency={to} size={26} />
                    <span className="route-name">{to.name}</span>
                    <span className="route-ratio">{formatRatio(e.rate)}</span>
                    {e.requiredCardIds?.length ? (
                      <span
                        className={`route-required-card${locked ? " is-locked" : ""}`}
                        title={
                          locked
                            ? "このカードを保有していないため利用不可"
                            : "このルートを使うために保有が必要なカード"
                        }
                      >
                        {locked ? "🔒 " : ""}要{" "}
                        {e.requiredCardIds.map(cardName).join(" / ")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {incoming.length > 0 && (
          <div className="node-routes-col">
            <h4 className="route-section-title">
              入口（このポイントへ変換できる元）
            </h4>
            <div className="route-list">
              {incoming.map((e) => {
                const fr = currencyById.get(e.fromCurrencyId);
                if (!fr) return null;
                const locked = !isEdgeAccessible(e);
                return (
                  <button
                    key={e.id}
                    className={`route-item${locked ? " is-locked" : ""}`}
                    onClick={() => onSelectEdge(e.id)}
                  >
                    <CurrencyIcon currency={fr} size={26} />
                    <span className="route-name">{fr.name}</span>
                    <span className="route-arrow">→</span>
                    <span className="route-ratio">{formatRatio(e.rate)}</span>
                    {e.requiredCardIds?.length ? (
                      <span
                        className={`route-required-card${locked ? " is-locked" : ""}`}
                        title={
                          locked
                            ? "このカードを保有していないため利用不可"
                            : "このルートを使うために保有が必要なカード"
                        }
                      >
                        {locked ? "🔒 " : ""}要{" "}
                        {e.requiredCardIds.map(cardName).join(" / ")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
