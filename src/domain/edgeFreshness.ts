// REM-#2: 交換エッジの鮮度判定 (月精度)。
//
// ConversionEdge.lastVerifiedAt ("YYYY-MM") = レートを公式ページで最後に人手確認した月。
// 「最終確認から N ヶ月超経過したか」を月精度で判定する純関数群。UI (CalculatorScreen の
// bestPath 結果行 / EdgesScreen のメンテ用ビュー) から共有して、鮮度が落ちた交換ルートに
// 「⚠ 要確認」を出すために使う。
//
// 設計方針:
//   - 月精度 (日は無視)。同じ暦月内なら経過月数は同じ = 「作った直後だけ正しく半年後に
//     嘘をつく」現象を月単位で検出できれば十分 (日次の鮮度管理は過剰)。
//   - 未記入 (undefined) / 形式不正は **stale 扱いしない** (安全側 = 未検証を古いと誤警告しない)。
//   - 閾値ちょうど (= N ヶ月) は stale ではない。「N ヶ月"超"」= 厳密に大きいときだけ ⚠。
//     四半期棚卸し (×2 回 = 6ヶ月) で全 edge を一巡できるよう、既定閾値 6 と整合させる。

import type { ConversionEdge } from "./types";

// 既定の stale 閾値 (ヶ月)。四半期チェックリスト (SESSION_LOG) を 2 回まわすと 6ヶ月なので、
// この値を超えて未確認の edge は「棚卸しから漏れている」= 要確認とみなす。
export const EDGE_STALE_THRESHOLD_MONTHS = 6;

// "YYYY-MM" (year 4 桁 + month 01-12) の妥当性。seed 契約テスト / stale 判定で共用。
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isValidVerifiedMonth(month: string): boolean {
  return MONTH_RE.test(month);
}

// verifiedMonth ("YYYY-MM") から now までの経過月数 (整数月)。
// 形式不正なら null。未来 (verifiedMonth が now より後) は負値を返す。
export function monthsSince(verifiedMonth: string, now: Date): number | null {
  const m = MONTH_RE.exec(verifiedMonth);
  if (!m) return null;
  const verifiedIdx = Number(m[1]) * 12 + (Number(m[2]) - 1); // month は 1-12 → 0-11
  const nowIdx = now.getFullYear() * 12 + now.getMonth(); // getMonth: 0-11
  return nowIdx - verifiedIdx;
}

// verifiedMonth が threshold ヶ月「超」古いか。
// 境界 (ちょうど threshold ヶ月) は false (= まだ stale ではない)。
// 形式不正 / 未来は false (安全側で ⚠ を出さない)。
export function isMonthStale(
  verifiedMonth: string,
  now: Date,
  thresholdMonths: number = EDGE_STALE_THRESHOLD_MONTHS,
): boolean {
  const diff = monthsSince(verifiedMonth, now);
  if (diff === null) return false;
  return diff > thresholdMonths;
}

// 経路 (edge 列) の鮮度。lastVerifiedAt を持つ step のうち **最古** を取り、それが stale なら
// その月 ("YYYY-MM") を返す。記入済み step が無い (全 undefined) / 最古が stale でないなら null。
// 未記入 step は無視する (未検証 = 古い扱いしない)。
// "YYYY-MM" は辞書順が時系列順なので文字列比較で最古を取れる。
export function staleVerifiedMonth(
  steps: readonly Pick<ConversionEdge, "lastVerifiedAt">[],
  now: Date,
  thresholdMonths: number = EDGE_STALE_THRESHOLD_MONTHS,
): string | null {
  let oldest: string | null = null;
  for (const s of steps) {
    const v = s.lastVerifiedAt;
    if (v && isValidVerifiedMonth(v) && (oldest === null || v < oldest)) {
      oldest = v;
    }
  }
  if (oldest === null) return null;
  return isMonthStale(oldest, now, thresholdMonths) ? oldest : null;
}
