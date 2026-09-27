// @vitest-environment jsdom
//
// PR-6d (U6): onUncaughtError から呼ぶ静的 fallback のテスト。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { showStaticCrashFallback } from "./staticFallback";

const reloadMock = vi.fn();
let originalLocation: Location;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"><p>react</p></div>';
  reloadMock.mockClear();
  originalLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, reload: reloadMock },
  });
});
afterEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("showStaticCrashFallback", () => {
  it("body に 1 つだけ append する (2 回呼んでも冪等)", () => {
    showStaticCrashFallback();
    showStaticCrashFallback();
    const nodes = document.querySelectorAll("#pointmax-static-fallback");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].parentElement).toBe(document.body);
    expect(nodes[0].getAttribute("role")).toBe("alert");
  });

  it("React が管理する #root には書き込まない", () => {
    showStaticCrashFallback();
    expect(document.getElementById("root")?.innerHTML).toBe("<p>react</p>");
  });

  it("[再読み込み] ボタンで location.reload が呼ばれる", () => {
    showStaticCrashFallback();
    const button = document.querySelector(
      "#pointmax-static-fallback button",
    ) as HTMLButtonElement;
    expect(button.textContent).toBe("再読み込み");
    button.click();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
