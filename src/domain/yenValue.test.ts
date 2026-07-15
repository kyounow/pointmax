import { describe, it, expect } from "vitest";
import {
  YEN_TARGET_ID,
  isYenTarget,
  effectiveYenValue,
  makeYenValueResolver,
  valuateRankingInYen,
  findYenRatioViolations,
} from "./yenValue";
import type { CardRanking } from "./rankCards";
import type { ConversionEdge, Currency } from "./types";

const CURRENCIES: Currency[] = [
  { id: "rakuten-pt", name: "楽天ポイント", yenValue: 1 },
  { id: "jal-mile", name: "JALマイル", yenValue: 1.5 },
  { id: "eikyu", name: "永久不滅", yenValue: 5 },
  { id: "amex-mr", name: "MR" }, // yenValue 無し
];
const byId = new Map(CURRENCIES.map((c) => [c.id, c] as const));

describe("effectiveYenValue", () => {
  it("override が無ければ seed の yenValue を返す", () => {
    expect(effectiveYenValue("rakuten-pt", byId, {})).toBe(1);
    expect(effectiveYenValue("jal-mile", byId, {})).toBe(1.5);
  });

  it("override があれば override を優先する", () => {
    expect(effectiveYenValue("jal-mile", byId, { "jal-mile": 2 })).toBe(2);
  });

  it("seed も override も無ければ undefined", () => {
    expect(effectiveYenValue("amex-mr", byId, {})).toBeUndefined();
    expect(effectiveYenValue("unknown", byId, {})).toBeUndefined();
  });

  it("override が seed 未設定通貨に付いていれば採用される", () => {
    expect(effectiveYenValue("amex-mr", byId, { "amex-mr": 0.8 })).toBe(0.8);
  });

  it("非正 / 非有限の override は無効 (seed にフォールバック)", () => {
    expect(effectiveYenValue("rakuten-pt", byId, { "rakuten-pt": 0 })).toBe(1);
    expect(effectiveYenValue("rakuten-pt", byId, { "rakuten-pt": -3 })).toBe(1);
    expect(
      effectiveYenValue("rakuten-pt", byId, { "rakuten-pt": Number.NaN }),
    ).toBe(1);
  });
});

describe("isYenTarget / YEN_TARGET_ID", () => {
  it("仮想ターゲット id を判定する", () => {
    expect(isYenTarget(YEN_TARGET_ID)).toBe(true);
    expect(isYenTarget("rakuten-pt")).toBe(false);
  });
});

// valuateRankingInYen 用の最小 CardRanking モック。
function mkRanking(over: Partial<CardRanking>): CardRanking {
  return {
    card: { id: "c1", name: "テスト", defaultRate: 0.01, defaultCurrencyId: "rakuten-pt" },
    resolved: { rate: 0.01, currencyId: "rakuten-pt", source: "default" },
    earnedAmount: 0,
    earnedCurrencyId: "rakuten-pt",
    pathSteps: [],
    pathProduct: 0,
    finalAmount: 0,
    reachable: false,
    unreachableReason: null,
    paymentApp: null,
    appBonusRate: 0,
    appBonusFinalAmount: 0,
    appBonusEarnedAmount: 0,
    appBonusCurrencyId: null,
    appBonusReachable: false,
    appBonusBreakdown: [],
    loyalties: [],
    totalFinalAmount: 0,
    minUnitAnnotations: [],
    ...over,
  } as CardRanking;
}

describe("valuateRankingInYen", () => {
  const yv = makeYenValueResolver(byId, {});

  it("earnedAmount × yenValue で円評価する (path 不使用)", () => {
    const r = mkRanking({ earnedAmount: 100, earnedCurrencyId: "jal-mile" });
    const v = valuateRankingInYen(r, yv);
    expect(v.reachable).toBe(true);
    expect(v.primaryYen).toBe(150); // 100 × 1.5
    expect(v.totalYen).toBe(150);
    expect(v.missingCurrencyId).toBeNull();
  });

  it("獲得通貨に yenValue が無ければ対象外 (reachable=false)", () => {
    const r = mkRanking({ earnedAmount: 100, earnedCurrencyId: "amex-mr" });
    const v = valuateRankingInYen(r, yv);
    expect(v.reachable).toBe(false);
    expect(v.primaryYen).toBe(0);
    expect(v.missingCurrencyId).toBe("amex-mr");
  });

  it("appBonus (yenValue のある通貨) を加算する", () => {
    const r = mkRanking({
      earnedAmount: 100,
      earnedCurrencyId: "rakuten-pt",
      appBonusBreakdown: [
        {
          programId: "p1",
          programName: "アプリ",
          rate: 0.005,
          earnedAmount: 50,
          earnedCurrencyId: "jal-mile",
          finalAmount: 0,
          pathSteps: [],
        },
      ],
    });
    const v = valuateRankingInYen(r, yv);
    expect(v.primaryYen).toBe(100); // 100 × 1
    expect(v.appBonusYen).toBe(75); // 50 × 1.5
    expect(v.totalYen).toBe(175);
  });

  it("override 優先の resolver を使う", () => {
    const yvOverride = makeYenValueResolver(byId, { "jal-mile": 2 });
    const r = mkRanking({ earnedAmount: 100, earnedCurrencyId: "jal-mile" });
    expect(valuateRankingInYen(r, yvOverride).primaryYen).toBe(200);
  });
});

describe("findYenRatioViolations", () => {
  const yv = (id: string) => byId.get(id)?.yenValue;

  it("価値保存に近い edge は violation なし", () => {
    const edges: ConversionEdge[] = [
      // eikyu(5) → rakuten(1) rate 4.5 → ratio 0.9
      { id: "e1", fromCurrencyId: "eikyu", toCurrencyId: "rakuten-pt", rate: 4.5 },
      // rakuten(1) → jal(1.5) rate 0.5 → ratio 0.75
      { id: "e2", fromCurrencyId: "rakuten-pt", toCurrencyId: "jal-mile", rate: 0.5 },
    ];
    expect(findYenRatioViolations(edges, yv)).toEqual([]);
  });

  it("上限超過 (ratio > 2.5) を検出", () => {
    const edges: ConversionEdge[] = [
      { id: "hi", fromCurrencyId: "rakuten-pt", toCurrencyId: "jal-mile", rate: 3 },
    ];
    // ratio = 3 × 1.5 / 1 = 4.5 > 2.5
    const v = findYenRatioViolations(edges, yv);
    expect(v).toHaveLength(1);
    expect(v[0].edgeId).toBe("hi");
    expect(v[0].ratio).toBeCloseTo(4.5, 5);
  });

  it("下限未満 (ratio < 1/2.5) を検出", () => {
    const edges: ConversionEdge[] = [
      { id: "lo", fromCurrencyId: "eikyu", toCurrencyId: "rakuten-pt", rate: 0.1 },
    ];
    // ratio = 0.1 × 1 / 5 = 0.02 < 0.4
    const v = findYenRatioViolations(edges, yv);
    expect(v.map((x) => x.edgeId)).toEqual(["lo"]);
  });

  it("片側でも yenValue が無い edge はスキップ", () => {
    const edges: ConversionEdge[] = [
      { id: "skip", fromCurrencyId: "amex-mr", toCurrencyId: "jal-mile", rate: 99 },
    ];
    expect(findYenRatioViolations(edges, yv)).toEqual([]);
  });

  it("maxFactor を狭めると境界が変わる", () => {
    const edges: ConversionEdge[] = [
      // ratio 0.75。maxFactor=1.2 → 下限 0.833、0.75 < 0.833 で violation。
      { id: "b", fromCurrencyId: "rakuten-pt", toCurrencyId: "jal-mile", rate: 0.5 },
    ];
    expect(findYenRatioViolations(edges, yv, 2.5)).toEqual([]);
    expect(findYenRatioViolations(edges, yv, 1.2).map((v) => v.edgeId)).toEqual([
      "b",
    ]);
  });
});
