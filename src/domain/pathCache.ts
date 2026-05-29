// PointMax: bestPath (Bellman-Ford O(V·E)) の memoize ラッパ.
//
// 背景:
//   rankCards.ts は card × paymentApp × (primary path + 各 addOn path) で
//   bestPath を最大 cards × paymentApps × (1 + addOns) 回呼ぶ。同一
//   (fromCurrency, toCurrency) ペアが繰り返し計算されるが、product (= rate 積)
//   は amount に対し線形なので 1 度計算すれば amount 倍だけで済む。
//
//   selectPrimaryForTarget も内部で類似の ratioCache を持つが、呼び出し内
//   closure に閉じていて rankCards 全体での再利用ができない。
//   本モジュールで cache を 1 つにまとめて rankCards 入口で構築し、
//   evaluatePrograms / selectPrimary / 各 addOn / loyalty.bestLoyalties に
//   一貫して渡す設計。
//
// 性能想定:
//   - 重複 (from, to) ペアが多い workload (例: addOn=3 通貨 × paymentApp=3 個)
//     で bestPath 呼び出し 60-80% 削減 (audit Plan A-1)。
//   - cache 自体は単一 rankCards 呼び出し内で生存。Calculator 再計算ごとに
//     新しい cache を作る (= edges / availableCardIds 変更耐性、stale なし)。
//
// 注意:
//   - availableCardIds が異なる cache は混在不可。呼出元で識別を一致させること。
//   - 純粋 helper なので availableCardIds=undefined でも正しく動作 (テスト容易)。

import { bestPath, type BestPathResult } from "./bestPath";
import type { ConversionEdge } from "./types";

export type PathCache = {
  /**
   * (from, to) ペアに対し bestPath 結果を amount 倍して返す。
   * 内部キャッシュにあれば bestPath は呼ばれない。
   */
  resolve: (
    from: string,
    to: string,
    amount: number,
  ) => BestPathResult | null;

  /**
   * (from, to) の product (= path rate 積) のみ返す。selectPrimaryForTarget
   * のような ratio だけ欲しい caller 用。
   * from === to なら 1、到達不能なら 0。
   */
  getProduct: (from: string, to: string) => number;
};

type CachedEntry = { product: number; steps: ConversionEdge[] } | null;

export function makePathCache(
  edges: ConversionEdge[],
  availableCardIds?: ReadonlySet<string>,
  blockedCurrencyIds?: ReadonlySet<string>,
): PathCache {
  const cache = new Map<string, CachedEntry>();

  function lookup(from: string, to: string): CachedEntry {
    if (from === to) return { product: 1, steps: [] };
    const key = `${from}|${to}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const result = bestPath(edges, from, to, 1, availableCardIds, blockedCurrencyIds);
    const stored: CachedEntry = result
      ? { product: result.product, steps: result.steps }
      : null;
    cache.set(key, stored);
    return stored;
  }

  return {
    resolve(from, to, amount) {
      const stored = lookup(from, to);
      if (!stored) return null;
      return {
        finalAmount: amount * stored.product,
        product: stored.product,
        steps: stored.steps,
      };
    },
    getProduct(from, to) {
      const stored = lookup(from, to);
      return stored?.product ?? 0;
    },
  };
}
