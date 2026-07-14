// @vitest-environment jsdom
// PR-0c: 永続ストレージ要求 / 照会ユーティリティのテスト。
// navigator.storage をモックして granted / denied / unsupported の 3 分岐を検証する。
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getPersistenceStatus,
  requestPersistentStorage,
} from "./storagePersistence";

// navigator.storage を差し替えるヘルパ (jsdom は StorageManager 未実装なので
// configurable な新規プロパティとして定義できる)。
function setStorage(value: unknown) {
  Object.defineProperty(navigator, "storage", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  setStorage(undefined);
  vi.restoreAllMocks();
});

describe("storagePersistence (PR-0c 永続ストレージ)", () => {
  describe("unsupported: Storage API 非対応", () => {
    it("navigator.storage が無いとき getPersistenceStatus は unsupported", async () => {
      setStorage(undefined);
      expect(await getPersistenceStatus()).toBe("unsupported");
    });

    it("persist/persisted が関数でないとき requestPersistentStorage は unsupported", async () => {
      setStorage({});
      expect(await requestPersistentStorage()).toBe("unsupported");
    });

    it("persisted() が throw しても unsupported にフォールバック (本体を壊さない)", async () => {
      setStorage({
        persisted: () => Promise.reject(new Error("boom")),
        persist: () => Promise.resolve(true),
      });
      expect(await getPersistenceStatus()).toBe("unsupported");
      expect(await requestPersistentStorage()).toBe("unsupported");
    });
  });

  describe("granted: 既に永続化済み", () => {
    it("getPersistenceStatus は granted", async () => {
      setStorage({
        persisted: () => Promise.resolve(true),
        persist: () => Promise.resolve(false),
      });
      expect(await getPersistenceStatus()).toBe("granted");
    });

    it("requestPersistentStorage は persist を再要求せず granted を返す", async () => {
      const persist = vi.fn(() => Promise.resolve(false));
      setStorage({
        persisted: () => Promise.resolve(true),
        persist,
      });
      expect(await requestPersistentStorage()).toBe("granted");
      expect(persist).not.toHaveBeenCalled();
    });
  });

  describe("denied: 未許可", () => {
    it("getPersistenceStatus は denied", async () => {
      setStorage({
        persisted: () => Promise.resolve(false),
        persist: () => Promise.resolve(false),
      });
      expect(await getPersistenceStatus()).toBe("denied");
    });

    it("requestPersistentStorage: persist() が true なら granted", async () => {
      const persist = vi.fn(() => Promise.resolve(true));
      setStorage({
        persisted: () => Promise.resolve(false),
        persist,
      });
      expect(await requestPersistentStorage()).toBe("granted");
      expect(persist).toHaveBeenCalledOnce();
    });

    it("requestPersistentStorage: persist() が false なら denied", async () => {
      setStorage({
        persisted: () => Promise.resolve(false),
        persist: () => Promise.resolve(false),
      });
      expect(await requestPersistentStorage()).toBe("denied");
    });
  });
});
