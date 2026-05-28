// PointMax: StoreProgramMembership の参照高速化用 index helper.
//
// 背景:
//   programEvaluator.evaluatePrograms / loyalty.bestLoyalties はどちらも
//   「特定 storeId に紐づく membership 群」を `memberships.filter(m => m.storeId === storeId)`
//   で抽出していたため、rankCards から store ごとに 2 回スキャンが発生する。
//   現在は memberships=320 件で体感上問題ないが、scale 増で線形に効く。
//
//   さらに「全 store 適用 = どの membership にも program 不在」の判定も
//   `new Set(memberships.map(m => m.programId))` で毎回スキャン。
//
//   rankCards の単一呼び出し内で 1 度だけ index を構築して下流に渡すことで
//   O(stores × programs × memberships) → O(stores × programs) + O(memberships) に削減できる。
//
// 注意:
//   - index は memberships 配列に対する純粋関数なので、`memberships` 参照が
//     変わらない限り再利用可能 (Zustand selector で memoize するのに適する)。
//   - 同一 storeId に複数 membership がある場合 (異なる programId)、配列に積まれる。

import type { StoreProgramMembership } from "./types";

export type MembershipIndex = {
  /** storeId → 当該 store に紐づく memberships。未登録 storeId は undefined */
  byStore: Map<string, StoreProgramMembership[]>;
  /** membership を 1 件以上持つ programId 集合 (「全 store 適用 program」判定の補集合) */
  programsWithMembership: Set<string>;
};

export function buildMembershipIndex(
  memberships: StoreProgramMembership[],
): MembershipIndex {
  const byStore = new Map<string, StoreProgramMembership[]>();
  const programsWithMembership = new Set<string>();
  for (const m of memberships) {
    programsWithMembership.add(m.programId);
    const arr = byStore.get(m.storeId);
    if (arr) arr.push(m);
    else byStore.set(m.storeId, [m]);
  }
  return { byStore, programsWithMembership };
}

/** index 経由で storeId に紐づく memberships を取得。未登録は空配列を返す。 */
export function membersFor(
  index: MembershipIndex,
  storeId: string,
): StoreProgramMembership[] {
  return index.byStore.get(storeId) ?? [];
}
