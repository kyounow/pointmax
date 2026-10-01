// PR-5a: 円換算 (目安) モードの結果リスト。
// 通常モード (CalcResultCard) が「目標通貨への交換 path 込みの正確値」を出すのに対し、
// こちらは交換 path を使わず、各カードの獲得通貨を yenValue で直接円評価する fallback ビュー。
// 「≈」プレフィクスと「目安」バッジで path 由来の正確値と視覚的に区別する。
//
// PR-6b: 優先通貨が未設定の人の既定ビューになったため、通常ビューの展開ビューと同じ警告
// (期間バッジ / 条件チップ / ⚠ 上限 / ⚠ 要エントリー / ⚠ 古い情報かも) を各行の result-meta に
// 出す。判定は CalcResultCard と同じ純関数 buildWarningPlan (= rankWarningChips の出力、最大 3 件) で、
// 描画部品も共通 (WarningBadges)。端数 (最低交換単位) は交換 path の注記なので円換算では発生しない。

import { useMemo } from "react";
import type { CardRanking } from "../../domain/rankCards";
import type {
  BenefitProgram,
  StoreProgramMembership,
} from "../../domain/types";
import { cardLabel } from "../../domain/cardLabel";
import { formatNum } from "../../domain/formatNum";
import { sortRankingsInYen } from "../../domain/yenValue";
import type { FreshnessResolver } from "../../domain/edgeFreshness";
import { buildWarningPlan } from "../../domain/warningChips";
import { seedFreshness } from "../../state/seedFreshness";
import { MetaWarnings, StaleWarnChip } from "./WarningBadges";

type Props = {
  // 保有カード (enabled === true) の試算結果。earnedCurrency/earnedAmount と警告の材料を使う。
  rankings: CardRanking[];
  currencyName: (id: string) => string;
  yenValueOf: (currencyId: string) => number | undefined;
  // PR-6b: 警告チップの材料 (CalcResultCard と同じ)。
  programById: ReadonlyMap<string, BenefitProgram>;
  /** 現在の店舗での program の membership (親が storeId で束縛)。省略時は membership を見ない。 */
  membershipOf?: (programId: string) => StoreProgramMembership | undefined;
  /** stale 判定の基準日 (親の useToday())。 */
  now: Date;
  /** 確認月の解決方法。省略時は同梱 seed を参照する seedFreshness。 */
  freshness?: FreshnessResolver;
};

export function CalcYenResults({
  rankings,
  currencyName,
  yenValueOf,
  programById,
  membershipOf,
  now,
  freshness = seedFreshness,
}: Props) {
  // reachable 優先 → 円換算合計 降順 → カード名で安定ソート (結果サマリの #1 と同じ関数)
  const rows = useMemo(
    () => sortRankingsInYen(rankings, yenValueOf),
    [rankings, yenValueOf],
  );

  // 同額は同順位 (#1, #1, #3 ...)。reachable のみ順位付け。
  const rankByCardId = useMemo(() => {
    const map = new Map<string, number>();
    let prevTotal = Number.POSITIVE_INFINITY;
    let prevRank = 0;
    rows.forEach(({ r, v }, i) => {
      if (v.reachable && v.totalYen !== prevTotal) {
        prevRank = i + 1;
        prevTotal = v.totalYen;
      }
      map.set(r.card.id, v.reachable ? prevRank : -1);
    });
    return map;
  }, [rows]);

  if (rows.length === 0) {
    return <p className="empty">保有カードが登録されていません。</p>;
  }

  return (
    <div className="results results-yen">
      <p className="hint" style={{ fontSize: 13 }}>
        💡 交換ルートを使わず、貯まるポイントを目安の円価値で比べます（目安値は「通貨」画面で変更可）。
      </p>
      {rows.map(({ r, v }) => {
        const rank = rankByCardId.get(r.card.id) ?? -1;
        const plan = buildWarningPlan({
          ranking: r,
          programById,
          membershipOf,
          freshness,
          now,
          currencyName,
          // rankCards 上は全カード path 到達不能 (仮想ターゲット) なので、円評価の到達可否で判定する
          reachable: v.reachable,
        });
        return (
          <article
            key={r.card.id}
            className={`result-card ${v.reachable ? "" : "unreachable"} ${rank === 1 && v.reachable ? "best" : ""}`}
          >
            <header className="result-head">
              <span className="rank">
                {v.reachable ? `#${rank}` : "対象外"}
              </span>
              <strong>{cardLabel(r.card)}</strong>
              {v.reachable ? (
                <span className="final">
                  ≈ {formatNum(v.totalYen)} 円
                  <span
                    className="badge yen-est-badge"
                    title="path 由来の正確値ではなく、通貨の円換算目安に基づく参考値です"
                  >
                    目安
                  </span>
                </span>
              ) : (
                <span
                  className="unreachable-badge unreachable-no-path"
                  title={`${currencyName(v.missingCurrencyId ?? r.earnedCurrencyId)} は円換算の目安値が未設定です`}
                >
                  目安値未設定
                </span>
              )}
            </header>

            <div className="result-meta">
              {v.reachable ? (
                <>
                  {formatNum(r.earnedAmount)} {currencyName(r.earnedCurrencyId)}
                  {" ≈ "}
                  {formatNum(v.primaryYen)} 円
                  {v.appBonusYen > 0 && (
                    <>
                      {" ＋ アプリ ≈ "}
                      {formatNum(v.appBonusYen)} 円
                    </>
                  )}
                </>
              ) : (
                <small className="hint">
                  {currencyName(r.earnedCurrencyId)}{" "}
                  の円換算目安値が未設定のため比較できません。「通貨」画面で目安値を
                  設定すると円換算に反映されます。
                </small>
              )}
              {/* PR-6b: 通常ビューの展開ビューと同じ警告 (buildWarningPlan、最大 3 件)。
                  端数 (最低交換単位) は交換 path の注記なので、path を使わない円換算では
                  minUnitAnnotations が常に空 = 出ない (予算の計算には通常どおり含まれる)。 */}
              <MetaWarnings plan={plan} />
              {plan.stale && plan.shown.has("stale") && (
                <StaleWarnChip stale={plan.stale} />
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
