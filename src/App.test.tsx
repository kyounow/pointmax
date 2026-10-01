// @vitest-environment jsdom
//
// PR-2e / UX-8(1): App のナビゲーション ARIA 検証。
//   - tablist/tab/tabpanel の ARIA ロールを一切使わない (orphan ARIA 防止)。
//   - 現在タブ (デスクトップナビ) に aria-current="page" が付く。
// PR-6a-1 (F7): 新規プロファイル / 初期化後の次回起動で公式 seed が自動投入される。
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { StrictMode } from "react";
import { render, cleanup, within, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App from "./App";
import { DialogProvider } from "./ui/dialog/DialogProvider";
import { useStore } from "./state/store";
import { seed, SEED_VERSION } from "./state/seed";
import { PERSIST_STORE_KEY } from "./state/persist-versions";
import { clearHydrationFailure } from "./state/hydrationGuard";
import { visibleStoreIds } from "./domain/storePicker";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  window.location.hash = "";
});
afterEach(() => {
  cleanup();
  // PR-6d: 壊れた JSON の hydrate テストが立てる hydrate 失敗のモジュール状態を漏らさない
  clearHydrationFailure();
});

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

describe("App 起動時の公式データ自動投入 (PR-6a-1 / F7)", () => {
  // 計算画面の店舗カテゴリ select に seed の店舗数が出る = seed の店舗が入っている。
  // PR-6c (B6): 店舗 select は membership ゼロ・除外カテゴリ・電気・ガスの店を隠すので、
  // 数えるのは picker に出る店 (visibleStoreIds、初回起動は選択中 = general のみ)。
  const expectSeedStoresOnCalculator = () => {
    const s = seed();
    const ids = visibleStoreIds(s.stores, s.memberships);
    const stores = s.stores.filter((st) => ids.has(st.id));
    expect(
      screen.getByRole("option", { name: `全カテゴリ (${stores.length})` }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("option", { name: stores[0].name }).length,
    ).toBeGreaterThan(0);
  };
  const expectNoSyncUi = () => {
    // SyncUpdateModal (<dialog>) も自動反映 (notice) も出ない (差分 0 件)。
    // 更新バナーの不在は計算タブでは確かめられない (カード全 OFF でオンボーディングが通知枠を
    // 取るので常に不在になる) ため、main 上部に UpdateBanner を出す #stores タブで別に確かめる。
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useStore.getState().autoApplyNotice).toBeNull();
  };

  it("localStorage 空 (新規プロファイル) でマウントすると seed が入り、計算画面に店舗が出る", async () => {
    // persist キーも無い状態で hydration をやり直す (= 新規プロファイルの起動)
    localStorage.clear();
    await useStore.persist.rehydrate();
    expect(localStorage.getItem(PERSIST_STORE_KEY)).toBeNull();

    // main.tsx と同じ StrictMode (effect 二重実行) でも 1 回だけ投入される
    render(
      <StrictMode>
        <DialogProvider>
          <App />
        </DialogProvider>
      </StrictMode>,
    );

    expectSeedStoresOnCalculator();
    expectNoSyncUi();
    const s = useStore.getState();
    expect(s.lastSeedVersion).toBe(SEED_VERSION);
    expect(s.cards).toEqual(seed().cards);
    // カードは全 OFF で入るのでオンボーディングが出る
    expect(s.cards.every((c) => c.enabled !== true)).toBe(true);
    // 投入結果は persist に書かれる (次回起動はデータありで no-op)
    expect(localStorage.getItem(PERSIST_STORE_KEY)).toContain(
      `"lastSeedVersion":${SEED_VERSION}`,
    );
  });

  it("初期化 (clearAll) 済みの state で次回起動しても同じ規則で再投入される", () => {
    // beforeEach の clearAll で empty + lastSeedVersion 0 が persist 済み
    renderApp();
    expectSeedStoresOnCalculator();
    expectNoSyncUi();
    expect(useStore.getState().lastSeedVersion).toBe(SEED_VERSION);
  });

  it("#stores (UpdateBanner を main 上部に出すタブ) で新規プロファイルを起動しても更新バナーは出ない", async () => {
    localStorage.clear();
    await useStore.persist.rehydrate();
    window.location.hash = "#stores";
    const { container } = renderApp();
    expect(useStore.getState().lastSeedVersion).toBe(SEED_VERSION);
    expect(useStore.getState().stores).toEqual(seed().stores);
    expectNoSyncUi();
    expect(container.querySelector(".update-banner")).toBeNull();
  });

  it("陽性コントロール: #stores でデータあり + lastSeedVersion < SEED_VERSION なら更新バナーが出る", () => {
    useStore.setState({ ...seed(), lastSeedVersion: SEED_VERSION - 1 });
    window.location.hash = "#stores";
    const { container } = renderApp();
    expect(container.querySelector(".update-banner")).not.toBeNull();
    expect(screen.getByText(`サンプルデータの新バージョン v${SEED_VERSION}`)).toBeInTheDocument();
  });

  it("データがある state では何も投入しない (no-op)", () => {
    const one = seed().stores.slice(0, 1);
    useStore.setState({ stores: one });
    renderApp();
    expect(useStore.getState().stores).toEqual(one);
    expect(useStore.getState().cards).toEqual([]);
    expect(useStore.getState().lastSeedVersion).toBe(0);
  });

  it("persist の hydration に失敗した (壊れた JSON) ときは投入せず、生データを上書きしない", async () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    try {
      await useStore.persist.rehydrate();
      expect(useStore.persist.hasHydrated()).toBe(false);

      renderApp();

      expect(useStore.getState().stores).toEqual([]);
      expect(useStore.getState().lastSeedVersion).toBe(0);
      expect(localStorage.getItem(PERSIST_STORE_KEY)).toBe("{broken");
    } finally {
      // 後続テストのために正常な hydration 状態へ戻す
      localStorage.clear();
      await useStore.persist.rehydrate();
    }
  });
});
