// @vitest-environment jsdom
//
// PR-2b2: 設定画面の「誕生月」設定 (恒久設定箇所) のテスト。
//   - select で月を選ぶと store.birthMonth に反映される。
//   - 未設定を選ぶと undefined に戻る。
//   - 既存の birthMonth が select に初期表示される。
// PR-2d: 設定内「マスタ更新履歴」セクション (旧「更新履歴」タブ) のテスト。
//   - 最新 1 件のプレビュー (日付 + 件数) は常時表示。
//   - #settings/history (旧 #sync-history 含む) で details を自動展開 + scrollIntoView。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SettingsScreen } from "./SettingsScreen";
import { DialogProvider } from "./dialog/DialogProvider";
import { useStore } from "../state/store";
import { loadSyncHistory } from "../domain/syncHistory";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  vi.restoreAllMocks();
  window.location.hash = "";
  // jsdom は scrollIntoView 未実装なので no-op スタブ (history 展開 effect が呼ぶ)。
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const renderSettings = () =>
  render(
    <DialogProvider>
      <SettingsScreen />
    </DialogProvider>,
  );

describe("SettingsScreen 誕生月設定", () => {
  it("月を選ぶと store.birthMonth に反映され、未設定でクリアされる", () => {
    renderSettings();
    const select = screen.getByLabelText("誕生月") as HTMLSelectElement;
    expect(select.value).toBe(""); // 初期は未設定

    fireEvent.change(select, { target: { value: "7" } });
    expect(useStore.getState().birthMonth).toBe(7);

    fireEvent.change(select, { target: { value: "" } });
    expect(useStore.getState().birthMonth).toBeUndefined();
  });

  it("既存の birthMonth が select に初期表示される", () => {
    useStore.setState({ birthMonth: 9 });
    renderSettings();
    const select = screen.getByLabelText("誕生月") as HTMLSelectElement;
    expect(select.value).toBe("9");
  });
});

describe("SettingsScreen マスタ更新履歴 (PR-2d)", () => {
  it("最新 1 件のプレビュー (日付 + 件数) を常時表示し、全履歴は折りたたむ", () => {
    const latest = loadSyncHistory().entries[0];
    // このテストは bundle 同梱の SYNC_HISTORY.json が非空である前提 (常に entry あり)。
    expect(latest).toBeDefined();

    const { container } = renderSettings();

    // セクション見出し
    expect(
      screen.getByRole("heading", { name: "マスタ更新履歴", level: 3 }),
    ).toBeInTheDocument();

    // プレビュー行に最新の日付 + 件数が出る
    const preview = container.querySelector(".sync-history-preview");
    expect(preview).not.toBeNull();
    expect(preview?.textContent).toContain(latest.date);
    expect(preview?.textContent).toContain(`auto ${latest.totalCount} 件`);

    // 全履歴は details 折りたたみ (既定は閉じている)
    const details = container.querySelector(
      "details.sync-history-more",
    ) as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(screen.getByText(/過去の更新をすべて表示/)).toBeInTheDocument();
  });

  it("#settings/history で details を自動展開し scrollIntoView する", () => {
    window.location.hash = "#settings/history";
    const { container } = renderSettings();

    const details = container.querySelector(
      "details.sync-history-more",
    ) as HTMLDetailsElement | null;
    expect(details?.open).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("旧 #sync-history からの流入 (replaceRoute 前) でも自動展開する", () => {
    window.location.hash = "#sync-history";
    const { container } = renderSettings();

    const details = container.querySelector(
      "details.sync-history-more",
    ) as HTMLDetailsElement | null;
    expect(details?.open).toBe(true);
  });

  it("#settings (sub なし) では details は閉じたまま", () => {
    window.location.hash = "#settings";
    const { container } = renderSettings();

    const details = container.querySelector(
      "details.sync-history-more",
    ) as HTMLDetailsElement | null;
    expect(details?.open).toBe(false);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
