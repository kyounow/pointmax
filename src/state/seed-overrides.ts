// 既存 BenefitProgram への部分上書き (override layer)。
//
// 背景 (改善計画 B-1): cron の rate 変動提案は autoApplicable に分類されるのに
// apply-proposals が updateField を書き込めず、「履歴上は反映済みに見えるのに
// seed は不変」という乖離があった。既存 program の本体は手書きの
// seed-data-programs.ts にあり codegen で直接書き換えるのは危険なため、
// 機械生成ファイル (seed-additions.ts の PROGRAM_OVERRIDES) に
// 「id + 上書きフィールド」だけを蓄積し、seed() が合成の最後に適用する。
//
// 対象フィールドは還元計算と期間 (rate / validFrom / validTo) に限定。
// キャンペーンの率改定・期間延長 (B-2) がこの経路で実反映される。

import type { BenefitProgram } from "../domain/types";

export type ProgramOverride = {
  /** 対象 BenefitProgram.id (seed-data-programs / seed-additions のどちらでも可) */
  id: string;
  rate?: number;
  validFrom?: string;
  validTo?: string;
};

/**
 * id マッチした program に部分上書きを適用する。
 * - 同 id の override が複数あれば後勝ちでフィールド単位マージ
 * - マッチしない override は無視 (program 削除後に残骸が残っても無害)
 * - override に無いフィールドは元の値を維持
 */
export function applyProgramOverrides(
  programs: BenefitProgram[],
  overrides: ProgramOverride[],
): BenefitProgram[] {
  if (overrides.length === 0) return programs;
  const byId = new Map<string, ProgramOverride>();
  for (const o of overrides) {
    const prev = byId.get(o.id);
    byId.set(o.id, prev ? { ...prev, ...o } : o);
  }
  return programs.map((p) => {
    const o = byId.get(p.id);
    if (!o) return p;
    const merged: BenefitProgram = { ...p };
    if (o.rate !== undefined) merged.rate = o.rate;
    if (o.validFrom !== undefined) merged.validFrom = o.validFrom;
    if (o.validTo !== undefined) merged.validTo = o.validTo;
    return merged;
  });
}
