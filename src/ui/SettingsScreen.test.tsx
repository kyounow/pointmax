// @vitest-environment jsdom
//
// PR-2b2: 設定画面の「誕生月」設定 (恒久設定箇所) のテスト。
//   - select で月を選ぶと store.birthMonth に反映される。
//   - 未設定を選ぶと undefined に戻る。
//   - 既存の birthMonth が select に初期表示される。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SettingsScreen } from "./SettingsScreen";
import { DialogProvider } from "./dialog/DialogProvider";
import { useStore } from "../state/store";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  vi.restoreAllMocks();
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
