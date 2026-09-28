// PR-6c (B6 = (a) 実行時に隠す): 計算画面の店舗 picker に出す店の実行時フィルタ。
//
// 【背景】
//   seed の店舗 268 件のうち約 80 件は membership (店舗別の還元) が 1 件も無く、選んでも
//   「一般店舗 (規定還元)」と全く同じ結果 (カードの基本還元率) になる。select に並ぶだけで
//   「この店は特別な還元がある」と誤解させ、レジ前で探す行も増やすので picker から隠す。
//   seed からは消さない (cron の店舗追加・membership 付与でそのまま現れる = 実行時導出)。
//
// 【隠す条件】(general は常に表示)
//   1. membership が 1 件も無い店 (state の memberships から storeId 集合を導出)。
//   2. 除外カテゴリ (PICKER_EXCLUDED_CATEGORIES = 同期の EXCLUDED_CATEGORIES と同じ語彙) の店。
//   3. 還元の減額・対象外が未モデルのカテゴリ (電気・ガス。README『計算に反映していない条件』7)。
//   ただし選択中の店と直近店舗チップの店は残す (隠すと select の value が壊れ、チップも無効になる)。
//
// React 非依存の純関数。

import type { Store, StoreProgramMembership } from "./types";

/** 「一般店舗 (規定還元)」の store id。picker では常に表示する。 */
export const GENERAL_STORE_ID = "general";

/**
 * 同期パイプラインの除外カテゴリ (scripts/sync/types.ts の EXCLUDED_CATEGORIES) と同じ語彙。
 * app は scripts を import しないので値を複製し、一致は storePicker.test で固定する。
 * 照合は Store.category の文字列そのもの (category 未設定の店はこの条件では隠さない)。
 */
export const PICKER_EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set([
  "金融",
  "保険",
  "医療",
  "ギャンブル",
  "葬儀",
  "不動産",
  "住宅",
  "不動産・住宅",
  "ネットサービス",
  "サービス",
  "その他",
  "(未分類)",
]);

/**
 * 公共料金の減額・対象外 (カード会社ごとの還元率の引き下げ) をモデル化していないカテゴリ。
 * 選ぶとカードの基本還元率で計算され実際より高く見えるので、picker から隠す。
 */
export const PICKER_REDUCED_RATE_CATEGORIES: ReadonlySet<string> = new Set([
  "電気・ガス",
]);

/**
 * picker に出す店の id 集合。
 * @param memberships 省略時 (undefined) は membership による絞り込みをしない (カテゴリ条件のみ)。
 * @param keep.selectedId 選択中の店 (常に残す)。
 * @param keep.recentIds 直近店舗チップの店 (常に残す)。
 */
export function visibleStoreIds(
  stores: readonly Store[],
  memberships: readonly Pick<StoreProgramMembership, "storeId">[] | undefined,
  keep: { selectedId?: string; recentIds?: readonly string[] } = {},
): Set<string> {
  const withMembership = memberships
    ? new Set(memberships.map((m) => m.storeId))
    : null;
  const kept = new Set(keep.recentIds ?? []);
  if (keep.selectedId) kept.add(keep.selectedId);
  const out = new Set<string>();
  for (const s of stores) {
    const hidden =
      s.id !== GENERAL_STORE_ID &&
      ((withMembership !== null && !withMembership.has(s.id)) ||
        (s.category !== undefined &&
          (PICKER_EXCLUDED_CATEGORIES.has(s.category) ||
            PICKER_REDUCED_RATE_CATEGORIES.has(s.category))));
    if (!hidden || kept.has(s.id)) out.add(s.id);
  }
  return out;
}
