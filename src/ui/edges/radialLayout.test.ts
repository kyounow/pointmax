import { describe, it, expect } from "vitest";
import { computeFocusedRadialLayout } from "./radialLayout";
import type { ConversionEdge } from "../../domain/types";

const CENTER_X = 400;
const CENTER_Y = 260;

const mkEdge = (
  id: string,
  from: string,
  to: string,
): ConversionEdge => ({ id, fromCurrencyId: from, toCurrencyId: to, rate: 1 });

describe("computeFocusedRadialLayout", () => {
  it("selected ノードを中心 (400, 260) に配置", () => {
    const layout = computeFocusedRadialLayout("a", []);
    expect(layout.get("a")).toEqual({ x: CENTER_X, y: CENTER_Y });
  });

  it("関連エッジなし → selected のみ含む 1 件", () => {
    const layout = computeFocusedRadialLayout("a", [
      mkEdge("e", "b", "c"), // a と無関係
    ]);
    expect(layout.size).toBe(1);
  });

  it("入口 1 個 (incoming only) → 真上 (centerY より上)", () => {
    const layout = computeFocusedRadialLayout("a", [mkEdge("e", "b", "a")]);
    const pos = layout.get("b");
    expect(pos).toBeDefined();
    expect(pos!.y).toBeLessThan(CENTER_Y); // 上半円
    // angle = 3π/2 = 真上 → x ≈ centerX (cos(3π/2) ≈ 0)
    expect(Math.abs(pos!.x - CENTER_X)).toBeLessThan(0.01);
  });

  it("出口 1 個 (outgoing only) → 真下 (centerY より下)", () => {
    const layout = computeFocusedRadialLayout("a", [mkEdge("e", "a", "b")]);
    const pos = layout.get("b");
    expect(pos!.y).toBeGreaterThan(CENTER_Y); // 下半円
    expect(Math.abs(pos!.x - CENTER_X)).toBeLessThan(0.01);
  });

  it("双方向 1 個 → 左 (centerX より左)", () => {
    const layout = computeFocusedRadialLayout("a", [
      mkEdge("e1", "b", "a"),
      mkEdge("e2", "a", "b"),
    ]);
    const pos = layout.get("b");
    expect(pos!.x).toBeLessThan(CENTER_X); // 左
    expect(pos!.y).toBe(CENTER_Y); // 真左 (y = centerY)
  });

  it("双方向 2 個 → 左右に振り分け", () => {
    const layout = computeFocusedRadialLayout("a", [
      mkEdge("e1", "b", "a"),
      mkEdge("e2", "a", "b"),
      mkEdge("e3", "c", "a"),
      mkEdge("e4", "a", "c"),
    ]);
    const posB = layout.get("b");
    const posC = layout.get("c");
    // 1 つは左 (centerX より左)、1 つは右 (centerX より右)
    const positions = [posB!.x, posC!.x].sort((a, b) => a - b);
    expect(positions[0]).toBeLessThan(CENTER_X); // 左
    expect(positions[1]).toBeGreaterThan(CENTER_X); // 右
  });

  it("入口 2 + 出口 2 → 上半円と下半円に分かれる", () => {
    const layout = computeFocusedRadialLayout("a", [
      mkEdge("e1", "in1", "a"),
      mkEdge("e2", "in2", "a"),
      mkEdge("e3", "a", "out1"),
      mkEdge("e4", "a", "out2"),
    ]);
    expect(layout.get("in1")!.y).toBeLessThan(CENTER_Y);
    expect(layout.get("in2")!.y).toBeLessThan(CENTER_Y);
    expect(layout.get("out1")!.y).toBeGreaterThan(CENTER_Y);
    expect(layout.get("out2")!.y).toBeGreaterThan(CENTER_Y);
  });

  it("入口 / 出口 / 双方向が混在 → 全部 layout に含まれる", () => {
    const layout = computeFocusedRadialLayout("a", [
      mkEdge("e1", "in", "a"),
      mkEdge("e2", "a", "out"),
      mkEdge("e3", "bi", "a"),
      mkEdge("e4", "a", "bi"),
    ]);
    expect(layout.size).toBe(4); // selected + in + out + bi
    expect(layout.get("a")).toEqual({ x: CENTER_X, y: CENTER_Y });
    expect(layout.get("in")!.y).toBeLessThan(CENTER_Y); // 上
    expect(layout.get("out")!.y).toBeGreaterThan(CENTER_Y); // 下
    expect(layout.get("bi")!.y).toBe(CENTER_Y); // 左右 (y == centerY)
  });

  it("ノード数が増えると radius が大きくなる (上限 280)", () => {
    // 入口 1 個 vs 入口 20 個で同方向 (真上付近) の y 距離が変わるか
    const layoutSmall = computeFocusedRadialLayout("a", [
      mkEdge("e", "b", "a"),
    ]);
    const distSmall = CENTER_Y - layoutSmall.get("b")!.y;

    const manyEdges = Array.from({ length: 20 }, (_, i) =>
      mkEdge(`e${i}`, `n${i}`, "a"),
    );
    const layoutLarge = computeFocusedRadialLayout("a", manyEdges);
    // 真上付近のノードを 1 つ拾って distance を比較
    // 20 個入口なら中央付近 (i=9 or 10) が真上 (angle ≈ 3π/2)
    const middleId = "n9";
    const midPos = layoutLarge.get(middleId);
    expect(midPos).toBeDefined();
    const distLarge = Math.hypot(midPos!.x - CENTER_X, midPos!.y - CENTER_Y);
    expect(distLarge).toBeGreaterThan(distSmall); // radius 増加 (180 → 280 上限)
    expect(distLarge).toBeLessThanOrEqual(280 + 0.01); // 上限を超えない
  });
});
