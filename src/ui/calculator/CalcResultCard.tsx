// CalculatorScreen から切り出した「1 カードぶんの試算結果カード」(Wave 6 B-2)。
// result.map の 1 article 分。展開状態は親が持ち、props で受け取る。
// 動作不変リファクタ: 元の JSX をそのまま移植し、resolver / Map を props 化しただけ。

import type { CardRanking } from "../../domain/rankCards";
import type { BenefitProgram, Currency } from "../../domain/types";
import { cardLabel } from "../../domain/cardLabel";
import { formatNum } from "../../domain/formatNum";
import { formatRatio } from "../../domain/currencyKind";
import { NodePill } from "../NodePill";
import { RuleStatusBadge } from "../RuleStatusBadge";
import { NoteChips } from "../NoteChips";

type Props = {
  ranking: CardRanking;
  /** displayRankMap で解決済の表示順位 (reachable のみ意味を持つ) */
  displayRank: number;
  expanded: boolean;
  onToggle: () => void;
  activeCurrencyId: string;
  currencyById: Map<string, Currency>;
  currencyName: (id: string) => string;
  cardName: (id: string) => string;
  programById: Map<string, BenefitProgram>;
};

export function CalcResultCard({
  ranking: r,
  displayRank,
  expanded,
  onToggle,
  activeCurrencyId,
  currencyById,
  currencyName,
  cardName,
  programById,
}: Props) {
  const reachableLoyalties = r.loyalties.filter((l) => l.reachable);
  const loyaltyTotal = reachableLoyalties.reduce(
    (s, l) => s + l.finalAmount,
    0,
  );
  const hasLoyalty = reachableLoyalties.length > 0;

  return (
    <article
      className={`result-card ${r.reachable ? "" : "unreachable"} ${displayRank === 1 && r.reachable ? "best" : ""} ${expanded ? "expanded" : "collapsed"}`}
    >
      <header
        className="result-head clickable"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="caret" aria-hidden="true">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="rank">
          {r.reachable ? `#${displayRank}` : "対象外"}
        </span>
        {(() => {
          // paymentMode を優先、なければ chargeBased fallback
          const mode =
            r.paymentApp?.paymentMode ??
            (r.paymentApp?.chargeBased ? "charge" : undefined);
          return mode === "charge" || mode === "direct";
        })() ? (
          <>
            <span className="payment-app-badge" title="支払いに使うアプリ">
              {r.paymentApp!.iconChar && (
                <span
                  className="payment-app-icon"
                  style={{ background: r.paymentApp!.iconColor ?? "#6b7280" }}
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
              <span className="payment-app-badge" title="自動選択された支払方法">
                {r.paymentApp.iconChar && (
                  <span
                    className="payment-app-icon"
                    style={{ background: r.paymentApp.iconColor ?? "#6b7280" }}
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
              const appBonus = r.appBonusReachable ? r.appBonusFinalAmount : 0;
              const hasExtras = hasLoyalty || appBonus > 0;
              if (!hasExtras) {
                return (
                  <>
                    最終: {formatNum(r.finalAmount)}{" "}
                    {currencyName(activeCurrencyId)}
                  </>
                );
              }
              const parts: string[] = [`クレカ ${formatNum(r.finalAmount)}`];
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
                  {currencyName(activeCurrencyId)}
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
            {r.resolved.source === "charge" && r.paymentApp ? (
              <>
                {r.paymentApp.name} ベース還元{" "}
                {(r.resolved.rate * 100).toFixed(2)}% で{" "}
                {formatNum(r.earnedAmount)} {currencyName(r.earnedCurrencyId)}
              </>
            ) : (
              <>
                クレカ還元率 {(r.resolved.rate * 100).toFixed(2)}% で{" "}
                {formatNum(r.earnedAmount)} {currencyName(r.earnedCurrencyId)}
              </>
            )}
            {r.resolved.source === "program" && (
              <span className="badge">プログラム適用</span>
            )}
            {r.resolved.source === "program" &&
              (() => {
                const resolved = r.resolved;
                const prog =
                  resolved.source === "program"
                    ? programById.get(resolved.programId)
                    : null;
                if (!prog) return null;
                return (
                  <>
                    <RuleStatusBadge
                      validFrom={prog.validFrom}
                      validTo={prog.validTo}
                      style={{ marginLeft: 4 }}
                    />
                    <NoteChips notes={prog.notes} />
                    {prog.monthlyCapAmountYen && (
                      <span
                        className="cap-warn"
                        title="この還元率には月間/年間の上限があります"
                      >
                        ⚠ 上限 {prog.monthlyCapAmountYen.toLocaleString()}円/月
                      </span>
                    )}
                  </>
                );
              })()}
          </div>

          {r.resolved.source === "charge" && r.paymentApp && (
            <div
              className="hint"
              style={{ marginTop: 2, fontSize: 11, paddingLeft: 0 }}
              title="チャージ式の支払アプリは、カード単体での還元は 0% (チャージ時には還元されない)。表示は支払アプリのベース還元率。"
            >
              ※ クレカ単体 0%、{r.paymentApp.name} 側で還元
            </div>
          )}

          <div className="path">
            <div className="path-line">
              <NodePill currency={currencyById.get(r.earnedCurrencyId)} />
              {r.pathSteps.map((step) => (
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
                  <NodePill currency={currencyById.get(step.toCurrencyId)} />
                </span>
              ))}
            </div>
            {r.reachable && r.pathSteps.length === 0 && (
              <small className="hint">変換不要（同一通貨）</small>
            )}
            {!r.reachable && (
              <small className="hint">
                {currencyName(r.earnedCurrencyId)} から{" "}
                {currencyName(activeCurrencyId)} への交換ルートが未登録です
              </small>
            )}
          </div>

          {/* v5.1.3: 異種通貨 addOn 分離表示。1 つでも appBonus がある場合
                breakdown を通貨別に 1 行ずつ表示する。1 件のみのときは従来と
                同じ見た目になる。breakdown が空 (旧 fallback) でも legacy summary
                フィールドで 1 行表示はカバー。 */}
          {r.paymentApp && r.appBonusBreakdown.length > 0 && (
            <div className="result-meta">
              {r.paymentApp.chargeBased
                ? `${r.paymentApp.name} 利用ボーナス`
                : "支払アプリ還元"}
              {r.appBonusBreakdown.map((b) => (
                <div
                  key={b.programId}
                  style={{ marginLeft: 8, fontSize: 12 }}
                  title={b.programName}
                >
                  {b.programName} ({(b.rate * 100).toFixed(2)}%):{" "}
                  {formatNum(b.earnedAmount)} {currencyName(b.earnedCurrencyId)}
                  {b.finalAmount > 0 && (
                    <>
                      {" "}
                      → +{formatNum(b.finalAmount)}{" "}
                      {currencyName(activeCurrencyId)}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}
