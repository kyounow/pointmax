// @vitest-environment jsdom
//
// PR-6d (U6): hydrate 失敗の検知 + 生データ退避 (hydrationGuard.ts) の単体テスト。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  CRASH_BACKUP_KEY,
  backupRawPersisted,
  readCrashBackup,
  clearCrashBackup,
  markHydrationFailure,
  getHydrationFailure,
  clearHydrationFailure,
} from "./hydrationGuard";
import { PERSIST_STORE_KEY } from "./persist-versions";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  clearHydrationFailure();
  localStorage.clear();
});

describe("backupRawPersisted", () => {
  it("persist の raw が無ければ false で、退避キーを作らない", () => {
    expect(backupRawPersisted("hydrate")).toBe(false);
    expect(localStorage.getItem(CRASH_BACKUP_KEY)).toBeNull();
    expect(readCrashBackup()).toBeNull();
  });

  it("{takenAt, cause, raw} で退避する", () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    expect(backupRawPersisted("hydrate")).toBe(true);
    const b = readCrashBackup();
    expect(b).not.toBeNull();
    expect(b?.raw).toBe("{broken");
    expect(b?.cause).toBe("hydrate");
    expect(Number.isNaN(Date.parse(b?.takenAt ?? ""))).toBe(false);
  });

  it("同じ raw は二重に書かず true (最初の cause を残す)。raw が変われば上書きする", () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    backupRawPersisted("hydrate");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    expect(backupRawPersisted("reset")).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
    expect(readCrashBackup()?.cause).toBe("hydrate");
    setItem.mockRestore();

    localStorage.setItem(PERSIST_STORE_KEY, "{other");
    expect(backupRawPersisted("reset")).toBe(true);
    expect(readCrashBackup()).toMatchObject({ raw: "{other", cause: "reset" });
  });

  it("setItem が throw (quota 超過) しても例外を漏らさず false", () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(() => backupRawPersisted("hydrate")).not.toThrow();
    expect(backupRawPersisted("hydrate")).toBe(false);
  });

  it("clearCrashBackup で消え、壊れた退避データは null として読む", () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    backupRawPersisted("hydrate");
    clearCrashBackup();
    expect(readCrashBackup()).toBeNull();
    localStorage.setItem(CRASH_BACKUP_KEY, "{not json");
    expect(readCrashBackup()).toBeNull();
    localStorage.setItem(CRASH_BACKUP_KEY, JSON.stringify({ raw: "x" }));
    expect(readCrashBackup()).toBeNull();
  });
});

describe("hydration failure の記録", () => {
  it("mark → get → clear", () => {
    expect(getHydrationFailure()).toBeNull();
    const e = new Error("parse error");
    markHydrationFailure(e);
    expect(getHydrationFailure()).toBe(e);
    clearHydrationFailure();
    expect(getHydrationFailure()).toBeNull();
  });

  it("Error 以外が投げられた場合も Error に包む", () => {
    markHydrationFailure("boom");
    expect(getHydrationFailure()).toBeInstanceOf(Error);
    expect(getHydrationFailure()?.message).toBe("boom");
  });
});
