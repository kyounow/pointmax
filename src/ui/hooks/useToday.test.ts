// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToday } from "./useToday";

describe("useToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("同じ暦日のうちは参照を維持する (1 分 tick で再 render させない)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00"));
    const { result } = renderHook(() => useToday());
    const first = result.current;
    act(() => {
      vi.advanceTimersByTime(5 * 60_000); // 5 分経過 (同じ日)
    });
    expect(result.current).toBe(first);
  });

  it("日付が変わると新しい Date に更新される (C-2: 日付跨ぎの stale 解消)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T23:59:30"));
    const { result } = renderHook(() => useToday());
    const first = result.current;
    expect(first.getDate()).toBe(15);
    act(() => {
      vi.advanceTimersByTime(2 * 60_000); // 00:01:30 → 日付跨ぎ
    });
    expect(result.current).not.toBe(first);
    expect(result.current.getDate()).toBe(16);
  });

  it("unmount で interval が解除される (リーク防止)", () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useToday());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
