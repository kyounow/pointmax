// UX-3: 計算結果カード展開ビューの「積み上げサマリ」を組み立てる純関数。
// 「基本 0.5% + タッチ決済 +6.5% = 7.0%」のような 1 行要約に必要な rate パーツ列を返す。
//
// 内訳の要約 (既存の appBonusBreakdown / loyalty の詳細表示はそのまま残し、その先頭に
// 置く 1 行サマリ) なので、CardRanking から rate と表示ラベルだけを取り出す。通貨名解決は
// 不要 (rate と program/pointCard 名だけで組める) なので UI 非依存の純関数として node テスト可能。
//
// 異種通貨の合算について: base / addOn / loyalty は通貨が異なりうるが、rate を単純合算した
// 「合算 X%」を出す。これは header の appBonusRate や「合計」表示と同じ既存の簡略化方針で、
// 「実効的にどれだけ上乗せされるか」の一目安として提示する (厳密な同一通貨換算ではない)。

import type { CardRanking } from "./rankCards";

export type RateStackPartKind = "base" | "addon" | "loyalty";

export type RateStackPart = {
  label: string;
  rate: number;
  kind: RateStackPartKind;
};

export type RateStackSummary = {
  parts: RateStackPart[];
  totalRate: number;
};

// CardRanking から積み上げサマリを構築する。
//   - base   : カード/チャージの primary 還元 (resolved.rate)。rate 0 は省く
//              (chargeBased でカード単体 0% のケース等。別途「※ クレカ単体 0%」注記が担う)。
//   - addon  : appBonusBreakdown の各 program (上乗せ、target 通貨へ到達済のもののみ格納されている)。
//   - loyalty: reachable なポイントカード提示 (二重取り)。
export function buildRateStackSummary(r: CardRanking): RateStackSummary {
  const parts: RateStackPart[] = [];

  // base 還元 (charge のときは支払アプリ由来のベース還元、それ以外はカード還元)
  if (r.resolved.rate > 0) {
    const baseLabel =
      r.resolved.source === "charge" && r.paymentApp
        ? `${r.paymentApp.name} ベース`
        : "基本";
    parts.push({ label: baseLabel, rate: r.resolved.rate, kind: "base" });
  }

  // addOn (支払アプリ上乗せ / 併用上乗せ)
  for (const b of r.appBonusBreakdown) {
    parts.push({ label: b.programName, rate: b.rate, kind: "addon" });
  }

  // loyalty (ポイントカード提示の二重取り)
  for (const l of r.loyalties) {
    if (l.reachable) {
      parts.push({ label: l.pointCard.name, rate: l.rule.rate, kind: "loyalty" });
    }
  }

  const totalRate = parts.reduce((s, p) => s + p.rate, 0);
  return { parts, totalRate };
}
