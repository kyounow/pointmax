// @vitest-environment jsdom
//
// PR-6d (U6): ErrorBoundary の既定 fallback (RecoveryPanel の screen モード) のテスト。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ErrorBoundary } from "./ErrorBoundary";

// モジュール変数で子の throw を切り替える (「もう一度試す」後に throw しなくなる子)。
let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error("bomb exploded");
  return <p>子が描画されました</p>;
}

let errorSpy: ReturnType<typeof vi.spyOn>;
let originalLocation: Location;
const reloadMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  shouldThrow = true;
  reloadMock.mockClear();
  // React と componentDidCatch の console.error を抑える (内容は個別に検査する)
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  originalLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, reload: reloadMock },
  });
});
afterEach(() => {
  cleanup();
  errorSpy.mockRestore();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("ErrorBoundary (PR-6d 既定 fallback = RecoveryPanel screen)", () => {
  it("子が throw すると role=alert のパネルに scopeName とメッセージが出る", () => {
    render(
      <ErrorBoundary scopeName="計算">
        <Bomb />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("エラーが発生しました");
    expect(alert).toHaveTextContent("(計算)");
    expect(alert).toHaveTextContent("bomb exploded");
    // screen モードは「もう一度試す」を出す
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });

  it("[もう一度試す] で reset され、throw しなくなった子が再描画される", () => {
    render(
      <ErrorBoundary scopeName="計算">
        <Bomb />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(screen.getByText("子が描画されました")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("[ページを再読み込み] で location.reload が呼ばれる", () => {
    render(
      <ErrorBoundary scopeName="計算">
        <Bomb />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "ページを再読み込み" }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("fallback prop があればそちらが優先される (null 縮退にも使える)", () => {
    const { container } = render(
      <div>
        <ErrorBoundary scopeName="X" fallback={(e) => <p>custom: {e.message}</p>}>
          <Bomb />
        </ErrorBoundary>
        <ErrorBoundary scopeName="Y" fallback={() => null}>
          <Bomb />
        </ErrorBoundary>
      </div>,
    );
    expect(screen.getByText("custom: bomb exploded")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.textContent).toBe("custom: bomb exploded");
  });

  it("console.error に '[ErrorBoundary / X]' が出る", () => {
    render(
      <ErrorBoundary scopeName="X">
        <Bomb />
      </ErrorBoundary>,
    );
    expect(
      errorSpy.mock.calls.some((c: unknown[]) => c[0] === "[ErrorBoundary / X]"),
    ).toBe(true);
  });
});
