import { describe, it, expect } from "vitest";
import { mergeSeed, diffCount, changeCount } from "./mergeSeed";
import { membershipId } from "../state/defineMemberships";
import type {
  BenefitProgram,
  Card,
  ConversionEdge,
  Currency,
  PointCard,
  Store,
  StoreProgramMembership,
} from "./types";

const empty = {
  cards: [] as Card[],
  currencies: [] as Currency[],
  stores: [] as Store[],
  edges: [] as ConversionEdge[],
  pointCards: [] as PointCard[],
  paymentApps: [] as never[],
};

const card = (id: string, name: string): Card => ({
  id,
  name,
  defaultRate: 0.01,
  defaultCurrencyId: "x",
});
const cur = (id: string): Currency => ({ id, name: id });

describe("mergeSeed", () => {
  it("空 current ＋ seed → seed の全要素を追加", () => {
    const seed = {
      ...empty,
      cards: [card("a", "A")],
      currencies: [cur("c1"), cur("c2")],
    };
    const result = mergeSeed(empty, seed);
    expect(result.cards).toHaveLength(1);
    expect(result.currencies).toHaveLength(2);
    expect(result.diff.cards).toHaveLength(1);
    expect(result.diff.currencies).toHaveLength(2);
  });

  it("current が seed を完全に含む → 追加なし", () => {
    const items = {
      ...empty,
      cards: [card("a", "A")],
      currencies: [cur("c1")],
    };
    const result = mergeSeed(items, items);
    expect(result.cards).toHaveLength(1);
    expect(result.diff.cards).toHaveLength(0);
    expect(result.diff.currencies).toHaveLength(0);
  });

  it("current にあるアイテムは更新されない（編集を保護）", () => {
    const userCard = card("a", "USER_EDITED_NAME");
    const seedCard = card("a", "SEED_NAME");
    const result = mergeSeed(
      { ...empty, cards: [userCard] },
      { ...empty, cards: [seedCard] },
    );
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe("USER_EDITED_NAME");
    expect(result.diff.cards).toHaveLength(0);
  });

  it("seed にだけある新しいIDは追加される", () => {
    const result = mergeSeed(
      { ...empty, currencies: [cur("c1")] },
      { ...empty, currencies: [cur("c1"), cur("c2"), cur("c3")] },
    );
    expect(result.currencies).toHaveLength(3);
    expect(result.diff.currencies.map((c) => c.id)).toEqual(["c2", "c3"]);
  });

  it("複数カテゴリで同時にマージできる", () => {
    const current = {
      ...empty,
      cards: [card("a", "A")],
      currencies: [cur("c1")],
    };
    const seed = {
      ...empty,
      cards: [card("a", "A"), card("b", "B")],
      currencies: [cur("c1"), cur("c2")],
      stores: [{ id: "s1", name: "Store1" }],
    };
    const result = mergeSeed(current, seed);
    expect(result.cards).toHaveLength(2);
    expect(result.currencies).toHaveLength(2);
    expect(result.stores).toHaveLength(1);
    expect(result.diff.cards.map((c) => c.id)).toEqual(["b"]);
    expect(result.diff.currencies.map((c) => c.id)).toEqual(["c2"]);
    expect(result.diff.stores.map((s) => s.id)).toEqual(["s1"]);
  });
});

// ─── Phase 5: 公式 program の更新伝播 + tombstone 削除 ───

const prog = (
  id: string,
  over: Partial<BenefitProgram> = {},
): BenefitProgram => ({
  id,
  name: id,
  scope: "member-stores",
  rate: 0.05,
  currencyId: "d-pt",
  validFrom: "2026-06-01",
  validTo: "2026-06-30",
  ...over,
});

const mem = (
  programId: string,
  storeId: string,
  over: Partial<StoreProgramMembership> = {},
): StoreProgramMembership => ({
  id: membershipId(programId, storeId),
  programId,
  storeId,
  ...over,
});

describe("mergeSeed — 公式 program の内容更新伝播 (Phase 5)", () => {
  it("公式由来 + 未編集の program は seed の最新内容に置換される (期間延長の伝播)", () => {
    const current = {
      ...empty,
      programs: [prog("prog-a", { validTo: "2026-06-30" })],
    };
    const seed = {
      ...empty,
      programs: [prog("prog-a", { validTo: "2026-07-31" })], // override で延長済み
    };
    const result = mergeSeed(current, seed);
    expect(result.programs?.[0].validTo).toBe("2026-07-31");
    expect(result.updatedPrograms).toHaveLength(1);
    expect(result.updatedPrograms[0].id).toBe("prog-a");
    expect(result.diff.programs).toHaveLength(0); // 追加ではなく更新
  });

  it("rate 改定も伝播する", () => {
    const result = mergeSeed(
      { ...empty, programs: [prog("prog-a", { rate: 0.05 })] },
      { ...empty, programs: [prog("prog-a", { rate: 0.07 })] },
    );
    expect(result.programs?.[0].rate).toBe(0.07);
    expect(result.updatedPrograms).toHaveLength(1);
  });

  it("ユーザー編集済み (userModifiedAt あり) は保護され置換されない", () => {
    const edited = prog("prog-a", {
      rate: 0.1,
      userModifiedAt: "2026-06-01T00:00:00.000Z",
    });
    const result = mergeSeed(
      { ...empty, programs: [edited] },
      { ...empty, programs: [prog("prog-a", { rate: 0.07 })] },
    );
    expect(result.programs?.[0].rate).toBe(0.1);
    expect(result.updatedPrograms).toHaveLength(0);
  });

  it("内容が同一なら何もしない + 配列参照を維持 (no-op memo 保全)", () => {
    const programs = [prog("prog-a")];
    const result = mergeSeed(
      { ...empty, programs },
      { ...empty, programs: [prog("prog-a")] },
    );
    expect(result.updatedPrograms).toHaveLength(0);
    expect(result.programs).toBe(programs);
  });

  it("キー順序が違っても同内容なら更新扱いしない (persist/restore 耐性)", () => {
    const reordered = {
      validTo: "2026-06-30",
      rate: 0.05,
      currencyId: "d-pt",
      name: "prog-a",
      id: "prog-a",
      scope: "member-stores",
      validFrom: "2026-06-01",
    } as BenefitProgram;
    const result = mergeSeed(
      { ...empty, programs: [reordered] },
      { ...empty, programs: [prog("prog-a")] },
    );
    expect(result.updatedPrograms).toHaveLength(0);
  });

  it("ユーザー独自 program (seed に無い id) は触らない", () => {
    const userProg = prog("uuid-user-prog", { rate: 0.02 });
    const result = mergeSeed(
      { ...empty, programs: [userProg] },
      { ...empty, programs: [prog("prog-a")] },
    );
    expect(result.programs?.find((p) => p.id === "uuid-user-prog")?.rate).toBe(
      0.02,
    );
    expect(result.updatedPrograms).toHaveLength(0);
  });
});

// ─── PR-1d: opt-in の enabled (preference) を更新伝播で保護 ───
describe("mergeSeed — program preference (enabled) の保護 (PR-1d)", () => {
  it("(a) ユーザーが ON にした opt-in program に公式が rate 改定 → 更新は届き enabled は維持", () => {
    // local: opt-in を ON (enabled:true) + 旧 rate。seed(公式): enabled 出荷せず + 新 rate。
    const local = prog("prog-optin", {
      optIn: true,
      enabled: true,
      rate: 0.01,
      validFrom: undefined,
      validTo: undefined,
    });
    const official = prog("prog-optin", {
      optIn: true,
      rate: 0.02, // rate 改定
      validFrom: undefined,
      validTo: undefined,
    });
    const result = mergeSeed(
      { ...empty, programs: [local] },
      { ...empty, programs: [official] },
    );
    const merged = result.programs?.find((p) => p.id === "prog-optin");
    expect(merged?.rate).toBe(0.02); // 公式更新が届く
    expect(merged?.enabled).toBe(true); // ユーザーの ON は維持 (carry-over)
    expect(result.updatedPrograms).toHaveLength(1);
  });

  it("(b) enabled だけが違う (公式内容は同一) → 誤って更新扱いしない + enabled 維持", () => {
    const local = prog("prog-optin", {
      optIn: true,
      enabled: true, // ユーザー ON
      rate: 0.01,
      validFrom: undefined,
      validTo: undefined,
    });
    const official = prog("prog-optin", {
      optIn: true, // enabled は出荷しない、rate も同一
      rate: 0.01,
      validFrom: undefined,
      validTo: undefined,
    });
    const result = mergeSeed(
      { ...empty, programs: [local] },
      { ...empty, programs: [official] },
    );
    // preference キーを除いた内容は同一 → updated に載らない
    expect(result.updatedPrograms).toHaveLength(0);
    const merged = result.programs?.find((p) => p.id === "prog-optin");
    expect(merged?.enabled).toBe(true); // ON 維持
  });

  it("enabled:false (明示 OFF) も rate 改定後に維持される", () => {
    const local = prog("prog-optin", {
      optIn: true,
      enabled: false,
      rate: 0.01,
      validFrom: undefined,
      validTo: undefined,
    });
    const official = prog("prog-optin", {
      optIn: true,
      rate: 0.03,
      validFrom: undefined,
      validTo: undefined,
    });
    const result = mergeSeed(
      { ...empty, programs: [local] },
      { ...empty, programs: [official] },
    );
    const merged = result.programs?.find((p) => p.id === "prog-optin");
    expect(merged?.rate).toBe(0.03);
    expect(merged?.enabled).toBe(false);
  });
});

describe("mergeSeed — tombstone 削除 (Phase 5)", () => {
  it("removedProgramIds の program と memberships が cascade 除去される", () => {
    const current = {
      ...empty,
      programs: [prog("prog-old"), prog("prog-keep")],
      memberships: [
        mem("prog-old", "store-1"),
        mem("prog-old", "store-2"),
        mem("prog-keep", "store-1"),
      ],
    };
    const seed = { ...empty, programs: [prog("prog-keep")] }; // seed からは削除済み
    const result = mergeSeed(current, seed, {
      removedProgramIds: ["prog-old"],
    });
    expect(result.programs?.map((p) => p.id)).toEqual(["prog-keep"]);
    expect(result.memberships).toHaveLength(1);
    expect(result.removedPrograms.map((p) => p.id)).toEqual(["prog-old"]);
    expect(result.removedMembershipCount).toBe(2);
  });

  it("ユーザー編集済み program は tombstone があっても保護される", () => {
    const edited = prog("prog-old", {
      userModifiedAt: "2026-06-01T00:00:00.000Z",
    });
    const result = mergeSeed(
      { ...empty, programs: [edited], memberships: [mem("prog-old", "s1")] },
      { ...empty },
      { removedProgramIds: ["prog-old"] },
    );
    expect(result.programs).toHaveLength(1);
    expect(result.memberships).toHaveLength(1);
    expect(result.removedPrograms).toHaveLength(0);
  });

  it("該当なし (既に削除済み端末) なら no-op + 参照維持", () => {
    const programs = [prog("prog-keep")];
    const memberships = [mem("prog-keep", "s1")];
    const result = mergeSeed(
      { ...empty, programs, memberships },
      { ...empty, programs: [prog("prog-keep")], memberships: [mem("prog-keep", "s1")] },
      { removedProgramIds: ["prog-gone-long-ago"] },
    );
    expect(result.programs).toBe(programs);
    expect(result.memberships).toBe(memberships);
    expect(result.removedPrograms).toHaveLength(0);
    expect(result.removedMembershipCount).toBe(0);
  });

  it("opts 省略時は従来挙動 (削除なし)", () => {
    const result = mergeSeed(
      { ...empty, programs: [prog("prog-a")] },
      { ...empty },
    );
    expect(result.programs).toHaveLength(1);
    expect(result.removedPrograms).toHaveLength(0);
  });
});

describe("mergeSeed — membership の id ベース add-only merge (v6)", () => {
  it("seed にだけある id の membership が追加される", () => {
    const result = mergeSeed(
      { ...empty, memberships: [mem("prog-a", "s1")] },
      { ...empty, memberships: [mem("prog-a", "s1"), mem("prog-a", "s2")] },
    );
    expect(result.memberships?.map((m) => m.id)).toEqual([
      membershipId("prog-a", "s1"),
      membershipId("prog-a", "s2"),
    ]);
    expect(result.diff.memberships?.map((m) => m.id)).toEqual([
      membershipId("prog-a", "s2"),
    ]);
  });

  it("既存 id (ユーザー編集済み overrideRate) は seed 側で上書きされず保護される", () => {
    // add-only merge のため、同 id が seed にあっても current の内容 (userModifiedAt +
    // 編集済み overrideRate) が構造的に維持される。
    const edited = mem("prog-a", "s1", {
      overrideRate: 0.1,
      userModifiedAt: "2026-06-01T00:00:00.000Z",
    });
    const result = mergeSeed(
      { ...empty, memberships: [edited] },
      { ...empty, memberships: [mem("prog-a", "s1", { overrideRate: 0.03 })] },
    );
    expect(result.memberships).toHaveLength(1);
    expect(result.memberships?.[0].overrideRate).toBe(0.1);
    expect(result.memberships?.[0].userModifiedAt).toBe(
      "2026-06-01T00:00:00.000Z",
    );
    expect(result.diff.memberships).toHaveLength(0);
  });
});

describe("mergeSeed — removedMembershipIds (#103 対応)", () => {
  it("該当 id 完全一致の membership が除去される", () => {
    const current = {
      ...empty,
      memberships: [
        mem("prog-jcb-jpoint-20x", "general"),
        mem("prog-jcb-jpoint-20x", "starbucks"),
      ],
    };
    const result = mergeSeed(current, { ...empty }, {
      removedMembershipIds: [membershipId("prog-jcb-jpoint-20x", "general")],
    });
    expect(result.memberships).toEqual([
      mem("prog-jcb-jpoint-20x", "starbucks"),
    ]);
    expect(result.removedMembershipIdCount).toBe(1);
  });

  it("id 不一致の membership は残る", () => {
    const memberships = [mem("prog-a", "store-a"), mem("prog-b", "store-b")];
    const result = mergeSeed(
      { ...empty, memberships },
      { ...empty },
      { removedMembershipIds: [membershipId("prog-x", "store-x")] },
    );
    expect(result.memberships).toBe(memberships);
    expect(result.removedMembershipIdCount).toBe(0);
  });
});

describe("changeCount", () => {
  it("追加 + 更新 + 削除を合算する", () => {
    const result = mergeSeed(
      {
        ...empty,
        programs: [prog("prog-upd", { rate: 0.05 }), prog("prog-del")],
      },
      {
        ...empty,
        programs: [prog("prog-upd", { rate: 0.07 }), prog("prog-new")],
      },
      { removedProgramIds: ["prog-del"] },
    );
    // 追加 1 (prog-new) + 更新 1 (prog-upd) + 削除 1 (prog-del)
    expect(diffCount(result.diff)).toBe(1);
    expect(result.updatedPrograms).toHaveLength(1);
    expect(result.removedPrograms).toHaveLength(1);
    expect(changeCount(result)).toBe(3);
  });
});

describe("diffCount", () => {
  it("各カテゴリの追加件数を合算する", () => {
    const diff = {
      cards: [card("a", "A")],
      currencies: [cur("c1"), cur("c2")],
      stores: [],
      edges: [],
      pointCards: [],
      paymentApps: [],
    };
    expect(diffCount(diff)).toBe(3);
  });

  it("空 diff は 0", () => {
    expect(
      diffCount({
        cards: [],
        currencies: [],
        stores: [],
        edges: [],
        pointCards: [],
        paymentApps: [],
      }),
    ).toBe(0);
  });
});
