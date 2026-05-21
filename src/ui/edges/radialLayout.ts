// PointMax: ノード選択時の radial レイアウト
//
// 選択ノードを中心とした円周上に関連ノードを配置する pure function。
// 方向情報を保持するため:
//   - 入口 (incoming のみ)  → 上半円 (角度 π 〜 2π、画面では centerY より上)
//   - 出口 (outgoing のみ)  → 下半円 (角度 0 〜 π、画面では centerY より下)
//   - 双方向 (incoming かつ outgoing) → 左右 (angle = π / 0)、複数なら y で stack
//
// ノードサイズ (`.currency-node` の max-width: 130px) を考慮した適応 radius を採用:
//   - 必要 radius = N * NODE_SLOT_SIZE / arc_angle (= 半円なら / π)
//   - BASE_RADIUS 〜 MAX_RADIUS の範囲で動的調整
//   - 上限を超える場合は 2 重リングへ fallback (外側に capacity 分、残りを内側に)
//
// 例: JAL マイル (入口 13 個 / 出口 1 個 / 双方向 0) → 上半円が詰まる → 2 重リング展開
//
// React Flow 座標系: x→右, y→下。sin が正 = y が centerY より下 (= 下半円)。

import type { ConversionEdge } from "../../domain/types";

const CENTER_X = 400;
const CENTER_Y = 260;
// ノードの実 max-width (130px) + 最小余白で、隣接ノード間の最低弦長 (chord)
const NODE_SLOT_SIZE = 160;
// 関連ノードが 0 個の時の最小 radius (UX 上「近すぎず遠すぎず」のバランス)
const BASE_RADIUS = 180;
// 多重リングで使う radius (外側 → 中間 → 内側)。3 重リングまで対応 (13 個入口でも余裕)。
const MAX_RADIUS = 380;
const RING_RADIUSES = [MAX_RADIUS, 270, 160] as const;
// 双方向ノードを左右に積む時の y 方向間隔
const STACK_SPACING_Y = 100;

/**
 * arc 上に N 個のノードを等分配置した時、隣接 2 ノード間の弦長 (chord、直線距離) は
 *   chord = 2 * radius * sin(arc / (2 * N))
 * これが NODE_SLOT_SIZE 以上になる最小 radius を返す。
 *
 * 旧実装は弧長 (= radius * arc) ベースで計算していたが、実際の重なりは弦長で決まる
 * (= 半円端 angle ≈ π/0 で 2 つのノードの直線距離は弧長より大幅に短くなる)。
 */
function requiredRadiusForChord(N: number, arc: number): number {
  if (N <= 1) return BASE_RADIUS;
  return NODE_SLOT_SIZE / (2 * Math.sin(arc / (2 * N)));
}

/**
 * 指定 radius / arc 上に NODE_SLOT_SIZE を満たして配置できる最大ノード数。
 *   chord(N, radius, arc) = 2 * radius * sin(arc / (2N)) ≥ NODE_SLOT_SIZE
 *   → N ≤ arc / (2 * asin(NODE_SLOT_SIZE / (2 * radius)))
 */
function maxCapacityOnArc(radius: number, arc: number): number {
  const sinArg = NODE_SLOT_SIZE / (2 * radius);
  if (sinArg >= 1) return 1; // ノードが radius より大きい (= 1 個しか乗らない)
  return Math.max(1, Math.floor(arc / (2 * Math.asin(sinArg))));
}

/**
 * 弧上に等分配置する。N 個のノードを startAngle 〜 endAngle に均等に。
 */
function placeOnArc(
  ids: string[],
  startAngle: number,
  endAngle: number,
  radius: number,
  layout: Map<string, { x: number; y: number }>,
): void {
  const N = ids.length;
  if (N === 0) return;
  const arc = endAngle - startAngle;
  ids.forEach((id, i) => {
    const t = (i + 0.5) / N;
    const angle = startAngle + t * arc;
    layout.set(id, {
      x: CENTER_X + radius * Math.cos(angle),
      y: CENTER_Y + radius * Math.sin(angle),
    });
  });
}

/**
 * 適応 radius で弧上配置。N が多すぎて MAX_RADIUS でも弦長が足りない場合は多重リングへ。
 *
 * 計算は弦長 (chord) ベース:
 *   chord = 2 * radius * sin(arc / (2N)) ≥ NODE_SLOT_SIZE
 *
 * - requiredRadiusForChord(N, arc) ≤ MAX_RADIUS なら単一リング
 *   (radius = max(BASE_RADIUS, requiredRadius))
 * - 超える場合は外側 → 中間 → 内側の順に RING_RADIUSES で埋める。各リングは
 *   chord 制限を満たす capacity 分だけ受け入れる。
 */
function placeAdaptiveArc(
  ids: string[],
  startAngle: number,
  endAngle: number,
  layout: Map<string, { x: number; y: number }>,
): void {
  const N = ids.length;
  if (N === 0) return;
  const arc = endAngle - startAngle;
  const requiredRadius = requiredRadiusForChord(N, arc);

  if (requiredRadius <= MAX_RADIUS) {
    const radius = Math.max(BASE_RADIUS, requiredRadius);
    placeOnArc(ids, startAngle, endAngle, radius, layout);
    return;
  }

  // 多重リング: 外側 → 中間 → 内側 の順に chord 制限を満たす範囲で埋める
  let remaining = ids;
  for (const r of RING_RADIUSES) {
    if (remaining.length === 0) break;
    const cap = maxCapacityOnArc(r, arc);
    const take = Math.min(remaining.length, cap);
    placeOnArc(remaining.slice(0, take), startAngle, endAngle, r, layout);
    remaining = remaining.slice(take);
  }
  // 3 重でも入りきらない極端ケース (>>20 個) は最内リングに詰める (重なり許容)
  if (remaining.length > 0) {
    placeOnArc(remaining, startAngle, endAngle, BASE_RADIUS, layout);
  }
}

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

  const layout = new Map<string, { x: number; y: number }>();
  layout.set(selectedId, { x: CENTER_X, y: CENTER_Y });

  // 入口を上半円 (angle ∈ (π, 2π), sin < 0 → y < centerY)、適応 radius + 2 重リング
  placeAdaptiveArc(inputOnly, Math.PI, 2 * Math.PI, layout);
  // 出口を下半円 (angle ∈ (0, π), sin > 0 → y > centerY)、同上
  placeAdaptiveArc(outputOnly, 0, Math.PI, layout);

  // 双方向は左右 (angle = π / 0) に配置、複数なら y で stack
  // 双方向数は通常少ない (≤ 6 程度) ので単純な stack で十分。
  // radius は入口/出口の最大 required と同じスケールで揃える (弦長基準)。
  const sideRadius = (() => {
    const inputRequired = inputOnly.length
      ? requiredRadiusForChord(inputOnly.length, Math.PI)
      : 0;
    const outputRequired = outputOnly.length
      ? requiredRadiusForChord(outputOnly.length, Math.PI)
      : 0;
    const maxRequired = Math.max(inputRequired, outputRequired);
    if (maxRequired === 0) return BASE_RADIUS;
    return Math.min(MAX_RADIUS, Math.max(BASE_RADIUS, maxRequired));
  })();

  const leftCount = Math.ceil(bidir.length / 2);
  const leftBidir = bidir.slice(0, leftCount);
  const rightBidir = bidir.slice(leftCount);
  leftBidir.forEach((id, i) => {
    const y = CENTER_Y + (i - (leftBidir.length - 1) / 2) * STACK_SPACING_Y;
    layout.set(id, { x: CENTER_X - sideRadius, y });
  });
  rightBidir.forEach((id, i) => {
    const y = CENTER_Y + (i - (rightBidir.length - 1) / 2) * STACK_SPACING_Y;
    layout.set(id, { x: CENTER_X + sideRadius, y });
  });

  return layout;
}
