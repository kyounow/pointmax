// PR-4b (UX-5): 週次 cron の seed 更新を「起動時に自動反映してよいか」を判定する純関数。
//
// 【背景】
//   従来は差分があると SyncUpdateModal (フルスクリーン) が割り込んで「アプリに反映」を
//   押させていた。これを「安全な週は自動反映 + 事後 Undo バナー」に変え、削除や大きな
//   変更を含む週だけ従来モーダルへフォールバックする。その安全ラインを決めるのが本関数。
//
// 【安全 (自動反映してよい) の定義】
//   追加 (diff.* = 新しい card/store/program/membership 等) と、公式内容更新
//   (updatedPrograms = rate 改定・期間延長など既存 program の非破壊な値更新 /
//   updatedMemberships = 提携店舗の注記 (notes) など channel を変えない更新、PR-0a-2b) と、
//   期限切れ campaign の整理 (PR-6a-2 / U1): removedPrograms が **全て** 期限切れ
//   (validTo の翌日以降 = isExpiredRemoval) の tombstone で、その cascade membership の削除。
//   既に計算に効いていない還元が消えるだけなので確認を挟まない。期限切れ整理だけの週は
//   確認もバナーも出さずに反映する (planAutoApply の silent)。
//
// 【unsafe (従来モーダルで確認) の定義】= 以下のいずれかを含む週
//   1. 削除: 期限切れでない program の tombstone (validTo 当日・validTo 無し・日付不正を含む) /
//      その cascade membership / 単体 membership tombstone。
//      削除は「使えるはずの還元が消える」体験なので必ず確認を挟む。
//   2. scope 変更を含む更新: updatedPrograms の中に all-stores ⇄ member-stores の
//      付け替えがあるもの (mergeSeed.scopeChangedUpdateIds)。適用範囲の再定義は大きい。
//   3. channel 変更を含む更新 (PR-0a-2b): program / membership の購入チャネル (店頭 ⇄ ネット) が
//      変わるもの (mergeSeed.channelChangedUpdateIds)。店頭計算に載る・載らないが変わり、
//      見かけの還元が大きく動くので確認を挟む。
//   4. SEED_VERSION の bump (lastSeedVersion < SEED_VERSION): リリース級のデータ刷新。
//      これは UpdateBanner が担当する通知経路なので、自動反映では触らない。
//
// React 非依存の純関数として切り出し、node/jsdom どちらでも網羅テストできるようにする。

import type { MergeResult } from "./mergeSeed";
import type { BenefitProgram } from "./types";
import { classifyCampaignStatus } from "./ruleActiveAt";

/** isAutoApplySafe が参照する mergeSeed の判定材料 (テストで最小構築できるよう部分型)。 */
export type AutoApplySafetyDiff = Pick<
  MergeResult,
  | "removedPrograms"
  | "removedMembershipCount"
  | "removedMembershipIdCount"
  | "scopeChangedUpdateIds"
  | "channelChangedUpdateIds"
>;

export type AutoApplySafetyOptions = {
  /**
   * リリース級の版 bump を伴う週か (= lastSeedVersion < SEED_VERSION)。
   * true なら unsafe (UpdateBanner が担当するため自動反映しない)。
   */
  seedVersionBumped: boolean;
  /**
   * 期限切れ判定の基準時刻 (PR-6a-2)。UI は useToday() を渡す (端末の時計に依存する)。
   */
  now: Date;
};

/**
 * 削除された program が期限切れ (validTo 当日 23:59:59.999 ローカルより後) か (PR-6a-2 / U1)。
 * classifyCampaignStatus と同じ境界: validTo 当日は active = false。validTo 無し・validFrom だけ
 * (ongoing)・日付不正も false (= 期限切れと断定できない削除は確認を挟む)。
 */
export function isExpiredRemoval(
  p: Pick<BenefitProgram, "validFrom" | "validTo">,
  now: Date,
): boolean {
  return classifyCampaignStatus(p, now) === "expired";
}

/**
 * この週の seed 差分を起動時に自動反映してよいか。
 * true = 安全 (自動反映。バナーの有無は planAutoApply) / false = unsafe (従来モーダルで確認)。
 */
export function isAutoApplySafe(
  diff: AutoApplySafetyDiff,
  opts: AutoApplySafetyOptions,
): boolean {
  const removed = diff.removedPrograms;
  // main chunk の予算のため 1 式にまとめている。unsafe (false) になる条件を上から順に並べ、
  // どれにも当たらない週 (追加 + scope / channel 非変更の内容更新 (membership の notes 更新を含む)
  // + 期限切れ整理) が安全。
  // 削除 (2.) は「expiredOnly = removedPrograms.length > 0 && 全て isExpiredRemoval」のときだけ
  // program の tombstone とその cascade membership を許す、を次の 2 項で表している:
  //   - 期限切れでない program の削除が 1 件でもあれば unsafe。
  //   - cascade 件数は removedPrograms にぶら下がる分だけ (mergeSeed.applyProgramRemovals) なので、
  //     removedPrograms が全て期限切れなら cascade も期限切れ campaign の membership = 許容。
  //     ただし removedPrograms が空で cascade > 0 の不整合入力は unsafe ([].every は true なので
  //     every だけでは安全扱いになってしまう)。
  return !(
    // 1. 版 bump は自動反映しない (リリース級。UpdateBanner に委譲)。
    (
      opts.seedVersionBumped ||
      // 2. 期限切れでない削除 / removedPrograms が空の cascade 削除 / 単体 membership tombstone
      //    (単体 tombstone は期限と無関係な誤 merge の撤去なので従来どおり unsafe)。
      !removed.every((p) => isExpiredRemoval(p, opts.now)) ||
      (diff.removedMembershipCount > 0 && !removed.length) ||
      diff.removedMembershipIdCount > 0 ||
      // 3. scope 変更を含む更新。
      diff.scopeChangedUpdateIds.length > 0 ||
      // 4. channel (購入チャネル) 変更を含む更新 (PR-0a-2b)。
      diff.channelChangedUpdateIds.length > 0
    )
  );
}

/**
 * 起動時オーケストレータ (SyncUpdateModal) の振り分け (PR-6a-2 / U1)。
 *   - unsafe: 従来モーダルで確認。
 *   - silent: 期限切れ整理だけの週。確認もバナーも出さずに反映し、digest を既読化する。
 *   - notice: 追加・内容更新を含む週。自動反映 + Undo バナー (changeCount は期限切れ整理を除く件数)。
 */
export type AutoApplyPlan =
  | { kind: "unsafe" }
  | { kind: "silent"; expiredRemovedCount: number }
  | { kind: "notice"; changeCount: number; expiredRemovedCount: number };

/** unsafe の plan (共有の定数。SyncUpdateModal の merged=null 時にも使う)。 */
export const UNSAFE_PLAN: AutoApplyPlan = { kind: "unsafe" };

/**
 * totalChangeCount は mergeSeed.changeCount (追加 + 内容更新 + 削除の全変更種)。
 * silent 判定はこれが全変更種を数えている前提に立つ: changeCount に入らない変更種があると、
 * それだけが起きた週が「期限切れ整理のみ」と誤判定され無告知で反映される (結合テストで固定)。
 * safe なら removedPrograms は全て期限切れなので、その件数を引いた残りが追加・更新の件数。
 */
export function planAutoApply(
  diff: AutoApplySafetyDiff,
  totalChangeCount: number,
  opts: AutoApplySafetyOptions,
): AutoApplyPlan {
  if (!isAutoApplySafe(diff, opts)) return UNSAFE_PLAN;
  const expiredRemovedCount = diff.removedPrograms.length;
  const changeCount = totalChangeCount - expiredRemovedCount;
  return changeCount <= 0
    ? { kind: "silent", expiredRemovedCount }
    : { kind: "notice", changeCount, expiredRemovedCount };
}
