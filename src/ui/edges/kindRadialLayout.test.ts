import { describe, it, expect } from "vitest";
import { layoutByKindRadial } from "./kindRadialLayout";
import type { Currency } from "../../domain/types";

const CENTER_X = 400;
const CENTER_Y = 260;

const mkCur = (id: string, kind: Currency["kind"] = "point"): Currency => ({
  id,
  name: id,
  kind,
});

describe("layoutByKindRadial", () => {
  it("空入力 → 空マップ", () => {
    expect(layoutByKindRadial([]).size).toBe(0);
  });

  it("全ノードが kind 別の同心円に配置 (point=外側、mile=中間、cashlike=内側)", () => {
    const currencies = [
      mkCur("p1", "point"),
      mkCur("p2", "point"),
      mkCur("p3", "point"),
      mkCur("m1", "mile"),
      mkCur("m2", "mile"),
      mkCur("c1", "cashlike"),
    ];
    const layout = layoutByKindRadial(currencies);
    expect(layout.size).toBe(6);

    const distFromCenter = (id: string) => {
      const pos = layout.get(id)!;
      return Math.hypot(pos.x - CENTER_X, pos.y - CENTER_Y);
    };
    // 各 kind のリングを推定
    const pointDist = distFromCenter("p1");
    const mileDist = distFromCenter("m1");
    const cashDist = distFromCenter("c1");
    // 同 kind の全ノードが同じ radius
    expect(distFromCenter("p2")).toBeCloseTo(pointDist, 1);
    expect(distFromCenter("p3")).toBeCloseTo(pointDist, 1);
    expect(distFromCenter("m2")).toBeCloseTo(mileDist, 1);
    // 外側 > 中間 > 内側
    expect(pointDist).toBeGreaterThan(mileDist);
    expect(mileDist).toBeGreaterThan(cashDist);
  });

  it("ポイント kind 12 個 → リング上で隣接弦長 ≥ SLOT_SIZE - 余裕 (重なりなし)", () => {
    const SLOT_SIZE = 160;
    const currencies = Array.from({ length: 12 }, (_, i) =>
      mkCur(`p${i}`, "point"),
    );
    const layout = layoutByKindRadial(currencies);
    const positions = currencies.map((c) => layout.get(c.id)!);
    // 隣接 (angle 順) の弦長を確認
    const sorted = positions
      .map((p) => ({
        ...p,
        angle: Math.atan2(p.y - CENTER_Y, p.x - CENTER_X),
      }))
      .sort((a, b) => a.angle - b.angle);
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const b = sorted[(i + 1) % sorted.length];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      // 全周 2π に 12 個 → 弦長 = 2R sin(π/12) ≈ R × 0.518。
      // POINT_RADIUS デフォルト 320 で chord ≈ 165、SLOT_SIZE 160 を満たすはず
      expect(d).toBeGreaterThanOrEqual(SLOT_SIZE - 1);
    }
  });

  it("未分類 kind のノードも other リング (radius 60) に配置される", () => {
    const cur: Currency = { id: "u1", name: "未分類", kind: undefined };
    const layout = layoutByKindRadial([cur]);
    const pos = layout.get("u1");
    expect(pos).toBeDefined();
    const dist = Math.hypot(pos!.x - CENTER_X, pos!.y - CENTER_Y);
    // 単一ノードは other base radius (60) で配置
    expect(dist).toBeCloseTo(60, 1);
  });

  it("真上 (angle = -π/2) から時計回り配置", () => {
    // 1 個だけのポイントは真上 (CENTER_X, CENTER_Y - POINT_RADIUS) に
    const cur = mkCur("only", "point");
    const layout = layoutByKindRadial([cur]);
    const pos = layout.get("only")!;
    // sin(-π/2) = -1 → y = centerY - radius (真上)
    expect(pos.x).toBeCloseTo(CENTER_X, 1);
    expect(pos.y).toBeLessThan(CENTER_Y); // 上
  });
});
