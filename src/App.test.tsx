// @vitest-environment jsdom
//
// PR-2e / UX-8(1): App のナビゲーション ARIA 検証。
//   - tablist/tab/tabpanel の ARIA ロールを一切使わない (orphan ARIA 防止)。
//   - 現在タブ (デスクトップナビ) に aria-current="page" が付く。
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App from "./App";
import { DialogProvider } from "./ui/dialog/DialogProvider";
import { useStore } from "./state/store";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  window.location.hash = "";
});
afterEach(cleanup);

const renderApp = () =>
  render(
    <DialogProvider>
      <App />
    </DialogProvider>,
  );

describe("App ナビゲーション ARIA (UX-8(1))", () => {
  it("tab / tablist / tabpanel ロールが document 上に存在しない", () => {
    const { container } = renderApp();
    expect(
      container.querySelectorAll("[role=tab],[role=tablist],[role=tabpanel]")
        .length,
    ).toBe(0);
  });

  it("既定 (#calculator) では計算タブに aria-current=page が付く", () => {
    renderApp();
    // デスクトップナビ (aria-label=メインナビゲーション) は 2 つ (desktop/mobile) 描画される。
    const currents = document.querySelectorAll('[aria-current="page"]');
    // 少なくとも 1 つは現在タブに付く
    expect(currents.length).toBeGreaterThan(0);
    for (const el of currents) {
      expect(el.textContent).toContain("計算");
    }
  });

  it("#stores では data 系なのでデスクトップの「データ」トリガーが aria-current=page", () => {
    window.location.hash = "#stores";
    renderApp();
    const desktopNav = document
      .querySelectorAll("nav.desktop-only")[0] as HTMLElement;
    const current = within(desktopNav).getByRole("button", {
      current: "page",
    });
    expect(current.textContent).toContain("データ");
  });
});
