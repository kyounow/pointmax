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
});
