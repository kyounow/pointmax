// 特典・キャンペーン統合画面 (PR-2c) のフィルタ分類ロジック (純関数のみ)。
//
// ProgramsScreen (all/active/inactive/campaign/loyalty/paymentapp) と
// CampaignsScreen (all/active/ongoing/expired/future) のフィルタを 1 本化する。
// 期間系フィルタ (常設/有効中/期限切れ/未来開始) は互いに排他で全 program を分割し、
// ポイントカード提示 / 決済アプリ / opt-in 特典 は横断フィルタ (期間系と直交)。
//
// heavy import を持たない (型 + 純関数) ので node 環境でユニットテストできる。

import type { BenefitProgram } from "../../domain/types";
import { classifyCampaignStatus } from "../../domain/ruleActiveAt";

// 期間の状態分類 (統合フィルタ用)。CampaignsScreen の classifyCampaignStatus を土台に、
// 「終了日 (validTo) を持たない program」をすべて「常設 (permanent)」へ寄せる:
//   - validFrom / validTo とも無し          → permanent (たまるマーケット等の常設特典)
//   - validFrom のみ (期限未告知の長期特典)  → classifyCampaignStatus は "ongoing"。
//                                              既に開始済みで終了予定が無い = 常設扱い。
//                                              ただし validFrom が未来なら "future" が優先される
//                                              (classifyCampaignStatus が validFrom を先に判定)。
//   - validTo あり (期間限定)                → active / expired / future
export type PeriodClass = "permanent" | "active" | "expired" | "future";

export function classifyProgramPeriod(
  p: { validFrom?: string; validTo?: string },
  now: Date = new Date(),
): PeriodClass {
  if (!p.validFrom && !p.validTo) return "permanent";
  const s = classifyCampaignStatus(p, now);
  // "ongoing" (validFrom のみ・開始済み・終了未告知) は常設として扱う。
  return s === "ongoing" ? "permanent" : s;
}

export type BenefitFilterKey =
  | "all"
  | "permanent"
  | "active"
  | "expired"
  | "future"
  | "loyalty"
  | "paymentapp"
  | "optin";

// フィルタタブの定義 (表示順・ラベル)。画面はこれを map してタブ行を描く。
export const BENEFIT_FILTERS: { key: BenefitFilterKey; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "permanent", label: "常設" },
  { key: "active", label: "期間限定 (有効中)" },
  { key: "expired", label: "期限切れ" },
  { key: "future", label: "未来開始" },
  { key: "loyalty", label: "ポイントカード提示" },
  { key: "paymentapp", label: "決済アプリ" },
  { key: "optin", label: "opt-in 特典" },
];

// program が指定フィルタに該当するか。now は期間系フィルタの判定基準時刻。
export function matchesBenefitFilter(
  p: BenefitProgram,
  filter: BenefitFilterKey,
  now: Date,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "permanent":
    case "active":
    case "expired":
    case "future":
      return classifyProgramPeriod(p, now) === filter;
    case "loyalty":
      return !!p.pointCardId;
    case "paymentapp":
      return !!p.paymentAppId;
    case "optin":
      return p.optIn === true;
    default:
      return true;
  }
}

// 各フィルタの該当件数 (バッジ表示用)。期間系は 1 回の分類で数え上げ、
// 横断系はフラグを加算する (programs を 1 周するだけで全件数が揃う)。
export function countBenefitFilters(
  programs: BenefitProgram[],
  now: Date,
): Record<BenefitFilterKey, number> {
  const counts: Record<BenefitFilterKey, number> = {
    all: programs.length,
    permanent: 0,
    active: 0,
    expired: 0,
    future: 0,
    loyalty: 0,
    paymentapp: 0,
    optin: 0,
  };
  for (const p of programs) {
    counts[classifyProgramPeriod(p, now)]++;
    if (p.pointCardId) counts.loyalty++;
    if (p.paymentAppId) counts.paymentapp++;
    if (p.optIn === true) counts.optin++;
  }
  return counts;
}
