// CalculatorScreen から切り出した「1 カードぶんの試算結果カード」(Wave 6 B-2)。
// result.map の 1 article 分。展開状態は親が持ち、props で受け取る。
// 動作不変リファクタ: 元の JSX をそのまま移植し、resolver / Map を props 化しただけ。

import type { CardRanking, UnreachableReason } from "../../domain/rankCards";
import type { BenefitProgram, Currency } from "../../domain/types";
import { cardLabel } from "../../domain/cardLabel";
import { formatNum } from "../../domain/formatNum";
import { formatRatio } from "../../domain/currencyKind";
import { buildRateStackSummary } from "../../domain/rateStackSummary";
import { staleVerifiedMonth } from "../../domain/edgeFreshness";
import { navigate } from "../../navigation";
import { NodePill } from "../NodePill";
import { RuleStatusBadge } from "../RuleStatusBadge";
import { NoteChips } from "../NoteChips";

// 還元率をパーセント表記に整形 (0.005 → "0.5%")。formatNum で末尾ゼロを抑制。
function fmtPct(rate: number): string {
  return `${formatNum(rate * 100)}%`;
}

// UX-7: 対象外理由コード → 折り畳みヘッダの短い理由バッジ + 展開ビューの次アクション導線。
//   badge: ヘッダに出す短ラベル / cta: 展開ビューのボタン文言 / route: navigate 先 /
//   title: バッジ・ボタンの補足ツールチップ / cls: 理由別スタイルの識別クラス。
const UNREACHABLE_META = {
  "no-path": {
    badge: "ルート未登録",
    cta: "交換ルートを見る →",
    route: "edges",
    title: "貯まる通貨から目標通貨への交換ルートが未登録です",
    cls: "no-path",
  },
  "currency-blocked": {
    badge: "通貨OFF",
    cta: "ウォレットで確認 →",
    route: "wallet/point-cards",
    title: "経路上のポイント通貨が「使わない」設定のため到達できません",
    cls: "currency-blocked",
  },
} satisfies Record<
  UnreachableReason,
  { badge: string; cta: string; route: string; title: string; cls: string }
>;

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
  // UX-3: 差額表示用。topTotal = 1位の totalFinalAmount (reachable が 0 件なら undefined)。
  //   secondBestTotal = 1位と ε 以上離れた次点の totalFinalAmount (存在時のみ、#1 の「2位より」用)。
  topTotal?: number;
  secondBestTotal?: number;
  // PR-2: 決済ワンタップ除外のハンドラ。渡され、かつこの結果に paymentApp があるとき、
  //   展開ビューの支払方法表示の近くに「この決済は使えなかった」ボタンを出す。押すと
  //   親が excludeStorePayment(現在の storeId, 引数の paymentAppId) を呼び即時再計算する。
  //   店舗未選択 (general) では親が undefined を渡すため、ボタンは出ない。
  onExcludePayment?: (paymentAppId: string) => void;
  // REM-#2: 鮮度 (stale) 判定の基準日。経由 edge の lastVerifiedAt 最古が 6ヶ月超なら
  //   展開ビューに「⚠ ルート要確認」を出す。省略時は new Date() (テスト以外は親が
  //   useToday() の today を渡し、日付跨ぎでも判定が更新される)。
  now?: Date;
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
  topTotal,
  secondBestTotal,
  onExcludePayment,
  now,
}: Props) {
  const reachableLoyalties = r.loyalties.filter((l) => l.reachable);
  const loyaltyTotal = reachableLoyalties.reduce(
    (s, l) => s + l.finalAmount,
    0,
  );
  const hasLoyalty = reachableLoyalties.length > 0;

  // UX-7: 対象外カードの理由メタ (reachable なら null)。ヘッダのバッジと展開ビューの
  // CTA の両方で参照する。r.unreachableReason の narrowing を 1 箇所に閉じる。
  const unreachableMeta =
    !r.reachable && r.unreachableReason
      ? UNREACHABLE_META[r.unreachableReason]
      : null;

  return (
    <article
      className={`result-card ${r.reachable ? "" : "unreachable"} ${displayRank === 1 && r.reachable ? "best" : ""} ${expanded ? "expanded" : "collapsed"}`}
    >
      <header
        className="result-head clickable"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
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
        {/* UX-7: 折り畳みでも見える理由バッジ (「ルート未登録」「通貨OFF」)。 */}
        {unreachableMeta && (
          <span
            className={`unreachable-badge unreachable-${unreachableMeta.cls}`}
            title={unreachableMeta.title}
          >
            {unreachableMeta.badge}
          </span>
        )}
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
        {/* UX-3: 1位比の差額。#1 は「2位より +N」(2位が存在する時のみ)、
            それ以外の reachable 行は「(1位比 −N)」。totalFinalAmount 基準 (順位決定と同じ量)。 */}
        {r.reachable &&
          displayRank === 1 &&
          topTotal !== undefined &&
          secondBestTotal !== undefined && (
            <span className="rank-diff rank-diff-lead" title="2位との差">
              2位より +{formatNum(topTotal - secondBestTotal)}
            </span>
          )}
        {r.reachable && displayRank > 1 && topTotal !== undefined && (
          <span className="rank-diff" title="1位との差">
            （1位比 −{formatNum(topTotal - r.totalFinalAmount)}）
          </span>
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
          {/* UX-3: 積み上げサマリ。展開内容の先頭で「基本 X% + 上乗せ +Y% = Z%」を
              chip で 1 行要約 (下の詳細内訳の要約行)。パーツが無ければ非表示。 */}
          {(() => {
            const summary = buildRateStackSummary(r);
            if (summary.parts.length === 0) return null;
            return (
              <div className="rate-stack" aria-label="還元率の内訳サマリ">
                {summary.parts.map((p, i) => (
                  <span key={`${p.kind}-${i}`} className="rate-stack-seg">
                    {i > 0 && (
                      <span className="rate-stack-op" aria-hidden="true">
                        +
                      </span>
                    )}
                    <span className={`rate-chip rate-chip-${p.kind}`}>
                      {p.kind === "base"
                        ? `${p.label} ${fmtPct(p.rate)}`
                        : `${p.label} +${fmtPct(p.rate)}`}
                    </span>
                  </span>
                ))}
                {summary.parts.length >= 2 && (
                  <span className="rate-stack-total">
                    = {fmtPct(summary.totalRate)}
                  </span>
                )}
              </div>
            );
          })()}

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

          {/* PR-2: 決済ワンタップ除外。この店でこの決済 (paymentApp) が使えなかった時に
              ワンタップで候補から外し、他決済で再計算する。店舗未選択 (general) では
              onExcludePayment=undefined でボタン非表示。復帰は対象外グループの「除外済」から。 */}
          {onExcludePayment && r.paymentApp && (
            <div className="exclude-payment">
              <button
                type="button"
                className="exclude-payment-btn"
                title={`この店で「${r.paymentApp.name}」を使えない設定にして他の決済で再計算します（あとで戻せます）`}
                onClick={() => onExcludePayment(r.paymentApp!.id)}
              >
                この決済（{r.paymentApp.name}）は使えなかった
              </button>
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
                {unreachableMeta?.cls === "currency-blocked"
                  ? `${currencyName(r.earnedCurrencyId)} から ${currencyName(activeCurrencyId)} への経路上に「使わない」設定のポイント通貨があります`
                  : `${currencyName(r.earnedCurrencyId)} から ${currencyName(activeCurrencyId)} への交換ルートが未登録です`}
              </small>
            )}
          </div>

          {/* UX-7: 対象外カードの次アクション導線 (展開時のみ)。
              no-path → 交換ルート画面 / currency-blocked → ウォレット (ポイントカード)。 */}
          {unreachableMeta && (
            <div className="unreachable-cta">
              <button
                type="button"
                className="unreachable-cta-btn"
                title={unreachableMeta.title}
                onClick={() => navigate(unreachableMeta.route)}
              >
                {unreachableMeta.cta}
              </button>
            </div>
          )}

          {/* REM-#2: 交換ルートの鮮度警告。経由 edge の lastVerifiedAt 最古が 6ヶ月超なら
              「⚠ ルート要確認 (最終確認 YYYY-MM)」を出す (未記入 edge は無視 = 未検証を古い扱い
              しない)。判定は純関数 staleVerifiedMonth。到達不能カードは pathSteps が空なので出ない。
              ── 警告チップの表示予算 (横断規律: 要エントリー > 上限 > stale > 失効 > 端数 の
              優先順で最大3): この展開ビューに現状出る警告系は 上限 (cap-warn, 上の result-meta) /
              stale (ここ) / 端数 (minunit, 下) の最大 3 種で予算内。4 種目以降を足すときは
              優先順ヘルパへの切り出しを検討すること (最も混む楽天5と0の日に #1 展開ビューが
              警告で埋まるのを防ぐ設計)。 */}
          {(() => {
            const staleMonth = staleVerifiedMonth(r.pathSteps, now ?? new Date());
            if (!staleMonth) return null;
            return (
              <div className="route-stale-notes">
                <span
                  className="rate-chip route-stale-chip"
                  title="この交換ルートに含まれるレートは公式ページでの最終確認から6ヶ月以上経過しています。各社公式サイトで最新のレートをご確認ください (計算には現在のレートをそのまま使用しています)。"
                >
                  ⚠ ルート要確認 (最終確認 {staleMonth})
                </span>
              </div>
            );
          })()}

          {/* DB-8: 最低交換単位に満たない交換ステップの事後注記 (折り畳みヘッダには出さない)。
              経路選択には影響せず、貯めてから交換すればレート積どおりになる旨を chip で示す。 */}
          {r.minUnitAnnotations.length > 0 && (
            <div className="minunit-notes">
              {r.minUnitAnnotations.map((a) => (
                <span
                  key={a.edgeId}
                  className="rate-chip minunit-chip"
                  title="この交換には最低交換単位があります。少額では単位に満たないため、貯めてから交換してください (経路選択には影響しません)。"
                >
                  {currencyName(a.fromCurrencyId)} は {formatNum(a.minFromUnits)}{" "}
                  貯めてから交換 (最低交換単位)
                </span>
              ))}
            </div>
          )}

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
