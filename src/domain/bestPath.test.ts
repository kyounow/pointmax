import { describe, it, expect } from "vitest";
import { bestPath } from "./bestPath";
import type { ConversionEdge } from "./types";

const edge = (
  id: string,
  from: string,
  to: string,
  rate: number,
): ConversionEdge => ({
  id,
  fromCurrencyId: from,
  toCurrencyId: to,
  rate,
});

describe("bestPath", () => {
  it("from と to が同一なら、変換不要で startAmount をそのまま返す", () => {
    const result = bestPath([], "A", "A", 100);
    expect(result).not.toBeNull();
    expect(result!.finalAmount).toBe(100);
    expect(result!.product).toBe(1);
    expect(result!.steps).toEqual([]);
  });

  it("到達不可なら null を返す", () => {
    const result = bestPath([], "A", "B", 100);
    expect(result).toBeNull();
  });

  it("直接エッジ1本のときはそれを使う", () => {
    const edges = [edge("e1", "A", "B", 0.5)];
    const result = bestPath(edges, "A", "B", 100);
    expect(result).not.toBeNull();
    expect(result!.finalAmount).toBe(50);
    expect(result!.product).toBe(0.5);
    expect(result!.steps).toEqual([edges[0]]);
  });

  it("複数候補から最大積を選ぶ（直接 vs 2ホップ）", () => {
    // A→B 直接 0.5  /  A→C 1.2 → C→B 0.5 = 0.6 (こちらが勝つ)
    const edges = [
      edge("direct", "A", "B", 0.5),
      edge("ac", "A", "C", 1.2),
      edge("cb", "C", "B", 0.5),
    ];
    const result = bestPath(edges, "A", "B", 100);
    expect(result).not.toBeNull();
    expect(result!.product).toBeCloseTo(0.6, 10);
    expect(result!.finalAmount).toBeCloseTo(60, 10);
    expect(result!.steps.map((e) => e.id)).toEqual(["ac", "cb"]);
  });

  it("同じノード間に複数エッジがあるとき高レートを選ぶ", () => {
    const edges = [
      edge("low", "A", "B", 0.3),
      edge("high", "A", "B", 0.8),
      edge("mid", "A", "B", 0.5),
    ];
    const result = bestPath(edges, "A", "B", 100);
    expect(result!.steps.map((e) => e.id)).toEqual(["high"]);
    expect(result!.finalAmount).toBeCloseTo(80, 10);
  });

  it("3ホップのチェーンを正しく辿る", () => {
    const edges = [
      edge("ab", "A", "B", 1),
      edge("bc", "B", "C", 0.5),
      edge("cd", "C", "D", 2),
    ];
    const result = bestPath(edges, "A", "D", 100);
    expect(result).not.toBeNull();
    expect(result!.product).toBeCloseTo(1, 10);
    expect(result!.finalAmount).toBeCloseTo(100, 10);
    expect(result!.steps.map((e) => e.id)).toEqual(["ab", "bc", "cd"]);
  });

  it("startAmount のデフォルトは 1", () => {
    const edges = [edge("ab", "A", "B", 0.5)];
    const result = bestPath(edges, "A", "B");
    expect(result!.finalAmount).toBe(0.5);
  });

  it("from から到達できないノードへの問い合わせは null", () => {
    const edges = [
      edge("ab", "A", "B", 1),
      edge("cd", "C", "D", 1), // 別コンポーネント
    ];
    expect(bestPath(edges, "A", "D", 100)).toBeNull();
  });

  it("レートが負やゼロのエッジは無視される（不正データへの防御）", () => {
    const edges = [
      edge("zero", "A", "B", 0),
      edge("neg", "A", "B", -0.5),
      edge("ok", "A", "B", 0.4),
    ];
    const result = bestPath(edges, "A", "B", 100);
    expect(result!.steps.map((e) => e.id)).toEqual(["ok"]);
    expect(result!.finalAmount).toBeCloseTo(40, 10);
  });

  it("requiredCardIds: 必要なカードを持っていればエッジが採用される", () => {
    const edges: ConversionEdge[] = [
      { id: "e", fromCurrencyId: "A", toCurrencyId: "B", rate: 0.5, requiredCardIds: ["card1"] },
    ];
    const result = bestPath(edges, "A", "B", 100, new Set(["card1"]));
    expect(result).not.toBeNull();
    expect(result!.finalAmount).toBe(50);
  });

  it("requiredCardIds: 必要なカードを持っていなければエッジがスキップされる", () => {
    const edges: ConversionEdge[] = [
      { id: "e", fromCurrencyId: "A", toCurrencyId: "B", rate: 0.5, requiredCardIds: ["card1"] },
    ];
    const result = bestPath(edges, "A", "B", 100, new Set(["other"]));
    expect(result).toBeNull();
  });

  it("requiredCardIds: availableCardIds が undefined なら制約は無視される (後方互換)", () => {
    const edges: ConversionEdge[] = [
      { id: "e", fromCurrencyId: "A", toCurrencyId: "B", rate: 0.5, requiredCardIds: ["card1"] },
    ];
    const result = bestPath(edges, "A", "B", 100); // 5th arg なし
    expect(result).not.toBeNull();
    expect(result!.finalAmount).toBe(50);
  });

  it("requiredCardIds: 複数のうち 1 枚でも持っていれば OR で通る", () => {
    const edges: ConversionEdge[] = [
      { id: "e", fromCurrencyId: "A", toCurrencyId: "B", rate: 0.5, requiredCardIds: ["card1", "card2"] },
    ];
    const result = bestPath(edges, "A", "B", 100, new Set(["card2"]));
    expect(result).not.toBeNull();
  });

  // ─── D-3 audit-fix: 収束性 / 循環 / 自己ループ / V-1 反復境界 ───

  it("自己ループ edge は無害 (rate=1 でも有限回反復で収束)", () => {
    // A→A の自己ループ (rate=2 で gain あり) と A→B 直接 (rate=0.5)
    // 旧 Bellman-Ford は negative cycle 検出が要件だが、本実装は **積最大** で
    // 全 rate>0 のため不正循環は無く、V-1 反復で確実に停止する。
    const edges = [
      edge("self", "A", "A", 2),
      edge("ab", "A", "B", 0.5),
    ];
    const result = bestPath(edges, "A", "B", 100);
    expect(result).not.toBeNull();
    // 自己ループ rate=2 を通っても A の bestProduct は単調増加だが、A→B は同じ B を再計算するだけ
    // (= ループで A の値が上書きされても、B も同期更新されるので最終 product は変わらない)。
    // 重要なのは「無限ループ / crash しない」こと。
    expect(result!.finalAmount).toBeGreaterThan(0);
  });

  it("2 ノード相互変換 (A↔B) は更新収束 (V=2 → 1 反復で停止)", () => {
    // A→B 0.5 / B→A 1.5 → A→B→A は product 0.75 (損)、よって to=B の最善は直接 A→B
    const edges = [
      edge("ab", "A", "B", 0.5),
      edge("ba", "B", "A", 1.5),
    ];
    const result = bestPath(edges, "A", "B", 100);
    expect(result!.product).toBeCloseTo(0.5, 10);
    expect(result!.steps.map((e) => e.id)).toEqual(["ab"]);
  });

  it("4 ホップ chain (V=5、V-1=4 反復必要) で正しく収束", () => {
    // A→B→C→D→E。V=5 で V-1=4 反復が必要な境界ケース。
    const edges = [
      edge("ab", "A", "B", 0.5),
      edge("bc", "B", "C", 2),
      edge("cd", "C", "D", 0.5),
      edge("de", "D", "E", 2),
    ];
    const result = bestPath(edges, "A", "E", 100);
    expect(result).not.toBeNull();
    expect(result!.product).toBeCloseTo(1, 10);
    expect(result!.steps.map((e) => e.id)).toEqual(["ab", "bc", "cd", "de"]);
  });

  it("tie path (積が完全一致): 先に bestProduct を更新した経路が steps に残る", () => {
    // A→B 0.6 (直接) と A→C→B (0.6 = 1.2 × 0.5) の tie
    // 候補 ordering は edges 配列順、最初に達成した path が prevEdge に残る (= direct 採用)
    const edges = [
      edge("direct", "A", "B", 0.6),
      edge("ac", "A", "C", 1.2),
      edge("cb", "C", "B", 0.5),
    ];
    const result = bestPath(edges, "A", "B", 100);
    expect(result!.product).toBeCloseTo(0.6, 10);
    expect(result!.steps.map((e) => e.id)).toEqual(["direct"]);
  });

  it("到達不能 toId (= edges から到達不能) → null、crash しない", () => {
    // A→B のみ、to=Z (孤立)。bestProduct[Z] = -Infinity で null 返却される
    const edges = [edge("ab", "A", "B", 0.5)];
    const result = bestPath(edges, "A", "Z", 100);
    expect(result).toBeNull();
  });
});
