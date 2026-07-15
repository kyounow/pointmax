// @vitest-environment jsdom
// PR-4a (N-4): 破壊的操作の直前スナップショット + 「元に戻す」のテスト。
// localStorage が必要なので jsdom 環境で実行する。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  takeSnapshot,
  getSnapshotMeta,
  restoreSnapshot,
  clearSnapshot,
  type Snapshot,
} from "./stateSnapshot";
import { PERSIST_SCHEMA_VERSION, PERSIST_STORE_KEY } from "./persist-versions";

const SNAPSHOT_KEY = "pointmax:snapshot:v1";

// 代表的な persist app state (最小構成)。JSON セーフな値のみ。
const sampleState = () => ({
  cards: [
    {
      id: "rakuten-card",
      name: "楽天カード",
      defaultRate: 0.01,
      defaultCurrencyId: "rakuten-pt",
    },
  ],
  currencies: [],
  stores: [],
  edges: [],
  pointCards: [],
  paymentApps: [],
  programs: [],
  memberships: [],
  lastSeedVersion: 43,
  syncUrl: "https://example.test/master.json",
  lastSyncAt: null,
  preferredCurrencyIds: ["rakuten-pt"],
});

describe("stateSnapshot: take / restore round-trip", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("take → restore で persist キーに元 state が書き戻る (round-trip)", () => {
    const state = sampleState();
    expect(takeSnapshot("import", state).ok).toBe(true);

    // メタは take 内容を反映する
    const meta = getSnapshotMeta();
    expect(meta).not.toBeNull();
    expect(meta?.trigger).toBe("import");
    expect(meta?.schemaVersion).toBe(PERSIST_SCHEMA_VERSION);
    expect(typeof meta?.takenAt).toBe("string");

    const res = restoreSnapshot();
    expect(res.ok).toBe(true);

    // persist キーに zustand persist の { state, version } 形式で書き戻る
    const raw = localStorage.getItem(PERSIST_STORE_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw ?? "null");
    expect(persisted.version).toBe(PERSIST_SCHEMA_VERSION);
    expect(persisted.state).toEqual(state);

    // 復元後はスナップショットを消費する (1 手だけの undo)
    expect(getSnapshotMeta()).toBeNull();
  });

  it("未保存なら getSnapshotMeta は null / restore は ok:false", () => {
    expect(getSnapshotMeta()).toBeNull();
    expect(restoreSnapshot().ok).toBe(false);
  });

  it("clearSnapshot でスナップショットを消せる", () => {
    takeSnapshot("import", sampleState());
    expect(getSnapshotMeta()).not.toBeNull();
    clearSnapshot();
    expect(getSnapshotMeta()).toBeNull();
  });

  it("壊れた JSON からは null で回復し throw しない", () => {
    localStorage.setItem(SNAPSHOT_KEY, "{ not valid json");
    expect(getSnapshotMeta()).toBeNull();
    expect(restoreSnapshot().ok).toBe(false);
  });
});

describe("stateSnapshot: 1 世代のみ (上書き)", () => {
  beforeEach(() => localStorage.clear());

  it("2 回 take すると最新 1 世代だけが残る", () => {
    takeSnapshot("import", { ...sampleState(), lastSeedVersion: 1 });
    takeSnapshot("reset", { ...sampleState(), lastSeedVersion: 2 });

    // メタは 2 回目 (reset) を指す
    expect(getSnapshotMeta()?.trigger).toBe("reset");

    // restore すると 2 回目の state が戻る
    expect(restoreSnapshot().ok).toBe(true);
    const persisted = JSON.parse(
      localStorage.getItem(PERSIST_STORE_KEY) ?? "null",
    );
    expect(persisted.state.lastSeedVersion).toBe(2);
  });
});

describe("stateSnapshot: schemaVersion 不一致は復元拒否", () => {
  beforeEach(() => localStorage.clear());

  it("旧世代 (schemaVersion 不一致) スナップは restore を拒否し persist キーを触らない", () => {
    const stale: Snapshot = {
      takenAt: new Date().toISOString(),
      schemaVersion: PERSIST_SCHEMA_VERSION - 1, // 旧世代スナップ
      trigger: "import",
      state: sampleState(),
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(stale));

    const res = restoreSnapshot();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain(`v${PERSIST_SCHEMA_VERSION - 1}`);
    }
    // persist キーは書き換えられない (不整合 state を作らない)
    expect(localStorage.getItem(PERSIST_STORE_KEY)).toBeNull();
    // メタ自体は読める (UI が disabled + 理由表示に使う)
    expect(getSnapshotMeta()?.schemaVersion).toBe(PERSIST_SCHEMA_VERSION - 1);
  });
});

describe("stateSnapshot: quota 失敗 / null は例外を漏らさない", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("setItem が throw (quota 超過相当) しても例外を漏らさず ok:false を返す", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    // 呼び出しが throw すればこのテストは失敗する = 「例外を漏らさない」の検証
    const res = takeSnapshot("import", sampleState());
    expect(res.ok).toBe(false);
    spy.mockRestore();
  });

  it("state が null (未永続状態) なら何もせず ok:false", () => {
    const res = takeSnapshot("import", null);
    expect(res.ok).toBe(false);
    expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    expect(getSnapshotMeta()).toBeNull();
  });
});

describe("stateSnapshot: 独立キーを含めない / 復元でも消さない", () => {
  beforeEach(() => localStorage.clear());

  it("snapshot 対象は persist state のみ。独立キーは含めず復元でも無傷", () => {
    const usage = JSON.stringify({ tabViews: { calc: 3 } });
    const calc = JSON.stringify({
      date: "2026-07-15",
      amount: "3000",
      activeCurrencyId: null,
    });
    localStorage.setItem("pointmax:usage-stats:v1", usage);
    localStorage.setItem("pointmax:calc-form:v1", calc);
    localStorage.setItem("pointmax:onboarding-dismissed:v1", "1");

    takeSnapshot("import", sampleState());

    // スナップショットの state は渡した persist state と一致 (独立キーは混ざらない)
    const snap = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? "null");
    expect(snap.state).toEqual(sampleState());

    restoreSnapshot();

    // 復元しても独立キー群は一切変更されない (巻き戻しで消さない設計)
    expect(localStorage.getItem("pointmax:usage-stats:v1")).toBe(usage);
    expect(localStorage.getItem("pointmax:calc-form:v1")).toBe(calc);
    expect(localStorage.getItem("pointmax:onboarding-dismissed:v1")).toBe("1");
  });
});
