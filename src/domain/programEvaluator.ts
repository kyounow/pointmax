// PointMax v3: BenefitProgram の評価エンジン
//
// 入力: card / store / paymentApp / programs / memberships / 期間
// 出力: 該当 program 群、適用 rate (primary 最大値) + addOn 合計
//
// 旧 resolveRate.ts と並行運用 (PR 1 期、JAL特約店 のみ Program 化)。
// PR 2 で他の旧 rule も Program 化、PR 3 で resolveRate.ts 削除。

import { isRuleActiveAt } from "./ruleActiveAt";
import type { BenefitProgram, Card, PaymentApp, Store, StoreProgramMembership } from "./types";

export type ProgramMatch = {
  program: BenefitProgram;
  effectiveRate: number;        // membership.overrideRate ?? program.rate
  effectiveCurrencyId: string;  // membership.overrideCurrencyId ?? program.currencyId
  membership?: StoreProgramMembership;
};

export type ProgramEvalResult = {
  // primary: 排他的、最大 rate を選んだ 1 件 (もしくは null = 該当なし)
  primary: ProgramMatch | null;
  // addOn: 全部加算する候補
  addOns: ProgramMatch[];
};

/**
 * card × store × paymentApp の組合せで該当する program を評価。
 * pointCard 系 (loyalty) は別 phase で評価するため、ここでは pointCardId を持つ program は除外。
 */
export function evaluatePrograms(args: {
  card: Card;
  store: Store;
  paymentApp: PaymentApp;
  programs: BenefitProgram[];
  memberships: StoreProgramMembership[];
  now?: Date;
}): ProgramEvalResult {
  const { card, store, paymentApp, programs, memberships, now = new Date() } = args;

  // 1. この store に該当する membership を抽出
  const storeMembers = memberships.filter((m) => m.storeId === store.id);
  const memberProgramIds = new Set(storeMembers.map((m) => m.programId));

  // 2. program 候補: storeId match の membership あり、もしくは membership 無し = 全 store 適用
  const programIdsWithAnyMembership = new Set(memberships.map((m) => m.programId));

  const candidates = programs.filter((p) => {
    // pointCardId 系は別 phase で評価
    if (p.pointCardId) return false;
    // この store に紐づく？ or 全 store 適用 (membership 無し)？
    const hasMembershipForStore = memberProgramIds.has(p.id);
    const isGlobalProgram = !programIdsWithAnyMembership.has(p.id);
    if (!hasMembershipForStore && !isGlobalProgram) return false;
    return true;
  });

  // 3. 各 program の発動条件を評価
  const eligible: ProgramMatch[] = [];
  for (const p of candidates) {
    if (!isRuleActiveAt(p, now)) continue;
    if (p.cardIds && !p.cardIds.includes(card.id)) continue;
    if (p.paymentAppId && p.paymentAppId !== paymentApp.id) continue;

    // chargeBased paymentApp 経由のときは paymentAppId を持たない program を除外する。
    // chargeBased = カードは「チャージ元」(0% 還元) で決済主体は paymentApp なので、
    // カード単体特典 (cardIds-only) や全カード共通の汎用特典は paymentApp 経由では
    // 発動しないのが論理的整合 (例: Olive 選べる特典 +1% は Olive 直接決済時のみ、
    // 楽天Pay/d払い 経由では発動しない)。
    // paymentApp 専用 program (prog-rakuten-pay-base 等) や paymentApp × card 組合せ
    // program (prog-rakuten-pay-rakuten-card-addon 等) は paymentAppId 指定済なので
    // この除外の対象外 (上の line 62 で paymentAppId == paymentApp.id を既に検証済)。
    if (paymentApp.chargeBased && !p.paymentAppId) continue;

    const membership = storeMembers.find((m) => m.programId === p.id);
    eligible.push({
      program: p,
      effectiveRate: membership?.overrideRate ?? p.rate,
      effectiveCurrencyId: membership?.overrideCurrencyId ?? p.currencyId,
      membership,
    });
  }

  // 4. primary と addOn を分離、primary は最大 rate 選択
  const primaryCandidates = eligible.filter(
    (m) => (m.program.bonusType ?? "primary") === "primary",
  );
  const addOns = eligible.filter((m) => m.program.bonusType === "addOn");

  let primary: ProgramMatch | null = null;
  for (const c of primaryCandidates) {
    if (!primary || c.effectiveRate > primary.effectiveRate) primary = c;
  }

  return { primary, addOns };
}
