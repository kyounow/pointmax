// @vitest-environment jsdom
// ユーザー手動キャンペーン登録 (A-4) の store アクションテスト。
// addCampaignProgram: program + 対象店舗 memberships の一括追加 (UUID id)
// removeUserProgram: ユーザー作成分のみ削除 (master 由来は no-op)、memberships cascade
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";
import { SEED_BENEFIT_PROGRAMS } from "./seed-data-programs";
import { membershipId } from "./defineMemberships";

const baseProgram = {
  name: "テスト手動キャンペーン +5%",
  scope: "member-stores" as const,
  rate: 0.05,
  currencyId: "d-pt",
  bonusType: "addOn" as const,
  paymentAppId: "pa-d-pay",
  validFrom: "2026-06-01",
  validTo: "2026-06-30",
};

describe("addCampaignProgram / removeUserProgram (A-4)", () => {
  beforeEach(() => {
    useStore.setState({ programs: [], memberships: [] });
  });

  it("program と対象店舗 memberships を一括追加し、生成 id を返す", () => {
    const id = useStore
      .getState()
      .addCampaignProgram(baseProgram, ["store-a", "store-b"]);
    const s = useStore.getState();
    expect(id).toBeTruthy();
    const prog = s.programs.find((p) => p.id === id);
    expect(prog?.name).toBe(baseProgram.name);
    expect(prog?.rate).toBe(0.05);
    expect(prog?.paymentAppId).toBe("pa-d-pay");
    expect(
      s.memberships.filter((m) => m.programId === id).map((m) => m.storeId),
    ).toEqual(["store-a", "store-b"]);
  });

  it("同一 storeId の重複指定は 1 件に畳む", () => {
    const id = useStore
      .getState()
      .addCampaignProgram(baseProgram, ["store-a", "store-a", "store-b"]);
    expect(
      useStore.getState().memberships.filter((m) => m.programId === id),
    ).toHaveLength(2);
  });

  it("removeUserProgram は program と memberships を cascade 削除する (他は不変)", () => {
    const id1 = useStore.getState().addCampaignProgram(baseProgram, ["store-a"]);
    const id2 = useStore
      .getState()
      .addCampaignProgram({ ...baseProgram, name: "別件" }, ["store-b"]);
    useStore.getState().removeUserProgram(id1);
    const s = useStore.getState();
    expect(s.programs.some((p) => p.id === id1)).toBe(false);
    expect(s.memberships.some((m) => m.programId === id1)).toBe(false);
    expect(s.programs.some((p) => p.id === id2)).toBe(true);
    expect(s.memberships.some((m) => m.programId === id2)).toBe(true);
  });

  it("master 由来 program には no-op (公式は保護、削除は seed 側 tombstone の仕事)", () => {
    const master = SEED_BENEFIT_PROGRAMS[0];
    useStore.setState({
      programs: [master],
      memberships: [
        {
          id: membershipId(master.id, "store-x"),
          programId: master.id,
          storeId: "store-x",
        },
      ],
    });
    useStore.getState().removeUserProgram(master.id);
    const s = useStore.getState();
    expect(s.programs).toHaveLength(1);
    expect(s.memberships).toHaveLength(1);
  });
});
