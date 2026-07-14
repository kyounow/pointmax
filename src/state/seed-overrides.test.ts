import { describe, it, expect } from "vitest";
import { applyProgramOverrides, type ProgramOverride } from "./seed-overrides";
import type { BenefitProgram } from "../domain/types";

const prog = (over: Partial<BenefitProgram> & { id: string }): BenefitProgram => ({
  name: over.id,
  scope: "member-stores",
  rate: 0.01,
  currencyId: "d-pt",
  ...over,
});

describe("applyProgramOverrides", () => {
  const base = [
    prog({ id: "prog-a", rate: 0.05, validFrom: "2026-06-01", validTo: "2026-06-30" }),
    prog({ id: "prog-b", rate: 0.01 }),
  ];

  it("id マッチした program のフィールドだけ部分上書きする", () => {
    const out = applyProgramOverrides(base, [
      { id: "prog-a", validTo: "2026-07-31" }, // 期間延長
    ]);
    expect(out[0].validTo).toBe("2026-07-31");
    expect(out[0].rate).toBe(0.05); // 未指定フィールドは維持
    expect(out[0].validFrom).toBe("2026-06-01");
    expect(out[1]).toBe(base[1]); // 非対象は参照ごと不変
  });

  it("rate 上書きも適用される", () => {
    const out = applyProgramOverrides(base, [{ id: "prog-b", rate: 0.02 }]);
    expect(out[1].rate).toBe(0.02);
  });

  it("マッチしない override は無視 (program 削除後の残骸耐性)", () => {
    const out = applyProgramOverrides(base, [{ id: "prog-gone", rate: 0.99 }]);
    expect(out).toEqual(base);
  });

  it("同 id の override が複数あれば後勝ちでフィールド単位マージ", () => {
    const overrides: ProgramOverride[] = [
      { id: "prog-a", rate: 0.06 },
      { id: "prog-a", validTo: "2026-08-31" }, // rate は前の override が残る
    ];
    const out = applyProgramOverrides(base, overrides);
    expect(out[0].rate).toBe(0.06);
    expect(out[0].validTo).toBe("2026-08-31");
  });

  it("overrides が空なら入力配列をそのまま返す", () => {
    expect(applyProgramOverrides(base, [])).toBe(base);
  });

  it("元の配列・オブジェクトを mutate しない", () => {
    const snapshot = JSON.parse(JSON.stringify(base));
    applyProgramOverrides(base, [{ id: "prog-a", rate: 0.99 }]);
    expect(base).toEqual(snapshot);
  });
});
