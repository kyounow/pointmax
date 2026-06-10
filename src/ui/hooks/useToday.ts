// 「今日」を表す Date を返し、暦日が変わったら自動更新する hook (改善計画 C-2)。
//
// 背景: ProgramsScreen は mount 時 1 回の useMemo、CalculatorScreen の
// rankCards useMemo は時間系 dependency 無しだったため、PWA を日付を跨いで
// 開きっぱなしにすると「終了したキャンペーンが計算に効き続ける /
// 開始したものが現れない / recurringDays (5のつく日等) が切り替わらない」
// stale 問題があった。
//
// 設計:
//   - 1 分ごとに「暦日が変わったか」だけを確認し、変わった時のみ state 更新
//     → 通常は再 render ゼロ。日付変更の瞬間に依存 useMemo が一斉に再計算される
//   - 返す Date は当日の 00:00 ではなく生成時刻そのまま (isRuleActiveAt は
//     時刻も見るが、日付境界はローカル 00:00/23:59 で判定されるため
//     「同じ暦日なら同じ判定」が成り立つ)

import { useEffect, useState } from "react";

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setToday((prev) => {
        const now = new Date();
        // 同じ暦日なら参照を維持 = 依存 useMemo を再計算させない
        return isSameCalendarDay(prev, now) ? prev : now;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}
