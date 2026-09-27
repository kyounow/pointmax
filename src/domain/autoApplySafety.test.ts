import { describe, it, expect } from "vitest";
import { isAutoApplySafe, type AutoApplySafetyDiff } from "./autoApplySafety";
import { mergeSeed } from "./mergeSeed";
import type { BenefitProgram, Store, StoreProgramMembership } from "./types";

// 追加/更新のみで削除も scope 変更も無い基本形 (= 安全)。
const safeDiff: AutoApplySafetyDiff = {
  removedPrograms: [],
  removedMembershipCount: 0,
  removedMembershipIdCount: 0,
  scopeChangedUpdateIds: [],
  channelChangedUpdateIds: [],
};

describe("isAutoApplySafe", () => {
  it("追加・非破壊更新のみ + 版 bump 無し → 安全 (true)", () => {
    expect(isAutoApplySafe(safeDiff, { seedVersionBumped: false })).toBe(true);
  });

  it("SEED_VERSION の bump を伴う週 → unsafe (false)", () => {
    expect(isAutoApplySafe(safeDiff, { seedVersionBumped: true })).toBe(false);
  });

  it("program 削除 (tombstone) を含む週 → unsafe", () => {
    expect(
      isAutoApplySafe(
        { ...safeDiff, removedPrograms: [{ id: "prog-x" } as BenefitProgram] },
        { seedVersionBumped: false },
      ),
    ).toBe(false);
  });

  it("membership の cascade 削除を含む週 → unsafe", () => {
    expect(
      isAutoApplySafe(
        { ...safeDiff, removedMembershipCount: 1 },
        { seedVersionBumped: false },
      ),
    ).toBe(false);
  });

  it("membership の単体 tombstone 削除を含む週 → unsafe", () => {
    expect(
      isAutoApplySafe(
        { ...safeDiff, removedMembershipIdCount: 1 },
        { seedVersionBumped: false },
      ),
    ).toBe(false);
  });

  it("scope 変更を含む更新の週 → unsafe", () => {
    expect(
      isAutoApplySafe(
        { ...safeDiff, scopeChangedUpdateIds: ["prog-scope"] },
        { seedVersionBumped: false },
      ),
    ).toBe(false);
  });

  it("PR-0a-2b: channel 変更を含む更新の週 → unsafe", () => {
    expect(
      isAutoApplySafe(
        { ...safeDiff, channelChangedUpdateIds: ["m-prog-a-s1"] },
        { seedVersionBumped: false },
      ),
    ).toBe(false);
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
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(true);
  });

  it("rate 改定 (scope 不変) の更新は安全", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-a", { rate: 0.05 })] },
      { ...empty, programs: [prog("prog-a", { rate: 0.07 })] },
    );
    expect(merged.updatedPrograms).toHaveLength(1);
    expect(merged.scopeChangedUpdateIds).toEqual([]);
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(true);
  });

  it("scope 変更を伴う更新は unsafe (mergeSeed が scopeChangedUpdateIds を立てる)", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-a", { scope: "member-stores" })] },
      { ...empty, programs: [prog("prog-a", { scope: "all-stores" })] },
    );
    expect(merged.updatedPrograms).toHaveLength(1);
    expect(merged.scopeChangedUpdateIds).toEqual(["prog-a"]);
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(false);
  });

  it("tombstone 削除を含む週は unsafe", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-old"), prog("prog-keep")] },
      { ...empty, programs: [prog("prog-keep")] },
      { removedProgramIds: ["prog-old"] },
    );
    expect(merged.removedPrograms).toHaveLength(1);
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(false);
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
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(true);
  });

  it("membership の channel 変更は unsafe (モーダルで確認)", () => {
    const merged = mergeSeed(
      { ...empty, memberships: [mem("s1")] },
      { ...empty, memberships: [mem("s1", { channel: "online" })] },
    );
    expect(merged.channelChangedUpdateIds).toEqual(["m-prog-a-s1"]);
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(false);
  });

  it("program の channel 変更も unsafe", () => {
    const merged = mergeSeed(
      { ...empty, programs: [prog("prog-a")] },
      { ...empty, programs: [prog("prog-a", { channel: "online" })] },
    );
    expect(merged.channelChangedUpdateIds).toEqual(["prog-a"]);
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(false);
  });

  it("membership 単体 tombstone は unsafe (現行どおり)", () => {
    const merged = mergeSeed(
      { ...empty, memberships: [mem("general")] },
      { ...empty },
      { removedMembershipIds: ["m-prog-a-general"] },
    );
    expect(merged.removedMemberships).toHaveLength(1);
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(false);
  });
});
