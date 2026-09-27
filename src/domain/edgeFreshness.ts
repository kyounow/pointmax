// REM-#2 / PR-5a: 公式情報の鮮度判定 (月精度)。
//
// lastVerifiedAt ("YYYY-MM") = 率を公式ページで最後に人手確認した月。交換エッジ
// (ConversionEdge) に加えて、PR-5a から還元プログラム (BenefitProgram) とカードの基本還元
// (Card) も同じ形式で持つ。「最終確認から N ヶ月超経過したか」を月精度で判定する純関数群で、
// UI (CalcResultCard の『古い情報かも』チップ / EdgeDetailPanel のメンテ用表示) から共有する。
//
// 設計方針:
//   - 月精度 (日は無視)。同じ暦月内なら経過月数は同じ = 「作った直後だけ正しく半年後に
//     嘘をつく」現象を月単位で検出できれば十分 (日次の鮮度管理は過剰)。
//   - 未記入 (undefined) / 形式不正は **stale 扱いしない** (安全側 = 未検証を古いと誤警告しない)。
//   - 閾値ちょうど (= N ヶ月) は stale ではない。「N ヶ月"超"」= 厳密に大きいときだけ ⚠。
//   - 表示時の確認月は **同梱 seed を参照して解決する** (resolveVerifiedMonth)。確認月は
//     META キーで公式更新の伝播対象外 (mergeSeed の PROGRAM_META_KEYS) なので、端末に残る
//     local の月は古い seed 由来でありうるため。
//
// ⚠ scripts/ (tsx / Node) から seed 系経由で import されうるので、DOM API を使わないこと。

import type { BenefitProgram, ConversionEdge } from "./types";

// stale 閾値 (ヶ月)。四半期チェック (SESSION_LOG の四半期表) で全対象を当月に更新する運用で、
// 1 回滞っただけで保有カードの結果に一斉に ⚠ が出る (警告の壁紙化) のを避けるため 12 ヶ月
// (B19 決定、PR-5a)。交換エッジ・還元プログラム・カード基本還元で共通の値を使う
// (以前の edge 専用 6 ヶ月判定もこの定数に揃えた)。
export const FRESHNESS_STALE_MONTHS = 12;

// "YYYY-MM" (year 4 桁 + month 01-12) の妥当性。seed 契約テスト / stale 判定で共用。
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isValidVerifiedMonth(month: string): boolean {
  return MONTH_RE.test(month);
}

// verifiedMonth ("YYYY-MM") から now までの経過月数 (整数月)。
// 形式不正なら null。未来 (verifiedMonth が now より後) は負値を返す。
export function monthsSince(verifiedMonth: string, now: Date): number | null {
  const m = MONTH_RE.exec(verifiedMonth);
  if (!m) return null;
  const verifiedIdx = Number(m[1]) * 12 + (Number(m[2]) - 1); // month は 1-12 → 0-11
  const nowIdx = now.getFullYear() * 12 + now.getMonth(); // getMonth: 0-11
  return nowIdx - verifiedIdx;
}

// verifiedMonth が threshold ヶ月「超」古いか。
// 境界 (ちょうど threshold ヶ月) は false (= まだ stale ではない)。
// 形式不正 / 未来は false (安全側で ⚠ を出さない)。
export function isMonthStale(
  verifiedMonth: string,
  now: Date,
  thresholdMonths: number = FRESHNESS_STALE_MONTHS,
): boolean {
  const diff = monthsSince(verifiedMonth, now);
  if (diff === null) return false;
  return diff > thresholdMonths;
}

/** lastVerifiedAt を持ちうるレコード (edge / program / card の構造的な共通部分)。 */
export type Verifiable = { lastVerifiedAt?: string };

// 経路 (edge 列) の鮮度。lastVerifiedAt を持つ step のうち **最古** を取り、それが stale なら
// その月 ("YYYY-MM") を返す。記入済み step が無い (全 undefined) / 最古が stale でないなら null。
// 未記入 step は無視する (未検証 = 古い扱いしない)。
// "YYYY-MM" は辞書順が時系列順なので文字列比較で最古を取れる。
export function staleVerifiedMonth(
  steps: readonly Verifiable[],
  now: Date,
  thresholdMonths: number = FRESHNESS_STALE_MONTHS,
): string | null {
  let oldest: string | null = null;
  for (const s of steps) {
    const v = s.lastVerifiedAt;
    if (v && isValidVerifiedMonth(v) && (oldest === null || v < oldest)) {
      oldest = v;
    }
  }
  if (oldest === null) return null;
  return isMonthStale(oldest, now, thresholdMonths) ? oldest : null;
}

// 表示に使う確認月を「同梱 seed (official)」と「端末のローカルコピー (local)」から解決する。
//   (a) local.userModifiedAt あり → undefined (編集済みは公式の確認月を名乗らない)
//   (b) official があり rate が一致 → official.lastVerifiedAt を **fallback なしで** 返す
//       (seed が未記入なら undefined。local の月は META 非伝播のため古い seed 由来でありうる。
//       seed を空欄にした意図 (週次監視 tier 等) を尊重する)
//   (c) それ以外 (official が無い = ユーザー作成 / rate 不一致 = 旧 rate のまま) → local の月
export function resolveVerifiedMonth(
  local: { rate: number; lastVerifiedAt?: string; userModifiedAt?: string },
  official?: { rate: number; lastVerifiedAt?: string },
): string | undefined {
  if (local.userModifiedAt !== undefined) return undefined;
  if (official && Math.abs(local.rate - official.rate) < 1e-9) {
    return official.lastVerifiedAt;
  }
  return local.lastVerifiedAt;
}

/**
 * 表示に使う確認月の解決方法 (CalcResultCard の鮮度チップに注入する)。
 * アプリ本体は同梱 seed を参照する実装 (src/state/seedFreshness.ts、CalcResultCard の既定) を使い、
 * テストは任意の実装 (LOCAL_FRESHNESS = 端末のローカル値そのまま 等) に差し替えられる。
 */
export type FreshnessResolver = {
  programMonth: (p: BenefitProgram) => string | undefined;
  edgeMonth: (e: ConversionEdge) => string | undefined;
};

/** 端末のローカルコピーの lastVerifiedAt をそのまま使う resolver (seed を参照しない)。 */
export const LOCAL_FRESHNESS: FreshnessResolver = {
  programMonth: (p) => p.lastVerifiedAt,
  edgeMonth: (e) => e.lastVerifiedAt,
};

/** 鮮度チップの 1 項目。route = 交換ルートの edge、rate = 還元率 (program / カード基本還元)。 */
export type FreshnessItem = {
  kind: "route" | "rate";
  label: string;
  month?: string;
};

export type StaleSummary = {
  /** stale な項目のうち最古の月 ("YYYY-MM")。チップ本文に出す。 */
  oldest: string;
  /** stale な項目 (入力順)。チップの title (内訳) に使う。 */
  stale: (FreshnessItem & { month: string })[];
};

// 項目群のうち「どれが古いか」を返す。形式が正しく、かつ threshold ヶ月超の項目だけを集め、
// 最古の月を oldest にする。該当が無ければ null (未記入・形式不正・未来月は無視)。
export function collectStaleItems(
  items: readonly FreshnessItem[],
  now: Date,
  thresholdMonths: number = FRESHNESS_STALE_MONTHS,
): StaleSummary | null {
  const stale: (FreshnessItem & { month: string })[] = [];
  let oldest: string | null = null;
  for (const it of items) {
    const m = it.month;
    if (!m || !isValidVerifiedMonth(m) || !isMonthStale(m, now, thresholdMonths)) {
      continue;
    }
    stale.push(it as FreshnessItem & { month: string }); // month は上で検証済み
    if (oldest === null || m < oldest) oldest = m;
  }
  return oldest === null ? null : { oldest, stale };
}
