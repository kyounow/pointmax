import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { rankCards } from "../domain/rankCards";
import { cardLabel } from "../domain/cardLabel";
import { formatRatio } from "../domain/currencyKind";
import { formatNum } from "../domain/formatNum";
import { groupBy } from "../domain/groupBy";
import { NodePill } from "./NodePill";
import { RuleStatusBadge } from "./RuleStatusBadge";
import { NoteChips } from "./NoteChips";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { isRuleActiveAt } from "../domain/ruleActiveAt";
import { isMasterCard } from "../state/seed";
import { CardComparisonSection } from "./CardComparisonSection";

export function CalculatorScreen() {
  const cards = useStore((s) => s.cards);
  const stores = useStore((s) => s.stores);
  const currencies = useStore((s) => s.currencies);
  const rules = useStore((s) => s.rules);
  const edges = useStore((s) => s.edges);
  const pointCards = useStore((s) => s.pointCards);
  const loyaltyRules = useStore((s) => s.loyaltyRules);
  const paymentApps = useStore((s) => s.paymentApps);

  // デフォルトは「一般店舗 (規定還元)」。基本還元率の確認用。
  // store-id "general" が存在しない場合 (極端なリセット直後) は空文字フォールバック
  const [storeId, setStoreId] = useState("general");
  const [storeSearch, setStoreSearch] = useState("");
  const [storeCategory, setStoreCategory] = useState(""); // "" = 全カテゴリ
  const [amount, setAmount] = useState("10000");
  const [targetCurrencyId, setTargetCurrencyId] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 利用可能なカテゴリ一覧 (件数付き)
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stores) {
      const c = s.category ?? "(未分類)";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [stores]);

  // カテゴリ絞り込み + 文字検索 (AND)
  // どちらも空ならデフォルトで全件表示
  const filteredStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    return stores.filter((s) => {
      if (storeCategory) {
        const cat = s.category ?? "(未分類)";
        if (cat !== storeCategory) return false;
      }
      if (q) {
        const inName = s.name.toLowerCase().includes(q);
        const inCat = (s.category ?? "").toLowerCase().includes(q);
        if (!inName && !inCat) return false;
      }
      return true;
    });
  }, [stores, storeSearch, storeCategory]);

  // 店舗をカテゴリ別にグループ化 (検索フィルタ後)
  const storesByCategory = useMemo(
    () => groupBy(filteredStores, (s) => s.category ?? "その他"),
    [filteredStores],
  );
  // 通貨を kind 別にグループ化（マイル/ポイント/現金相当/未分類）
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

  const currencyById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );
  const currencyName = useCallback(
    (id: string) => currencyById.get(id)?.name ?? id,
    [currencyById],
  );
  const { cardName } = useNameResolvers();

  // includeDisabled: true で全カード試算、後で 2 つに分割
  const allRanked = useMemo(() => {
    if (!storeId || !targetCurrencyId || !amount) return null;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    return rankCards(
      {
        payment: { storeId, amount: amt },
        targetCurrencyId,
        cards,
        stores,
        rules,
        edges,
        pointCards,
        loyaltyRules,
        paymentApps,
      },
      { includeDisabled: true },
    );
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
    paymentApps,
  ]);

  // 主結果: enabled なカード (既存 result と同等)
  const result = useMemo(
    () => (allRanked ? allRanked.filter((r) => r.card.enabled !== false) : null),
    [allRanked],
  );

  // 比較対象: enabled=false かつ master pool のカード
  const comparisonItems = useMemo(
    () =>
      allRanked
        ? allRanked.filter(
            (r) => r.card.enabled === false && isMasterCard(r.card.id),
          )
        : [],
    [allRanked],
  );

  const loyalties = result && result.length > 0 ? result[0].loyalties : [];

  // 同率 rank 表示: totalFinalAmount 同値カードに同じ rank を割り当てる (#1, #1, #3 ...)
  const displayRankMap = useMemo(() => {
    if (!result) return new Map<string, number>();
    const map = new Map<string, number>();
    let prevTotal = Number.POSITIVE_INFINITY;
    let prevRank = 0;
    result.forEach((r, i) => {
      if (r.reachable && r.totalFinalAmount !== prevTotal) {
        prevRank = i + 1;
        prevTotal = r.totalFinalAmount;
      }
      map.set(r.card.id, r.reachable ? prevRank : -1);
    });
    return map;
  }, [result]);

  // 入力が変わるたびに、同率 1 位の reachable カード全部を展開状態にリセット
  // (totalFinalAmount が最上位値と等しい全カード = displayRank 1 の集合)
  useEffect(() => {
    if (!result) {
      setExpandedIds(new Set());
      return;
    }
    const topTotal = result.find((r) => r.reachable)?.totalFinalAmount;
    if (topTotal === undefined) {
      setExpandedIds(new Set());
      return;
    }
    const tiedTop = result.filter(
      (r) => r.reachable && r.totalFinalAmount === topTotal,
    );
    setExpandedIds(new Set(tiedTop.map((r) => r.card.id)));
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
      {(() => {
        const now = new Date();
        const dateStr = now.toLocaleDateString("ja-JP", {
          month: "long",
          day: "numeric",
          weekday: "short",
        });

        // アクティブ期間ルールの集計
        const allRules = [...rules, ...loyaltyRules];
        // PaymentApp の cardSpecificBonusRates 期間も集計
        const paymentAppBonuses = paymentApps.flatMap((p) =>
          p.cardSpecificBonusRates ?? []
        );

        const timeBoundActive = [...allRules, ...paymentAppBonuses].filter(
          (r) => r.validTo && isRuleActiveAt(r, now)
        ).length;
        const ongoingActive = [...allRules, ...paymentAppBonuses].filter(
          (r) => !r.validTo && r.validFrom && isRuleActiveAt(r, now)
        ).length;
        const recurringActive = allRules.filter(
          (r) => "recurringDays" in r && r.recurringDays?.length && isRuleActiveAt(r, now)
        ).length;

        return (
          <div className="today-banner">
            <span className="today-banner-date">📅 今日 {dateStr}</span>
            <span className="today-banner-counts">
              <span>🎯 期間限定 <strong>{timeBoundActive}</strong> 件</span>
              <span>📌 公式プログラム <strong>{ongoingActive}</strong> 件</span>
              <span>🗓 recurring <strong>{recurringActive}</strong> 件</span>
            </span>
          </div>
        );
      })()}

      <form className="row" onSubmit={(e) => e.preventDefault()}>
        <label>
          店舗:
          <span className="store-picker">
            <select
              className="store-category-filter"
              value={storeCategory}
              onChange={(e) => setStoreCategory(e.target.value)}
              aria-label="カテゴリで絞り込み"
              title="カテゴリで絞り込み"
            >
              <option value="">全カテゴリ ({stores.length})</option>
              {categoryOptions.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
            <input
              type="search"
              className="store-search"
              placeholder="検索..."
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              aria-label="店舗を絞り込み検索"
            />
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              <option value="">選択</option>
              {storesByCategory.map((g) => (
                <optgroup key={g.key} label={g.key}>
                  {g.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {(storeSearch || storeCategory) && (
              <small className="store-search-hint">
                {filteredStores.length} 件
              </small>
            )}
          </span>
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
        </label>
      </form>

      {!result && (
        <p className="empty">
          店舗・金額・目標通貨を選択すると結果が表示されます。
        </p>
      )}

      {result && loyalties.length > 0 && (
        <div className="loyalty-banner">
          <div className="loyalty-banner-title">
            ポイントカード併用
            {loyalties.length > 1
              ? `（${loyalties.length}枚を同時提示・三重取り）`
              : `（${loyalties[0].pointCard.name}）`}
          </div>
          {loyalties.map((loyalty, idx) => (
            <div className="loyalty-banner-body" key={loyalty.rule.id}>
              {loyalties.length > 1 && (
                <span className="loyalty-stack-tag">{idx + 1}枚目</span>
              )}
              <span className="loyalty-rate">
                {loyalties.length > 1 && (
                  <>
                    <strong>{loyalty.pointCard.name}</strong>{" "}
                  </>
                )}
                還元率 {(loyalty.rule.rate * 100).toFixed(2)}% →{" "}
                {formatNum(loyalty.earnedAmount)}{" "}
                {currencyName(loyalty.earnedCurrencyId)}
                <RuleStatusBadge
                  validFrom={loyalty.rule.validFrom}
                  validTo={loyalty.rule.validTo}
                  style={{ marginLeft: 6 }}
                />
                <NoteChips notes={loyalty.rule.notes} />
              </span>
              <span className="path-line">
                <NodePill
                  currency={currencyById.get(loyalty.earnedCurrencyId)}
                />
                {loyalty.pathSteps.map((step) => (
                  <span key={step.id} className="path-segment">
                    <span className="arrow">
                      →<small>{formatRatio(step.rate)}</small>
                    </span>
                    <NodePill currency={currencyById.get(step.toCurrencyId)} />
                    {step.requiredCardIds?.length ? (
                      <small className="step-required-card" title="このステップはこのカード保有を前提とします">
                        (要 {step.requiredCardIds.map(cardName).join(" / ")})
                      </small>
                    ) : null}
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
          ))}
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
            const reachableLoyalties = r.loyalties.filter((l) => l.reachable);
            const loyaltyTotal = reachableLoyalties.reduce(
              (s, l) => s + l.finalAmount,
              0,
            );
            const hasLoyalty = reachableLoyalties.length > 0;
            const expanded = expandedIds.has(r.card.id);
            return (
              <article
                key={r.card.id}
                className={`result-card ${r.reachable ? "" : "unreachable"} ${displayRankMap.get(r.card.id) === 1 && r.reachable ? "best" : ""} ${expanded ? "expanded" : "collapsed"}`}
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
                    {r.reachable ? `#${displayRankMap.get(r.card.id) ?? i + 1}` : "対象外"}
                  </span>
                  {(() => {
                    // paymentMode を優先、なければ chargeBased fallback
                    const mode =
                      r.paymentApp?.paymentMode ??
                      (r.paymentApp?.chargeBased ? "charge" : undefined);
                    return mode === "charge" || mode === "direct";
                  })() ? (
                    <>
                      <span
                        className="payment-app-badge"
                        title="支払いに使うアプリ"
                      >
                        {r.paymentApp!.iconChar && (
                          <span
                            className="payment-app-icon"
                            style={{
                              background: r.paymentApp!.iconColor ?? "#6b7280",
                            }}
                          >
                            {r.paymentApp!.iconChar}
                          </span>
                        )}
                        {r.paymentApp!.name}
                      </span>
                      <span className="charge-flow-hint">
                        {(r.paymentApp!.paymentMode ?? "charge") === "direct"
                          ? " に紐付けて決済、"
                          : " の残高にカードからチャージ、"}
                      </span>
                      <strong>{cardLabel(r.card)}</strong>
                    </>
                  ) : (
                    <>
                      <strong>{cardLabel(r.card)}</strong>
                      {r.paymentApp && (
                        <span
                          className="payment-app-badge"
                          title="自動選択された支払方法"
                        >
                          {r.paymentApp.iconChar && (
                            <span
                              className="payment-app-icon"
                              style={{
                                background:
                                  r.paymentApp.iconColor ?? "#6b7280",
                              }}
                            >
                              {r.paymentApp.iconChar}
                            </span>
                          )}
                          {r.paymentApp.name}
                        </span>
                      )}
                    </>
                  )}
                  {r.reachable && (
                    <span className="final">
                      {(() => {
                        const appBonus = r.appBonusReachable
                          ? r.appBonusFinalAmount
                          : 0;
                        const hasExtras = hasLoyalty || appBonus > 0;
                        if (!hasExtras) {
                          return (
                            <>
                              最終: {formatNum(r.finalAmount)}{" "}
                              {currencyName(targetCurrencyId)}
                            </>
                          );
                        }
                        const parts: string[] = [
                          `クレカ ${formatNum(r.finalAmount)}`,
                        ];
                        if (appBonus > 0) {
                          parts.push(`アプリ +${formatNum(appBonus)}`);
                        }
                        if (hasLoyalty) {
                          parts.push(
                            `併用 +${formatNum(loyaltyTotal)}${reachableLoyalties.length > 1 ? `×${reachableLoyalties.length}枚` : ""}`,
                          );
                        }
                        return (
                          <>
                            合計 {formatNum(r.totalFinalAmount)}{" "}
                            {currencyName(targetCurrencyId)}
                            <small className="loyalty-breakdown">
                              （{parts.join(" + ")}）
                            </small>
                          </>
                        );
                      })()}
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
                      {(r.resolved.source === "rule" ||
                        r.resolved.source === "category") && (
                        <RuleStatusBadge
                          validFrom={r.resolved.validFrom}
                          validTo={r.resolved.validTo}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                      {(r.resolved.source === "rule" ||
                        r.resolved.source === "category") && (
                        <NoteChips notes={r.resolved.notes} />
                      )}
                      {(() => {
                        if (r.resolved.source === "default" || r.resolved.source === "charge") return null;
                        const ruleId = r.resolved.ruleId;
                        const rule = rules.find((rl) => rl.id === ruleId);
                        if (!rule?.monthlyCapAmountYen) return null;
                        return (
                          <span
                            className="cap-warn"
                            title="この還元率には月間/年間の上限があります"
                          >
                            ⚠ 上限{" "}
                            {rule.monthlyCapAmountYen.toLocaleString()}
                            円/月
                          </span>
                        );
                      })()}
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
                            {step.requiredCardIds?.length ? (
                              <small className="step-required-card" title="このステップはこのカード保有を前提とします">
                                (要 {step.requiredCardIds.map(cardName).join(" / ")})
                              </small>
                            ) : null}
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

                    {r.paymentApp &&
                      r.appBonusEarnedAmount > 0 &&
                      r.appBonusCurrencyId && (
                        <div className="result-meta">
                          {r.paymentApp.chargeBased
                            ? `${r.paymentApp.name} 利用ボーナス`
                            : "支払アプリ還元"}{" "}
                          ({(r.appBonusRate * 100).toFixed(2)}%):{" "}
                          {formatNum(r.appBonusEarnedAmount)}{" "}
                          {currencyName(r.appBonusCurrencyId)}
                          {r.appBonusReachable && r.appBonusFinalAmount > 0 && (
                            <>
                              {" "}
                              → +{formatNum(r.appBonusFinalAmount)}{" "}
                              {currencyName(targetCurrencyId)}
                            </>
                          )}
                        </div>
                      )}
                  </>
                )}
              </article>
            );
          })}
          {comparisonItems.length > 0 && (() => {
            const topReachable = result.find((r) => r.reachable);
            const topTotal = topReachable?.totalFinalAmount ?? 0;
            return (
              <CardComparisonSection
                comparisonItems={comparisonItems}
                topReachableTotal={topTotal}
                targetCurrencyName={currencyName(targetCurrencyId)}
              />
            );
          })()}
        </div>
      )}
    </section>
  );
}

