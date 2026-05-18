import { describe, it, expect } from "vitest";
import { syncDigest, buildSyncGroups } from "./syncDigest";
import type { Diff } from "./mergeSeed";

const emptyDiff = (): Diff => ({
  cards: [],
  currencies: [],
  stores: [],
  edges: [],
  pointCards: [],
  loyaltyRules: [],
  paymentApps: [],
  programs: [],
  memberships: [],
});

describe("syncDigest", () => {
  it("空差分は空文字 (= 通知しない印)", () => {
    expect(syncDigest(emptyDiff())).toBe("");
  });

  it("同一集合は順序が違っても同じ digest", () => {
    const a: Diff = {
      ...emptyDiff(),
      memberships: [
        { programId: "p1", storeId: "s1" },
        { programId: "p1", storeId: "s2" },
      ],
    };
    const b: Diff = {
      ...emptyDiff(),
      memberships: [
        { programId: "p1", storeId: "s2" },
        { programId: "p1", storeId: "s1" },
      ],
    };
    expect(syncDigest(a)).toBe(syncDigest(b));
    expect(syncDigest(a)).toMatch(/^2-/);
  });

  it("集合が変わると digest も変わる (次の cron バッチで再通知される)", () => {
    const before: Diff = {
      ...emptyDiff(),
      memberships: [{ programId: "p1", storeId: "s1" }],
    };
    const after: Diff = {
      ...emptyDiff(),
      memberships: [
        { programId: "p1", storeId: "s1" },
        { programId: "p1", storeId: "s2" },
      ],
    };
    expect(syncDigest(before)).not.toBe(syncDigest(after));
  });
});

describe("buildSyncGroups", () => {
  it("memberships を店舗名/プログラム名に解決して整形する", () => {
    const diff: Diff = {
      ...emptyDiff(),
      stores: [{ id: "bic-camera", name: "ビックカメラ", category: "家電量販店" }],
      memberships: [{ programId: "prog-ponta-card-0.5pc", storeId: "bic-camera" }],
    };
    const groups = buildSyncGroups(diff, {
      store: (id) => (id === "bic-camera" ? "ビックカメラ" : id),
      program: (id) =>
        id === "prog-ponta-card-0.5pc" ? "Pontaカード提示 0.5%" : id,
    });
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("店舗");
    expect(labels).toContain("提携店舗");
    const teikei = groups.find((g) => g.label === "提携店舗")!;
    expect(teikei.items).toEqual(["Pontaカード提示 0.5% → ビックカメラ"]);
  });

  it("空グループは出力しない", () => {
    expect(buildSyncGroups(emptyDiff(), { store: (s) => s, program: (p) => p })).toEqual(
      [],
    );
  });

  it("program は還元率付きで表示", () => {
    const diff: Diff = {
      ...emptyDiff(),
      programs: [
        {
          id: "prog-x",
          name: "楽天Pay 5%還元",
          rate: 0.05,
          currencyId: "rakuten-pt",
        },
      ],
    };
    const groups = buildSyncGroups(diff, { store: (s) => s, program: (p) => p });
    expect(groups[0].items[0]).toBe("楽天Pay 5%還元 (5.0%)");
  });
});
