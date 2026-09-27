// @vitest-environment jsdom
//
// PR-6d (U6): App の境界配置のテスト。
//   - 任意 UI (同期モーダル / 更新バナー / 計算タブの BannerSlot) の例外は非表示に縮退し、
//     ヘッダ・画面は描画され続ける。
//   - 画面の例外は screen モードの復旧パネル。key={tab} により別タブへ移ると復帰する。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { createElement } from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// モジュール変数フラグで各コンポーネントを throw させる (false なら本物を描画)。
const flags = vi.hoisted(() => ({
  sync: false,
  calc: false,
  banner: false,
  update: false,
}));

vi.mock("./ui/SyncUpdateModal", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./ui/SyncUpdateModal")>();
  return {
    SyncUpdateModal: (props: { onViewHistory?: () => void }) => {
      if (flags.sync) throw new Error("sync boom");
      return <mod.SyncUpdateModal {...props} />;
    },
  };
});
vi.mock("./ui/CalculatorScreen", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./ui/CalculatorScreen")>();
  return {
    CalculatorScreen: () => {
      if (flags.calc) throw new Error("calc boom");
      return createElement(mod.CalculatorScreen);
    },
  };
});
vi.mock("./ui/calculator/BannerSlot", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./ui/calculator/BannerSlot")>();
  return {
    BannerSlot: (props: Parameters<typeof mod.BannerSlot>[0]) => {
      if (flags.banner) throw new Error("banner boom");
      return createElement(mod.BannerSlot, props);
    },
  };
});
vi.mock("./ui/UpdateBanner", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./ui/UpdateBanner")>();
  return {
    UpdateBanner: () => {
      if (flags.update) throw new Error("update boom");
      return createElement(mod.UpdateBanner);
    },
  };
});

import App from "./App";
import { DialogProvider } from "./ui/dialog/DialogProvider";
import { useStore } from "./state/store";

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  window.location.hash = "";
  Object.assign(flags, { sync: false, calc: false, banner: false, update: false });
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  errorSpy.mockRestore();
});

const renderApp = () =>
  render(
    <DialogProvider>
      <App />
    </DialogProvider>,
  );
const loggedScope = (scope: string) =>
  errorSpy.mock.calls.some((c: unknown[]) => c[0] === `[ErrorBoundary / ${scope}]`);
const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

describe("App の任意 UI は例外で非表示に縮退する (PR-6d)", () => {
  it("SyncUpdateModal が throw してもヘッダと『計算』画面は描画される", () => {
    flags.sync = true;
    renderApp();
    expect(screen.getByRole("button", { name: "計算画面に戻る" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "計算" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(loggedScope("SyncUpdateModal")).toBe(true);
  });

  it("計算タブの BannerSlot が throw しても計算画面は描画される", () => {
    flags.banner = true;
    renderApp();
    expect(screen.getByRole("heading", { name: "計算" })).toBeInTheDocument();
    expect(
      screen.getByText(/店舗・金額・貯めたい通貨を選ぶと/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(loggedScope("BannerSlot")).toBe(true);
  });

  it("計算以外のタブの UpdateBanner が throw しても画面は描画される", () => {
    flags.update = true;
    window.location.hash = "#settings";
    renderApp();
    expect(screen.getByRole("heading", { name: "設定", level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(loggedScope("UpdateBanner")).toBe(true);
  });
});

describe("App の画面境界 (key={tab})", () => {
  it("CalculatorScreen が throw すると screen モードの復旧パネル、別タブへ移ると復帰する", () => {
    flags.calc = true;
    renderApp();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("画面エラーが発生しました");
    expect(alert).toHaveTextContent("(計算)");
    expect(alert).toHaveTextContent("calc boom");
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
    // ヘッダ (ナビ) は生きている
    expect(screen.getByRole("button", { name: "計算画面に戻る" })).toBeInTheDocument();

    goTo("#settings");
    expect(screen.getByRole("heading", { name: "設定", level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();

    // 直ったあとで計算タブへ戻ると境界が作り直されて描画される
    flags.calc = false;
    goTo("#calculator");
    expect(screen.getByRole("heading", { name: "計算" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
