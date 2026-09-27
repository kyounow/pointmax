// CalculatorScreen から切り出した「1 カードぶんの試算結果カード」(Wave 6 B-2)。
// result.map の 1 article 分。展開状態は親が持ち、props で受け取る。
// 動作不変リファクタ: 元の JSX をそのまま移植し、resolver / Map を props 化しただけ。

import type { CardRanking, UnreachableReason } from "../../domain/rankCards";
import type {
  BenefitProgram,
  ConversionEdge,
  Currency,
  StoreProgramMembership,
} from "../../domain/types";
import { cardLabel } from "../../domain/cardLabel";
import { formatNum } from "../../domain/formatNum";
import { formatRatio } from "../../domain/currencyKind";
import { buildRateStackSummary } from "../../domain/rateStackSummary";
import {
  collectStaleItems,
  FRESHNESS_STALE_MONTHS,
  type FreshnessItem,
  type FreshnessResolver,
} from "../../domain/edgeFreshness";
import { seedFreshness } from "../../state/seedFreshness";
import { isSafeHttpUrl } from "../../domain/urlSafety";
import {
  extractNoteChips,
  joinNoteTexts,
  sanitizeNoteForDisplay,
  type NoteChipKind,
} from "../../domain/noteParser";
import {
  rankWarningChips,
  type WarningChipKind,
} from "../../domain/warningChips";
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
  // REM-#2 / PR-5a: 鮮度 (stale) 判定の基準日。採用した交換ルート・還元率の最終確認の最古が
  //   12ヶ月超なら展開ビューに「⚠ 古い情報かも」を出す。省略時は new Date() (テスト以外は親が
  //   useToday() の today を渡し、日付跨ぎでも判定が更新される)。
  now?: Date;
  // PR-5a: 確認月の解決方法。省略時 (= アプリ) は同梱 seed を参照する seedFreshness
  //   (src/state/seedFreshness.ts)。テストは LOCAL_FRESHNESS (ローカル値そのまま) 等に差し替える。
  freshness?: FreshnessResolver;
  // PR-0a-2b (M3): 現在の店舗での program の membership を引く関数 (親が storeId で束縛)。
  //   primary 行の条件チップに membership.notes (店別の条件) を合流させるのに使う。
  //   省略時は membership を見ない (program の notes / conditions だけ)。
  membershipOf?: (programId: string) => StoreProgramMembership | undefined;
};

// PR-0a-2b: 警告チップの候補。source は「どの描画要素か」(同 kind の専用バッジと条件チップを区別)。
type WarningCandidate = {
  kind: WarningChipKind;
  source: "entryBadge" | "capBadge" | "note" | "stale" | "minUnit";
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
  membershipOf,
  freshness = seedFreshness,
}: Props) {
  const reachableLoyalties = r.loyalties.filter((l) => l.reachable);
  const loyaltyTotal = reachableLoyalties.reduce(
    (s, l) => s + l.finalAmount,
    0,
  );
  const hasLoyalty = reachableLoyalties.length > 0;

  // ── 警告チップ (展開ビュー) の材料 ──
  // primary 行で採用された program (source === "program" のときだけ)。
  const resolvedProg =
    r.resolved.source === "program"
      ? programById.get(r.resolved.programId)
      : undefined;

  // 採用された program (primary / charge の base / addOn / reachable な loyalty)。PR-5a で
  // rankCards の adoptedProgramIds に集約 (要エントリーと鮮度チップで同じ集合を使う)。
  const adoptedPrograms = r.adoptedProgramIds
    .map((id) => programById.get(id))
    .filter((p): p is BenefitProgram => p !== undefined);

  // REM-#5: 要エントリー バッジ。採用された program のいずれかに requiresEntry があるとき
  // 「⚠ 要エントリー」を出す (charge の base program は requiresEntry を持たないので挙動は不変)。
  // entryUrl があれば urlSafety.isSafeHttpUrl 検証を通してタップで別タブ起動、無ければバッジのみ。
  const entryWarning = (() => {
    const entryProgs = adoptedPrograms.filter((p) => p.requiresEntry === true);
    if (entryProgs.length === 0) return null;
    const names = entryProgs.map((p) => p.name).join(" / ");
    // 採用 program のうち最初の安全な entryUrl を代表タップ先にする。
    const entryUrl = entryProgs
      .map((p) => p.entryUrl)
      .find((u): u is string => !!u && isSafeHttpUrl(u));
    const title = `エントリー / 登録が必要な特典が含まれます (${names})。${entryUrl ? "タップでエントリーページを開きます。" : ""}未エントリーだと表示の還元が付かない場合があります。`;
    return { entryUrl, title };
  })();

  // PR-0a-2b (M3): primary 行の条件チップの抽出元 = program の notes + conditions + この店の
  // membership.notes (店別の条件。例: スタバ『モバイルオーダー…限定』、すき家『QUICPay…は対象外』)。
  const chipNotes = resolvedProg
    ? joinNoteTexts(
        resolvedProg.notes,
        resolvedProg.conditions,
        membershipOf?.(resolvedProg.id)?.notes,
      )
    : undefined;

  // REM-#2 / PR-5a: 公式情報の鮮度。採用した交換ルート (primary / addOn / loyalty の経路 edge) と
  // 還元率 (採用 program / source:'default' ならカードの基本還元) の確認月を集め、12ヶ月超のものが
  // あれば 1 チップ『古い情報かも』に
  // まとめる (最古の月を本文、内訳を title)。確認月は freshness (アプリは同梱 seed 参照) で解決する。
  // 未記入は無視 (未検証を古い扱いしない)。対象外 (reachable=false) のカードには出さない。
  const staleSummary = (() => {
    if (!r.reachable) return null;
    const items: FreshnessItem[] = [];
    const seenEdgeIds = new Set<string>();
    const addRoute = (steps: readonly ConversionEdge[]) => {
      for (const e of steps) {
        if (seenEdgeIds.has(e.id)) continue;
        seenEdgeIds.add(e.id);
        items.push({
          kind: "route",
          label: `${currencyName(e.fromCurrencyId)}→${currencyName(e.toCurrencyId)}`,
          month: freshness.edgeMonth(e),
        });
      }
    };
    addRoute(r.pathSteps);
    for (const b of r.appBonusBreakdown) addRoute(b.pathSteps);
    for (const l of reachableLoyalties) addRoute(l.pathSteps);
    for (const p of adoptedPrograms) {
      items.push({ kind: "rate", label: p.name, month: freshness.programMonth(p) });
    }
    // B11: program を採用せずカードの基本還元 (defaultRate) で計算した結果は、その確認月も対象。
    if (r.resolved.source === "default") {
      items.push({
        kind: "rate",
        label: `${cardLabel(r.card)} の基本還元`,
        month: freshness.cardMonth(r.card),
      });
    }
    return collectStaleItems(items, now ?? new Date());
  })();
  // チップの title: 閾値と案内 + 古い項目の内訳 (ルート / 還元率ごとに 1 行)。
  const staleTitle = staleSummary
    ? `最終確認から${FRESHNESS_STALE_MONTHS}ヶ月超。公式サイトで最新の内容をご確認ください (計算は現在の値のまま)` +
      staleSummary.stale
        .map((s) => `\n・${s.kind === "route" ? "ルート" : "還元率"} ${s.label} (${s.month})`)
        .join("")
    : undefined;

  // PR-0a-2b: 警告チップの表示予算 (rankWarningChips = 要エントリー=要経由 > channel > 上限 >
  // 限定/対象外 > stale > 端数、最大 3)。専用バッジ (要エントリー・上限) を条件チップより先に渡し、
  // 同 kind は専用バッジを優先する (notes の『要エントリー』『上限』と二重に出さない)。
  const warnings = rankWarningChips<WarningCandidate>([
    ...(entryWarning ? [{ kind: "entry", source: "entryBadge" } as const] : []),
    ...(resolvedProg?.monthlyCapAmountYen
      ? [{ kind: "cap", source: "capBadge" } as const]
      : []),
    ...extractNoteChips(sanitizeNoteForDisplay(chipNotes)).map(
      (c): WarningCandidate => ({ kind: c.kind, source: "note" }),
    ),
    ...(staleSummary ? [{ kind: "stale", source: "stale" } as const] : []),
    ...(r.minUnitAnnotations.length > 0
      ? [{ kind: "minUnit", source: "minUnit" } as const]
      : []),
  ]);
  const shownWarnings = new Set(warnings.map((w) => w.source));
  const visibleNoteKinds = new Set(
    warnings
      .filter((w) => w.source === "note")
      .map((w) => w.kind as NoteChipKind),
  );

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
            {resolvedProg && (
              <>
                <RuleStatusBadge
                  validFrom={resolvedProg.validFrom}
                  validTo={resolvedProg.validTo}
                  style={{ marginLeft: 4 }}
                />
                {/* PR-0a-2b (M3): notes は従来どおり詳細ボタン付き。conditions /
                    membership.notes 由来はチップが出るときだけ (詳細ボタンの対象外)。
                    描画するチップは警告予算 (rankWarningChips) の内側に残った kind だけ。 */}
                <NoteChips
                  notes={resolvedProg.notes}
                  chipNotes={chipNotes}
                  visibleKinds={visibleNoteKinds}
                />
                {resolvedProg.monthlyCapAmountYen &&
                  shownWarnings.has("capBadge") && (
                    <span
                      className="cap-warn"
                      title="この還元率には月間/年間の上限があります"
                    >
                      ⚠ 上限 {resolvedProg.monthlyCapAmountYen.toLocaleString()}円/月
                    </span>
                  )}
              </>
            )}
            {/* REM-#5: 要エントリー バッジ (位置は result-meta 内、上限バッジ / NoteChips の隣)。
                警告予算の最優先なので条件を満たせば必ず出る (rankWarningChips)。 */}
            {entryWarning &&
              shownWarnings.has("entryBadge") &&
              (entryWarning.entryUrl ? (
                <a
                  className="entry-warn entry-warn-link"
                  href={entryWarning.entryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={entryWarning.title}
                >
                  ⚠ 要エントリー
                </a>
              ) : (
                <span className="entry-warn" title={entryWarning.title}>
                  ⚠ 要エントリー
                </span>
              ))}
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

          {/* REM-#2 / PR-5a: 公式情報の鮮度警告。採用した交換ルートと還元率の最終確認のうち
              最古が 12ヶ月超なら「⚠ 古い情報かも (最終確認 YYYY-MM)」を 1 チップだけ出す
              (内訳は title。未記入は無視 = 未検証を古い扱いしない)。判定は純関数
              collectStaleItems、確認月は freshness (同梱 seed 参照) で解決。
              ── 警告チップの表示予算: rankWarningChips (src/domain/warningChips.ts、
              要エントリー=要経由 > channel > 上限 > 限定/対象外 > stale > 端数 の優先順で最大 3)。
              J-POINT 20倍 (要エントリー + 経由型 + 対象外) と stale が同時に立つと stale が落ちる。 */}
          {staleSummary && shownWarnings.has("stale") && (
            <div className="route-stale-notes">
              <span className="rate-chip route-stale-chip" title={staleTitle}>
                ⚠ 古い情報かも (最終確認 {staleSummary.oldest})
              </span>
            </div>
          )}

          {/* DB-8: 最低交換単位に満たない交換ステップの事後注記 (折り畳みヘッダには出さない)。
              経路選択には影響せず、貯めてから交換すればレート積どおりになる旨を chip で示す。
              警告予算では最下位 (端数)。複数 edge の注記は 1 枠として扱う。 */}
          {r.minUnitAnnotations.length > 0 && shownWarnings.has("minUnit") && (
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
