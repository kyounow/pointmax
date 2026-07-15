// @vitest-environment jsdom
//
// PR-5b: SchemaUpgradeModal のネイティブ <dialog> 化。
//   - <dialog> として描画される。
//   - reset 必須のため Esc (cancel イベント) では閉じない (onCancel を preventDefault)。
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SchemaUpgradeModal } from "./SchemaUpgradeModal";

afterEach(cleanup);

function fireCancel(el: Element) {
  fireEvent(el, new Event("cancel", { bubbles: false, cancelable: true }));
}

describe("SchemaUpgradeModal (ネイティブ <dialog> 化 PR-5b)", () => {
  it("<dialog> として描画され、Esc (cancel) では閉じない", () => {
    render(
      <SchemaUpgradeModal
        strategy={{ type: "reset", reason: "旧バージョンからのリセットが必要です" }}
      />,
    );
    const dlg = screen.getByRole("dialog");
    expect(dlg).toBeInTheDocument();
    expect(
      screen.getByText(/旧バージョンからのリセットが必要です/),
    ).toBeInTheDocument();

    // 閉じられない仕様: cancel を preventDefault するのでモーダルは残り続ける。
    fireCancel(dlg);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
