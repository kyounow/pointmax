// CalculatorScreen から切り出した「今日のアクティブ割増サマリ」バナー (Wave 6 B-2)。
// 元は CalculatorScreen 内の IIFE。集計ロジックと開閉表示を内包。
// 動作不変リファクタ。開閉状態は親が持ち props で受け取る (他の入力リセットと独立)。

import type { BenefitProgram, LoyaltyRule } from "../../domain/types";
import { isRuleActiveAt } from "../../domain/ruleActiveAt";

type Props = {
  loyaltyRules: LoyaltyRule[];
  programs: BenefitProgram[];
  open: boolean;
  onToggle: () => void;
};

export function CalcTodayBanner({
  loyaltyRules,
  programs,
  open,
  onToggle,
}: Props) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // アクティブ期間ルールの集計 (programs + loyaltyRules)
  const allRules = [...loyaltyRules];
  const allProgramsWithDates = programs.filter((p) => p.validFrom || p.validTo);

  const timeBoundActive = [...allRules, ...allProgramsWithDates].filter(
    (r) => r.validTo && isRuleActiveAt(r, now),
  ).length;
  const ongoingActive = [...allRules, ...allProgramsWithDates].filter(
    (r) => !r.validTo && r.validFrom && isRuleActiveAt(r, now),
  ).length;
  const recurringActive = [...allRules, ...programs].filter(
    (r) =>
      "recurringDays" in r &&
      r.recurringDays?.length &&
      isRuleActiveAt(r, now),
  ).length;
  const totalActive = timeBoundActive + ongoingActive + recurringActive;

  return (
    <div className={`today-banner${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="today-banner-head"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="today-banner-breakdown"
        title={open ? "内訳を閉じる" : "内訳を表示"}
      >
        <span className="today-banner-date">📅 今日 {dateStr}</span>
        <span className="today-banner-summary">
          ✨ 今アクティブな割増 <strong>{totalActive}</strong> 件
        </span>
        <span className="today-banner-caret" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div id="today-banner-breakdown" className="today-banner-counts">
          <span>
            🎯 期間限定 <strong>{timeBoundActive}</strong> 件
          </span>
          <span>
            📌 公式プログラム <strong>{ongoingActive}</strong> 件
          </span>
          <span>
            🗓 毎月特定日 <strong>{recurringActive}</strong> 件
          </span>
        </div>
      )}
    </div>
  );
}
