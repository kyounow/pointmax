import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { rankCards } from "../domain/rankCards";
import { cardLabel } from "../domain/cardLabel";
import { formatRatio, styleOf } from "../domain/currencyKind";
import type { Currency } from "../domain/types";
import { CurrencyIcon } from "./CurrencyIcon";

export function CalculatorScreen() {
  const cards = useStore((s) => s.cards);
  const stores = useStore((s) => s.stores);
  const currencies = useStore((s) => s.currencies);
  const rules = useStore((s) => s.rules);
  const edges = useStore((s) => s.edges);
  const pointCards = useStore((s) => s.pointCards);
  const loyaltyRules = useStore((s) => s.loyaltyRules);

  const [storeId, setStoreId] = useState("");
  const [amount, setAmount] = useState("10000");
  const [targetCurrencyId, setTargetCurrencyId] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const currencyById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );
  const currencyName = (id: string) => currencyById.get(id)?.name ?? id;

  const result = useMemo(() => {
    if (!storeId || !targetCurrencyId || !amount) return null;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    return rankCards({
      payment: { storeId, amount: amt },
      targetCurrencyId,
      cards,
      stores,
      rules,
      edges,
      pointCards,
      loyaltyRules,
    });
  }, [
    storeId,
    amount,
    targetCurrencyId,
    cards,
    stores,
    rules,
    edges,
    pointCards,
    loyaltyRules,
  ]);

  const loyalty = result && result.length > 0 ? result[0].loyalty : null;

  // 入力が変わるたびに、最上位の reachable カードだけ展開状態にリセット
  useEffect(() => {
    if (!result) {
      setExpandedIds(new Set());
      return;
    }
    const topReachable = result.find((r) => r.reachable);
    setExpandedIds(topReachable ? new Set([topReachable.card.id]) : new Set());
  }, [storeId, targetCurrencyId, amount, result]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const expandAll = () => {
    if (!result) return;
    setExpandedIds(new Set(result.map((r) => r.card.id)));
  };
  const collapseAll = () => setExpandedIds(new Set());
  const allExpanded = !!result && expandedIds.size === result.length;

  return (
    <section>
      <h2>計算</h2>
      <p className="hint">
        支払い情報と「最終的に貯めたい通貨」を選ぶと、保有カード別に最適な交換ルートと最終取得量を表示します。ポイントカード併用ボーナスがある店舗ではクレカ還元と合算されます。
      </p>

      <form className="row" onSubmit={(e) => e.preventDefault()}>
        <label>
          店舗:
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">選択</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          金額:
          <input
            type="number"
            min="0"
            step="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          円
        </label>
        <label>
          目標通貨:
          <select
            value={targetCurrencyId}
            onChange={(e) => setTargetCurrencyId(e.target.value)}
          >
            <option value="">選択</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </form>

      {!result && (
        <p className="empty">
          店舗・金額・目標通貨を選択すると結果が表示されます。
        </p>
      )}

      {result && loyalty && (
        <div className="loyalty-banner">
          <div className="loyalty-banner-title">
            ポイントカード併用 ({loyalty.pointCard.name})
          </div>
          <div className="loyalty-banner-body">
            <span className="loyalty-rate">
              還元率 {(loyalty.rule.rate * 100).toFixed(2)}% →{" "}
              {formatNum(loyalty.earnedAmount)}{" "}
              {currencyName(loyalty.earnedCurrencyId)}
            </span>
            <span className="path-line">
              <NodePill currency={currencyById.get(loyalty.earnedCurrencyId)} />
              {loyalty.pathSteps.map((step) => (
                <span key={step.id} className="path-segment">
                  <span className="arrow">
                    →<small>{formatRatio(step.rate)}</small>
                  </span>
                  <NodePill currency={currencyById.get(step.toCurrencyId)} />
                </span>
              ))}
            </span>
            {loyalty.reachable ? (
              <strong className="final" style={{ marginLeft: "auto" }}>
                +{formatNum(loyalty.finalAmount)}{" "}
                {currencyName(targetCurrencyId)}
              </strong>
            ) : (
              <small className="hint">
                {currencyName(loyalty.earnedCurrencyId)} から{" "}
                {currencyName(targetCurrencyId)}{" "}
                へのルート未登録（合算は0扱い）
              </small>
            )}
          </div>
        </div>
      )}

      {result && result.length > 0 && (
        <div className="results-toolbar">
          <span className="hint" style={{ margin: 0 }}>
            {result.length}件中 {expandedIds.size}件展開
          </span>
          <button onClick={allExpanded ? collapseAll : expandAll}>
            {allExpanded ? "全て折り畳む" : "全て展開"}
          </button>
        </div>
      )}

      {result && (
        <div className="results">
          {result.length === 0 && (
            <p className="empty">保有カードが登録されていません。</p>
          )}
          {result.map((r, i) => {
            const hasLoyalty = !!r.loyalty?.reachable;
            const expanded = expandedIds.has(r.card.id);
            return (
              <article
                key={r.card.id}
                className={`result-card ${r.reachable ? "" : "unreachable"} ${i === 0 && r.reachable ? "best" : ""} ${expanded ? "expanded" : "collapsed"}`}
              >
                <header
                  className="result-head clickable"
                  onClick={() => toggleExpand(r.card.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(r.card.id);
                    }
                  }}
                >
                  <span className="caret" aria-hidden="true">
                    {expanded ? "▾" : "▸"}
                  </span>
                  <span className="rank">
                    {r.reachable ? `#${i + 1}` : "対象外"}
                  </span>
                  <strong>{cardLabel(r.card)}</strong>
                  {r.reachable && (
                    <span className="final">
                      {hasLoyalty ? (
                        <>
                          合計 {formatNum(r.totalFinalAmount)}{" "}
                          {currencyName(targetCurrencyId)}
                          <small className="loyalty-breakdown">
                            （クレカ {formatNum(r.finalAmount)} + 併用{" "}
                            {formatNum(r.loyalty!.finalAmount)}）
                          </small>
                        </>
                      ) : (
                        <>
                          最終: {formatNum(r.finalAmount)}{" "}
                          {currencyName(targetCurrencyId)}
                        </>
                      )}
                    </span>
                  )}
                </header>

                {expanded && (
                  <>
                    <div className="result-meta">
                      クレカ還元率 {(r.resolved.rate * 100).toFixed(2)}% で{" "}
                      {formatNum(r.earnedAmount)}{" "}
                      {currencyName(r.earnedCurrencyId)}
                      {r.resolved.source === "rule" && (
                        <span className="badge">店舗ルール適用</span>
                      )}
                      {r.resolved.source === "category" && (
                        <span className="badge">カテゴリルール適用</span>
                      )}
                    </div>

                    <div className="path">
                      <div className="path-line">
                        <NodePill
                          currency={currencyById.get(r.earnedCurrencyId)}
                        />
                        {r.pathSteps.map((step) => (
                          <span key={step.id} className="path-segment">
                            <span className="arrow">
                              →<small>{formatRatio(step.rate)}</small>
                            </span>
                            <NodePill
                              currency={currencyById.get(step.toCurrencyId)}
                            />
                          </span>
                        ))}
                      </div>
                      {r.reachable && r.pathSteps.length === 0 && (
                        <small className="hint">変換不要（同一通貨）</small>
                      )}
                      {!r.reachable && (
                        <small className="hint">
                          {currencyName(r.earnedCurrencyId)} から{" "}
                          {currencyName(targetCurrencyId)}{" "}
                          への交換ルートが未登録です
                        </small>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NodePill({ currency }: { currency: Currency | undefined }) {
  if (!currency) return <span className="node">?</span>;
  const s = styleOf(currency.kind);
  return (
    <span
      className="node node-with-icon"
      style={{
        background: s.bg,
        color: s.text,
        border: `1.5px solid ${s.border}`,
      }}
    >
      <CurrencyIcon currency={currency} size={20} />
      <span>{currency.name}</span>
    </span>
  );
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1)
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
