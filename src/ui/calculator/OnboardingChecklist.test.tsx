// @vitest-environment jsdom
//
// PR-3c (ONB-1): オンボーディングチェックリストの完了状態表示と、手動クローズの
// 独立 localStorage キーのテスト。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { OnboardingChecklist } from "./OnboardingChecklist";
import {
  isOnboardingDismissed,
  dismissOnboarding,
  clearOnboardingDismissed,
} from "../../state/onboardingDismissed";

afterEach(cleanup);

describe("onboardingDismissed (persist 外の独立キー)", () => {
  beforeEach(() => localStorage.clear());

  it("初期状態は未クローズ (false)", () => {
    expect(isOnboardingDismissed()).toBe(false);
  });

  it("dismissOnboarding で true、clearOnboardingDismissed で false に戻る", () => {
    dismissOnboarding();
    expect(isOnboardingDismissed()).toBe(true);
    clearOnboardingDismissed();
    expect(isOnboardingDismissed()).toBe(false);
  });

  it("専用キーにのみ書き、persist スキーマ (pointmax:store) を触らない", () => {
    dismissOnboarding();
    expect(localStorage.getItem("pointmax:onboarding-dismissed:v1")).toBe("1");
    // store 系の永続キーには一切書かない (独立性の担保)
    const keys = Object.keys(localStorage);
    expect(keys.some((k) => k.startsWith("pointmax:store"))).toBe(false);
  });
});

describe("OnboardingChecklist (2ステップの完了状態)", () => {
  beforeEach(() => localStorage.clear());

  it("両方未完了 (カード0枚 / 通貨空): 両ステップに遷移ボタンを出す", () => {
    render(
      <OnboardingChecklist
        step1Done={false}
        step2Done={false}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "ウォレットを開く" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "通貨画面を開く" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("完了")).not.toBeInTheDocument();
  });

  it("① のみ完了 (カード1枚以上 / 通貨空): ①=完了、②=ボタンのまま", () => {
    render(
      <OnboardingChecklist step1Done step2Done={false} onClose={() => {}} />,
    );
    expect(
      screen.queryByRole("button", { name: "ウォレットを開く" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "通貨画面を開く" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("完了")).toHaveLength(1);
  });

  it("② のみ完了 (カード0枚 / 通貨非空): ①=ボタンのまま、②=完了", () => {
    render(
      <OnboardingChecklist step1Done={false} step2Done onClose={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "ウォレットを開く" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "通貨画面を開く" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("完了")).toHaveLength(1);
  });

  it("両方完了: 両ステップとも「完了」でボタン無し", () => {
    render(<OnboardingChecklist step1Done step2Done onClose={() => {}} />);
    expect(
      screen.queryByRole("button", { name: "ウォレットを開く" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "通貨画面を開く" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("完了")).toHaveLength(2);
  });

  it("✕ で onClose が呼ばれる (手動クローズ)", () => {
    const onClose = vi.fn();
    render(
      <OnboardingChecklist
        step1Done={false}
        step2Done={false}
        onClose={onClose}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "オンボーディングを閉じる" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
