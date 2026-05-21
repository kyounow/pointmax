// PointMax: ノード未選択時のデフォルト radial レイアウト
//
// kind 別の同心円配置。各 kind は別 radius のリングに、全周 (2π) で均等配分。
//   - ポイント (point):   外側リング (radius=POINT_RADIUS)
//   - マイル (mile):       中間リング (radius=MILE_RADIUS)
//   - 現金相当 (cashlike): 内側リング (radius=CASH_RADIUS)
//   - 未分類 (other):      最内リング (radius=OTHER_RADIUS)
//
// 同 kind 内で多すぎる場合は弦長 (chord) ベースで「動的 radius」を採用し、
// 必要なら半径を膨張させて重なりを避ける。
// 旧 `layoutByKind` (kind 別の横一列) を置換、見た目を統一した円形表示に。

import type { Currency, CurrencyKind } from "../../domain/types";

const CENTER_X = 400;
const CENTER_Y = 260;
const POINT_RADIUS = 320;
const MILE_RADIUS = 210;
const CASH_RADIUS = 110;
const OTHER_RADIUS = 60;
const NODE_SLOT_SIZE = 160; // radialLayout.ts と統一
const MAX_OUTER_RADIUS = 440; // ポイント kind が多い場合の上限

const KIND_RADIUS: Record<CurrencyKind | "other", number> = {
  point: POINT_RADIUS,
  mile: MILE_RADIUS,
  cashlike: CASH_RADIUS,
  other: OTHER_RADIUS,
};

const ORDERED_KINDS: (CurrencyKind | "other")[] = [
  "point",
  "mile",
  "cashlike",
  "other",
];

/**
 * kind 別の同心円レイアウト。kind ごとに別 radius のリング、全周 2π に均等配分。
 * リングに乗らない数の kind は radius を動的拡大 (chord 計算)、ただし上限あり。
 */
export function layoutByKindRadial(
  currencies: Currency[],
): Map<string, { x: number; y: number }> {
  const buckets: Record<CurrencyKind | "other", Currency[]> = {
    point: [],
    mile: [],
    cashlike: [],
    other: [],
  };
  for (const c of currencies) {
    buckets[c.kind ?? "other"].push(c);
  }

  const map = new Map<string, { x: number; y: number }>();
  for (const kind of ORDERED_KINDS) {
    const items = buckets[kind];
    if (items.length === 0) continue;

    const N = items.length;
    const baseRadius = KIND_RADIUS[kind];
    // 弦長基準: chord = 2 * radius * sin(2π / (2N)) = 2 * radius * sin(π/N) ≥ NODE_SLOT_SIZE
    // → radius ≥ NODE_SLOT_SIZE / (2 * sin(π/N))
    const requiredRadius =
      N === 1 ? baseRadius : NODE_SLOT_SIZE / (2 * Math.sin(Math.PI / N));
    const radius = Math.min(
      MAX_OUTER_RADIUS,
      Math.max(baseRadius, requiredRadius),
    );

    items.forEach((c, i) => {
      // 真上 (angle = -π/2) から時計回りで配分
      const angle = -Math.PI / 2 + (i / N) * 2 * Math.PI;
      map.set(c.id, {
        x: CENTER_X + radius * Math.cos(angle),
        y: CENTER_Y + radius * Math.sin(angle),
      });
    });
  }
  return map;
}
