import type {
  BenefitProgram,
  ConversionEdge,
  LoyaltyRule,
  PointCard,
  StoreProgramMembership,
} from "./types";
import { bestPath } from "./bestPath";
import { isRuleActiveAt } from "./ruleActiveAt";
import { isProgramPreferenceActive } from "./programEvaluator";
import { membersFor, type MembershipIndex } from "./membershipIndex";
import type { PathCache } from "./pathCache";

export type LoyaltyResult = {
  pointCard: PointCard;
  // rule は LoyaltyRule (旧型、ユーザーカスタム) か BenefitProgram (v3 プログラムベース) のいずれか
  rule: LoyaltyRule;
  earnedAmount: number;
  earnedCurrencyId: string;
  pathSteps: ConversionEdge[];
  pathProduct: number;
  finalAmount: number;
  reachable: boolean;
};

// 単一の最良ロイヤリティ結果（後方互換）
export function bestLoyalty(
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  ownedPointCards: PointCard[],
  loyaltyRules: LoyaltyRule[],
  edges: ConversionEdge[],
  preferredPointCardIds?: string[],
  now: Date = new Date(),
): LoyaltyResult | null {
  const top = bestLoyalties(
    storeId,
    amount,
    targetCurrencyId,
    ownedPointCards,
    loyaltyRules,
    edges,
    1,
    preferredPointCardIds,
    now,
  );
  return top[0] ?? null;
}

// Top-N の重ね取り結果。同一 pointCard は1要素にまとめ、最終量降順で上位 maxStacks 件返す。
// preferredPointCardIds: 店舗の優先指定。同点還元時にこの順で優先採用される。
// now: キャンペーン期間判定の基準時刻 (テスト容易化のため引数化)
// availableCardIds: ConversionEdge.requiredCardIds のゲート判定に使う enabled なカード id の集合。
//   渡された場合のみ制約チェックが行われる (未指定 = 後方互換で全エッジ使用)。
// programs / memberships: v3 BenefitProgram ベースの loyalty 評価 (pointCardId を持つ programs)
// 同一 (pointCard, store) で複数 rule active なら最高 rate を採用。
export function bestLoyalties(
  storeId: string,
  amount: number,
  targetCurrencyId: string,
  ownedPointCards: PointCard[],
  loyaltyRules: LoyaltyRule[],
  edges: ConversionEdge[],
  maxStacks: number,
  preferredPointCardIds?: string[],
  now: Date = new Date(),
  availableCardIds?: ReadonlySet<string>,
  programs?: BenefitProgram[],
  memberships?: StoreProgramMembership[],
  /** optional: 事前構築済 membership index (rankCards から再利用) */
  membershipIndex?: MembershipIndex,
  /** optional: 事前構築済 path cache (rankCards から再利用、bestPath 重複呼出削減) */
  pathCache?: PathCache,
  /** optional: ユーザーの誕生月 (1-12)。birthdayMonthOnly program の発火判定に使う (PR-1d)。 */
  userBirthMonth?: number,
): LoyaltyResult[] {
  if (maxStacks <= 0) return [];

  const ownedById = new Map(ownedPointCards.map((p) => [p.id, p]));

  // 旧型 LoyaltyRule (ユーザーカスタム) からの候補
  const loyaltyApplicable = loyaltyRules.filter(
    (r) =>
      r.storeId === storeId &&
      ownedById.has(r.pointCardId) &&
      isRuleActiveAt(r, now),
  );

  // v3 BenefitProgram ベースの loyalty 候補 (pointCardId を持つ programs)
  const programApplicable: LoyaltyRule[] = [];
  if (programs && memberships) {
    // この store の membership を持つ programs + 全 store 適用 programs
    const storeMembers = membershipIndex
      ? membersFor(membershipIndex, storeId)
      : memberships.filter((m) => m.storeId === storeId);
    const memberProgramIds = new Set(storeMembers.map((m) => m.programId));

    for (const p of programs) {
      if (!p.pointCardId) continue;
      // R1 (PR-1d): per-user preference / 誕生月ゲート (通常 program 評価と同一判定)。
      if (!isProgramPreferenceActive(p, now, userBirthMonth)) continue;
      if (!isRuleActiveAt(p, now)) continue;
      if (!ownedById.has(p.pointCardId)) continue;

      // store membership チェック (v6: scope="all-stores" のみ全 store 適用、
      // それ以外は当該 store の membership がある場合のみ)。
      const hasMembershipForStore = memberProgramIds.has(p.id);
      const isGlobalProgram = p.scope === "all-stores";
      if (!hasMembershipForStore && !isGlobalProgram) continue;

      const membership = storeMembers.find((m) => m.programId === p.id);
      const effectiveRate = membership?.overrideRate ?? p.rate;
      const effectiveCurrencyId = membership?.overrideCurrencyId ?? p.currencyId;

      // BenefitProgram を LoyaltyRule 形式に変換 (id は program.id で衝突回避)
      programApplicable.push({
        id: p.id,
        storeId,
        pointCardId: p.pointCardId,
        rate: effectiveRate,
        currencyId: effectiveCurrencyId,
        validFrom: p.validFrom,
        validTo: p.validTo,
        recurringDays: p.recurringDays,
        recurringWeekdays: p.recurringWeekdays,
        notes: p.notes,
      });
    }
  }

  // 全候補: 旧型 + プログラムベース
  // 同一 (pointCardId, store) で両方あれば最高 rate が採用される
  const applicable = [...loyaltyApplicable, ...programApplicable];
  if (applicable.length === 0) return [];

  const evaluated: LoyaltyResult[] = applicable.map((rule) => {
    const pc = ownedById.get(rule.pointCardId)!;
    // 注: program の monthlyCapAmountYen は現状この loyalty 経路へ伝播していない
    // (cap 付き program は paymentApp 系のみで rankCards 側でクランプ済み。将来 pointCard 系の
    // cap 付き program が登場したら、ここにも per-tx クランプを追加すること)。
    const earnedAmount = amount * rule.rate;
    const earnedCurrencyId = rule.currencyId ?? pc.currencyId;
    const path = pathCache
      ? pathCache.resolve(earnedCurrencyId, targetCurrencyId, earnedAmount)
      : bestPath(
          edges,
          earnedCurrencyId,
          targetCurrencyId,
          earnedAmount,
          availableCardIds,
        );
    if (path === null) {
      return {
        pointCard: pc,
        rule,
        earnedAmount,
        earnedCurrencyId,
        pathSteps: [],
        pathProduct: 0,
        finalAmount: 0,
        reachable: false,
      };
    }
    return {
      pointCard: pc,
      rule,
      earnedAmount,
      earnedCurrencyId,
      pathSteps: path.steps,
      pathProduct: path.product,
      finalAmount: path.finalAmount,
      reachable: true,
    };
  });

  // 1) reachable 優先 / 2) finalAmount 降順
  // 3) 店舗の preferredPointCardIds 順
  // 4) ownedPointCards 配列順
  // 5) earnedAmount 降順
  const userPriorityIndex = new Map(ownedPointCards.map((p, i) => [p.id, i]));
  const storePriorityIndex = new Map(
    (preferredPointCardIds ?? []).map((id, i) => [id, i]),
  );
  evaluated.sort((a, b) => {
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
    if (a.finalAmount !== b.finalAmount) return b.finalAmount - a.finalAmount;
    const aStore =
      storePriorityIndex.get(a.pointCard.id) ?? Number.POSITIVE_INFINITY;
    const bStore =
      storePriorityIndex.get(b.pointCard.id) ?? Number.POSITIVE_INFINITY;
    if (aStore !== bStore) return aStore - bStore;
    const aUser =
      userPriorityIndex.get(a.pointCard.id) ?? Number.POSITIVE_INFINITY;
    const bUser =
      userPriorityIndex.get(b.pointCard.id) ?? Number.POSITIVE_INFINITY;
    if (aUser !== bUser) return aUser - bUser;
    return b.earnedAmount - a.earnedAmount;
  });

  // 同一 pointCard は最初に出てくる(=最良)1件のみ採用
  const seen = new Set<string>();
  const dedup: LoyaltyResult[] = [];
  for (const r of evaluated) {
    if (seen.has(r.pointCard.id)) continue;
    seen.add(r.pointCard.id);
    dedup.push(r);
    if (dedup.length >= maxStacks) break;
  }
  return dedup;
}
