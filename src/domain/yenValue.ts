// PR-5a (DB-2): 円換算目安 (Currency.yenValue) 関連の純粋ヘルパ + edge レート validator。
//
// 3 つの役割:
//   1. effectiveYenValue: override (ユーザー値) ?? seed の Currency.yenValue を解決する。
//   2. valuateRankingInYen: 1 カードの試算結果 (CardRanking) を「交換 path を使わず」
//      獲得通貨の yenValue で円評価する (円換算タブの fallback ビュー)。
//   3. findYenRatioViolations: 各 edge の rate が円価値目安と乖離していないかを検証する
//      (seed 契約テスト用。ユーザー編集 edge は縛らない)。

import type { CardRanking } from "./rankCards";
import type { ConversionEdge, Currency } from "./types";

// 円換算タブが目標通貨の代わりに渡す仮想ターゲット id。実在通貨・edge には決して現れない
// センチネルなので、rankCards は全カードを「path 到達不能」として返し (finalAmount=0)、
// UI 層 (valuateRankingInYen) が獲得通貨を yenValue で円評価し直す。
export const YEN_TARGET_ID = "__yen__";

// この id が円換算モードかどうか (UI の分岐で使う)。
export function isYenTarget(currencyId: string): boolean {
  return currencyId === YEN_TARGET_ID;
}

// 正の有限数のみ受理する内部ガード。
function positiveOrUndefined(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

// 通貨の円換算目安 (1 単位 ≒ 円)。override 優先、無ければ seed の Currency.yenValue。
// どちらも無い / 非正なら undefined (= 円換算比較の対象外)。
export function effectiveYenValue(
  currencyId: string,
  currencyById: Map<string, Currency>,
  overrides: Record<string, number> = {},
): number | undefined {
  const ov = positiveOrUndefined(overrides[currencyId]);
  if (ov !== undefined) return ov;
  return positiveOrUndefined(currencyById.get(currencyId)?.yenValue);
}

// currencyById + overrides から「id → yenValue | undefined」のリゾルバを作る (UI 用の糖衣)。
export function makeYenValueResolver(
  currencyById: Map<string, Currency>,
  overrides: Record<string, number> = {},
): (currencyId: string) => number | undefined {
  return (currencyId) => effectiveYenValue(currencyId, currencyById, overrides);
}

// 1 カードの円換算 (目安) 評価結果。
export type YenValuation = {
  // 主獲得通貨 (earnedCurrencyId) に yenValue があるか。false = 「目安値未設定」で対象外表示。
  reachable: boolean;
  // クレカ主還元ぶんの円換算 (earnedAmount × yenValue)。yenValue 無しなら 0。
  primaryYen: number;
  // 決済アプリ addOn ぶんの円換算合計 (yenValue のある通貨のみ加算)。
  appBonusYen: number;
  // primaryYen + appBonusYen (= このカードで得られる円換算合計の目安)。
  totalYen: number;
  // reachable=false のとき、目安値が無い主獲得通貨 id (UI 表示用)。reachable なら null。
  missingCurrencyId: string | null;
};

// CardRanking を円換算する。交換 path (finalAmount) は一切見ず、各 earn をその通貨の
// yenValue で直接円評価する (どの通貨で貯めても円目安で横並び比較する fallback)。
// loyalty (店頭提示) は店舗単位で全カード共通のため、カード間比較を歪めないようここには
// 含めない (カード自身が生む earn = クレカ主還元 + 決済アプリ addOn のみを評価)。
export function valuateRankingInYen(
  r: CardRanking,
  yenValueOf: (currencyId: string) => number | undefined,
): YenValuation {
  const primaryYv = yenValueOf(r.earnedCurrencyId);
  const primaryYen = primaryYv !== undefined ? r.earnedAmount * primaryYv : 0;

  let appBonusYen = 0;
  for (const b of r.appBonusBreakdown) {
    const yv = yenValueOf(b.earnedCurrencyId);
    if (yv !== undefined) appBonusYen += b.earnedAmount * yv;
  }

  const reachable = primaryYv !== undefined;
  return {
    reachable,
    primaryYen,
    appBonusYen,
    totalYen: primaryYen + appBonusYen,
    missingCurrencyId: reachable ? null : r.earnedCurrencyId,
  };
}

// ─── edge レート妥当性 validator (seed 契約用) ───

export type YenRatioViolation = {
  edgeId: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  // rate × yenValue(to) / yenValue(from)。1 付近が価値保存、閾値外は乖離。
  ratio: number;
};

// 各 edge について from/to 両方に yenValue がある場合のみ、
//   ratio = rate × yenValue(to) / yenValue(from)
// を計算し、[1/maxFactor, maxFactor] の範囲外を violation として返す。
// maxFactor は通説より広め (既定 2.5) にして誤検知を避ける — 永久不滅等の高価値通貨も
// yenValue で正規化されるので、正当な高 rate (例: eikyu-to-d rate 5) は ratio≈1 で通る。
// yenValue が片方でも無い edge (マイル/ホテル系等) は検証対象外 (スキップ)。
export function findYenRatioViolations(
  edges: ConversionEdge[],
  yenValueOf: (currencyId: string) => number | undefined,
  maxFactor = 2.5,
): YenRatioViolation[] {
  const minFactor = 1 / maxFactor;
  const violations: YenRatioViolation[] = [];
  for (const e of edges) {
    const from = yenValueOf(e.fromCurrencyId);
    const to = yenValueOf(e.toCurrencyId);
    if (from === undefined || to === undefined) continue;
    const ratio = (e.rate * to) / from;
    if (ratio < minFactor || ratio > maxFactor) {
      violations.push({
        edgeId: e.id,
        fromCurrencyId: e.fromCurrencyId,
        toCurrencyId: e.toCurrencyId,
        ratio,
      });
    }
  }
  return violations;
}
