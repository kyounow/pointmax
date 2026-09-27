import { describe, it, expect, vi, afterEach } from "vitest";
import {
  bucketProposals,
  buildSeedAdditionsContent,
  emitObjectLiteral,
  mergeOverrides,
  mergeRemovals,
  mergeWithExisting,
  pruneRemovedFromBuckets,
} from "./apply-proposals";
import type { Proposal } from "./types";
import { membershipId } from "../../src/state/defineMemberships";

const mkAdd = (collection: Proposal["collection"], record: Record<string, unknown>): Proposal => ({
  type: "addRecord",
  collection,
  record,
  sourceId: "test",
  confidence: 0.95,
  evidence: { evidenceQuote: "x", explicitness: 0.95, ambiguity: 0.05 },
});

describe("bucketProposals", () => {
  it("各 collection ごとに addRecord を仕分け", () => {
    const ps: Proposal[] = [
      mkAdd("stores", { id: "s1", name: "S1" }),
      mkAdd("stores", { id: "s2", name: "S2" }),
      mkAdd("memberships", { programId: "prog-x", storeId: "s" }),
    ];
    const { buckets, skipped } = bucketProposals(ps);
    expect(buckets.stores).toHaveLength(2);
    expect(buckets.memberships).toHaveLength(1);
    expect(buckets.cards).toHaveLength(0);
    expect(skipped).toEqual([]);
  });

  it("addRecord 以外は skipped に集計", () => {
    const ps: Proposal[] = [
      mkAdd("stores", { id: "s1" }),
      {
        type: "updateField",
        collection: "cards",
        id: "c1",
        field: "defaultRate",
        from: 0.01,
        to: 0.02,
        sourceId: "x",
        confidence: 0.95,
        evidence: { evidenceQuote: "x", explicitness: 1, ambiguity: 0 },
      },
      {
        type: "referenceChange",
        collection: "cards",
        id: "c2",
        field: "defaultCurrencyId",
        from: "a",
        to: "b",
        sourceId: "x",
        confidence: 0.95,
        evidence: { evidenceQuote: "x", explicitness: 1, ambiguity: 0 },
        reviewReason: "referenceChange",
      },
    ];
    const { buckets, skipped } = bucketProposals(ps);
    expect(buckets.stores).toHaveLength(1);
    expect(skipped).toEqual(
      expect.arrayContaining([
        { type: "updateField", collection: "cards", count: 1 },
        { type: "referenceChange", collection: "cards", count: 1 },
      ]),
    );
  });
});

describe("mergeWithExisting", () => {
  it("新規 id を追加、重複は skip", () => {
    const existing = [{ id: "a" }, { id: "b" }];
    const newOnes = [{ id: "b", name: "dup" }, { id: "c", name: "new" }];
    const { merged, added, skipped } = mergeWithExisting(existing, newOnes);
    expect(merged).toEqual([{ id: "a" }, { id: "b" }, { id: "c", name: "new" }]);
    expect(added).toBe(1);
    expect(skipped).toBe(1);
  });

  it("同じ run 内での id 重複も skip", () => {
    const existing: { id: string }[] = [];
    const newOnes = [{ id: "x" }, { id: "x" }, { id: "y" }];
    const { merged, added, skipped } = mergeWithExisting(existing, newOnes);
    expect(merged.map((r) => r.id)).toEqual(["x", "y"]);
    expect(added).toBe(2);
    expect(skipped).toBe(1);
  });

  it("既存が空配列でも動く", () => {
    const { merged, added } = mergeWithExisting([], [{ id: "a" }]);
    expect(merged).toEqual([{ id: "a" }]);
    expect(added).toBe(1);
  });
});

describe("emitObjectLiteral", () => {
  it("文字列値を JSON でエスケープ", () => {
    expect(emitObjectLiteral({ id: "x", name: "hello" })).toBe(
      '{ id: "x", name: "hello" }',
    );
  });

  it("undefined と null は省略", () => {
    expect(emitObjectLiteral({ id: "x", name: "y", category: undefined, foo: null })).toBe(
      '{ id: "x", name: "y" }',
    );
  });

  it("数値・boolean・配列もそのまま", () => {
    expect(emitObjectLiteral({ id: "x", rate: 0.07, active: true, tags: ["a", "b"] })).toBe(
      '{ id: "x", rate: 0.07, active: true, tags: ["a","b"] }',
    );
  });

  it("特殊なキー名は quote される", () => {
    expect(emitObjectLiteral({ "with space": 1, "valid_key": 2 })).toBe(
      '{ "with space": 1, valid_key: 2 }',
    );
  });

  it("空オブジェクトは {}", () => {
    expect(emitObjectLiteral({ a: undefined })).toBe("{}");
  });
});

describe("buildSeedAdditionsContent", () => {
  it("空配列なら ADDED_STORES: Store[] = []; を出力", () => {
    const out = buildSeedAdditionsContent({
      stores: [],
      cards: [],
      paymentApps: [],
      programs: [],
      memberships: [],
      programOverrides: [],
      removedProgramIds: [],
    });
    expect(out).toContain("export const ADDED_STORES: Store[] = [];");
    expect(out).toContain("export const ADDED_PAYMENT_APPS: PaymentApp[] = [];");
    expect(out).toContain("export const ADDED_PROGRAMS: BenefitProgram[] = [];");
    expect(out).toContain("export const ADDED_MEMBERSHIPS: StoreProgramMembership[] = [];");
    expect(out).toContain("export const PROGRAM_OVERRIDES: ProgramOverride[] = [];");
    expect(out).toContain("export const REMOVED_PROGRAM_IDS: string[] = [];");
    expect(out).toContain('import type { ProgramOverride } from "./seed-overrides";');
    expect(out).toContain("AUTO-GENERATED");
  });

  it("配列の要素は object literal として出力", () => {
    const out = buildSeedAdditionsContent({
      stores: [{ id: "kura-sushi", name: "くら寿司", category: "飲食" }],
      cards: [],
      paymentApps: [],
      programs: [],
      memberships: [],
      programOverrides: [{ id: "prog-a", validTo: "2026-07-31" }],
      removedProgramIds: ["prog-old-campaign"],
    });
    expect(out).toContain(
      'export const ADDED_STORES: Store[] = [\n  { id: "kura-sushi", name: "くら寿司", category: "飲食" },\n];',
    );
    expect(out).toContain(
      'export const PROGRAM_OVERRIDES: ProgramOverride[] = [\n  { id: "prog-a", validTo: "2026-07-31" },\n];',
    );
    expect(out).toContain(
      'export const REMOVED_PROGRAM_IDS: string[] = [\n  "prog-old-campaign",\n];',
    );
  });

  // PR-0a-2a: propose が epos-tamaru 由来の新規 program に付けた channel は、
  // codegen (emitObjectLiteral) で落とされず ADDED_PROGRAMS に出力される。
  it("channel 付きの program record は channel: \"online\" として出力される", () => {
    const out = buildSeedAdditionsContent({
      stores: [],
      cards: [],
      paymentApps: [],
      programs: [
        {
          id: "prog-epos-tamaru-5x",
          name: "たまるマーケット (5倍)",
          scope: "member-stores",
          rate: 0.025,
          currencyId: "epos",
          channel: "online",
        },
      ],
      memberships: [],
      programOverrides: [],
      removedProgramIds: [],
    });
    expect(out).toContain(
      'export const ADDED_PROGRAMS: BenefitProgram[] = [\n  { id: "prog-epos-tamaru-5x", name: "たまるマーケット (5倍)", scope: "member-stores", rate: 0.025, currencyId: "epos", channel: "online" },\n];',
    );
  });
});

// ─── Phase 4 (B-1): updateField/programs → PROGRAM_OVERRIDES 経路 ───

const mkUpdate = (
  collection: Proposal["collection"],
  id: string,
  field: string,
  from: unknown,
  to: unknown,
): Proposal => ({
  type: "updateField",
  collection,
  id,
  field,
  from,
  to,
  sourceId: "test",
  confidence: 0.95,
  evidence: { evidenceQuote: "x", explicitness: 0.95, ambiguity: 0.05 },
});

describe("bucketProposals — programOverrides", () => {
  it("updateField/programs の rate/validFrom/validTo は programOverrides に入る (skip しない)", () => {
    const ps: Proposal[] = [
      mkUpdate("programs", "prog-a", "rate", 0.05, 0.07),
      mkUpdate("programs", "prog-a", "validTo", "2026-06-30", "2026-07-31"),
      mkUpdate("programs", "prog-b", "validFrom", "2026-06-01", "2026-07-01"),
    ];
    const { buckets, skipped } = bucketProposals(ps);
    expect(buckets.programOverrides).toEqual([
      { id: "prog-a", rate: 0.07 },
      { id: "prog-a", validTo: "2026-07-31" },
      { id: "prog-b", validFrom: "2026-07-01" },
    ]);
    expect(skipped).toEqual([]);
  });

  it("programs 以外の updateField / 対象外フィールドは従来どおり skip", () => {
    const ps: Proposal[] = [
      mkUpdate("cards", "c1", "defaultRate", 0.01, 0.02),
      mkUpdate("programs", "prog-a", "name", "旧名", "新名"),
    ];
    const { buckets, skipped } = bucketProposals(ps);
    expect(buckets.programOverrides).toEqual([]);
    expect(skipped).toEqual(
      expect.arrayContaining([
        { type: "updateField", collection: "cards", count: 1 },
        { type: "updateField", collection: "programs", count: 1 },
      ]),
    );
  });
});

// ─── Phase 5 (B-3): delete/programs → REMOVED_PROGRAM_IDS (tombstone) 経路 ───

const mkDelete = (
  collection: Proposal["collection"],
  id: string,
): Proposal => ({
  type: "delete",
  collection,
  id,
  sourceId: "expired-cleanup",
  confidence: 1.0,
  evidence: { evidenceQuote: "validTo=2026-05-31 (30日前に終了)", explicitness: 1, ambiguity: 0 },
  reviewReason: "expiredCampaign",
});

describe("bucketProposals — removedProgramIds", () => {
  it("delete/programs は removedProgramIds に入る (skip しない)", () => {
    const { buckets, skipped } = bucketProposals([
      mkDelete("programs", "prog-old-1"),
      mkDelete("programs", "prog-old-2"),
    ]);
    expect(buckets.removedProgramIds).toEqual(["prog-old-1", "prog-old-2"]);
    expect(skipped).toEqual([]);
  });

  it("programs 以外の delete は従来どおり skip", () => {
    const { buckets, skipped } = bucketProposals([mkDelete("stores", "store-x")]);
    expect(buckets.removedProgramIds).toEqual([]);
    expect(skipped).toEqual([
      { type: "delete", collection: "stores", count: 1 },
    ]);
  });
});

describe("mergeRemovals", () => {
  it("union + 重複なし (冪等)", () => {
    const { merged, added } = mergeRemovals(
      ["prog-a"],
      ["prog-a", "prog-b", "prog-b"],
    );
    expect(merged).toEqual(["prog-a", "prog-b"]);
    expect(added).toBe(1);
  });
});

describe("pruneRemovedFromBuckets", () => {
  const base = {
    stores: [],
    cards: [],
    paymentApps: [],
    programs: [
      { id: "prog-old", name: "旧" },
      { id: "prog-keep", name: "維持" },
    ] as Record<string, unknown>[],
    memberships: [
      { programId: "prog-old", storeId: "s1" },
      { programId: "prog-keep", storeId: "s1" },
    ] as Record<string, unknown>[],
    programOverrides: [
      { id: "prog-old", validTo: "2026-05-31" },
      { id: "prog-keep", rate: 0.07 },
    ],
    removedProgramIds: ["prog-old"],
  };

  it("tombstone 対象の program / memberships / override を生成物から落とす", () => {
    const pruned = pruneRemovedFromBuckets(base);
    expect(pruned.programs.map((p) => p.id)).toEqual(["prog-keep"]);
    expect(pruned.memberships.map((m) => m.programId)).toEqual(["prog-keep"]);
    expect(pruned.programOverrides.map((o) => o.id)).toEqual(["prog-keep"]);
    expect(pruned.removedProgramIds).toEqual(["prog-old"]); // tombstone 自体は維持
  });

  it("removedProgramIds が空で membership tombstone も無ければ同一参照を返す", () => {
    const noRemovals = { ...base, removedProgramIds: [] };
    expect(pruneRemovedFromBuckets(noRemovals)).toBe(noRemovals);
  });

  // PR-0a-2c: 手書き membership tombstone (REMOVED_MEMBERSHIP_IDS) の ADDED 行も物理削除する。
  describe("membership tombstone (PR-0a-2c)", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    const takashimayaGold2x = membershipId("prog-jcb-jpoint-gold-2x", "takashimaya");
    const withAdded = {
      ...base,
      removedProgramIds: [] as string[],
      memberships: [
        // 既存 ADDED 行 (id 付き) と新規提案 (id 無し) の両方の形
        {
          id: takashimayaGold2x,
          programId: "prog-jcb-jpoint-gold-2x",
          storeId: "takashimaya",
        },
        { programId: "prog-jcb-jpoint-gold-4x", storeId: "takashimaya" },
        { programId: "prog-epos-tamaru-4x", storeId: "muji" },
      ] as Record<string, unknown>[],
    };
    const tomb = new Set([
      takashimayaGold2x,
      membershipId("prog-epos-tamaru-4x", "muji"),
    ]);

    it("removedProgramIds が空でも tombstone 済み membership を落とし、件数をログに出す", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const pruned = pruneRemovedFromBuckets(withAdded, tomb);
      expect(pruned.memberships).toEqual([
        { programId: "prog-jcb-jpoint-gold-4x", storeId: "takashimaya" },
      ]);
      // program / override は触らない
      expect(pruned.programs).toEqual(withAdded.programs);
      expect(pruned.programOverrides).toEqual(withAdded.programOverrides);
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("🪦 membership tombstone: 2 件を ADDED_MEMBERSHIPS から除去"),
      );
    });

    it("program tombstone と membership tombstone を同時に適用できる", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const pruned = pruneRemovedFromBuckets(
        {
          ...withAdded,
          memberships: [...withAdded.memberships, ...base.memberships],
          removedProgramIds: ["prog-old"],
        },
        tomb,
      );
      expect(pruned.memberships.map((m) => `${m.programId}|${m.storeId}`)).toEqual([
        "prog-jcb-jpoint-gold-4x|takashimaya",
        "prog-keep|s1",
      ]);
      expect(pruned.programs.map((p) => p.id)).toEqual(["prog-keep"]);
    });

    it("既定は seed-blocklist の REMOVED_MEMBERSHIP_IDS: ADDED の m-prog-jcb-jpoint-gold-2x-takashimaya は prune 後に消える", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const pruned = pruneRemovedFromBuckets(withAdded);
      expect(pruned.memberships.map((m) => `${m.programId}|${m.storeId}`)).toEqual([
        "prog-jcb-jpoint-gold-4x|takashimaya",
      ]);
    });

    it("生成物 (seed-additions.ts の内容) に tombstone 済み membership id が出ない", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const content = buildSeedAdditionsContent(pruneRemovedFromBuckets(withAdded, tomb));
      expect(content).not.toContain(takashimayaGold2x);
      expect(content).not.toContain(membershipId("prog-epos-tamaru-4x", "muji"));
      expect(content).toContain(membershipId("prog-jcb-jpoint-gold-4x", "takashimaya"));
    });
  });
});

describe("mergeOverrides", () => {
  it("新規 id は追加、同 id はフィールド単位で後勝ちマージ", () => {
    const { merged, added, updated } = mergeOverrides(
      [{ id: "prog-a", rate: 0.05 }],
      [
        { id: "prog-a", validTo: "2026-07-31" },
        { id: "prog-b", rate: 0.02 },
      ],
    );
    expect(merged).toEqual([
      { id: "prog-a", rate: 0.05, validTo: "2026-07-31" },
      { id: "prog-b", rate: 0.02 },
    ]);
    expect(added).toBe(1);
    expect(updated).toBe(1);
  });

  it("同 id の同フィールドは新しい値が勝つ (キャンペーン再延長等)", () => {
    const { merged } = mergeOverrides(
      [{ id: "prog-a", validTo: "2026-07-31" }],
      [{ id: "prog-a", validTo: "2026-08-31" }],
    );
    expect(merged).toEqual([{ id: "prog-a", validTo: "2026-08-31" }]);
  });

  it("既存内の同 id 重複も先に畳んでからマージ", () => {
    const { merged } = mergeOverrides(
      [
        { id: "prog-a", rate: 0.05 },
        { id: "prog-a", validTo: "2026-07-31" },
      ],
      [],
    );
    expect(merged).toEqual([{ id: "prog-a", rate: 0.05, validTo: "2026-07-31" }]);
  });
});
