import { describe, it, expect } from "vitest";
import {
  mergeSeed,
  diffCount,
  changeCount,
  PROGRAM_META_KEYS,
  EDGE_META_KEYS,
  CARD_META_KEYS,
} from "./mergeSeed";
import { syncDigest } from "./syncDigest";
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

// ─── PR-5a: META キー (lastVerifiedAt / officialUrl) は公式差分の比較・通知の対象外 ───
describe("mergeSeed — META キー (lastVerifiedAt / officialUrl) の除外 (PR-5a)", () => {
  it("PROGRAM_META_KEYS / EDGE_META_KEYS / CARD_META_KEYS の中身を固定する", () => {
    expect([...PROGRAM_META_KEYS]).toEqual(["lastVerifiedAt", "officialUrl"]);
    expect([...EDGE_META_KEYS]).toEqual(["lastVerifiedAt"]);
    expect([...CARD_META_KEYS]).toEqual(["lastVerifiedAt"]);
  });

  it("card の lastVerifiedAt だけが異なっても (defaultRate 同じ) 更新扱いにならない", () => {
    const cards: Card[] = [{ ...card("a", "A"), lastVerifiedAt: "2026-04" }];
    const result = mergeSeed(
      { ...empty, cards },
      { ...empty, cards: [{ ...card("a", "A"), lastVerifiedAt: "2026-10" }] },
    );
    expect(result.cards).toBe(cards);
    expect(result.cards[0].lastVerifiedAt).toBe("2026-04");
    expect(changeCount(result)).toBe(0);
  });

  it("meta だけが異なる program: 更新扱いせず、配列参照も changeCount も syncDigest も変わらない", () => {
    const programs = [
      prog("prog-a", { lastVerifiedAt: "2026-04", officialUrl: "https://old.example/a" }),
      prog("prog-b"), // local は未記入
    ];
    const result = mergeSeed(
      { ...empty, programs },
      {
        ...empty,
        programs: [
          prog("prog-a", { lastVerifiedAt: "2026-07", officialUrl: "https://new.example/a" }),
          prog("prog-b", { lastVerifiedAt: "2026-07" }),
        ],
      },
    );
    expect(result.updatedPrograms).toEqual([]);
    expect(result.scopeChangedUpdateIds).toEqual([]);
    expect(result.channelChangedUpdateIds).toEqual([]);
    expect(result.programs).toBe(programs); // no-op の参照維持
    expect(changeCount(result)).toBe(0);
    expect(
      syncDigest(result.diff, {
        updatedPrograms: result.updatedPrograms,
        removedPrograms: result.removedPrograms,
        updatedMemberships: result.updatedMemberships,
        removedMemberships: result.removedMemberships,
      }),
    ).toBe("");
  });

  it("rate と lastVerifiedAt が両方異なる: 更新として届き、置換後は official の meta を持つ", () => {
    const result = mergeSeed(
      {
        ...empty,
        programs: [
          prog("prog-a", { rate: 0.05, lastVerifiedAt: "2026-04", officialUrl: "https://old.example/a" }),
        ],
      },
      {
        ...empty,
        programs: [
          prog("prog-a", { rate: 0.07, lastVerifiedAt: "2026-07", officialUrl: "https://new.example/a" }),
        ],
      },
    );
    expect(result.updatedPrograms).toHaveLength(1);
    const merged = result.programs?.find((p) => p.id === "prog-a");
    expect(merged?.rate).toBe(0.07);
    expect(merged?.lastVerifiedAt).toBe("2026-07");
    expect(merged?.officialUrl).toBe("https://new.example/a");
    expect(changeCount(result)).toBe(1);
  });

  it("meta の差分 + ローカルが enabled:true: 更新扱いせず enabled も保持 (preference 保護の回帰)", () => {
    const local = prog("prog-optin", { optIn: true, enabled: true, lastVerifiedAt: "2026-04" });
    const result = mergeSeed(
      { ...empty, programs: [local] },
      { ...empty, programs: [prog("prog-optin", { optIn: true, lastVerifiedAt: "2026-07" })] },
    );
    expect(result.updatedPrograms).toHaveLength(0);
    expect(result.programs?.[0]).toBe(local);
    expect(result.programs?.[0].enabled).toBe(true);
  });

  it("rate 改定 + meta 差分 + ローカルが enabled:true: 更新は届き enabled は carry-over される", () => {
    const result = mergeSeed(
      {
        ...empty,
        programs: [prog("prog-optin", { optIn: true, enabled: true, rate: 0.01, lastVerifiedAt: "2026-04" })],
      },
      {
        ...empty,
        programs: [prog("prog-optin", { optIn: true, rate: 0.02, lastVerifiedAt: "2026-07" })],
      },
    );
    const merged = result.programs?.[0];
    expect(result.updatedPrograms).toHaveLength(1);
    expect(merged?.rate).toBe(0.02);
    expect(merged?.lastVerifiedAt).toBe("2026-07");
    expect(merged?.enabled).toBe(true);
  });

  it("edge の lastVerifiedAt だけが異なっても何も起きない (edge は add-only、更新として数えない)", () => {
    const edges: ConversionEdge[] = [
      { id: "e1", fromCurrencyId: "a", toCurrencyId: "b", rate: 1, lastVerifiedAt: "2026-04" },
    ];
    const result = mergeSeed(
      { ...empty, edges },
      {
        ...empty,
        edges: [{ id: "e1", fromCurrencyId: "a", toCurrencyId: "b", rate: 1, lastVerifiedAt: "2026-07" }],
      },
    );
    expect(result.edges).toBe(edges);
    expect(result.edges[0].lastVerifiedAt).toBe("2026-04");
    expect(changeCount(result)).toBe(0);
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
    // PR-0a-2b: 除去した行そのもの (digest / 削除グループ表示用)
    expect(result.removedMemberships).toEqual([
      mem("prog-jcb-jpoint-20x", "general"),
    ]);
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
    expect(result.removedMemberships).toEqual([]);
  });
});

// PR-0a-2b: 公式 membership の内容更新伝播 (propagateMembershipUpdates)。
describe("mergeSeed — 公式 membership の内容更新伝播 (PR-0a-2b)", () => {
  it("公式の notes 差分が未編集の既存 membership に伝播する", () => {
    const result = mergeSeed(
      { ...empty, memberships: [mem("prog-a", "s1")] },
      {
        ...empty,
        memberships: [mem("prog-a", "s1", { notes: "QUICPay は対象外" })],
      },
    );
    expect(result.memberships?.[0].notes).toBe("QUICPay は対象外");
    expect(result.updatedMemberships.map((m) => m.id)).toEqual([
      membershipId("prog-a", "s1"),
    ]);
    expect(result.diff.memberships).toHaveLength(0); // 追加ではなく更新
    expect(result.channelChangedUpdateIds).toEqual([]); // notes だけの更新
  });

  it("公式の channel / overrideRate の差分も伝播し、channel の変化は channelChangedUpdateIds に入る", () => {
    const result = mergeSeed(
      {
        ...empty,
        memberships: [mem("prog-a", "s1"), mem("prog-a", "s2")],
      },
      {
        ...empty,
        memberships: [
          mem("prog-a", "s1", { channel: "online" }),
          mem("prog-a", "s2", { overrideRate: 0.03 }),
        ],
      },
    );
    const byId = new Map(result.memberships?.map((m) => [m.id, m]));
    expect(byId.get(membershipId("prog-a", "s1"))?.channel).toBe("online");
    expect(byId.get(membershipId("prog-a", "s2"))?.overrideRate).toBe(0.03);
    expect(result.updatedMemberships).toHaveLength(2);
    expect(result.channelChangedUpdateIds).toEqual([membershipId("prog-a", "s1")]);
  });

  it("program の channel 変更も channelChangedUpdateIds に入る (program と membership の両方)", () => {
    const result = mergeSeed(
      {
        ...empty,
        programs: [prog("prog-a"), prog("prog-b")],
        memberships: [mem("prog-b", "s1")],
      },
      {
        ...empty,
        programs: [prog("prog-a", { channel: "online" }), prog("prog-b", { rate: 0.07 })],
        memberships: [mem("prog-b", "s1", { channel: "in-store" })],
      },
    );
    expect(result.updatedPrograms.map((p) => p.id).sort()).toEqual([
      "prog-a",
      "prog-b",
    ]);
    // rate だけ変わった prog-b は入らない (順序は program → membership)
    expect(result.channelChangedUpdateIds).toEqual([
      "prog-a",
      membershipId("prog-b", "s1"),
    ]);
  });

  it("ユーザー編集済み (userModifiedAt あり) の membership は保護される", () => {
    const edited = mem("prog-a", "s1", {
      notes: "自分用メモ",
      userModifiedAt: "2026-06-01T00:00:00.000Z",
    });
    const result = mergeSeed(
      { ...empty, memberships: [edited] },
      { ...empty, memberships: [mem("prog-a", "s1", { notes: "公式の注記" })] },
    );
    expect(result.memberships?.[0]).toBe(edited);
    expect(result.updatedMemberships).toEqual([]);
  });

  it("差分ゼロなら入力の参照をそのまま返す (キー順序違い・userModifiedAt 以外は同内容)", () => {
    const memberships = [
      { storeId: "s1", notes: "n", programId: "prog-a", id: membershipId("prog-a", "s1") },
    ] as StoreProgramMembership[];
    const result = mergeSeed(
      { ...empty, memberships },
      { ...empty, memberships: [mem("prog-a", "s1", { notes: "n" })] },
    );
    expect(result.memberships).toBe(memberships);
    expect(result.updatedMemberships).toEqual([]);
    expect(changeCount(result)).toBe(0);
  });

  it("UUID program (ユーザー作成) の membership は seed と id が衝突しないので不変", () => {
    const userMem = mem("3f2a-uuid-user-prog", "s1", { overrideRate: 0.02 });
    const result = mergeSeed(
      { ...empty, memberships: [userMem] },
      { ...empty, memberships: [mem("prog-a", "s1", { notes: "公式" })] },
    );
    expect(result.memberships?.find((m) => m.id === userMem.id)).toBe(userMem);
    expect(result.updatedMemberships).toEqual([]);
  });

  it("tombstone 対象は伝播の後で除去され、更新には数えない (削除として数える)", () => {
    const result = mergeSeed(
      { ...empty, memberships: [mem("prog-a", "s1"), mem("prog-a", "s2")] },
      {
        ...empty,
        memberships: [
          mem("prog-a", "s1", { notes: "更新あり" }),
          mem("prog-a", "s2", { notes: "更新あり", channel: "online" }),
        ],
      },
      { removedMembershipIds: [membershipId("prog-a", "s2")] },
    );
    expect(result.memberships?.map((m) => m.id)).toEqual([
      membershipId("prog-a", "s1"),
    ]);
    expect(result.updatedMemberships.map((m) => m.id)).toEqual([
      membershipId("prog-a", "s1"),
    ]);
    expect(result.removedMemberships.map((m) => m.id)).toEqual([
      membershipId("prog-a", "s2"),
    ]);
    expect(result.channelChangedUpdateIds).toEqual([]);
    expect(changeCount(result)).toBe(2); // 更新 1 + 削除 1
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

  it("PR-0a-2b: membership の内容更新と単体 tombstone 削除も数える", () => {
    const result = mergeSeed(
      {
        ...empty,
        memberships: [mem("prog-a", "s1"), mem("prog-jcb-jpoint-20x", "general")],
      },
      { ...empty, memberships: [mem("prog-a", "s1", { notes: "公式の注記" })] },
      { removedMembershipIds: [membershipId("prog-jcb-jpoint-20x", "general")] },
    );
    expect(diffCount(result.diff)).toBe(0);
    expect(result.updatedMemberships).toHaveLength(1);
    expect(result.removedMemberships).toHaveLength(1);
    expect(changeCount(result)).toBe(2);
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
