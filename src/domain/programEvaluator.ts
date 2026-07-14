// PointMax v3: BenefitProgram の評価エンジン
//
// 入力: card / store / paymentApp / programs / memberships / 期間
// 出力: 該当 program 群、適用 rate (primary 最大値) + addOn 合計
//
// 旧 resolveRate.ts と並行運用 (PR 1 期、JAL特約店 のみ Program 化)。
// PR 2 で他の旧 rule も Program 化、PR 3 で resolveRate.ts 削除。

import { isRuleActiveAt } from "./ruleActiveAt";
import { membersFor, type MembershipIndex } from "./membershipIndex";
import type { BenefitProgram, Card, PaymentApp, Store, StoreProgramMembership } from "./types";

export type ProgramMatch = {
  program: BenefitProgram;
  effectiveRate: number;        // membership.overrideRate ?? program.rate
  effectiveCurrencyId: string;  // membership.overrideCurrencyId ?? program.currencyId
  membership?: StoreProgramMembership;
};

export type ProgramEvalResult = {
  // primary: 排他的、effectiveRate 数値最大を選んだ 1 件 (もしくは null = 該当なし)。
  // 後方互換のため残す。target 通貨を考慮した選択をしたい caller は primaryCandidates を使う。
  primary: ProgramMatch | null;
  // primaryCandidates: 全 primary 候補 (effectiveRate 降順)。
  // target 通貨への path を踏まえて最適 primary を再選択したい caller 向け
  // (例: rankCards.ts は selectPrimaryForTarget() に渡して path-aware に選び直す)。
  // primary == primaryCandidates[0] ?? null。
  // 監査残 B (異種通貨 primary の path 込み比較) のために v5.x で追加。
  primaryCandidates: ProgramMatch[];
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
  /** optional: 事前構築済 membership index。複数 store/card で再利用するときに渡す。 */
  membershipIndex?: MembershipIndex;
}): ProgramEvalResult {
  const { card, store, paymentApp, programs, memberships, now = new Date(), membershipIndex } = args;

  // 1. この store に該当する membership を抽出 (index が渡されていれば O(1) lookup)
  const storeMembers = membershipIndex
    ? membersFor(membershipIndex, store.id)
    : memberships.filter((m) => m.storeId === store.id);
  const memberProgramIds = new Set(storeMembers.map((m) => m.programId));

  // 2. program 候補: storeId match の membership あり、もしくは scope="all-stores" = 全 store 適用。
  //    v6 で「membership 有無からの推論」を廃止し program.scope のみで判定する。

  // 2a. chargeBased paymentApp 経由のときは paymentAppId を持たない program を全部除外する。
  //     候補生成時に lift して loop 本体の早期 continue を減らす (A-3 audit-fix)。
  //     chargeBased = カードは「チャージ元」(0% 還元) で決済主体は paymentApp なので、
  //     カード単体特典 (cardIds-only) や全カード共通の汎用特典は paymentApp 経由では
  //     発動しないのが論理的整合 (例: Olive 選べる特典 +1% は Olive 直接決済時のみ、
  //     楽天Pay/d払い 経由では発動しない)。
  //     paymentApp 専用 program / paymentApp × card 組合せ program は paymentAppId 指定済。
  const filterChargeBased = paymentApp.chargeBased;

  const candidates = programs.filter((p) => {
    // pointCardId 系は別 phase で評価
    if (p.pointCardId) return false;
    // chargeBased early-exit: paymentAppId を持たない program は paymentApp 経由で発動しない
    if (filterChargeBased && !p.paymentAppId) return false;
    // この store に紐づく？ or 全 store 適用 (scope="all-stores")？
    const hasMembershipForStore = memberProgramIds.has(p.id);
    const isGlobalProgram = p.scope === "all-stores";
    if (!hasMembershipForStore && !isGlobalProgram) return false;
    return true;
  });

  // 3. 各 program の発動条件を評価
  const eligible: ProgramMatch[] = [];
  for (const p of candidates) {
    if (!isRuleActiveAt(p, now)) continue;
    if (p.cardIds && !p.cardIds.includes(card.id)) continue;
    if (p.paymentAppId && p.paymentAppId !== paymentApp.id) continue;

    const membership = storeMembers.find((m) => m.programId === p.id);
    eligible.push({
      program: p,
      effectiveRate: membership?.overrideRate ?? p.rate,
      effectiveCurrencyId: membership?.overrideCurrencyId ?? p.currencyId,
      membership,
    });
  }

  // 4. primary と addOn を分離。
  //    primary 候補は effectiveRate 降順 sort して全て返す (caller が target 通貨を踏まえて選び直せるように)。
  //    primary フィールドは旧 caller / back-compat 用に primaryCandidates[0] を入れる
  //    (= effectiveRate 単純最大、target 不問)。
  const primaryCandidates = eligible
    .filter((m) => (m.program.bonusType ?? "primary") === "primary")
    .slice()
    .sort((a, b) => b.effectiveRate - a.effectiveRate);
  const addOns = eligible.filter((m) => m.program.bonusType === "addOn");

  const primary: ProgramMatch | null = primaryCandidates[0] ?? null;

  return { primary, primaryCandidates, addOns };
}
