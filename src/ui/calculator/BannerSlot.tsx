// PR-3a (N-1): 計算画面上部の「通知系バナー」を 1 枚に絞る積層ガバナンス層。
//
// 【背景】
//   計算画面は UpdateBanner (SEED_VERSION 通知) / CalcTodayBanner (今日の割増) /
//   オンボーディング / hint / 結果付随バナー が積層し得て、全部出ると結果 1 位が
//   初期ビューポートに入らなかった。本コンポーネントは通知枠を常時 1 枚に統制する。
//
// 決定ロジックは純関数 selectBannerSlot (bannerSlot.ts) に切り出してテスト可能にしてある。
// 優先度: onboarding > swUpdate(将来) > update(SEED_VERSION) > autoApply(将来) > today

import type { ReactNode } from "react";
import { useShallow } from "zustand/shallow";
import type { BenefitProgram } from "../../domain/types";
import { useStore } from "../../state/store";
import { SEED_VERSION } from "../../state/seed";
import { useOnline } from "../hooks/useOnline";
import { UpdateBanner } from "../UpdateBanner";
import { CalcTodayBanner } from "./CalcTodayBanner";
import { selectBannerSlot } from "./bannerPriority";

type Props = {
  /**
   * オンボーディングを最優先枠に出すべきか。PR-3c で判定を
   * 「(① or ② 未完了) かつ 手動クローズしてない」に更新 (旧: 保有0枚)。
   * true の間は通知系 (update/today) を抑制し、onboarding ノードを枠に描画する。
   */
  onboardingActive: boolean;
  /** onboardingActive 時に枠へ描画するノード (OnboardingChecklist)。未指定なら空枠。 */
  onboarding?: ReactNode;
  programs: BenefitProgram[];
  /** 評価時刻 (親の useToday())。 */
  now: Date;
  /** CalcTodayBanner の内訳開閉状態 (親が保持)。 */
  todayOpen: boolean;
  onToggleToday: () => void;
};

export function BannerSlot({
  onboardingActive,
  onboarding,
  programs,
  now,
  todayOpen,
  onToggleToday,
}: Props) {
  const online = useOnline();
  // hasData は「いずれかの collection が非空」。UpdateBanner の表示ゲートと同条件。
  // mergeSeed の重い再計算を避けるため collection 長の合算だけを購読する
  // (UpdateBanner 側は自前の useSeedMerge で最終的に再ゲートするので二重で安全)。
  const { lastSeedVersion, hasData } = useStore(
    useShallow((s) => ({
      lastSeedVersion: s.lastSeedVersion,
      hasData:
        s.cards.length +
          s.currencies.length +
          s.stores.length +
          s.edges.length +
          s.pointCards.length +
          s.paymentApps.length >
        0,
    })),
  );

  const updateAvailable = online && hasData && lastSeedVersion < SEED_VERSION;

  const kind = selectBannerSlot({
    onboardingActive,
    updateAvailable,
    todayAvailable: true, // 今日の日付は常時有用な baseline
  });

  if (kind === "onboarding") {
    // onboarding 枠: 通知系を抑制し、代わりにチェックリスト (onboarding ノード) を出す。
    // ノード未指定 (旧テスト等) なら従来どおり空枠。
    return <>{onboarding ?? null}</>;
  }
  if (kind === "update") return <UpdateBanner />;
  if (kind === "today") {
    return (
      <CalcTodayBanner
        programs={programs}
        now={now}
        open={todayOpen}
        onToggle={onToggleToday}
      />
    );
  }
  // null は何も描画しない。
  return null;
}
