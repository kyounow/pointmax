// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  isSwUpdated,
  initBuildIdBaseline,
  dismissSwUpdate,
  clearBuildId,
  currentBuildId,
} from "./swUpdateNotice";

const BUILD_KEY = "pointmax:build-id:v1";

describe("swUpdateNotice (SW 更新後の初回起動判定)", () => {
  beforeEach(() => {
    clearBuildId();
  });

  it("初回インストール (記録なし) は更新扱いしない", () => {
    expect(isSwUpdated()).toBe(false);
  });

  it("initBuildIdBaseline で現ビルドを記録する / 同一ビルドでは更新扱いしない", () => {
    initBuildIdBaseline();
    expect(localStorage.getItem(BUILD_KEY)).toBe(currentBuildId());
    expect(isSwUpdated()).toBe(false);
  });

  it("記録済みビルドが現ビルドと異なれば更新後の初回起動 = true", () => {
    localStorage.setItem(BUILD_KEY, "OLD-BUILD-ID");
    expect(isSwUpdated()).toBe(true);
  });

  it("initBuildIdBaseline は既存記録を上書きしない (更新中も表示継続)", () => {
    localStorage.setItem(BUILD_KEY, "OLD-BUILD-ID");
    initBuildIdBaseline();
    expect(localStorage.getItem(BUILD_KEY)).toBe("OLD-BUILD-ID");
    expect(isSwUpdated()).toBe(true);
  });

  it("dismiss で現ビルドを記録し以後は再表示しない", () => {
    localStorage.setItem(BUILD_KEY, "OLD-BUILD-ID");
    expect(isSwUpdated()).toBe(true);
    dismissSwUpdate();
    expect(localStorage.getItem(BUILD_KEY)).toBe(currentBuildId());
    expect(isSwUpdated()).toBe(false);
  });
});
