// PR-0a-2b: 計算結果カード (CalcResultCard 展開ビュー) の「警告チップ」の表示予算を決める純関数。
//
// 【背景】
//   展開ビューには 要エントリー / 上限 / 条件チップ (notes・conditions・membership.notes 由来の
//   限定・対象外・経由型) / 公式情報の鮮度 (stale。PR-5a で交換ルート・還元率を『古い情報かも』
//   1 チップに統合) / 最低交換単位 (端数) が並びうる。
//   以前は「優先順で最大 3」をコメント運用で守っていたが、M3 (条件チップの合流) で同時に立つ
//   組み合わせが増えたため、優先順と件数予算を 1 関数に集約する。
//   6b (円換算モードへの移植)・5a (stale)・4e (要経由) もこの関数を使う (二重実装しない)。
//
// 【優先順 (高い順)】
//   要エントリー = 要経由 > channel (経由型・チャネル限定) > 上限 > 限定条件 / 対象外 > stale > 端数
//   同順位は候補の並び順 (安定ソート)。同じ kind は最初の 1 件だけ (専用バッジを先に渡せば
//   notes 由来の同種チップより優先される)。最大 WARNING_CHIP_BUDGET 件。
//
// React 非依存。node / jsdom どちらでもテストできる。

import type { NoteChipKind } from "./noteParser";

export type WarningChipKind =
  | NoteChipKind // entry / channel / cap / exclusion / limited (noteParser の条件チップ)
  | "via" // 要経由 (PR-4e のネットモードで使用。要エントリーと同順位)
  | "stale" // 公式情報の最終確認が 12 ヶ月超 (edgeFreshness.FRESHNESS_STALE_MONTHS)
  | "minUnit"; // 最低交換単位 (端数) の注記

/** 1 展開ビューに出す警告チップの上限件数。 */
export const WARNING_CHIP_BUDGET = 3;

/** 小さいほど優先。同値は同順位 (候補の並び順で決まる)。 */
export const WARNING_CHIP_PRIORITY: Readonly<Record<WarningChipKind, number>> = {
  entry: 0,
  via: 0,
  channel: 1,
  cap: 2,
  limited: 3,
  exclusion: 3,
  stale: 4,
  minUnit: 5,
};

/**
 * 警告チップの候補を優先順に並べ、同 kind の重複を除いて最大 budget 件に絞る。
 * 候補には任意の payload を載せてよい (描画側が kind 以外の情報を持ち回せるよう generic)。
 */
export function rankWarningChips<T extends { kind: WarningChipKind }>(
  candidates: ReadonlyArray<T>,
  budget: number = WARNING_CHIP_BUDGET,
): T[] {
  const seen = new Set<WarningChipKind>();
  const unique: { c: T; i: number }[] = [];
  candidates.forEach((c, i) => {
    if (seen.has(c.kind)) return;
    seen.add(c.kind);
    unique.push({ c, i });
  });
  unique.sort(
    (a, b) =>
      WARNING_CHIP_PRIORITY[a.c.kind] - WARNING_CHIP_PRIORITY[b.c.kind] ||
      a.i - b.i,
  );
  return unique.slice(0, Math.max(0, budget)).map((x) => x.c);
}
