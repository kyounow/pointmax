import { describe, it, expect } from "vitest";
import {
  SCOPE_DIRECTIVES,
  computeConfidence,
  judgeRateChange,
} from "./types";

describe("SCOPE_DIRECTIVES", () => {
  it("全ての ExtractionScope に対応するディレクティブがある", () => {
    expect(SCOPE_DIRECTIVES.comprehensive).toBeTruthy();
    expect(SCOPE_DIRECTIVES["chains-only"]).toBeTruthy();
    expect(SCOPE_DIRECTIVES["existing-only"]).toBeTruthy();
  });

  it("chains-only は個店除外を明示", () => {
    expect(SCOPE_DIRECTIVES["chains-only"]).toContain("chains-only");
    expect(SCOPE_DIRECTIVES["chains-only"]).toContain("全国");
    expect(SCOPE_DIRECTIVES["chains-only"]).toMatch(/個店|個別|個人店|地域/);
  });

  it("existing-only は新規追加禁止を明示", () => {
    expect(SCOPE_DIRECTIVES["existing-only"]).toMatch(/新規.*追加.*行いません|新規.*なし|新規追加は行いません/);
  });
});

describe("computeConfidence", () => {
  it("evidenceQuote が空なら 0.3 を強制", () => {
    expect(
      computeConfidence({
        evidenceQuote: "",
        explicitness: 1.0,
        ambiguity: 0.0,
      }),
    ).toBe(0.3);
    expect(
      computeConfidence({
        evidenceQuote: "   ",
        explicitness: 1.0,
        ambiguity: 0.0,
      }),
    ).toBe(0.3);
  });

  it("explicitness × (1 - ambiguity) の合成", () => {
    expect(
      computeConfidence({
        evidenceQuote: "ある引用",
        explicitness: 0.9,
        ambiguity: 0.1,
      }),
    ).toBeCloseTo(0.81, 5);
  });

  it("不正値は 0-1 にクランプ", () => {
    expect(
      computeConfidence({
        evidenceQuote: "x",
        explicitness: 1.5,
        ambiguity: -0.2,
      }),
    ).toBe(1.0);
  });
});

describe("judgeRateChange", () => {
  it("微小な変動 (1% → 1.05%) は autoMergeable", () => {
    const j = judgeRateChange(0.01, 0.0105);
    expect(j.withinPp).toBe(true);
    expect(j.withinRatio).toBe(true);
    expect(j.autoMergeable).toBe(true);
  });

  it("大幅な pp 変動 (1% → 50%) は要レビュー", () => {
    const j = judgeRateChange(0.01, 0.5);
    expect(j.withinPp).toBe(false);
    expect(j.autoMergeable).toBe(false);
  });

  it("極端な比率変動 (1% → 5%) は要レビュー (ratio > 2)", () => {
    const j = judgeRateChange(0.01, 0.05);
    expect(j.withinPp).toBe(true);   // 4pp の差なので pp 的にはセーフ
    expect(j.withinRatio).toBe(false); // 5倍 → 要レビュー
    expect(j.autoMergeable).toBe(false);
  });

  it("半減 (1% → 0.4%) は要レビュー (ratio < 0.5)", () => {
    const j = judgeRateChange(0.01, 0.004);
    expect(j.withinPp).toBe(true);
    expect(j.withinRatio).toBe(false);
    expect(j.autoMergeable).toBe(false);
  });

  it("from=0 で to>0 は autoMergeable ではない (Infinity ratio)", () => {
    const j = judgeRateChange(0, 0.01);
    expect(j.withinPp).toBe(true);
    expect(j.withinRatio).toBe(false);
    expect(j.autoMergeable).toBe(false);
  });

  it("from=to=0 は変化無し", () => {
    const j = judgeRateChange(0, 0);
    expect(j.ppDelta).toBe(0);
    expect(j.ratio).toBe(1);
    expect(j.autoMergeable).toBe(true);
  });
});
