import { describe, it, expect } from "vitest";
import { syncDigest, buildSyncGroups } from "./syncDigest";
import type { Diff } from "./mergeSeed";

const emptyDiff = (): Diff => ({
  cards: [],
  currencies: [],
  stores: [],
  edges: [],
  pointCards: [],
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
        { id: "m-p1-s1", programId: "p1", storeId: "s1" },
        { id: "m-p1-s2", programId: "p1", storeId: "s2" },
      ],
    };
    const b: Diff = {
      ...emptyDiff(),
      memberships: [
        { id: "m-p1-s2", programId: "p1", storeId: "s2" },
        { id: "m-p1-s1", programId: "p1", storeId: "s1" },
      ],
    };
    expect(syncDigest(a)).toBe(syncDigest(b));
    expect(syncDigest(a)).toMatch(/^2-/);
  });

  it("集合が変わると digest も変わる (次の cron バッチで再通知される)", () => {
    const before: Diff = {
      ...emptyDiff(),
      memberships: [{ id: "m-p1-s1", programId: "p1", storeId: "s1" }],
    };
    const after: Diff = {
      ...emptyDiff(),
      memberships: [
        { id: "m-p1-s1", programId: "p1", storeId: "s1" },
        { id: "m-p1-s2", programId: "p1", storeId: "s2" },
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
      memberships: [{ id: "m-prog-ponta-card-0.5pc-bic-camera", programId: "prog-ponta-card-0.5pc", storeId: "bic-camera" }],
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
          scope: "all-stores",
          rate: 0.05,
          currencyId: "rakuten-pt",
        },
      ],
    };
    const groups = buildSyncGroups(diff, { store: (s) => s, program: (p) => p });
    expect(groups[0].items[0]).toBe("楽天Pay 5%還元 (5.0%)");
  });
});

// ─── Phase 5: 更新/削除の extras ───

describe("syncDigest extras (Phase 5)", () => {
  const updated = {
    id: "prog-a",
    name: "Aキャンペーン",
    scope: "member-stores" as const,
    rate: 0.05,
    currencyId: "d-pt",
    validTo: "2026-07-31",
  };
  const removed = {
    id: "prog-old",
    name: "終了キャンペーン",
    scope: "member-stores" as const,
    rate: 0.03,
    currencyId: "d-pt",
  };

  it("追加 0 件でも更新/削除があれば非空 digest (通知される)", () => {
    expect(
      syncDigest(emptyDiff(), { updatedPrograms: [updated] }),
    ).not.toBe("");
    expect(
      syncDigest(emptyDiff(), { removedPrograms: [removed] }),
    ).not.toBe("");
  });

  it("同じ campaign の再延長 (validTo 変化) は別 digest (再通知される)", () => {
    const d1 = syncDigest(emptyDiff(), { updatedPrograms: [updated] });
    const d2 = syncDigest(emptyDiff(), {
      updatedPrograms: [{ ...updated, validTo: "2026-08-31" }],
    });
    expect(d1).not.toBe(d2);
  });

  it("buildSyncGroups が更新/削除グループを生成する", () => {
    const groups = buildSyncGroups(
      emptyDiff(),
      { store: (s) => s, program: (p) => p },
      { updatedPrograms: [updated], removedPrograms: [removed] },
    );
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("内容更新 (還元率・期間・条件)");
    expect(labels).toContain("終了・削除");
    expect(
      groups.find((g) => g.label === "内容更新 (還元率・期間・条件)")?.items[0],
    ).toBe("Aキャンペーン (5.0%、〜2026-07-31)");
    expect(groups.find((g) => g.label === "終了・削除")?.items[0]).toBe(
      "終了キャンペーン",
    );
  });

  // PR-0a-2b (GAPS P3): 以前の指紋は rate / validFrom / validTo だけで、channel / conditions /
  // notes だけの公式更新が既読 digest と同一になり自動反映されなかった。
  it.each([
    ["channel", { channel: "online" as const }],
    ["conditions", { conditions: "店ごとの登録が必須" }],
    ["notes", { notes: "QUICPay は対象外" }],
  ])("rate・期間が同じでも %s だけの更新は別 digest (内容ハッシュ)", (_label, over) => {
    const d1 = syncDigest(emptyDiff(), { updatedPrograms: [updated] });
    const d2 = syncDigest(emptyDiff(), {
      updatedPrograms: [{ ...updated, ...over }],
    });
    expect(d2).not.toBe("");
    expect(d1).not.toBe(d2);
  });

  it("同内容の更新はキー順序が違っても同じ digest (正規形のハッシュ)", () => {
    const reordered = {
      validTo: "2026-07-31",
      currencyId: "d-pt",
      rate: 0.05,
      scope: "member-stores" as const,
      name: "Aキャンペーン",
      id: "prog-a",
    };
    expect(syncDigest(emptyDiff(), { updatedPrograms: [reordered] })).toBe(
      syncDigest(emptyDiff(), { updatedPrograms: [updated] }),
    );
  });
});

// ─── PR-0a-2b: membership の更新 (memU) / 単体 tombstone 削除 (memD) ───

describe("syncDigest / buildSyncGroups — membership extras (PR-0a-2b)", () => {
  const mUpd = {
    id: "m-prog-j20-sukiya",
    programId: "prog-j20",
    storeId: "sukiya",
    notes: "QUICPay は対象外",
  };
  const mDel = {
    id: "m-prog-j20-general",
    programId: "prog-j20",
    storeId: "general",
  };

  it("membership の更新 / 削除だけでも非空 digest (通知・自動反映の対象になる)", () => {
    expect(syncDigest(emptyDiff(), { updatedMemberships: [mUpd] })).not.toBe("");
    expect(syncDigest(emptyDiff(), { removedMemberships: [mDel] })).not.toBe("");
  });

  it("memU は notes / channel / overrideRate の値込みで指紋化される (値が変われば別 digest)", () => {
    const base = syncDigest(emptyDiff(), { updatedMemberships: [mUpd] });
    for (const over of [
      { notes: "別の注記" },
      { channel: "online" as const },
      { overrideRate: 0.03 },
      { overrideCurrencyId: "j-point" },
    ]) {
      expect(
        syncDigest(emptyDiff(), { updatedMemberships: [{ ...mUpd, ...over }] }),
      ).not.toBe(base);
    }
  });

  it("memU / memD は順序に依存しない", () => {
    const m2 = { ...mUpd, id: "m-prog-j20-gusto", storeId: "gusto" };
    const mDel2 = { ...mDel, id: "m-prog-j2-general", programId: "prog-j2" };
    expect(
      syncDigest(emptyDiff(), {
        updatedMemberships: [mUpd, m2],
        removedMemberships: [mDel, mDel2],
      }),
    ).toBe(
      syncDigest(emptyDiff(), {
        updatedMemberships: [m2, mUpd],
        removedMemberships: [mDel2, mDel],
      }),
    );
  });

  it("更新と削除は別キー (同じ membership でも memU と memD で digest が変わる)", () => {
    expect(syncDigest(emptyDiff(), { updatedMemberships: [mDel] })).not.toBe(
      syncDigest(emptyDiff(), { removedMemberships: [mDel] }),
    );
  });

  it("buildSyncGroups が『提携条件の更新』『提携店舗の削除』を program 名 → 店舗名で出す", () => {
    const storeNames: Record<string, string> = {
      sukiya: "すき家",
      general: "一般店舗",
    };
    const groups = buildSyncGroups(
      emptyDiff(),
      {
        store: (id) => storeNames[id] ?? id,
        program: (id) => (id === "prog-j20" ? "J-POINT 20倍" : id),
      },
      { updatedMemberships: [mUpd], removedMemberships: [mDel] },
    );
    expect(groups.find((g) => g.label === "提携条件の更新")?.items).toEqual([
      "J-POINT 20倍 → すき家",
    ]);
    expect(groups.find((g) => g.label === "提携店舗の削除")?.items).toEqual([
      "J-POINT 20倍 → 一般店舗",
    ]);
  });
});
