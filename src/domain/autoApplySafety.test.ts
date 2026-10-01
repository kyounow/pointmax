import { describe, it, expect } from "vitest";
import {
  isAutoApplySafe,
  isExpiredRemoval,
  planAutoApply,
  type AutoApplySafetyDiff,
} from "./autoApplySafety";
import { mergeSeed, changeCount } from "./mergeSeed";
import type { BenefitProgram, Store, StoreProgramMembership } from "./types";
import { membershipId } from "../state/defineMemberships";

// 期限切れ判定の基準時刻 (2026-09-20 12:00 ローカル) を固定する (実時刻に依存させない)。
const NOW = new Date(2026, 8, 20, 12);
const OPTS = { seedVersionBumped: false, now: NOW };

// 追加/更新のみで削除も scope 変更も無い基本形 (= 安全)。
const safeDiff: AutoApplySafetyDiff = {
  removedPrograms: [],
  removedMembershipCount: 0,
  removedMembershipIdCount: 0,
  scopeChangedUpdateIds: [],
  channelChangedUpdateIds: [],
};

const removed = (
  id: string,
  over: Partial<BenefitProgram> = {},
): BenefitProgram => ({ id, ...over }) as BenefitProgram;
const EXPIRED = removed("prog-old", { validFrom: "2026-07-01", validTo: "2026-08-31" });
const FUTURE = removed("prog-future", { validFrom: "2026-09-01", validTo: "2026-10-31" });

describe("isAutoApplySafe", () => {
  it("追加・非破壊更新のみ + 版 bump 無し → 安全 (true)", () => {
    expect(isAutoApplySafe(safeDiff, OPTS)).toBe(true);
  });

  it("SEED_VERSION の bump を伴う週 → unsafe (false)", () => {
    expect(isAutoApplySafe(safeDiff, { ...OPTS, seedVersionBumped: true })).toBe(false);
  });

  it("program 削除 (tombstone、validTo 無し) を含む週 → unsafe", () => {
    expect(
      isAutoApplySafe({ ...safeDiff, removedPrograms: [removed("prog-x")] }, OPTS),
    ).toBe(false);
  });

  it("membership の cascade 削除を含む週 → unsafe", () => {
    expect(isAutoApplySafe({ ...safeDiff, removedMembershipCount: 1 }, OPTS)).toBe(false);
  });

  it("membership の単体 tombstone 削除を含む週 → unsafe", () => {
    expect(isAutoApplySafe({ ...safeDiff, removedMembershipIdCount: 1 }, OPTS)).toBe(false);
  });

  it("scope 変更を含む更新の週 → unsafe", () => {
    expect(
      isAutoApplySafe({ ...safeDiff, scopeChangedUpdateIds: ["prog-scope"] }, OPTS),
    ).toBe(false);
  });

  it("PR-0a-2b: channel 変更を含む更新の週 → unsafe", () => {
    expect(
      isAutoApplySafe({ ...safeDiff, channelChangedUpdateIds: ["m-prog-a-s1"] }, OPTS),
    ).toBe(false);
  });
});

// ─── PR-6a-2 (U1): 期限切れ campaign の整理は安全側 ───
describe("isAutoApplySafe — 期限切れ整理 (PR-6a-2)", () => {
  it("全て期限切れの removedPrograms + その cascade membership → 安全", () => {
    expect(
      isAutoApplySafe(
        {
          ...safeDiff,
          removedPrograms: [EXPIRED, removed("prog-old-2", { validTo: "2026-09-01" })],
          removedMembershipCount: 3,
        },
        OPTS,
      ),
    ).toBe(true);
  });

  it("期限切れ 1 件 + validTo が未来の 1 件 → unsafe", () => {
    expect(
      isAutoApplySafe({ ...safeDiff, removedPrograms: [EXPIRED, FUTURE] }, OPTS),
    ).toBe(false);
  });

  it("validTo 無しの削除 (手動 tombstone) → unsafe", () => {
    expect(
      isAutoApplySafe({ ...safeDiff, removedPrograms: [removed("prog-manual")] }, OPTS),
    ).toBe(false);
  });

  it("境界: validTo 当日 (2026-09-20) は unsafe、前日 (2026-09-19) は安全", () => {
    const on = removed("prog-on", { validTo: "2026-09-20" });
    const before = removed("prog-before", { validTo: "2026-09-19" });
    expect(isExpiredRemoval(on, NOW)).toBe(false);
    expect(isAutoApplySafe({ ...safeDiff, removedPrograms: [on] }, OPTS)).toBe(false);
    expect(isExpiredRemoval(before, NOW)).toBe(true);
    expect(isAutoApplySafe({ ...safeDiff, removedPrograms: [before] }, OPTS)).toBe(true);
  });

  it("期限切れだけでも単体 membership tombstone を含めば unsafe", () => {
    expect(
      isAutoApplySafe(
        { ...safeDiff, removedPrograms: [EXPIRED], removedMembershipIdCount: 1 },
        OPTS,
      ),
    ).toBe(false);
  });

  it("期限切れだけでも SEED_VERSION の bump を伴えば unsafe", () => {
    expect(
      isAutoApplySafe(
        { ...safeDiff, removedPrograms: [EXPIRED] },
        { ...OPTS, seedVersionBumped: true },
      ),
    ).toBe(false);
  });

  it("期限切れだけでも channel 変更 (PR-0a-2b) を含めば unsafe", () => {
    expect(
      isAutoApplySafe(
        { ...safeDiff, removedPrograms: [EXPIRED], channelChangedUpdateIds: ["prog-a"] },
        OPTS,
      ),
    ).toBe(false);
  });

  it("removedPrograms が空で cascade だけ > 0 (不整合入力) は unsafe (every の空配列対策)", () => {
    expect(
      isAutoApplySafe({ ...safeDiff, removedPrograms: [], removedMembershipCount: 2 }, OPTS),
    ).toBe(false);
  });

  it("validFrom だけ (ongoing) / 日付不正の削除は unsafe", () => {
    const ongoing = removed("prog-ongoing", { validFrom: "2026-01-01" });
    const broken = removed("prog-broken", { validTo: "2026/08/31" });
    expect(isExpiredRemoval(ongoing, NOW)).toBe(false);
    expect(isExpiredRemoval(broken, NOW)).toBe(false);
    expect(isAutoApplySafe({ ...safeDiff, removedPrograms: [ongoing] }, OPTS)).toBe(false);
    expect(isAutoApplySafe({ ...safeDiff, removedPrograms: [broken] }, OPTS)).toBe(false);
  });
});

describe("planAutoApply (PR-6a-2)", () => {
  it("期限切れ整理だけ → silent", () => {
    expect(
      planAutoApply(
        { ...safeDiff, removedPrograms: [EXPIRED], removedMembershipCount: 1 },
        1,
        OPTS,
      ),
    ).toEqual({ kind: "silent", expiredRemovedCount: 1 });
  });

  it("期限切れ 1 + 追加 1 → notice (changeCount 1, expired 1)", () => {
    expect(planAutoApply({ ...safeDiff, removedPrograms: [EXPIRED] }, 2, OPTS)).toEqual({
      kind: "notice",
      changeCount: 1,
      expiredRemovedCount: 1,
    });
  });

  it("追加のみ → notice (expired 0)", () => {
    expect(planAutoApply(safeDiff, 3, OPTS)).toEqual({
      kind: "notice",
      changeCount: 3,
      expiredRemovedCount: 0,
    });
  });

  it("unsafe な週 → unsafe", () => {
    expect(planAutoApply({ ...safeDiff, removedPrograms: [FUTURE] }, 1, OPTS)).toEqual({
      kind: "unsafe",
    });
    expect(planAutoApply(safeDiff, 1, { ...OPTS, seedVersionBumped: true })).toEqual({
      kind: "unsafe",
    });
  });
});

// ─── mergeSeed の実結果を通した結合 (scopeChangedUpdateIds の算出も検証) ───

const empty = {
  cards: [],
  currencies: [],
  stores: [] as Store[],
  edges: [],
  pointCards: [],
  paymentApps: [],
};

const prog = (
  id: string,
  over: Partial<BenefitProgram> = {},
): BenefitProgram => ({
  id,
  name: id,
  scope: "member-stores",
  rate: 0.05,
  currencyId: "d-pt",
  ...over,
});

describe("isAutoApplySafe × mergeSeed 結合", () => {
  it("追加のみの週 (新 program) は安全", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-a")] },
      { ...empty, programs: [prog("prog-a"), prog("prog-new")] },
    );
    expect(merged.diff.programs).toHaveLength(1);
    expect(isAutoApplySafe(merged, OPTS)).toBe(true);
  });

  it("rate 改定 (scope 不変) の更新は安全", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-a", { rate: 0.05 })] },
      { ...empty, programs: [prog("prog-a", { rate: 0.07 })] },
    );
    expect(merged.updatedPrograms).toHaveLength(1);
    expect(merged.scopeChangedUpdateIds).toEqual([]);
    expect(isAutoApplySafe(merged, OPTS)).toBe(true);
  });

  it("scope 変更を伴う更新は unsafe (mergeSeed が scopeChangedUpdateIds を立てる)", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-a", { scope: "member-stores" })] },
      { ...empty, programs: [prog("prog-a", { scope: "all-stores" })] },
    );
    expect(merged.updatedPrograms).toHaveLength(1);
    expect(merged.scopeChangedUpdateIds).toEqual(["prog-a"]);
    expect(isAutoApplySafe(merged, OPTS)).toBe(false);
  });

  it("tombstone 削除 (validTo 無し) を含む週は unsafe", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-old"), prog("prog-keep")] },
      { ...empty, programs: [prog("prog-keep")] },
      { removedProgramIds: ["prog-old"] },
    );
    expect(merged.removedPrograms).toHaveLength(1);
    expect(isAutoApplySafe(merged, OPTS)).toBe(false);
  });

  // ─── PR-0a-2b: membership の更新・削除 ───
  const mem = (
    storeId: string,
    over: Partial<StoreProgramMembership> = {},
  ): StoreProgramMembership => ({
    id: `m-prog-a-${storeId}`,
    programId: "prog-a",
    storeId,
    ...over,
  });

  it("membership の notes だけの更新は安全 (自動反映)", () => {
    const merged = mergeSeed(
      { ...empty, memberships: [mem("s1")] },
      { ...empty, memberships: [mem("s1", { notes: "QUICPay は対象外" })] },
    );
    expect(merged.updatedMemberships).toHaveLength(1);
    expect(merged.channelChangedUpdateIds).toEqual([]);
    expect(isAutoApplySafe(merged, OPTS)).toBe(true);
  });

  it("membership の channel 変更は unsafe (モーダルで確認)", () => {
    const merged = mergeSeed(
      { ...empty, memberships: [mem("s1")] },
      { ...empty, memberships: [mem("s1", { channel: "online" })] },
    );
    expect(merged.channelChangedUpdateIds).toEqual(["m-prog-a-s1"]);
    expect(isAutoApplySafe(merged, OPTS)).toBe(false);
  });

  it("program の channel 変更も unsafe", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-a")] },
      { ...empty, programs: [prog("prog-a", { channel: "online" })] },
    );
    expect(merged.channelChangedUpdateIds).toEqual(["prog-a"]);
    expect(isAutoApplySafe(merged, OPTS)).toBe(false);
  });

  it("membership 単体 tombstone は unsafe (現行どおり)", () => {
    const merged = mergeSeed(
      { ...empty, memberships: [mem("general")] },
      { ...empty },
      { removedMembershipIds: ["m-prog-a-general"] },
    );
    expect(merged.removedMemberships).toHaveLength(1);
    expect(isAutoApplySafe(merged, OPTS)).toBe(false);
  });
});

// ─── PR-6a-2: planAutoApply × mergeSeed × changeCount の結合 ───
// silent 判定は changeCount が全変更種 (PR-0a-2b の updatedMemberships / removedMemberships を含む)
// を数えている前提に立つ。変更種を足して changeCount に入れ忘れると、それだけの週が
// 「期限切れ整理のみ」と誤判定されて無告知で反映されるので、ここで固定する。
describe("planAutoApply × mergeSeed 結合 (PR-6a-2)", () => {
  const EXPIRED_ID = "prog-expired";
  const expiredProg = prog(EXPIRED_ID, { validFrom: "2026-07-01", validTo: "2026-08-31" });
  const cascade = ["s1", "s2"].map(
    (storeId): StoreProgramMembership => ({
      id: membershipId(EXPIRED_ID, storeId),
      programId: EXPIRED_ID,
      storeId,
    }),
  );
  const keptMem: StoreProgramMembership = {
    id: membershipId("prog-keep", "s1"),
    programId: "prog-keep",
    storeId: "s1",
  };
  const local = {
    ...empty,
    programs: [expiredProg, prog("prog-keep")],
    memberships: [...cascade, keptMem],
  };
  const officialBase = {
    ...empty,
    programs: [prog("prog-keep")],
    memberships: [keptMem],
  };
  const plan = (official: typeof officialBase) => {
    const merged = mergeSeed(local, official, { removedProgramIds: [EXPIRED_ID] });
    return { merged, plan: planAutoApply(merged, changeCount(merged), OPTS) };
  };

  it("期限切れ program の tombstone + cascade membership 2 件 → 安全かつ silent", () => {
    const { merged, plan: p } = plan(officialBase);
    expect(merged.removedPrograms.map((x) => x.id)).toEqual([EXPIRED_ID]);
    expect(merged.removedMembershipCount).toBe(2);
    expect(isAutoApplySafe(merged, OPTS)).toBe(true);
    expect(p).toEqual({ kind: "silent", expiredRemovedCount: 1 });
  });

  it("期限切れ 1 + membership notes 更新 1 (updatedMemberships) → notice(changeCount 1, expired 1)", () => {
    const { merged, plan: p } = plan({
      ...officialBase,
      memberships: [{ ...keptMem, notes: "税抜換算" }],
    });
    expect(merged.updatedMemberships).toHaveLength(1);
    expect(p).toEqual({ kind: "notice", changeCount: 1, expiredRemovedCount: 1 });
  });

  it("期限切れ 1 + program 追加 1 → notice(changeCount 1, expired 1)", () => {
    const { merged, plan: p } = plan({
      ...officialBase,
      programs: [...officialBase.programs, prog("prog-new")],
    });
    expect(merged.diff.programs).toHaveLength(1);
    expect(p).toEqual({ kind: "notice", changeCount: 1, expiredRemovedCount: 1 });
  });

  it("期限切れ 1 + program の rate 更新 1 (updatedPrograms) → notice", () => {
    const { plan: p } = plan({
      ...officialBase,
      programs: [prog("prog-keep", { rate: 0.07 })],
    });
    expect(p).toEqual({ kind: "notice", changeCount: 1, expiredRemovedCount: 1 });
  });

  it("期限切れ 1 + membership 単体 tombstone 1 (removedMemberships) → unsafe (silent にならない)", () => {
    const merged = mergeSeed(local, officialBase, {
      removedProgramIds: [EXPIRED_ID],
      removedMembershipIds: [keptMem.id],
    });
    expect(merged.removedMemberships).toHaveLength(1);
    expect(planAutoApply(merged, changeCount(merged), OPTS)).toEqual({ kind: "unsafe" });
  });
});
