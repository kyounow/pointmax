import type { CardRanking } from "../domain/rankCards";
import { isMasterCard } from "../state/seed";
import { cardLabel } from "../domain/cardLabel";
import { formatNum } from "../domain/formatNum";

type Props = {
  comparisonItems: CardRanking[]; // disabled master pool cards のみ
  topReachableTotal: number; // 主結果 #1 の totalFinalAmount
  targetCurrencyName: string;
};

export function CardComparisonSection({
  comparisonItems,
  topReachableTotal,
  targetCurrencyName,
}: Props) {
  if (comparisonItems.length === 0) return null;

  // 差額降順でソート (お得な方を上に)
  const sorted = [...comparisonItems].sort(
    (a, b) => b.totalFinalAmount - a.totalFinalAmount,
  );

  return (
    <section className="card-comparison">
      <h3>💡 他のカードと比較</h3>
      <p className="hint">
        現在 master pool にあるが「使う」OFF のカードを同条件で試算。
        ON にしたり新規入会する判断材料に。
      </p>
      <table className="card-comparison-table">
        <colgroup>
          <col className="col-card" />
          <col className="col-state" />
          <col className="col-total" />
          <col className="col-diff" />
        </colgroup>
        <thead>
          <tr>
            <th>カード</th>
            <th>状態</th>
            <th>合計</th>
            <th>#1 との差</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const diff = r.totalFinalAmount - topReachableTotal;
            const diffSign = diff > 0 ? "+" : "";
            const diffClass =
              diff > 0
                ? "diff-positive"
                : diff < 0
                  ? "diff-negative"
                  : "diff-zero";
            return (
              <tr key={r.card.id}>
                <td data-label="カード">
                  <span className="card-name-with-badge">
                    {isMasterCard(r.card.id) && (
                      <span
                        className="card-master-badge"
                        title="公式マスター由来"
                      >
                        公式
                      </span>
                    )}
                    {cardLabel(r.card)}
                  </span>
                </td>
                <td data-label="状態" className="card-state-cell">
                  <span className="card-state-disabled">☐ 使う OFF</span>
                </td>
                <td data-label="合計" className="card-comparison-total">
                  {r.reachable
                    ? `${formatNum(r.totalFinalAmount)} ${targetCurrencyName}`
                    : "対象外"}
                </td>
                <td
                  data-label="#1との差"
                  className={`card-comparison-diff ${diffClass}`}
                >
                  {r.reachable
                    ? `${diffSign}${formatNum(diff)}${diff > 0 ? " ✨" : ""}`
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
