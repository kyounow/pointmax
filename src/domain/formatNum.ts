// 計算結果表示用の数値フォーマッタ。
//   - 1 以上は小数 2 桁まで (10000.5 や 1.23)
//   - 1 未満は小数 4 桁まで (0.0234 などの細かい値も読めるように)
//   - 非有限値 (NaN / Infinity) は "-" を返す
//
// 用途: ポイント数、円換算、レート表示等で広く使う。
// 統一フォーマッタとして使うため domain 配下に置いている (UI 非依存)。
export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
