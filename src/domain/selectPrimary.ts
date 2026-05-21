// PointMax: primary 通貨込み比較 (path-aware) セレクター
//
// 監査残 B (異種通貨 primary の path 込み比較) 対応で v5.x で導入。
//
// 背景:
// programEvaluator.ts は primary 候補を effectiveRate 数値降順で返すが、
// 異種通貨 primary が並ぶ場合 (例: JAL 特約 2% jal-mile vs 楽天Pay base 1% rakuten-pt)
// 数値だけでは target 通貨での実効価値を比較できない。
// 本モジュールは target 通貨への変換 path を踏まえて最適な primary を選び直す。
//
// アルゴリズム:
// 1. 各候補 c について「c.effectiveRate × bestPath(c.effectiveCurrencyId → targetCurrencyId).product」
//    を実効価値として算出 (target 同一通貨なら ratio=1、到達不能なら ratio=0)
// 2. 実効価値降順で sort
// 3. tie の場合 (例: 全候補が target 到達不能で実効価値 0): effectiveRate 降順で fallback
//    (= 旧 evaluatePrograms 挙動の再現、UI に何か出すための保険)
//
// 性能: 候補通貨ごとに bestPath を 1 回ずつキャッシュ。典型的候補数は ≦5 なので呼び出しコスト微小。
//
// 注意: edges / availableCardIds は rankCards.ts 後段で同じ bestPath 呼び出しに渡される値と
// 一致させること。さもないと selector の判断と後段の earn 計算で乖離が起きる。

import { bestPath } from "./bestPath";
import type { ProgramMatch } from "./programEvaluator";
import type { ConversionEdge } from "./types";

/**
 * primary 候補から target 通貨での実効価値が最大の 1 件を選ぶ。
 *
 * @param candidates ProgramMatch[] (evaluatePrograms().primaryCandidates。effectiveRate 降順前提)
 * @param edges 全 ConversionEdge (bestPath に渡される)
 * @param targetCurrencyId 目標通貨 ID
 * @param availableCardIds requiredCardIds ゲート用 (bestPath に渡される)
 * @returns 最適な ProgramMatch、または null (候補なし時)
 */
export function selectPrimaryForTarget(
  candidates: ProgramMatch[],
  edges: ConversionEdge[],
  targetCurrencyId: string,
  availableCardIds?: ReadonlySet<string>,
): ProgramMatch | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;

  // currency → target への path ratio キャッシュ (関数呼び出し内で完結)
  const ratioCache = new Map<string, number>();
  const getRatio = (currencyId: string): number => {
    if (currencyId === targetCurrencyId) return 1;
    const cached = ratioCache.get(currencyId);
    if (cached !== undefined) return cached;
    const path = bestPath(edges, currencyId, targetCurrencyId, 1, availableCardIds);
    const ratio = path?.product ?? 0; // 到達不能なら 0
    ratioCache.set(currencyId, ratio);
    return ratio;
  };

  // 候補ごとに valueAtTarget を計算して降順 sort
  // tie の場合は effectiveRate 降順で fallback (= 旧挙動再現)
  const ranked = candidates
    .map((c) => ({
      match: c,
      valueAtTarget: c.effectiveRate * getRatio(c.effectiveCurrencyId),
    }))
    .sort((a, b) => {
      if (b.valueAtTarget !== a.valueAtTarget) return b.valueAtTarget - a.valueAtTarget;
      return b.match.effectiveRate - a.match.effectiveRate;
    });

  return ranked[0]?.match ?? null;
}
