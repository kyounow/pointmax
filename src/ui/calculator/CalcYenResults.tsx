// PR-5a: 円換算 (目安) モードの結果リスト。
// 通常モード (CalcResultCard) が「目標通貨への交換 path 込みの正確値」を出すのに対し、
// こちらは交換 path を使わず、各カードの獲得通貨を yenValue で直接円評価する fallback ビュー。
// 「≈」プレフィクスと「目安」バッジで path 由来の正確値と視覚的に区別する。

import { useMemo } from "react";
import type { CardRanking } from "../../domain/rankCards";
import { cardLabel } from "../../domain/cardLabel";
import { formatNum } from "../../domain/formatNum";
import { valuateRankingInYen, type YenValuation } from "../../domain/yenValue";

type Props = {
  // 保有カード (enabled === true) の試算結果。earnedCurrency/earnedAmount のみ使う。
  rankings: CardRanking[];
  currencyName: (id: string) => string;
  yenValueOf: (currencyId: string) => number | undefined;
};

type Row = { r: CardRanking; v: YenValuation };

export function CalcYenResults({
  rankings,
  currencyName,
  yenValueOf,
}: Props) {
  const rows = useMemo<Row[]>(() => {
    const evaluated: Row[] = rankings.map((r) => ({
      r,
      v: valuateRankingInYen(r, yenValueOf),
    }));
    // reachable 優先 → 円換算合計 降順 → カード名で安定ソート
    evaluated.sort((a, b) => {
      if (a.v.reachable !== b.v.reachable) return a.v.reachable ? -1 : 1;
      if (b.v.totalYen !== a.v.totalYen) return b.v.totalYen - a.v.totalYen;
      return cardLabel(a.r.card).localeCompare(cardLabel(b.r.card), "ja");
    });
    return evaluated;
  }, [rankings, yenValueOf]);

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
        💡 円換算 (目安) は<strong>交換ルートを使わず</strong>、各カードで貯まる通貨を
        1 単位あたりの目安円価値でそのまま比較する参考ビューです。値は「通貨」画面で
        自分の換算値に上書きできます。
      </p>
      {rows.map(({ r, v }) => {
        const rank = rankByCardId.get(r.card.id) ?? -1;
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
            </div>
          </article>
        );
      })}
    </div>
  );
}
