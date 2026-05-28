// PointMax: ID lookup を Map 化して O(1) アクセスを提供するための index helper.
//
// 背景:
//   UI / sync コードで `programs.find((p) => p.id === id)` 等の線形検索が
//   render ループや map() 内で繰り返し走る箇所がある。programs=42 / stores=270 /
//   memberships=320 で実害は薄いが、scale 増 (programs 100+) で UI 応答が
//   遅くなる潜在問題。
//
//   本モジュールは「id を持つ配列 → Map<id, item>」の汎用ファクトリを提供する。
//   呼出側は useMemo で配列参照が同じ間 cache する想定:
//
//     const programById = useMemo(() => byId(programs), [programs]);
//     const prog = programById.get(id);
//
//   mergeSeed.ts の参照保持 fix (Wave 1 A-6) と合わせれば、no-op sync 時に
//   programs 配列の参照が維持され、Map も再構築されない。

type Identifiable = { id: string };

/** 配列を id でキー化した Map に変換する汎用 helper。同一 id があれば後勝ち。 */
export function byId<T extends Identifiable>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}

/** 配列を name でキー化した Map に変換する。重複 name は後勝ち。
 *  resolver 系 (UI で id→name → 表示用 record 検索) で使う想定。 */
export function byName<T extends { name: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.name, item);
  }
  return map;
}
