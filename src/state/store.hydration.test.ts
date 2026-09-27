// @vitest-environment jsdom
//
// PR-6d (U6): persist の hydrate 失敗の検知と生データ退避 (store.ts の onRehydrateStorage)。
// store.test.ts は node 環境 (localStorage 無し = persist が hydrate も callback も実行しない)
// なので、実際の persist を動かす本ファイルを jsdom で分けている。
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { useStore } from "./store";
import { PERSIST_SCHEMA_VERSION, PERSIST_STORE_KEY } from "./persist-versions";
import {
  getHydrationFailure,
  clearHydrationFailure,
  readCrashBackup,
} from "./hydrationGuard";

beforeEach(() => {
  localStorage.clear();
  // clearAll で empty (lastSeedVersion 0) に戻す (persist にも書かれるが各テストで上書きする)
  useStore.getState().clearAll();
  clearHydrationFailure();
});
afterEach(async () => {
  clearHydrationFailure();
  localStorage.clear();
  // 後続テストのために正常な hydration 状態へ戻す
  await useStore.persist.rehydrate();
  clearHydrationFailure();
});

describe("store の hydrate 失敗検知 (PR-6d)", () => {
  it("壊れた JSON: failure を記録し、生データを crash-backup に退避、persist キーは壊れたまま", async () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    await useStore.persist.rehydrate();

    expect(getHydrationFailure()).not.toBeNull();
    expect(useStore.persist.hasHydrated()).toBe(false);
    const backup = readCrashBackup();
    expect(backup?.raw).toBe("{broken");
    expect(backup?.cause).toBe("hydrate");
    expect(localStorage.getItem(PERSIST_STORE_KEY)).toBe("{broken");
  });

  it("失敗後の seedIfEmpty は false を返し、state は empty のまま (壊れた生データを seed で上書きしない)", async () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    await useStore.persist.rehydrate();

    expect(useStore.getState().seedIfEmpty()).toBe(false);
    expect(useStore.getState().stores).toEqual([]);
    expect(useStore.getState().cards).toEqual([]);
    expect(useStore.getState().lastSeedVersion).toBe(0);
    expect(localStorage.getItem(PERSIST_STORE_KEY)).toBe("{broken");
  });

  it("現行 schema の正常な JSON: failure は null で退避もしない", async () => {
    localStorage.setItem(
      PERSIST_STORE_KEY,
      JSON.stringify({
        state: { birthMonth: 3, lastSeedVersion: 1 },
        version: PERSIST_SCHEMA_VERSION,
      }),
    );
    await useStore.persist.rehydrate();

    expect(getHydrationFailure()).toBeNull();
    expect(readCrashBackup()).toBeNull();
    expect(useStore.persist.hasHydrated()).toBe(true);
    expect(useStore.getState().birthMonth).toBe(3);
  });

  it("旧 schema (v6) の正常な JSON は migrate が扱うので failure にしない", async () => {
    localStorage.setItem(
      PERSIST_STORE_KEY,
      JSON.stringify({
        state: {
          cards: [
            {
              id: "rakuten-card",
              name: "楽天カード",
              defaultRate: 0.01,
              defaultCurrencyId: "rakuten-pt",
            },
          ],
          pointCards: [],
          paymentApps: [],
          programs: [],
          lastSeedVersion: 1,
        },
        version: 6,
      }),
    );
    await useStore.persist.rehydrate();

    expect(getHydrationFailure()).toBeNull();
    expect(readCrashBackup()).toBeNull();
    // SCHEMA_MIGRATIONS[6] の transform (v6 の enabled 未指定 = 有効 → true を明示) が効いている
    expect(useStore.getState().cards[0].enabled).toBe(true);
  });

  it("persist キーが無い (新規プロファイル) なら failure は null", async () => {
    localStorage.removeItem(PERSIST_STORE_KEY);
    await useStore.persist.rehydrate();
    expect(getHydrationFailure()).toBeNull();
    expect(readCrashBackup()).toBeNull();
  });
});
