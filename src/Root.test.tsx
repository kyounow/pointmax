// @vitest-environment jsdom
//
// PR-6d (U6): Root (最外の境界 + 読み込み失敗時は App を描画しない) のテスト。
//   - hydrate 失敗: 復旧パネルだけを出し、App を描画しない = 壊れた生データを上書きする
//     最初の set() が起きない (persist キーへの書き込み 0 回)。
//   - App の描画例外: root モードの復旧パネル (もう一度試す は出さない)。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { StrictMode, createElement } from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// App をモジュール変数フラグで throw させる (フラグが false なら本物の App を描画する)。
// onRender は App の各 render の直前に呼ばれる (最初の render 時点の store を観測する用)。
const flags = vi.hoisted(() => ({
  appThrows: false,
  onRender: undefined as (() => void) | undefined,
}));
vi.mock("./App", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./App")>();
  return {
    default: function MaybeThrowingApp() {
      flags.onRender?.();
      if (flags.appThrows) throw new Error("app boom");
      return createElement(mod.default);
    },
  };
});

import Root from "./Root";
import { useStore } from "./state/store";
import { PERSIST_STORE_KEY } from "./state/persist-versions";
import { seed, SEED_VERSION } from "./state/seed";
import {
  clearHydrationFailure,
  getHydrationFailure,
  markHydrationFailure,
  readCrashBackup,
} from "./state/hydrationGuard";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  window.location.hash = "";
  flags.appThrows = false;
  flags.onRender = undefined;
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  clearHydrationFailure();
  localStorage.clear();
  // 後続テストのために正常な hydration 状態へ戻す
  await useStore.persist.rehydrate();
  clearHydrationFailure();
});

const persistWrites = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.filter((c: unknown[]) => c[0] === PERSIST_STORE_KEY).length;

describe("Root: 読み込み (hydrate) 失敗時", () => {
  it("壊れた persist では復旧パネルだけを出し、App を描画せず、persist キーに 1 度も書かない", async () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    await useStore.persist.rehydrate();
    expect(getHydrationFailure()).not.toBeNull();

    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { container } = render(
      <StrictMode>
        <Root />
      </StrictMode>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "保存データを読み込めませんでした。元のデータは端末内に退避済みです",
    );
    // App (ヘッダの PointMax ブランド・計算画面) は描画されない
    expect(container.querySelector(".appbar")).toBeNull();
    expect(screen.queryByText("PointMax")).toBeNull();
    expect(screen.queryByRole("heading", { name: "計算" })).toBeNull();
    // 最初の set() が起きないので生データはそのまま (退避も残る)
    expect(persistWrites(setItem)).toBe(0);
    expect(localStorage.getItem(PERSIST_STORE_KEY)).toBe("{broken");
    expect(readCrashBackup()?.raw).toBe("{broken");
  });

  it("陽性コントロール: 検知を無視して App を描画し store action を呼ぶと persist キーが上書きされる", async () => {
    // 上のケースの「書き込み 0 回」が spy の取りこぼしでないことを確かめる: 同じ壊れた persist で
    // failure を消す (= Root が App を描画する) と、最初の set() が生データを上書きする。
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    await useStore.persist.rehydrate();
    expect(getHydrationFailure()).not.toBeNull();
    clearHydrationFailure();

    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { container } = render(
      <StrictMode>
        <Root />
      </StrictMode>,
    );
    expect(container.querySelector(".appbar")).not.toBeNull();
    act(() => useStore.getState().setSyncUrl("https://example.test/master.json"));

    expect(persistWrites(setItem)).toBeGreaterThan(0);
    expect(localStorage.getItem(PERSIST_STORE_KEY)).not.toBe("{broken");
  });

  it("markHydrationFailure 済みなら (App が throw する設定でも) App を呼ばずにパネルを出す", () => {
    flags.appThrows = true;
    markHydrationFailure(new Error("x"));
    render(<Root />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("保存データを読み込めませんでした");
    expect(alert).not.toHaveTextContent("app boom");
    expect(screen.queryByRole("button", { name: "もう一度試す" })).toBeNull();
  });
});

describe("Root: 描画例外", () => {
  it("failure が無いときに App が throw すると root モードの復旧パネルが出る", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    flags.appThrows = true;
    render(<Root />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("エラーが発生しました");
    expect(alert).toHaveTextContent("app boom");
    expect(screen.getByRole("button", { name: "ページを再読み込み" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "もう一度試す" })).toBeNull();
    expect(
      errorSpy.mock.calls.some((c: unknown[]) => c[0] === "[ErrorBoundary / Root]"),
    ).toBe(true);
  });

  it("新規プロファイルは App の最初の描画より前に公式データが入る (空画面の 1 フレームが無い)", async () => {
    // persist キーの無い新規プロファイル (beforeEach の clearAll で empty + lastSeedVersion 0)
    localStorage.clear();
    await useStore.persist.rehydrate();
    expect(useStore.getState().stores).toEqual([]);
    const storesAtRender: number[] = [];
    flags.onRender = () => storesAtRender.push(useStore.getState().stores.length);

    render(<Root />);

    // App の useEffect (初回 paint の後) を待たず、最初の render で seed が見えている
    expect(storesAtRender[0]).toBe(seed().stores.length);
    expect(useStore.getState().lastSeedVersion).toBe(SEED_VERSION);
  });

  it("failure も例外も無ければ DialogProvider の中で App を描画する", () => {
    render(<Root />);
    expect(screen.getByRole("heading", { name: "計算" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "計算画面に戻る" })).toHaveTextContent(
      "PointMax",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
