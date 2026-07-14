import { describe, it, expect } from "vitest";
import { buildRateStackSummary } from "./rateStackSummary";
import type { CardRanking } from "./rankCards";

// buildRateStackSummary は rate と表示ラベルだけを見る純関数なので、
// テストは CardRanking の必要フィールドだけを埋めた最小オブジェクトで足りる。
function makeRanking(over: Partial<CardRanking> = {}): CardRanking {
  return {
    card: {
      id: "c",
      name: "カード",
      defaultRate: 0.005,
      defaultCurrencyId: "rakuten-pt",
    },
    resolved: { rate: 0.005, currencyId: "rakuten-pt", source: "default" },
    earnedAmount: 50,
    earnedCurrencyId: "rakuten-pt",
    pathSteps: [],
    pathProduct: 1,
    finalAmount: 50,
    reachable: true,
    paymentApp: null,
    appBonusRate: 0,
    appBonusFinalAmount: 0,
    appBonusEarnedAmount: 0,
    appBonusCurrencyId: null,
    appBonusReachable: false,
    appBonusBreakdown: [],
    loyalties: [],
    totalFinalAmount: 50,
    minUnitAnnotations: [],
    ...over,
  };
}

describe("buildRateStackSummary", () => {
  it("基本 + addOn を積み上げ、合計 rate を返す", () => {
    const summary = buildRateStackSummary(
      makeRanking({
        resolved: { rate: 0.005, currencyId: "rakuten-pt", source: "default" },
        appBonusBreakdown: [
          {
            programId: "p1",
            programName: "タッチ決済",
            rate: 0.065,
            earnedAmount: 6.5,
            earnedCurrencyId: "rakuten-pt",
            finalAmount: 6.5,
            pathSteps: [],
          },
        ],
      }),
    );
    expect(summary.parts).toEqual([
      { label: "基本", rate: 0.005, kind: "base" },
      { label: "タッチ決済", rate: 0.065, kind: "addon" },
    ]);
    expect(summary.totalRate).toBeCloseTo(0.07, 10);
  });

  it("rate 0 の base は省く (chargeBased でカード単体 0% のケース)", () => {
    const summary = buildRateStackSummary(
      makeRanking({
        resolved: { rate: 0, currencyId: "rakuten-pt", source: "charge" },
        paymentApp: { id: "pa", name: "楽天Pay", chargeBased: true },
        appBonusBreakdown: [
          {
            programId: "p1",
            programName: "楽天Pay 利用",
            rate: 0.01,
            earnedAmount: 1,
            earnedCurrencyId: "rakuten-pt",
            finalAmount: 1,
            pathSteps: [],
          },
        ],
      }),
    );
    // base (0%) は含めず、addOn だけ
    expect(summary.parts).toEqual([
      { label: "楽天Pay 利用", rate: 0.01, kind: "addon" },
    ]);
    expect(summary.totalRate).toBeCloseTo(0.01, 10);
  });

  it("charge の base ラベルは「{app} ベース」になる", () => {
    const summary = buildRateStackSummary(
      makeRanking({
        resolved: { rate: 0.01, currencyId: "rakuten-pt", source: "charge" },
        paymentApp: { id: "pa", name: "楽天Pay", chargeBased: true },
      }),
    );
    expect(summary.parts[0]).toEqual({
      label: "楽天Pay ベース",
      rate: 0.01,
      kind: "base",
    });
  });

  it("reachable な loyalty を loyalty chip として積み上げる (unreachable は除外)", () => {
    const summary = buildRateStackSummary(
      makeRanking({
        loyalties: [
          {
            pointCard: { id: "pc1", name: "楽天ポイントカード", currencyId: "rakuten-pt" },
            rule: {
              id: "r1",
              storeId: "s",
              pointCardId: "pc1",
              rate: 0.01,
            },
            earnedAmount: 1,
            earnedCurrencyId: "rakuten-pt",
            pathSteps: [],
            pathProduct: 1,
            finalAmount: 1,
            reachable: true,
          },
          {
            pointCard: { id: "pc2", name: "使えないカード", currencyId: "x-pt" },
            rule: { id: "r2", storeId: "s", pointCardId: "pc2", rate: 0.02 },
            earnedAmount: 2,
            earnedCurrencyId: "x-pt",
            pathSteps: [],
            pathProduct: 0,
            finalAmount: 0,
            reachable: false,
          },
        ],
      }),
    );
    expect(summary.parts).toEqual([
      { label: "基本", rate: 0.005, kind: "base" },
      { label: "楽天ポイントカード", rate: 0.01, kind: "loyalty" },
    ]);
    expect(summary.totalRate).toBeCloseTo(0.015, 10);
  });

  it("パーツが 1 個も無い (base 0% / addOn / loyalty なし) 時は空", () => {
    const summary = buildRateStackSummary(
      makeRanking({
        resolved: { rate: 0, currencyId: "rakuten-pt", source: "default" },
      }),
    );
    expect(summary.parts).toEqual([]);
    expect(summary.totalRate).toBe(0);
  });
});
