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

  // ─── PR-4b: 新枠 swUpdate / autoApply の優先度 ───
  it("swUpdate は onboarding の次点で update/autoApply/today より優先", () => {
    expect(
      selectBannerSlot({
        onboardingActive: false,
        swUpdateAvailable: true,
        updateAvailable: true,
        autoApplyAvailable: true,
        todayAvailable: true,
      }),
    ).toBe("swUpdate");
  });

  it("autoApply は update の下・today の上 (update 無しなら autoApply)", () => {
    expect(
      selectBannerSlot({
        onboardingActive: false,
        swUpdateAvailable: false,
        updateAvailable: false,
        autoApplyAvailable: true,
        todayAvailable: true,
      }),
    ).toBe("autoApply");
  });

  it("update と autoApply が同時なら update が勝つ", () => {
    expect(
      selectBannerSlot({
        onboardingActive: false,
        updateAvailable: true,
        autoApplyAvailable: true,
        todayAvailable: true,
      }),
    ).toBe("update");
  });

  it("新枠を省略しても既存挙動は不変 (後方互換)", () => {
    expect(
      selectBannerSlot({
        onboardingActive: false,
        updateAvailable: false,
        todayAvailable: true,
      }),
    ).toBe("today");
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

  it("autoApplyNotice が立つと autoApply バナーを描画する (今日より優先)", () => {
    // clearAll 済 (データ空) → update 無し。notice を立てて autoApply 枠を出す。
    useStore.setState({ autoApplyNotice: { digest: "d-1", count: 2 } });
    const { container } = render(
      <BannerSlot onboardingActive={false} {...baseProps} />,
    );
    expect(container.querySelector(".auto-apply-banner")).not.toBeNull();
    expect(screen.getByText(/マスタを自動更新しました/)).toBeInTheDocument();
    expect(container.querySelector(".today-banner")).toBeNull();
  });

  it("SW 更新後の初回起動は swUpdate バナーを描画する (最優先の通知枠)", () => {
    // ビルド識別子が前回と違う状態を作る → isSwUpdated=true。
    localStorage.setItem("pointmax:build-id:v1", "OLD-BUILD-ID");
    const { container } = render(
      <BannerSlot onboardingActive={false} {...baseProps} />,
    );
    expect(container.querySelector(".sw-update-banner")).not.toBeNull();
    expect(
      screen.getByText(/アプリを新しいバージョンに更新しました/),
    ).toBeInTheDocument();
  });
});
