// @vitest-environment jsdom
//
// PR-6d (U6): 復旧ヘルパ (recovery.ts) のテスト。store は使わず、persist キーと独立キーを
// localStorage に直接置いて検証する (recovery.ts は store を import しない UI 専用モジュール)。
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  buildRecoveryExportJson,
  restorableSnapshotMeta,
  restoreSnapshotForRecovery,
  removePersistedForRecovery,
  formatTakenAt,
} from "./recovery";
import { PERSIST_SCHEMA_VERSION, PERSIST_STORE_KEY } from "./persist-versions";
import { takeSnapshot, getSnapshotMeta } from "./stateSnapshot";
import { readSyncSeen, writeSyncSeen } from "./syncNotice";
import {
  CRASH_BACKUP_KEY,
  backupRawPersisted,
  readCrashBackup,
} from "./hydrationGuard";
import { validateImportData } from "./validators";
import { seed } from "./seed";

const persist = (state: unknown, version = PERSIST_SCHEMA_VERSION) =>
  localStorage.setItem(PERSIST_STORE_KEY, JSON.stringify({ state, version }));

// 現行 schema の正常な persist state (seed 由来のデータ + per-user 設定)。
const healthyState = () => ({
  ...seed(),
  lastSeedVersion: 1,
  preferredCurrencyIds: ["j-point"],
  birthMonth: 7,
  yenValueOverrides: { "j-point": 1.2 },
  excludedStorePayments: [
    { storeId: "s-1", paymentAppId: "pa-1", excludedAt: "2026-09-01T00:00:00.000Z" },
  ],
  autoApplyNotice: null,
});

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  localStorage.clear();
});

describe("buildRecoveryExportJson", () => {
  it("正常な persist から作った JSON は import の検証を通る (round-trip 契約) + preferences を含む", () => {
    persist(healthyState());
    const out = JSON.parse(buildRecoveryExportJson(new Error("boom"), "render"));

    const res = validateImportData(out, { requireSchemaVersion: true });
    expect(res.ok).toBe(true);
    expect(out.schemaVersion).toBe(PERSIST_SCHEMA_VERSION);
    expect(out.cards).toEqual(seed().cards);
    expect(out.memberships).toEqual(seed().memberships);
    expect(out.preferences).toEqual({
      preferredCurrencyIds: ["j-point"],
      birthMonth: 7,
      yenValueOverrides: { "j-point": 1.2 },
      excludedStorePayments: healthyState().excludedStorePayments,
    });
    expect(out.recovery).toMatchObject({
      cause: "render",
      message: "boom",
      source: "persist",
    });
    expect(typeof out.recovery.buildId).toBe("string");
  });

  it("配列でない collection は載せず recovery.invalidKeys に並べる", () => {
    persist({ ...healthyState(), cards: null, stores: "x" });
    const out = JSON.parse(buildRecoveryExportJson(null));
    expect(out.cards).toBeUndefined();
    expect(out.stores).toBeUndefined();
    expect(out.currencies).toEqual(seed().currencies);
    expect(out.recovery.invalidKeys).toEqual(["cards", "stores"]);
  });

  it("壊れた raw では throw せず kind='pointmax-recovery-raw' で raw を保持する", () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    let text = "";
    expect(() => {
      text = buildRecoveryExportJson(new Error("parse"), "hydrate");
    }).not.toThrow();
    const out = JSON.parse(text);
    expect(out.kind).toBe("pointmax-recovery-raw");
    expect(out.raw).toBe("{broken");
    expect(out.recovery).toMatchObject({ cause: "hydrate", message: "parse" });
  });

  it("persist が無く crash-backup があれば backup の raw を使い、退避時刻を載せる", () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    backupRawPersisted("hydrate");
    localStorage.removeItem(PERSIST_STORE_KEY);
    const out = JSON.parse(buildRecoveryExportJson(null));
    expect(out.kind).toBe("pointmax-recovery-raw");
    expect(out.raw).toBe("{broken");
    expect(out.recovery.source).toBe("crash-backup");
    expect(out.recovery.crashBackupTakenAt).toBe(readCrashBackup()?.takenAt);
  });
});

describe("restorableSnapshotMeta / restoreSnapshotForRecovery", () => {
  it("スナップショットが無ければ null、現行 schema なら meta、旧 schema は null", () => {
    expect(restorableSnapshotMeta()).toBeNull();
    takeSnapshot("seed-apply", healthyState());
    expect(restorableSnapshotMeta()?.trigger).toBe("seed-apply");
    localStorage.setItem(
      "pointmax:snapshot:v1",
      JSON.stringify({
        takenAt: new Date().toISOString(),
        schemaVersion: PERSIST_SCHEMA_VERSION - 1,
        trigger: "reset",
        state: healthyState(),
      }),
    );
    expect(restorableSnapshotMeta()).toBeNull();
  });

  it("seed-apply: persist の autoApplyNotice.digest を既読にしてから persist をスナップショットに置き換える", () => {
    const before = { ...healthyState(), lastSeedVersion: 11 };
    takeSnapshot("seed-apply", before);
    persist({
      ...healthyState(),
      lastSeedVersion: 12,
      autoApplyNotice: { digest: "d-x", count: 3 },
    });

    const res = restoreSnapshotForRecovery();
    expect(res.ok).toBe(true);
    expect(readSyncSeen()).toBe("d-x");
    const restored = JSON.parse(localStorage.getItem(PERSIST_STORE_KEY) ?? "null");
    expect(restored.state.lastSeedVersion).toBe(11);
    expect(restored.version).toBe(PERSIST_SCHEMA_VERSION);
    expect(getSnapshotMeta()).toBeNull(); // 消費される
  });

  it("import のスナップショットでは sync-seen を変えない", () => {
    writeSyncSeen("old");
    takeSnapshot("import", healthyState());
    persist({ ...healthyState(), autoApplyNotice: { digest: "d-x", count: 1 } });
    expect(restoreSnapshotForRecovery().ok).toBe(true);
    expect(readSyncSeen()).toBe("old");
  });

  it("schemaVersion が違うスナップショットは拒否し、sync-seen も変えない", () => {
    localStorage.setItem(
      "pointmax:snapshot:v1",
      JSON.stringify({
        takenAt: new Date().toISOString(),
        schemaVersion: PERSIST_SCHEMA_VERSION - 1,
        trigger: "seed-apply",
        state: healthyState(),
      }),
    );
    persist({ ...healthyState(), autoApplyNotice: { digest: "d-x", count: 1 } });
    const res = restoreSnapshotForRecovery();
    expect(res.ok).toBe(false);
    expect(readSyncSeen()).toBe("");
  });

  it("persist が壊れていても seed-apply の復元はできる (digest は読めないので既読化しない)", () => {
    takeSnapshot("seed-apply", healthyState());
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    expect(restoreSnapshotForRecovery().ok).toBe(true);
    expect(readSyncSeen()).toBe("");
    expect(localStorage.getItem(PERSIST_STORE_KEY)).not.toBe("{broken");
  });
});

describe("removePersistedForRecovery", () => {
  it("persist キーだけを消し、独立キーは残す。crash-backup に raw がある", () => {
    const others: Record<string, string> = {
      "pointmax:snapshot:v1": "s",
      "pointmax:usage-stats:v1": "u",
      "pointmax:calc-form:v1": "c",
      "pointmax:onboarding-dismissed:v1": "1",
      "pointmax-sync-seen-digest": "d",
      "pointmax:build-id:v1": "b",
    };
    for (const [k, v] of Object.entries(others)) localStorage.setItem(k, v);
    sessionStorage.setItem("pointmax:seed-update-dismissed:v1", "x");
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");

    expect(removePersistedForRecovery()).toEqual({ backedUp: true });

    expect(localStorage.getItem(PERSIST_STORE_KEY)).toBeNull();
    for (const [k, v] of Object.entries(others)) {
      expect(localStorage.getItem(k)).toBe(v);
    }
    expect(sessionStorage.getItem("pointmax:seed-update-dismissed:v1")).toBe("x");
    expect(localStorage.getItem(CRASH_BACKUP_KEY)).not.toBeNull();
    expect(readCrashBackup()).toMatchObject({ raw: "{broken", cause: "reset" });
    sessionStorage.clear();
  });

  it("persist が無ければ backedUp:false (何も壊さない)", () => {
    expect(removePersistedForRecovery()).toEqual({ backedUp: false });
    expect(readCrashBackup()).toBeNull();
  });
});

describe("formatTakenAt", () => {
  it("M/D HH:mm で表示する", () => {
    const iso = new Date(2026, 8, 7, 9, 5).toISOString();
    expect(formatTakenAt(iso)).toBe("9/7 09:05");
  });
});
