import { describe, it, expect } from "vitest";
import { defineMemberships, membershipId } from "./defineMemberships";

describe("membershipId", () => {
  it("規約 m-{programId}-{storeId} で id を生成する", () => {
    expect(membershipId("prog-a", "store-b")).toBe("m-prog-a-store-b");
  });
});

describe("defineMemberships", () => {
  it("プレーン文字列の store から id 付き membership を生成する", () => {
    const rows = defineMemberships("prog-a", ["s1", "s2"]);
    expect(rows).toEqual([
      { id: "m-prog-a-s1", programId: "prog-a", storeId: "s1" },
      { id: "m-prog-a-s2", programId: "prog-a", storeId: "s2" },
    ]);
  });

  it("タプル形式で overrideRate / notes を持つ行を作れる", () => {
    const rows = defineMemberships("prog-a", [
      "s1",
      ["s2", { overrideRate: 0.015, notes: "上書き" }],
    ]);
    expect(rows[0]).toEqual({ id: "m-prog-a-s1", programId: "prog-a", storeId: "s1" });
    expect(rows[1]).toEqual({
      id: "m-prog-a-s2",
      programId: "prog-a",
      storeId: "s2",
      overrideRate: 0.015,
      notes: "上書き",
    });
  });

  it("全行の id が membershipId 規約に一致する", () => {
    const rows = defineMemberships("prog-x", ["a", ["b", { notes: "n" }]]);
    for (const r of rows) {
      expect(r.id).toBe(membershipId(r.programId, r.storeId));
    }
  });

  it("overrides から id / programId / storeId を渡しても規約側が権威を持つ", () => {
    const rows = defineMemberships("prog-a", [
      ["s1", { id: "bogus", programId: "evil", storeId: "evil", notes: "n" } as never],
    ]);
    expect(rows[0]).toEqual({
      id: "m-prog-a-s1",
      programId: "prog-a",
      storeId: "s1",
      notes: "n",
    });
  });
});
