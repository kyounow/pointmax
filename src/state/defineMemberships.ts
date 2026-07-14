// StoreProgramMembership の id 生成と DSL。
//
// v6 で StoreProgramMembership.id を必須化した (規約 `m-{programId}-{storeId}`、
// program × store は一意)。id の生成規約はこのファイルの membershipId() に集約し、
// seed / sync / validators はすべてここを唯一の源として参照する
// (文字列を各所で直書きしない = 規約変更時の grep 漏れ・不一致を防ぐ)。

import type { StoreProgramMembership } from "../domain/types";

// membership id の唯一の生成関数。規約: `m-{programId}-{storeId}`。
// program × store は一意なので、この 2 値から決定論的に id が定まる。
export function membershipId(programId: string, storeId: string): string {
  return `m-${programId}-${storeId}`;
}

// defineMemberships の store 指定。
//   - プレーン: storeId 文字列のみ (override 無しの通常行)
//   - タプル: [storeId, overrides] — overrideRate / overrideCurrencyId / notes /
//     userModifiedAt を持つ行用。id / programId / storeId は規約側が権威を持つため
//     overrides から指定しても無視される (下の spread 順を参照)。
export type MembershipStoreSpec =
  | string
  | [storeId: string, overrides: Partial<StoreProgramMembership>];

// 1 つの program に対する membership 行を宣言的に定義する。
// 同型オブジェクトの羅列を圧縮しつつ、id を membershipId() で機械生成する。
export function defineMemberships(
  programId: string,
  stores: MembershipStoreSpec[],
): StoreProgramMembership[] {
  return stores.map((spec) => {
    if (typeof spec === "string") {
      return { id: membershipId(programId, spec), programId, storeId: spec };
    }
    const [storeId, overrides] = spec;
    // overrides を先に展開し、id / programId / storeId を後で確定させることで
    // 規約フィールドが overrides から誤って上書きされるのを防ぐ。
    return {
      ...overrides,
      id: membershipId(programId, storeId),
      programId,
      storeId,
    };
  });
}
