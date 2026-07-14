// @vitest-environment jsdom
// PR-0c: オンライン/オフライン検知 hook のテスト。
// navigator.onLine を差し替えつつ online/offline イベントの反映を検証する。
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnline } from "./useOnline";

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  setOnLine(true); // jsdom 既定 (オンライン) に戻す
});

describe("useOnline (PR-0c オフライン検知)", () => {
  it("navigator.onLine の初期値 (オンライン) を返す", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
  });

  it("初期が offline のときは false を返す", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(false);
  });

  it("offline イベントで false、online イベントで true に反映される", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("unmount で online/offline リスナが解除される (リーク防止)", () => {
    setOnLine(true);
    const { unmount, result } = renderHook(() => useOnline());
    unmount();
    // unmount 後にイベントが来ても購読解除済みなので例外なく無視される。
    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    // 最後にレンダーされた値は true のまま (再購読していない)。
    expect(result.current).toBe(true);
  });
});
