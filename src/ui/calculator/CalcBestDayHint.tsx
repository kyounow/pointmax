// REM-#4: ベスト購入日ヒントの 1 行チップ (#1 カード直下に置く presentational component)。
// 判定 (今後 30 日の日替わり再評価) は純関数 findBestPurchaseDay が担い、ここは表示のみ。
// 円換算モードでは親が bestDay=null を渡す (= レンダリングされない)。

import {
  formatBestDayLabel,
  type BestPurchaseDay,
} from "../../domain/bestPurchaseDay";
import { formatNum } from "../../domain/formatNum";

type Props = {
  bestDay: BestPurchaseDay;
  /** 今日 (ラベルの月跨ぎ判定に使う)。親は useToday() の today を渡す。 */
  today: Date;
  /** 目標通貨 id → 表示名。ゲイン量の単位表示に使う。 */
  currencyName: (id: string) => string;
  /** 目標通貨 id。 */
  activeCurrencyId: string;
};

export function CalcBestDayHint({
  bestDay,
  today,
  currencyName,
  activeCurrencyId,
}: Props) {
  return (
    <div className="best-day-hint">
      <span
        className="rate-chip best-day-chip"
        title="キャンペーンや「5と0のつく日」等の予定・エントリー要否は変更される可能性があります。実際の対象日・条件は各社公式サイトでご確認ください。"
      >
        📅 {formatBestDayLabel(bestDay.date, today)}に買えば +
        {formatNum(bestDay.gainAmount)} {currencyName(activeCurrencyId)}（
        {bestDay.drivingProgramName}）
      </span>
    </div>
  );
}
