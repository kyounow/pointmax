import { describe, it, expect } from "vitest";
import { selectPrimaryForTarget } from "./selectPrimary";
import type { ProgramMatch } from "./programEvaluator";
import type { BenefitProgram, ConversionEdge } from "./types";

// ─── テスト用 fixture ヘルパ ───

function mkMatch(
  id: string,
  rate: number,
  currencyId: string,
  bonusType: "primary" | "addOn" = "primary",
): ProgramMatch {
  const program: BenefitProgram = {
    id,
    name: id,
    scope: "member-stores",
    rate,
    currencyId,
    bonusType,
  };
  return { program, effectiveRate: rate, effectiveCurrencyId: currencyId };
}

const edges: ConversionEdge[] = [
  // rakuten-pt → v-pt: 0.5 (例: 5,000 楽天pt → 2,500 V ポイント)
  { id: "e-rakuten-vpt", fromCurrencyId: "rakuten-pt", toCurrencyId: "v-pt", rate: 0.5 },
  // jal-mile → v-pt: なし (= JAL マイル to V ポイントは通常 edge なし、到達不能)
  // v-pt → jal-mile: なし
  // d-pt → v-pt: なし (= 異種通貨 to V ポイント検証用)
];

// ─── テスト ───

describe("selectPrimaryForTarget", () => {
  it("候補なし → null", () => {
    const result = selectPrimaryForTarget([], edges, "v-pt");
    expect(result).toBeNull();
  });

  it("候補 1 件 → そのまま返却 (path 計算スキップ)", () => {
    const only = mkMatch("prog-a", 0.02, "jal-mile");
    const result = selectPrimaryForTarget([only], edges, "v-pt");
    expect(result).toBe(only);
  });

  it("target 同一通貨 → effectiveRate max を選ぶ", () => {
    const a = mkMatch("prog-a", 0.08, "v-pt");
    const b = mkMatch("prog-b", 0.05, "v-pt");
    const result = selectPrimaryForTarget([a, b], edges, "v-pt");
    expect(result?.program.id).toBe("prog-a");
  });

  it("target 異種通貨で到達可能: path 込み実効価値で選ぶ (rakuten 1% vs v-pt 0.5% → rakuten 経由 0.5% で同値 → tie-break)", () => {
    // a: rakuten-pt 0.01 × 0.5 = 0.005
    // b: v-pt 0.005 × 1 = 0.005
    // 同値 → effectiveRate 降順 tie-break で a が勝つ
    const a = mkMatch("prog-rakuten", 0.01, "rakuten-pt");
    const b = mkMatch("prog-v", 0.005, "v-pt");
    const result = selectPrimaryForTarget([a, b], edges, "v-pt");
    expect(result?.program.id).toBe("prog-rakuten");
  });

  it("target 異種通貨: 到達可能候補が実効価値で勝つ (旧挙動なら到達不能候補が選ばれていたケース)", () => {
    // a: jal-mile 0.02 → target=v-pt 到達不能 (edges に jal→v なし)、ratio=0 → valueAtTarget=0
    // b: rakuten-pt 0.01 → ratio=0.5 → valueAtTarget=0.005
    // 旧挙動 (rate 数値比較): a (0.02) が勝つ → target で 0 earn
    // 新挙動 (path 込み): b (0.005 実効) > a (0) → b が勝つ
    const a = mkMatch("prog-jal", 0.02, "jal-mile");
    const b = mkMatch("prog-rakuten", 0.01, "rakuten-pt");
    const result = selectPrimaryForTarget([a, b], edges, "v-pt");
    expect(result?.program.id).toBe("prog-rakuten");
  });

  it("全候補が target 到達不能: effectiveRate 降順 fallback (= 旧挙動再現)", () => {
    // 両方 jal-mile / d-pt で target=v-pt 到達不能、ratio=0
    // tie-break で effectiveRate 降順 = a が勝つ (旧挙動と一致)
    const a = mkMatch("prog-jal", 0.02, "jal-mile");
    const b = mkMatch("prog-d", 0.01, "d-pt");
    const result = selectPrimaryForTarget([a, b], edges, "v-pt");
    expect(result?.program.id).toBe("prog-jal");
  });

  it("3 候補で path 込み比較: 最大実効価値を選ぶ", () => {
    // a: jal-mile 0.05 → ratio=0 → 0
    // b: rakuten-pt 0.04 → ratio=0.5 → 0.02
    // c: v-pt 0.015 → ratio=1 → 0.015
    // b が勝つ
    const a = mkMatch("prog-jal", 0.05, "jal-mile");
    const b = mkMatch("prog-rakuten", 0.04, "rakuten-pt");
    const c = mkMatch("prog-v", 0.015, "v-pt");
    const result = selectPrimaryForTarget([a, b, c], edges, "v-pt");
    expect(result?.program.id).toBe("prog-rakuten");
  });

  it("availableCardIds ゲート: requiredCardIds 不一致 edge は path 計算から除外される", () => {
    // edge に requiredCardIds=["card-x"] を付ければゲート対象
    const gatedEdges: ConversionEdge[] = [
      {
        id: "e-rakuten-vpt-card-x",
        fromCurrencyId: "rakuten-pt",
        toCurrencyId: "v-pt",
        rate: 0.5,
        requiredCardIds: ["card-x"],
      },
    ];
    const a = mkMatch("prog-rakuten", 0.01, "rakuten-pt");
    const b = mkMatch("prog-v", 0.005, "v-pt");
    // availableCardIds=Set(["card-y"]) なら edge ブロック → a 到達不能、b 直接到達
    const result = selectPrimaryForTarget([a, b], gatedEdges, "v-pt", new Set(["card-y"]));
    expect(result?.program.id).toBe("prog-v");
    // availableCardIds=Set(["card-x"]) なら edge 解放 → a (0.005) と b (0.005) tie → effectiveRate 降順で a
    const result2 = selectPrimaryForTarget([a, b], gatedEdges, "v-pt", new Set(["card-x"]));
    expect(result2?.program.id).toBe("prog-rakuten");
  });
});
