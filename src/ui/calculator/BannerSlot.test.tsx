// @vitest-environment jsdom
//
// PR-3a (N-1): 通知系バナー積層ガバナンスのテスト。
//   - selectBannerSlot: 優先度規則 (純関数) を網羅。
//   - BannerSlot 描画: onboarding 抑制 / today baseline の最小 jsdom 検証。
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BannerSlot } from "./BannerSlot";
import { selectBannerSlot } from "./bannerPriority";
import { useStore } from "../../state/store";

describe("selectBannerSlot (通知枠の優先度規則)", () => {
  it("onboarding は最優先で、update/today を抑制する", () => {
    expect(
      selectBannerSlot({
        onboardingActive: true,
        updateAvailable: true,
        todayAvailable: true,
      }),
    ).toBe("onboarding");
  });

  it("update は today より優先される (同時に出したい週は update 勝ち)", () => {
    expect(
      selectBannerSlot({
        onboardingActive: false,
        updateAvailable: true,
        todayAvailable: true,
      }),
    ).toBe("update");
  });

  it("update を dismiss した (updateAvailable=false) 週は today に切り替わる", () => {
    expect(
      selectBannerSlot({
        onboardingActive: false,
        updateAvailable: false,
        todayAvailable: true,
      }),
    ).toBe("today");
  });

  it("today も出せないなら何も出さない (null)", () => {
    expect(
      selectBannerSlot({
        onboardingActive: false,
        updateAvailable: false,
        todayAvailable: false,
      }),
    ).toBeNull();
  });

  it("onboarding 中は update/today が両方出せても onboarding が勝つ (常時1枚)", () => {
    // 「同時に 2 枚出さない」ことの担保。onboarding 以外は選ばれない。
    const kind = selectBannerSlot({
      onboardingActive: true,
      updateAvailable: false,
      todayAvailable: true,
    });
    expect(kind).toBe("onboarding");
    expect(kind).not.toBe("today");
  });
});

describe("BannerSlot (描画)", () => {
  beforeEach(() => {
    localStorage.clear();
    // データ空 → hasData=false → updateAvailable=false (today/onboarding のみ検証)
    useStore.getState().clearAll();
  });
  afterEach(cleanup);

  const baseProps = {
    programs: [],
    now: new Date("2026-07-15T09:00:00+09:00"),
    todayOpen: false,
    onToggleToday: () => {},
  };

  it("onboarding 中 (保有0枚) は通知枠に何も描画しない", () => {
    const { container } = render(
      <BannerSlot onboardingActive {...baseProps} />,
    );
    // today バナーも update バナーも出ない
    expect(screen.queryByText(/今日/)).not.toBeInTheDocument();
    expect(container.querySelector(".today-banner")).toBeNull();
    expect(container.querySelector(".update-banner")).toBeNull();
  });

  it("通常時 (onboarding外・update無し) は today バナーを描画する", () => {
    const { container } = render(
      <BannerSlot onboardingActive={false} {...baseProps} />,
    );
    expect(container.querySelector(".today-banner")).not.toBeNull();
    expect(screen.getByText(/今日/)).toBeInTheDocument();
  });
});
