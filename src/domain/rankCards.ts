import type {
  BenefitProgram,
  Card,
  ConversionEdge,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreProgramMembership,
} from "./types";
import { bestLoyalties, type LoyaltyResult } from "./loyalty";
import { buildMembershipIndex } from "./membershipIndex";
import { makePathCache } from "./pathCache";
import { evaluatePrograms } from "./programEvaluator";
import { selectPrimaryForTarget } from "./selectPrimary";
import { computeBlockedCurrencyIds } from "./currencyGating";

// ResolvedRate は programEvaluator ベース。後方互換のため source フィールドを維持。
export type ResolvedRate =
  | { rate: number; currencyId: string; source: "default" }
  | { rate: number; currencyId: string; source: "charge" }
  | {
      rate: number;
      currencyId: string;
      source: "program";
      programId: string;
    };

export type RankInput = {
  payment: { storeId: string; amount: number };
  targetCurrencyId: string;
  cards: Card[];
  stores: Store[];
  edges: ConversionEdge[];
  pointCards?: PointCard[];
  loyaltyRules?: LoyaltyRule[];
  paymentApps?: PaymentApp[];
  programs?: BenefitProgram[];
  memberships?: StoreProgramMembership[];
};

// 異種通貨 addOn 分離表示用のエントリ (v5.1.3 audit-fix C)。
// addOn program ごとに「通貨」「rate」「earn 額 (pre-conversion)」「target 通貨換算 (post-conversion)」
// と通過 edge を保持して、UI 側で通貨混在時も誤誘導表示にならないようにする。
// 例: Olive 選べる特典 (v-pt) + 楽天Pay × 楽天カード上乗せ (rakuten-pt) が同時発火しても
// "1.50% / 150 Vポイント" の合算表示ではなく "1% v-pt + 0.5% rakuten-pt" として表示可能。
export type AddOnBreakdownEntry = {
  programId: string;
  programName: string;
  rate: number;
  earnedAmount: number;          // addOn 通貨での earn 量 (pre-conversion)
  earnedCurrencyId: string;
  finalAmount: number;           // target 通貨換算後の金額 (post-conversion)
  pathSteps: ConversionEdge[];
};

export type CardRanking = {
  card: Card;
  resolved: ResolvedRate;
  earnedAmount: number;
  earnedCurrencyId: string;
  pathSteps: ConversionEdge[];
  pathProduct: number;
  finalAmount: number;
  reachable: boolean;
  // 採用された支払アプリ (paymentApps が渡されない場合は null)
  paymentApp: PaymentApp | null;
  // 支払アプリのbonus還元結果 (summary fields; backward compat / tie-break ソート用)
  // 異種通貨が混在する場合は「first-currency のみの earn」「全 rate 合算」になるため
  // 表示には appBonusBreakdown を使う方が正確 (UI v5.1.3 で複数行表示に切替)。
  appBonusRate: number; // 実際に適用された bonus 還元率 (全通貨ぶんの合計)
  appBonusFinalAmount: number; // target通貨換算合計 (全通貨合算後、最終金額)
  appBonusEarnedAmount: number; // bonus額 (first-currency のみ合算、レガシー)
  appBonusCurrencyId: string | null; // first-currency
  appBonusReachable: boolean;
  // 通貨別の addOn 内訳 (v5.1.3 audit-fix C 追加、UI で混在表示に使用)
  appBonusBreakdown: AddOnBreakdownEntry[];
  // ポイントカード提示の二重取り
  loyalties: LoyaltyResult[];
  totalFinalAmount: number;
};

// v6.0.0: 「未使用のポイントカードを有効化すればこれだけお得になる」提案。
// MAIN (使う資産) と FULL (全ポイントカード ON) の差分から算出。
// disabled なポイントカードが 1 枚も無ければ null。
export type ScopeUpgrade = {
  deltaFinalAmount: number; // best achievable total の増分 (> 0)
  loyaltyDelta: number; // うち loyalty 二重取りの増分
  routeDelta: number; // うち交換ルート改善の増分 (= delta - loyaltyDelta、>= 0 にクランプ)
  addedLoyalties: LoyaltyResult[]; // 新たに二重取りに加わる pointCard 群 (FULL にあって MAIN に無い)
  unlockCurrencyIds: string[]; // ルート改善のため使い始めるべき通貨 (UI で pointCard 名に逆引き)
};

// v6.0.0: rankCards の戻り値。rankings = 現在の最適 (MAIN)、upgrade = 未使用資産有効化提案。
export type RankResult = {
  rankings: CardRanking[];
  upgrade: ScopeUpgrade | null;
};

// このカード × この支払アプリが使えるか判定
function isPaymentAppCompatible(card: Card, paymentApp: PaymentApp): boolean {
  if (!paymentApp.compatibleCardIds || paymentApp.compatibleCardIds.length === 0) {
    return true;
  }
  return paymentApp.compatibleCardIds.includes(card.id);
}

export function rankCards(
  input: RankInput,
  options: { includeDisabled?: boolean } = {},
): RankResult {
  const { includeDisabled = false } = options;
  const {
    payment,
    targetCurrencyId,
    cards,
    stores,
    edges,
    pointCards = [],
    loyaltyRules = [],
    paymentApps = [],
    programs = [],
    memberships = [],
  } = input;

  const store = stores.find((s) => s.id === payment.storeId);
  const maxStacks = Math.max(0, store?.maxLoyaltyStacks ?? 1);

  // membershipIndex: storeId → memberships の lookup を全 evaluatePrograms / loyalty で共有
  // (Wave 2 audit-fix A-2)。スコープ非依存なので 1 度だけ構築。
  const membershipIndex = buildMembershipIndex(memberships);

  const DIRECT_PAYMENT_APP: PaymentApp = { id: "__direct__", name: "直接決済" };

  // 1 スコープ (= 利用可能カード集合 + 使う通貨集合 + loyalty 対象ポイントカード) の
  // ランキングを計算する内部関数。MAIN (使う資産) と FULL (全ポイントカード ON) を
  // 同一ロジックで回し、差分から ScopeUpgrade を作る (v6.0.0)。
  //   - pathCache は usedCurrencyIds 込みで構築 → 全 path 解決が「使う通貨」でゲートされる
  //   - usedCurrencyIds=undefined なら全通貨解放 (FULL ルート計算用)
  function runScope(
    targetCards: Card[],
    availableCardIds: ReadonlySet<string>,
    blockedCurrencyIds: ReadonlySet<string> | undefined,
    scopePointCards: PointCard[],
  ): { rankings: CardRanking[]; loyalties: LoyaltyResult[]; loyaltyTotal: number } {
    // pathCache: bestPath (Bellman-Ford O(V·E)) の (from,to) 重複呼び出しを memoize
    // (Wave 2 audit-fix A-1)。blockedCurrencyIds ゲート込み。
    const pathCache = makePathCache(edges, availableCardIds, blockedCurrencyIds);

    // ─── Loyalty (ポイントカード提示) 評価 ───
    // programEvaluator ベースの loyalty: pointCardId を持つ programs を評価
    const loyalties = bestLoyalties(
      payment.storeId,
      payment.amount,
      targetCurrencyId,
      scopePointCards,
      loyaltyRules,
      edges,
      maxStacks,
      store?.preferredPointCardIds,
      new Date(),
      availableCardIds,
      programs,
      memberships,
      membershipIndex,
      pathCache,
    );
    const loyaltyTotal = loyalties.reduce(
      (sum, r) => sum + (r.reachable ? r.finalAmount : 0),
      0,
    );

    const ranked: CardRanking[] = targetCards.map((card) => {
    // PaymentApp なし: programEvaluator のみ
    if (paymentApps.length === 0 || !store) {
      const storeObj = store ?? null;
      const programResult = storeObj
        ? evaluatePrograms({
            card,
            store: storeObj,
            paymentApp: DIRECT_PAYMENT_APP,
            programs,
            memberships,
            membershipIndex,
          })
        : null;

      // primary は target 通貨への path 込みで再選択 (監査残 B 対応)。
      // 候補なし or programResult が null の場合は null。
      const primary = programResult
        ? selectPrimaryForTarget(
            programResult.primaryCandidates,
            edges,
            targetCurrencyId,
            availableCardIds,
            pathCache,
          )
        : null;
      const addOns = programResult?.addOns ?? [];

      // カード rate: primary program rate または defaultRate
      const cardRate = primary?.effectiveRate ?? card.defaultRate;
      const cardCurrencyId = primary?.effectiveCurrencyId ?? card.defaultCurrencyId;

      const resolved: ResolvedRate = primary
        ? { rate: cardRate, currencyId: cardCurrencyId, source: "program", programId: primary.program.id }
        : { rate: card.defaultRate, currencyId: card.defaultCurrencyId, source: "default" };

      const earnedAmount = payment.amount * cardRate;
      const path = pathCache.resolve(cardCurrencyId, targetCurrencyId, earnedAmount);
      const baseFinal = path?.finalAmount ?? 0;

      // addOn programs の合計 (paymentApp なし時は appBonus として表現)
      const appBonusBreakdown: AddOnBreakdownEntry[] = [];
      let appBonusTotal = 0; // post-conversion (target 通貨)
      let appBonusEarned = 0; // pre-conversion (addOn の first-currency のみ合算、legacy)
      let appBonusRate = 0;
      let appBonusCurrencyId: string | null = null;
      for (const addOn of addOns) {
        const addOnEarned = payment.amount * addOn.effectiveRate;
        const addOnPath = pathCache.resolve(addOn.effectiveCurrencyId, targetCurrencyId, addOnEarned);
        if (addOnPath) {
          appBonusBreakdown.push({
            programId: addOn.program.id,
            programName: addOn.program.name,
            rate: addOn.effectiveRate,
            earnedAmount: addOnEarned,
            earnedCurrencyId: addOn.effectiveCurrencyId,
            finalAmount: addOnPath.finalAmount,
            pathSteps: addOnPath.steps,
          });
          appBonusTotal += addOnPath.finalAmount;
          appBonusRate += addOn.effectiveRate;
          if (appBonusCurrencyId === null) {
            appBonusCurrencyId = addOn.effectiveCurrencyId;
          }
          if (addOn.effectiveCurrencyId === appBonusCurrencyId) {
            appBonusEarned += addOnEarned;
          }
        }
      }

      return {
        card,
        resolved,
        earnedAmount,
        earnedCurrencyId: cardCurrencyId,
        pathSteps: path?.steps ?? [],
        pathProduct: path?.product ?? 0,
        finalAmount: baseFinal,
        reachable: path !== null,
        paymentApp: null,
        appBonusRate,
        appBonusFinalAmount: appBonusTotal,
        appBonusEarnedAmount: appBonusEarned,
        appBonusCurrencyId,
        appBonusReachable: appBonusTotal > 0,
        appBonusBreakdown,
        loyalties,
        totalFinalAmount: baseFinal + appBonusTotal + loyaltyTotal,
      };
    }

    // PaymentApp あり: 各 app を試算して最良を選択
    const compatibleApps = paymentApps.filter(
      (pa) => pa.enabled !== false && isPaymentAppCompatible(card, pa),
    );

    // PaymentApp なし (互換なし) → direct 評価にフォールバック
    if (compatibleApps.length === 0) {
      const programResult = evaluatePrograms({
        card,
        store,
        paymentApp: DIRECT_PAYMENT_APP,
        programs,
        memberships,
        membershipIndex,
      });
      // primary は target 通貨への path 込みで再選択 (監査残 B 対応)
      const primary = selectPrimaryForTarget(
        programResult.primaryCandidates,
        edges,
        targetCurrencyId,
        availableCardIds,
        pathCache,
      );
      const cardRate = primary?.effectiveRate ?? card.defaultRate;
      const cardCurrencyId = primary?.effectiveCurrencyId ?? card.defaultCurrencyId;
      const resolved: ResolvedRate = primary
        ? { rate: cardRate, currencyId: cardCurrencyId, source: "program", programId: primary.program.id }
        : { rate: card.defaultRate, currencyId: card.defaultCurrencyId, source: "default" };
      const earnedAmount = payment.amount * cardRate;
      const path = pathCache.resolve(cardCurrencyId, targetCurrencyId, earnedAmount);
      const baseFinal = path?.finalAmount ?? 0;
      return {
        card,
        resolved,
        earnedAmount,
        earnedCurrencyId: cardCurrencyId,
        pathSteps: path?.steps ?? [],
        pathProduct: path?.product ?? 0,
        finalAmount: baseFinal,
        reachable: path !== null,
        paymentApp: null,
        appBonusRate: 0,
        appBonusFinalAmount: 0,
        appBonusEarnedAmount: 0,
        appBonusCurrencyId: null,
        appBonusReachable: false,
        appBonusBreakdown: [],
        loyalties,
        totalFinalAmount: baseFinal + loyaltyTotal,
      };
    }

    // 各 PaymentApp について programEvaluator で評価
    type AppEval = {
      pa: PaymentApp;
      cardRate: number;
      cardCurrencyId: string;
      resolved: ResolvedRate;
      cardFinal: number;
      cardPathSteps: ConversionEdge[];
      cardPathProduct: number;
      cardReachable: boolean;
      appBonusRate: number;
      appBonusFinal: number; // post-conversion (target 通貨)
      appBonusEarned: number; // pre-conversion (addOn の通貨)
      appBonusCurrencyId: string | null;
      appBonusReachable: boolean;
      appBonusBreakdown: AddOnBreakdownEntry[];
      total: number;
    };

    const appEvals: AppEval[] = compatibleApps.map((pa) => {
      const programResult = evaluatePrograms({
        card,
        store,
        paymentApp: pa,
        programs,
        memberships,
        membershipIndex,
      });

      // primary は target 通貨への path 込みで再選択 (監査残 B 対応)。
      // chargeBased / 非 chargeBased どちらでも path-aware に最適な primary を採用。
      const primary = selectPrimaryForTarget(
        programResult.primaryCandidates,
        edges,
        targetCurrencyId,
        availableCardIds,
        pathCache,
      );
      const addOns = programResult.addOns;

      // chargeBased=true: カード自身の還元は 0、bonus のみ (paymentApp program が全部カバー)
      let cardRate: number;
      let cardCurrencyId: string;
      let resolved: ResolvedRate;

      if (pa.chargeBased) {
        // chargeBased: primary program rate (paymentApp base bonus) or 0
        const baseRate = primary?.effectiveRate ?? 0;
        const baseCurrency = primary?.effectiveCurrencyId ?? card.defaultCurrencyId;
        cardRate = baseRate;
        cardCurrencyId = baseCurrency;
        // resolved.rate は「実際に earnedAmount を生んだレート」= cardRate に揃える。
        // 以前は 0 をハードコードしていたため UI で「クレカ還元率 0.00% で 100 楽天pt」
        // のような矛盾表示が出ていた。source=charge で UI 側が paymentApp 由来と判別する。
        resolved = { rate: baseRate, currencyId: baseCurrency, source: "charge" };
      } else {
        // 通常: primary program rate (card × store) or defaultRate
        cardRate = primary?.effectiveRate ?? card.defaultRate;
        cardCurrencyId = primary?.effectiveCurrencyId ?? card.defaultCurrencyId;
        resolved = primary
          ? { rate: cardRate, currencyId: cardCurrencyId, source: "program", programId: primary.program.id }
          : { rate: card.defaultRate, currencyId: card.defaultCurrencyId, source: "default" };
      }

      const cardEarned = payment.amount * cardRate;
      const cardPath = pathCache.resolve(cardCurrencyId, targetCurrencyId, cardEarned);
      const cardFinal = cardPath?.finalAmount ?? 0;

      // addOn programs の合計 + 通貨別 breakdown (v5.1.3)
      const appBonusBreakdown: AddOnBreakdownEntry[] = [];
      let appBonusTotal = 0; // post-conversion (target 通貨)
      let appBonusEarned = 0; // pre-conversion (addOn の first-currency のみ合算、legacy)
      let appBonusRateTotal = 0;
      let appBonusCurrencyId: string | null = null;
      for (const addOn of addOns) {
        const addOnEarned = payment.amount * addOn.effectiveRate;
        const addOnPath = pathCache.resolve(addOn.effectiveCurrencyId, targetCurrencyId, addOnEarned);
        if (addOnPath) {
          appBonusBreakdown.push({
            programId: addOn.program.id,
            programName: addOn.program.name,
            rate: addOn.effectiveRate,
            earnedAmount: addOnEarned,
            earnedCurrencyId: addOn.effectiveCurrencyId,
            finalAmount: addOnPath.finalAmount,
            pathSteps: addOnPath.steps,
          });
          appBonusTotal += addOnPath.finalAmount;
          appBonusRateTotal += addOn.effectiveRate;
          if (appBonusCurrencyId === null) {
            appBonusCurrencyId = addOn.effectiveCurrencyId;
          }
          if (addOn.effectiveCurrencyId === appBonusCurrencyId) {
            appBonusEarned += addOnEarned;
          }
        }
      }

      return {
        pa,
        cardRate,
        cardCurrencyId,
        resolved,
        cardFinal,
        cardPathSteps: cardPath?.steps ?? [],
        cardPathProduct: cardPath?.product ?? 0,
        cardReachable: cardPath !== null,
        appBonusRate: appBonusRateTotal,
        appBonusFinal: appBonusTotal,
        appBonusEarned,
        appBonusCurrencyId,
        appBonusReachable: appBonusTotal > 0,
        appBonusBreakdown,
        total: cardFinal + appBonusTotal,
      };
    });

    // 最良 app を選ぶ (reachable 優先 / total 降順)
    appEvals.sort((a, b) => {
      const aReach = a.cardReachable || a.appBonusReachable;
      const bReach = b.cardReachable || b.appBonusReachable;
      if (aReach !== bReach) return aReach ? -1 : 1;
      return b.total - a.total;
    });

    const best = appEvals[0];

    return {
      card,
      resolved: best.resolved,
      earnedAmount: payment.amount * best.cardRate,
      earnedCurrencyId: best.cardCurrencyId,
      // 以前ハードコードで [] / 0 だったため、chargeBased paymentApp 利用時 (楽天Pay等)
      // でも UI に「変換不要 (同一通貨)」と誤表示されていた。実際の cardPath からコピー。
      pathSteps: best.cardPathSteps,
      pathProduct: best.cardPathProduct,
      finalAmount: best.cardFinal,
      // reachable: target 通貨で何らかの earn (card primary / addOn / loyalty のいずれか) が
      // 発生する場合は true。以前は best.cardReachable のみだったため、chargeBased な
      // paymentApp (例: pa-waon) + 孤立通貨 target (waon-pt) で「addOn 単独で earn する
      // のに header は 対象外」という矛盾表示が出ていた (v3.6.0 で発覚した bug)。
      reachable:
        best.cardReachable ||
        best.appBonusReachable ||
        loyaltyTotal > 0,
      paymentApp: best.pa,
      appBonusRate: best.appBonusRate,
      appBonusFinalAmount: best.appBonusFinal,
      // 以前 best.appBonusFinal (post-conversion) を入れていたため UI に
      // 「25 楽天ポイント → +25 WAONポイント」のように同値表示 = 変換が見えない状態
      // だった。pre-conversion (addOn の通貨での earn) を正しく入れる。
      appBonusEarnedAmount: best.appBonusEarned,
      appBonusCurrencyId: best.appBonusCurrencyId,
      appBonusReachable: best.appBonusReachable,
      appBonusBreakdown: best.appBonusBreakdown,
      loyalties,
      totalFinalAmount: best.total + loyaltyTotal,
    };
  });

  ranked.sort((a, b) => {
    // 0次: reachable を優先
    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;

    // 1次: totalFinalAmount 降順
    if (a.totalFinalAmount !== b.totalFinalAmount) {
      return b.totalFinalAmount - a.totalFinalAmount;
    }

    // 2次: 支払単独 (card + appBonus、loyalty 除く) 多い順
    const aPay = a.finalAmount + a.appBonusFinalAmount;
    const bPay = b.finalAmount + b.appBonusFinalAmount;
    if (aPay !== bPay) return bPay - aPay;

    // 3次: 構成要素少ない順
    const partCount = (r: CardRanking) =>
      (r.finalAmount > 0 ? 1 : 0) +
      (r.appBonusFinalAmount > 0 ? 1 : 0) +
      r.loyalties.filter((l) => l.reachable).length;
    return partCount(a) - partCount(b);
    });

    return { rankings: ranked, loyalties, loyaltyTotal };
  }

  // ─── MAIN: 現在「使う」資産でのランキング ───
  const enabledCards = cards.filter((c) => c.enabled !== false);
  const mainAvailableCardIds = new Set(enabledCards.map((c) => c.id));
  const enabledPointCards = pointCards.filter((p) => p.enabled !== false);
  // 「使わない」選択をしたポイント通貨 (deny-list)。交換ルートの起点・経由から除外される。
  const blockedCurrencyIds = computeBlockedCurrencyIds(cards, pointCards, programs);
  const mainTargetCards = includeDisabled ? cards : enabledCards;
  const main = runScope(
    mainTargetCards,
    mainAvailableCardIds,
    blockedCurrencyIds,
    enabledPointCards,
  );

  // ─── FULL: 全ポイントカードを ON にしたらどうなるか (upgrade 算出用) ───
  // クレカ軸 (disabled クレカの有効化) は既存 comparisonItems が担うので、ここでは
  // ポイントカード軸のみ動かす: availableCardIds は enabled のまま、blockedCurrencyIds を
  // 空 (= 何もブロックしない) にし、loyalty も全ポイントカードで評価する。
  const hasDisabledPointCard = pointCards.some((p) => p.enabled === false);
  let upgrade: ScopeUpgrade | null = null;
  if (hasDisabledPointCard) {
    const full = runScope(
      mainTargetCards,
      mainAvailableCardIds,
      undefined, // 全ポイントカード ON 相当 = ブロックなし
      pointCards, // 全ポイントカードで loyalty 評価
    );
    upgrade = buildScopeUpgrade(main, full, blockedCurrencyIds);
  }

  return { rankings: main.rankings, upgrade };
}

// MAIN と FULL の差分から ScopeUpgrade を構築する。改善が無ければ null。
function buildScopeUpgrade(
  main: { rankings: CardRanking[]; loyalties: LoyaltyResult[]; loyaltyTotal: number },
  full: { rankings: CardRanking[]; loyalties: LoyaltyResult[]; loyaltyTotal: number },
  blockedCurrencyIds: ReadonlySet<string>,
): ScopeUpgrade | null {
  const EPS = 1e-9;
  const mainTop = main.rankings.find((r) => r.reachable)?.totalFinalAmount ?? 0;
  const fullTop = full.rankings.find((r) => r.reachable)?.totalFinalAmount ?? 0;
  const deltaFinalAmount = fullTop - mainTop;
  if (deltaFinalAmount <= EPS) return null;

  const loyaltyDelta = Math.max(0, full.loyaltyTotal - main.loyaltyTotal);
  const routeDelta = Math.max(0, deltaFinalAmount - loyaltyDelta);

  // 新たに loyalty stack に加わる pointCard (FULL にあって MAIN に無い)
  const mainLoyaltyCardIds = new Set(
    main.loyalties.map((l) => l.pointCard.id),
  );
  const addedLoyalties = full.loyalties.filter(
    (l) => l.reachable && !mainLoyaltyCardIds.has(l.pointCard.id),
  );

  // ルート改善のため使い始めるべき通貨: FULL top カードの path が使う edge の
  // fromCurrency のうち、MAIN でブロックされていた (使わない選択をした) 通貨。
  const fullTopCard = full.rankings.find((r) => r.reachable);
  const unlockCurrencySet = new Set<string>();
  if (fullTopCard) {
    const collect = (steps: { fromCurrencyId: string }[]) => {
      for (const s of steps) {
        if (blockedCurrencyIds.has(s.fromCurrencyId)) {
          unlockCurrencySet.add(s.fromCurrencyId);
        }
      }
    };
    collect(fullTopCard.pathSteps);
    for (const b of fullTopCard.appBonusBreakdown) collect(b.pathSteps);
  }

  return {
    deltaFinalAmount,
    loyaltyDelta,
    routeDelta,
    addedLoyalties,
    unlockCurrencyIds: [...unlockCurrencySet],
  };
}
