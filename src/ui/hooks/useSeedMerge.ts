// PointMax: bundled seed と現 state を mergeSeed する結果を共有する hook
// (Wave 4 B-7 audit-fix)
//
// 背景:
//   SyncUpdateModal / UpdateBanner が同じ mergeSeed(current, seed()) を独立に
//   計算していた。subscribe 対象も似ているが微妙に shape が違い (programs/memberships
//   含む / 含まない) でロジックの一貫性が崩れていた。
//
// 対応:
//   全 collection を含む統一 shape を使い、共通ロジックを hook 化。caller は
//   返り値の `merged` / `diffCount` を使う。component-level memo は依然
//   独立 (React の useMemo は component 内なので)、ただし計算ロジックが DRY 化される。
//
// 注意: SyncUpdateModal / UpdateBanner はそれぞれ 1 回だけインスタンス化される想定なので、
// 実害は計算重複ぶん (1 回 vs 2 回) で済む。完全 dedup には context provider 化が
// 必要だが、現状規模ならこれで十分。

import { useMemo } from "react";
import { useStore } from "../../state/store";
import { seed } from "../../state/seed";
import { mergeSeed, diffCount, type MergeResult } from "../../domain/mergeSeed";

export type SeedMergeResult = {
  merged: MergeResult | null;
  /** merged.diff の総件数。merged=null なら 0。 */
  additionCount: number;
  /** 現在 state にデータがあるか (空 state なら mergeSeed をスキップ)。 */
  hasData: boolean;
};

export function useSeedMerge(): SeedMergeResult {
  const cards = useStore((s) => s.cards);
  const currencies = useStore((s) => s.currencies);
  const stores = useStore((s) => s.stores);
  const edges = useStore((s) => s.edges);
  const pointCards = useStore((s) => s.pointCards);
  const loyaltyRules = useStore((s) => s.loyaltyRules);
  const paymentApps = useStore((s) => s.paymentApps);
  const programs = useStore((s) => s.programs);
  const memberships = useStore((s) => s.memberships);

  const hasData =
    cards.length +
      currencies.length +
      stores.length +
      edges.length +
      pointCards.length +
      loyaltyRules.length +
      paymentApps.length >
    0;

  const merged = useMemo(() => {
    if (!hasData) return null;
    return mergeSeed(
      {
        cards,
        currencies,
        stores,
        edges,
        pointCards,
        loyaltyRules,
        paymentApps,
        programs,
        memberships,
      },
      seed(),
    );
  }, [
    hasData,
    cards,
    currencies,
    stores,
    edges,
    pointCards,
    loyaltyRules,
    paymentApps,
    programs,
    memberships,
  ]);

  const additionCount = merged ? diffCount(merged.diff) : 0;

  return { merged, additionCount, hasData };
}
