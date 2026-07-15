// PR-3a (N-1): 計算画面「通知系バナー」積層ガバナンスの決定ロジック (純関数)。
//
// React コンポーネント (BannerSlot.tsx) から切り出して、fast-refresh を壊さず
// node/jsdom どちらでも単体テストできるようにしてある。
//
// 【ガバナンス規則】
//   - 通知枠は「常時 1 枚まで」。優先度順で最初に表示可能な 1 種だけ描画する。
//   - onboarding (保有 0 枚) 表示中は通知の情報価値が薄いので通知枠を全抑制する
//     (onboarding が最優先で勝ち、update/today を出さない)。onboarding 本体の
//     2 ステップ box は結果セクション側に別途描画されるため、通知枠は空になる。
//   - 結果付随バナー (CalcLoyaltyBanner / CalcUpgradeBanner) は "別勘定" で結果
//     セクション側に置くため本スロットの対象外 (競合しない)。

/** 通知枠に入りうるバナー種別 (将来枠 swUpdate / autoApply を含む)。 */
export type BannerKind =
  | "onboarding"
  | "swUpdate"
  | "update"
  | "autoApply"
  | "today";

export type BannerSlotInput = {
  /** 保有カード 0 枚のオンボーディング表示中か。true なら通知枠を全抑制する。 */
  onboardingActive: boolean;
  /** SEED_VERSION リリース通知 (UpdateBanner) を出せる状態か。 */
  updateAvailable: boolean;
  /** 今日バナー (CalcTodayBanner) を出せる状態か。日付は常時有用なので通常 true。 */
  todayAvailable: boolean;
  /**
   * PR-4b: Service Worker 更新通知 (CalcSwUpdateBanner) を出せる状態か。
   * onboarding の次点・最優先の通知枠 (アプリ自体が新版になった事実は最も上位)。
   * 省略時 false (既存呼び出し互換)。
   */
  swUpdateAvailable?: boolean;
  /**
   * PR-4b: 自動反映バナー (CalcAutoApplyBanner) を出せる状態か。
   * 優先度は update(SEED_VERSION) の下・today の上。省略時 false (既存呼び出し互換)。
   */
  autoApplyAvailable?: boolean;
};

// 表示優先度 (高い順)。最初に available な 1 種だけを描画する。
// 将来枠 swUpdate / autoApply の順位もここに予約済み。
export const BANNER_PRIORITY: BannerKind[] = [
  "onboarding",
  "swUpdate",
  "update",
  "autoApply",
  "today",
];

/**
 * 通知枠に描画すべきバナー 1 種を優先度順に決定する純関数。
 * どれも表示不可なら null。
 */
export function selectBannerSlot(input: BannerSlotInput): BannerKind | null {
  const available: Record<BannerKind, boolean> = {
    onboarding: input.onboardingActive,
    swUpdate: input.swUpdateAvailable ?? false,
    update: input.updateAvailable,
    autoApply: input.autoApplyAvailable ?? false,
    today: input.todayAvailable,
  };
  for (const kind of BANNER_PRIORITY) {
    if (available[kind]) return kind;
  }
  return null;
}
