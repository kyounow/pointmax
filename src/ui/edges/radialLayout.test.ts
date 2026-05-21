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

  it("ノード数が増えると radius が大きくなる (BASE_RADIUS → 適応 radius)", () => {
    // 入口 1 個 vs 入口 5 個で外側半径が増えるか
    const layoutSmall = computeFocusedRadialLayout("a", [
      mkEdge("e", "b", "a"),
    ]);
    const distSmall = CENTER_Y - layoutSmall.get("b")!.y;

    const mediumEdges = Array.from({ length: 5 }, (_, i) =>
      mkEdge(`e${i}`, `n${i}`, "a"),
    );
    const layoutMedium = computeFocusedRadialLayout("a", mediumEdges);
    // 5 個入口なら angle 範囲 (π, 2π) に均等配置、中央付近を抽出
    const midId = "n2"; // index 2 = (π + 0.5π = 1.5π) 真上付近
    const midPos = layoutMedium.get(midId)!;
    const distMedium = Math.hypot(midPos.x - CENTER_X, midPos.y - CENTER_Y);
    expect(distMedium).toBeGreaterThanOrEqual(distSmall);
  });

  // ─── 密集時の重なり回避 (PR #44 fix) ───
  it("入口 13 個 (JAL マイル 相当) → 2 重リングに展開され、上限 radius を超えない", () => {
    // JAL マイル相当の入口 13 個シナリオ。
    // requiredRadius = 13 * 145 / π ≈ 600 で MAX_RADIUS (380) を超えるため 2 重リング展開。
    const edges = Array.from({ length: 13 }, (_, i) =>
      mkEdge(`e${i}`, `n${i}`, "a"),
    );
    const layout = computeFocusedRadialLayout("a", edges);
    // 全ノードが MAX_RADIUS (380) 以下に配置されること
    for (let i = 0; i < 13; i++) {
      const pos = layout.get(`n${i}`);
      expect(pos).toBeDefined();
      const dist = Math.hypot(pos!.x - CENTER_X, pos!.y - CENTER_Y);
      expect(dist).toBeLessThanOrEqual(380 + 0.01);
    }
    // 外側リング (radius=380) と内側リング (radius=250) の両方が使われていること
    const distances = Array.from({ length: 13 }, (_, i) => {
      const pos = layout.get(`n${i}`)!;
      return Math.hypot(pos.x - CENTER_X, pos.y - CENTER_Y);
    });
    const outerCount = distances.filter((d) => Math.abs(d - 380) < 1).length;
    const innerCount = distances.filter((d) => Math.abs(d - 250) < 1).length;
    expect(outerCount).toBeGreaterThan(0);
    expect(innerCount).toBeGreaterThan(0);
    expect(outerCount + innerCount).toBe(13);
  });

  it("入口 13 個 → 同一リング内で隣接ノード間距離が SLOT_SIZE * 0.9 以上 (重なりなし)", () => {
    const SLOT_SIZE = 145;
    const edges = Array.from({ length: 13 }, (_, i) =>
      mkEdge(`e${i}`, `n${i}`, "a"),
    );
    const layout = computeFocusedRadialLayout("a", edges);
    const positions = Array.from({ length: 13 }, (_, i) => ({
      id: `n${i}`,
      ...layout.get(`n${i}`)!,
    }));
    // 同じ radius (=同一リング) のノード対を抽出し、隣接距離を確認
    const groupedByRing = new Map<number, typeof positions>();
    for (const p of positions) {
      const r = Math.round(Math.hypot(p.x - CENTER_X, p.y - CENTER_Y));
      if (!groupedByRing.has(r)) groupedByRing.set(r, []);
      groupedByRing.get(r)!.push(p);
    }
    for (const ringPositions of groupedByRing.values()) {
      // 同一リング内で隣接 2 ノードの距離が SLOT_SIZE * 0.9 以上 (= 重なり防止)
      // angle 順 sort してから隣接距離を確認
      const sortedByAngle = ringPositions
        .map((p) => ({
          ...p,
          angle: Math.atan2(p.y - CENTER_Y, p.x - CENTER_X),
        }))
        .sort((a, b) => a.angle - b.angle);
      for (let i = 0; i < sortedByAngle.length - 1; i++) {
        const a = sortedByAngle[i];
        const b = sortedByAngle[i + 1];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        expect(d).toBeGreaterThanOrEqual(SLOT_SIZE * 0.9);
      }
    }
  });

  it("入口 100 個 (極端ケース) → 内側 capacity も超える時の挙動: 全部 2 重リングに収まる", () => {
    // 100 個入口は現状 seed にないが防御的に、tsc/runtime エラーが出ないこと
    const edges = Array.from({ length: 100 }, (_, i) =>
      mkEdge(`e${i}`, `n${i}`, "a"),
    );
    const layout = computeFocusedRadialLayout("a", edges);
    // 全 100 個 layout に含まれること (見えなくても座標は付与)
    for (let i = 0; i < 100; i++) {
      expect(layout.get(`n${i}`)).toBeDefined();
    }
  });
});
