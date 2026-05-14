// validFrom / validTo の組み合わせから 2 段階のステータス表示を生成する。
//   - validTo あり: 🎯 キャンペーン中 (〜YYYY/MM/DD) [time-bound, 警告色]
//   - validFrom のみ: 📌 公式プログラム             [ongoing, 情報色]
//   - 両方なし:    null (バッジなし)
//
// 注意: アクティブ判定 (現時刻が範囲内か) はこのコンポネでは行わない。
//   呼び出し側で isRuleActiveAt を済ませた上で表示すること。
//   (CalculatorScreen は active rule しか rule に入れないので OK)
import type { CSSProperties } from "react";
import { daysUntilValidTo } from "../domain/ruleActiveAt";

type Props = {
  validFrom?: string;
  validTo?: string;
  style?: CSSProperties;
};

export function RuleStatusBadge({ validFrom, validTo, style }: Props) {
  if (validTo) {
    const days = daysUntilValidTo(validTo);
    let daysClass = "";
    let daysLabel = "";
    if (days !== null && days >= 0) {
      if (days <= 3) daysClass = "urgent";
      else if (days <= 7) daysClass = "warning";
      daysLabel = `あと${days}日`;
    }
    return (
      <span
        className="campaign-badge time-bound"
        style={style}
        title="期間限定キャンペーン"
      >
        🎯 キャンペーン中 (〜{validTo})
        {daysLabel && (
          <span className={`days-remaining ${daysClass}`}>{daysLabel}</span>
        )}
      </span>
    );
  }
  if (validFrom) {
    return (
      <span
        className="campaign-badge ongoing"
        style={style}
        title="公式プログラム (終了未告知)"
      >
        📌 公式プログラム
      </span>
    );
  }
  return null;
}
