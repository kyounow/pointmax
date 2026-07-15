// @vitest-environment jsdom
//
// PR-5b: 存続モーダルのネイティブ <dialog> 化。
//   - OK / キャンセルボタンが従来どおり resolve する。
//   - Esc (cancel イベント) で cancel 側に解決される。
//   - prompt は入力欄に初期フォーカスが当たる。
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Dialog } from "./Dialog";
import type { DialogState } from "./types";

afterEach(cleanup);

// jsdom は showModal 未実装のため、Dialog 側の open 属性フォールバックで可視化される。
// cancel イベントは bubbles:false のネイティブイベントを直接 dispatch して再現する。
function fireCancel(el: Element) {
  fireEvent(el, new Event("cancel", { bubbles: false, cancelable: true }));
}

describe("Dialog (ネイティブ <dialog> 化 PR-5b)", () => {
  it("<dialog> 要素として role=dialog で描画され、OK で true 解決", () => {
    const onConfirm = vi.fn();
    const state: DialogState = {
      type: "confirm",
      opts: { title: "確認" },
      resolve: () => {},
    };
    render(
      <Dialog
        state={state}
        onConfirm={onConfirm}
        onPrompt={() => {}}
        onAlert={() => {}}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("dialog-ok"));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("Esc (cancel イベント) で confirm が false 解決される", () => {
    const onConfirm = vi.fn();
    const state: DialogState = {
      type: "confirm",
      opts: { title: "確認" },
      resolve: () => {},
    };
    render(
      <Dialog
        state={state}
        onConfirm={onConfirm}
        onPrompt={() => {}}
        onAlert={() => {}}
      />,
    );
    fireCancel(screen.getByTestId("dialog-confirm"));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it("Esc (cancel イベント) で prompt が null 解決される", () => {
    const onPrompt = vi.fn();
    const state: DialogState = {
      type: "prompt",
      opts: { title: "入力" },
      resolve: () => {},
    };
    render(
      <Dialog
        state={state}
        onConfirm={() => {}}
        onPrompt={onPrompt}
        onAlert={() => {}}
      />,
    );
    fireCancel(screen.getByTestId("dialog-prompt"));
    expect(onPrompt).toHaveBeenCalledWith(null);
  });

  it("prompt は入力欄に初期フォーカスが当たる", () => {
    const state: DialogState = {
      type: "prompt",
      opts: { title: "誕生月", defaultValue: "3" },
      resolve: () => {},
    };
    render(
      <Dialog
        state={state}
        onConfirm={() => {}}
        onPrompt={() => {}}
        onAlert={() => {}}
      />,
    );
    const input = screen.getByTestId("dialog-prompt").querySelector("input");
    expect(input).toHaveFocus();
  });
});
