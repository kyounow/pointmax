// PointMax: ノード選択時の radial レイアウト
//
// 選択ノードを中心とした円周上に関連ノードを配置する pure function。
// 方向情報を保持するため:
//   - 入口 (incoming のみ)  → 上半円 (角度 π 〜 2π、画面では centerY より上)
//   - 出口 (outgoing のみ)  → 下半円 (角度 0 〜 π、画面では centerY より下)
//   - 双方向 (incoming かつ outgoing) → 左右 (angle = π / 0)、複数なら y で stack
//
// 旧「十字」配置 (入口=上行、出口=下行、双方向=左右の固定座標) を radial に置換。
// ノード数に応じて radius を動的に調整 (180〜280)。
//
// React Flow 座標系: x→右, y→下。sin が正 = y が centerY より下 (= 下半円)。

import type { ConversionEdge } from "../../domain/types";

const CENTER_X = 400;
const CENTER_Y = 260;
const BASE_RADIUS = 180;
const MAX_RADIUS = 280;
const RADIUS_PER_NODE = 12;
const STACK_SPACING_Y = 100;

/**
 * 選択ノードを中心とした radial レイアウト位置を計算。
 *
 * @param selectedId 選択ノードの id (中心に配置)
 * @param edges 全 ConversionEdge (入口/出口/双方向を判定)
 * @returns 表示対象ノード id → 座標のマップ (selectedId 含む)
 */
export function computeFocusedRadialLayout(
  selectedId: string,
  edges: ConversionEdge[],
): Map<string, { x: number; y: number }> {
  const incomingSet = new Set<string>();
  const outgoingSet = new Set<string>();
  for (const e of edges) {
    if (e.toCurrencyId === selectedId) incomingSet.add(e.fromCurrencyId);
    if (e.fromCurrencyId === selectedId) outgoingSet.add(e.toCurrencyId);
  }
  const bidirSet = new Set<string>();
  for (const id of incomingSet) {
    if (outgoingSet.has(id)) bidirSet.add(id);
  }
  const inputOnly = [...incomingSet].filter((id) => !bidirSet.has(id));
  const outputOnly = [...outgoingSet].filter((id) => !bidirSet.has(id));
  const bidir = [...bidirSet];

  const totalRelated = inputOnly.length + outputOnly.length + bidir.length;
  const radius = Math.min(
    MAX_RADIUS,
    BASE_RADIUS + totalRelated * RADIUS_PER_NODE,
  );

  const layout = new Map<string, { x: number; y: number }>();
  layout.set(selectedId, { x: CENTER_X, y: CENTER_Y });

  // 円弧上に等分配置するヘルパ (startAngle → endAngle に N 個)。
  const placeArc = (ids: string[], startAngle: number, endAngle: number) => {
    const N = ids.length;
    if (N === 0) return;
    ids.forEach((id, i) => {
      const t = (i + 0.5) / N;
      const angle = startAngle + t * (endAngle - startAngle);
      layout.set(id, {
        x: CENTER_X + radius * Math.cos(angle),
        y: CENTER_Y + radius * Math.sin(angle),
      });
    });
  };

  // 入口を上半円 (angle ∈ (π, 2π), sin < 0 → y < centerY)
  placeArc(inputOnly, Math.PI, 2 * Math.PI);
  // 出口を下半円 (angle ∈ (0, π), sin > 0 → y > centerY)
  placeArc(outputOnly, 0, Math.PI);

  // 双方向は左右 (angle = π / 0) に配置、複数なら y で stack
  const leftCount = Math.ceil(bidir.length / 2);
  const leftBidir = bidir.slice(0, leftCount);
  const rightBidir = bidir.slice(leftCount);
  leftBidir.forEach((id, i) => {
    const y = CENTER_Y + (i - (leftBidir.length - 1) / 2) * STACK_SPACING_Y;
    layout.set(id, { x: CENTER_X - radius, y });
  });
  rightBidir.forEach((id, i) => {
    const y = CENTER_Y + (i - (rightBidir.length - 1) / 2) * STACK_SPACING_Y;
    layout.set(id, { x: CENTER_X + radius, y });
  });

  return layout;
}
