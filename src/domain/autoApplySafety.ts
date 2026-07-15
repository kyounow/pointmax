// PR-4b (UX-5): 週次 cron の seed 更新を「起動時に自動反映してよいか」を判定する純関数。
//
// 【背景】
//   従来は差分があると SyncUpdateModal (フルスクリーン) が割り込んで「アプリに反映」を
//   押させていた。これを「安全な週は自動反映 + 事後 Undo バナー」に変え、削除や大きな
//   変更を含む週だけ従来モーダルへフォールバックする。その安全ラインを決めるのが本関数。
//
// 【安全 (自動反映してよい) の定義】
//   追加 (diff.* = 新しい card/store/program/membership 等) と、公式内容更新
//   (updatedPrograms = rate 改定・期間延長など既存 program の非破壊な値更新) のみ。
//
// 【unsafe (従来モーダルで確認) の定義】= 以下のいずれかを含む週
//   1. 削除: removedPrograms (tombstone) / cascade membership / 単体 membership tombstone。
//      削除は「使えるはずの還元が消える」体験なので必ず確認を挟む。
//   2. scope 変更を含む更新: updatedPrograms の中に all-stores ⇄ member-stores の
//      付け替えがあるもの (mergeSeed.scopeChangedUpdateIds)。適用範囲の再定義は大きい。
//   3. SEED_VERSION の bump (lastSeedVersion < SEED_VERSION): リリース級のデータ刷新。
//      これは UpdateBanner が担当する通知経路なので、自動反映では触らない。
//
// React 非依存の純関数として切り出し、node/jsdom どちらでも網羅テストできるようにする。

import type { MergeResult } from "./mergeSeed";

/** isAutoApplySafe が参照する mergeSeed の判定材料 (テストで最小構築できるよう部分型)。 */
export type AutoApplySafetyDiff = Pick<
  MergeResult,
  | "removedPrograms"
  | "removedMembershipCount"
  | "removedMembershipIdCount"
  | "scopeChangedUpdateIds"
>;

export type AutoApplySafetyOptions = {
  /**
   * リリース級の版 bump を伴う週か (= lastSeedVersion < SEED_VERSION)。
   * true なら unsafe (UpdateBanner が担当するため自動反映しない)。
   */
  seedVersionBumped: boolean;
};

/**
 * この週の seed 差分を起動時に自動反映してよいか。
 * true = 安全 (自動反映 + Undo バナー) / false = unsafe (従来モーダルで確認)。
 */
export function isAutoApplySafe(
  diff: AutoApplySafetyDiff,
  opts: AutoApplySafetyOptions,
): boolean {
  // 1. 版 bump は自動反映しない (リリース級。UpdateBanner に委譲)。
  if (opts.seedVersionBumped) return false;
  // 2. あらゆる削除を含む週は unsafe。
  if (diff.removedPrograms.length > 0) return false;
  if (diff.removedMembershipCount > 0) return false;
  if (diff.removedMembershipIdCount > 0) return false;
  // 3. scope 変更を含む更新は unsafe。
  if (diff.scopeChangedUpdateIds.length > 0) return false;
  // 追加 + scope 非変更の内容更新のみ = 安全。
  return true;
}
