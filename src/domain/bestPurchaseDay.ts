// REM-#4: ベスト購入日ヒント。
//
// 店舗確定済みの試算入力 (RankInput) について、今後 N 日 (既定 30) を日替わりで
// rankCards 再評価し、「今日の #1 (最良カードの totalFinalAmount) を上回る最良の日」を
// 探す純関数。まとめ買い前に「あと数日待てば得」を示すヒントを返す。
//
// 発火条件 (無関係な店で 30 回計算しないためのゲート):
//   選択 store の membership がある program に、recurringDays / recurringWeekdays /
//   未来 validFrom のいずれか (= 日で有効・無効が変わりうる program) が存在する場合のみ。
//   無ければ即 null を返し、rankCards は 1 度も呼ばない (rankFn 未呼び出しをテストで担保)。
//
// パフォーマンス方針 (設計書「pathCache 再構築を避ける実装配慮」):
//   rankCards は呼び出しごとに内部で pathCache を作り直す設計 (単一 rankCards 呼び出し内
//   でのみ cache が生存 = 呼び出し跨ぎでは再利用されない)。now だけ変えた 30 回の呼び出しで
//   cache を共有するには rankCards の cache 生存範囲を壊す必要があり割に合わないため、
//   ここでは (1) 上記ゲートで無関係店を早期に弾き、(2) UI 側 (CalculatorScreen) が
//   useMemo で店舗/金額/通貨/データ変更時のみ本関数を呼ぶ、の 2 段で再計算頻度を絞る。

import type { BenefitProgram, Card } from "./types";
import { rankCards, RANK_EPS, type RankInput, type RankResult } from "./rankCards";
import { isRuleActiveAt, classifyCampaignStatus } from "./ruleActiveAt";
import { isProgramPreferenceActive } from "./programEvaluator";

export type BestPurchaseDay = {
  /** 今日より後の最良日 (同点なら最も近い日)。時刻は正午に正規化。 */
  date: Date;
  /** (最良日の #1 totalFinalAmount) − (今日の #1 totalFinalAmount)。常に > 0。 */
  gainAmount: number;
  /** 最良日の #1 (到達可能な最上位) カード。 */
  topCard: Card;
  /** ゲインを生んだ日限定 program の名前 (UI のチップ末尾に「(◯◯)」で出す)。 */
  drivingProgramName: string;
};

// 今後の探索日数の既定値。楽天「5と0のつく日」等は最長でも 10 日以内に次の対象日が来るため
// 30 日あれば「次の得な日」を確実に含む。
export const DEFAULT_HORIZON_DAYS = 30;

// UI チップ用のベスト購入日ラベル。同じ暦月内なら「25日」、月をまたぐなら「8/5」で表示する
// (日番号だけだと翌月への跨ぎが紛らわしいため、月違いのときだけ月を前置する)。
// component 側は「コンポーネントのみ export」の lint 制約があるためここ (純関数) に置く。
export function formatBestDayLabel(date: Date, today: Date): string {
  const sameMonth =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth();
  return sameMonth
    ? `${date.getDate()}日`
    : `${date.getMonth() + 1}/${date.getDate()}`;
}

// program が「日で有効・無効が変わる」= 待てば発火/失効しうるか。
//   - recurringDays / recurringWeekdays を持つ (毎月◯日・毎週◯曜のみ)
//   - validFrom が今日より未来 (これから始まるキャンペーン)
// validTo (これから終わる) は「待っても得にならない・むしろ急ぐべき」方向なので対象外。
export function isDateGatedProgram(prog: BenefitProgram, today: Date): boolean {
  if (prog.recurringDays && prog.recurringDays.length > 0) return true;
  if (prog.recurringWeekdays && prog.recurringWeekdays.length > 0) return true;
  if (prog.validFrom && classifyCampaignStatus(prog, today) === "future") return true;
  return false;
}

// ゲート用: 選択 store の membership がある program のうち、日限定かつ発火しうる
// (明示 OFF / 未選択 opt-in ではない) ものを返す。空なら本ヒントは発火しない。
function dateGatedMembershipPrograms(
  input: Pick<RankInput, "payment" | "programs" | "memberships">,
  today: Date,
): BenefitProgram[] {
  const programs = input.programs ?? [];
  const memberships = input.memberships ?? [];
  const storeId = input.payment.storeId;
  const memberProgramIds = new Set(
    memberships.filter((m) => m.storeId === storeId).map((m) => m.programId),
  );
  return programs.filter((p) => {
    if (!memberProgramIds.has(p.id)) return false;
    if (!isDateGatedProgram(p, today)) return false;
    // 明示 OFF / 未選択 opt-in は将来日でも発火しないのでゲート対象外
    // (これらしか無い店では 30 回スキャンを走らせない)。
    if (p.enabled === false) return false;
    if (p.optIn === true && p.enabled !== true) return false;
    return true;
  });
}

// 到達可能な最上位カードの totalFinalAmount。到達可能カードが無ければ null。
function topReachableTotal(result: RankResult): number | null {
  const top = result.rankings.find((r) => r.reachable);
  return top ? top.totalFinalAmount : null;
}

// today を基準に offset 日後の Date を正午に正規化して返す。
// 正午にするのは DST 境界や 00:00 直前直後で recurringDays (getDate) / recurringWeekdays
// (getDay) の暦日判定がずれないようにするため (isRuleActiveAt は日境界を 00:00/23:59 で見る)。
function addDaysNoon(today: Date, offset: number): Date {
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + offset,
    12,
    0,
    0,
    0,
  );
}

export function findBestPurchaseDay(
  input: RankInput,
  options: {
    horizonDays?: number;
    // テスト用: rankCards をスパイに差し替え可能にする (無関係店で呼ばれないことの担保)。
    rankFn?: typeof rankCards;
  } = {},
): BestPurchaseDay | null {
  const { horizonDays = DEFAULT_HORIZON_DAYS, rankFn = rankCards } = options;
  const today = input.now ?? new Date();

  // ── ゲート: 日限定 membership program が無ければ即 null (rankFn は 1 度も呼ばない) ──
  const gatedPrograms = dateGatedMembershipPrograms(input, today);
  if (gatedPrograms.length === 0) return null;

  // 今日の #1 (最良カードの totalFinalAmount)。到達可能カードが無ければヒントは出さない。
  // includeDisabled は指定しない (既定 false = 保有カードのみ = 画面の #1 と同じ母集団)。
  const todayTop = topReachableTotal(rankFn({ ...input, now: today }));
  if (todayTop === null) return null;

  // 今後 horizonDays 日を日替わり評価し「今日を上回る最大の日」を探す。
  // 同点 (最大が複数日) は最も近い日を採る: offset 昇順で走査し、厳密に大きい時だけ更新する
  // (≈ 同値では更新しない → 先に見つかった近い日が残る)。
  let best: { offset: number; total: number; ranking: RankResult } | null = null;
  for (let offset = 1; offset <= horizonDays; offset++) {
    const day = addDaysNoon(today, offset);
    const ranking = rankFn({ ...input, now: day });
    const total = topReachableTotal(ranking);
    if (total === null) continue;
    if (
      total > todayTop + RANK_EPS &&
      (best === null || total > best.total + RANK_EPS)
    ) {
      best = { offset, total, ranking };
    }
  }
  if (best === null) return null;

  const bestDay = addDaysNoon(today, best.offset);
  const topCard = best.ranking.rankings.find((r) => r.reachable)?.card;
  if (!topCard) return null;

  // ゲインを生んだ日限定 program: 最良日に発火し・今日は発火していなかったもの。
  // gatedPrograms のうち isRuleActiveAt × preference (opt-in/誕生月) の両方を最良日で満たし、
  // 今日は満たさない最初の 1 件を代表名にする。該当が取れない (両日発火など) 稀な場合は
  // ゲートの先頭 program 名でフォールバック。
  const isFiring = (p: BenefitProgram, when: Date): boolean =>
    isRuleActiveAt(p, when) &&
    isProgramPreferenceActive(p, when, input.userBirthMonth);
  const driving = gatedPrograms.find(
    (p) => isFiring(p, bestDay) && !isFiring(p, today),
  );

  return {
    date: bestDay,
    gainAmount: best.total - todayTop,
    topCard,
    drivingProgramName: driving?.name ?? gatedPrograms[0].name,
  };
}
