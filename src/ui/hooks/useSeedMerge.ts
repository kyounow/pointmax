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
import { useShallow } from "zustand/shallow";
import { useStore } from "../../state/store";
import { seed } from "../../state/seed";
import {
  REMOVED_PROGRAM_IDS,
  REMOVED_MEMBERSHIP_KEYS,
} from "../../state/seed-additions";
import {
  mergeSeed,
  diffCount,
  changeCount,
  type MergeResult,
} from "../../domain/mergeSeed";

export type SeedMergeResult = {
  merged: MergeResult | null;
  /** merged.diff (追加分) の総件数。merged=null なら 0。 */
  additionCount: number;
  /** 追加 + 内容更新 + 削除の総件数 (Phase 5)。merged=null なら 0。 */
  totalChangeCount: number;
  /** 現在 state にデータがあるか (空 state なら mergeSeed をスキップ)。 */
  hasData: boolean;
};

export function useSeedMerge(): SeedMergeResult {
  // Wave 5 B-1 audit-fix: 9 個別 subscribe → 単一 useShallow に集約
  const {
    cards,
    currencies,
    stores,
    edges,
    pointCards,
    loyaltyRules,
    paymentApps,
    programs,
    memberships,
  } = useStore(
    useShallow((s) => ({
      cards: s.cards,
      currencies: s.currencies,
      stores: s.stores,
      edges: s.edges,
      pointCards: s.pointCards,
      loyaltyRules: s.loyaltyRules,
      paymentApps: s.paymentApps,
      programs: s.programs,
      memberships: s.memberships,
    })),
  );

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
      {
        removedProgramIds: REMOVED_PROGRAM_IDS,
        removedMembershipKeys: REMOVED_MEMBERSHIP_KEYS,
      },
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
  const totalChangeCount = merged ? changeCount(merged) : 0;

  return { merged, additionCount, totalChangeCount, hasData };
}
