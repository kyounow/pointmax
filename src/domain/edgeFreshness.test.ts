import { describe, it, expect } from "vitest";
import {
  EDGE_STALE_THRESHOLD_MONTHS,
  isValidVerifiedMonth,
  monthsSince,
  isMonthStale,
  staleVerifiedMonth,
} from "./edgeFreshness";
import type { ConversionEdge } from "./types";

// 基準日: 2026-07-20 (月は 7 = getMonth 6)。日は判定に影響しない (月精度) ことも確認する。
const NOW = new Date("2026-07-20T09:00:00+09:00");

describe("isValidVerifiedMonth", () => {
  it("YYYY-MM (month 01-12) を受理する", () => {
    expect(isValidVerifiedMonth("2026-01")).toBe(true);
    expect(isValidVerifiedMonth("2026-12")).toBe(true);
  });
  it("不正な形式を弾く", () => {
    expect(isValidVerifiedMonth("2026-00")).toBe(false);
    expect(isValidVerifiedMonth("2026-13")).toBe(false);
    expect(isValidVerifiedMonth("2026-1")).toBe(false); // ゼロ埋めなし
    expect(isValidVerifiedMonth("2026/07")).toBe(false);
    expect(isValidVerifiedMonth("2026-07-01")).toBe(false); // 日付精度は不可
    expect(isValidVerifiedMonth("")).toBe(false);
  });
});

describe("monthsSince", () => {
  it("経過月数を整数で返す", () => {
    expect(monthsSince("2026-07", NOW)).toBe(0); // 同月
    expect(monthsSince("2026-06", NOW)).toBe(1);
    expect(monthsSince("2026-01", NOW)).toBe(6);
    expect(monthsSince("2025-07", NOW)).toBe(12); // 年跨ぎ
  });
  it("未来は負値", () => {
    expect(monthsSince("2026-08", NOW)).toBe(-1);
  });
  it("形式不正は null", () => {
    expect(monthsSince("bogus", NOW)).toBeNull();
    expect(monthsSince("2026-13", NOW)).toBeNull();
  });
  it("同一暦月内なら日に依らず経過月数は同じ (月精度)", () => {
    expect(monthsSince("2026-01", new Date("2026-07-01T00:00:00+09:00"))).toBe(6);
    expect(monthsSince("2026-01", new Date("2026-07-31T23:59:00+09:00"))).toBe(6);
  });
});

describe("isMonthStale (境界: ちょうど 6ヶ月)", () => {
  it("ちょうど閾値 (6ヶ月) は stale ではない", () => {
    // 2026-01 → 2026-07 = 6ヶ月ちょうど
    expect(isMonthStale("2026-01", NOW)).toBe(false);
  });
  it("閾値超 (7ヶ月) は stale", () => {
    // 2025-12 → 2026-07 = 7ヶ月
    expect(isMonthStale("2025-12", NOW)).toBe(true);
  });
  it("閾値未満 (5ヶ月) は stale ではない", () => {
    expect(isMonthStale("2026-02", NOW)).toBe(false);
  });
  it("同月・未来は stale ではない", () => {
    expect(isMonthStale("2026-07", NOW)).toBe(false);
    expect(isMonthStale("2026-08", NOW)).toBe(false);
  });
  it("形式不正は stale ではない (安全側)", () => {
    expect(isMonthStale("bogus", NOW)).toBe(false);
  });
  it("閾値を引数で変更できる", () => {
    // 3 ヶ月閾値なら 2026-03 (4ヶ月前) は stale
    expect(isMonthStale("2026-03", NOW, 3)).toBe(true);
    expect(isMonthStale("2026-04", NOW, 3)).toBe(false); // ちょうど 3ヶ月
  });
  it("既定閾値は 6", () => {
    expect(EDGE_STALE_THRESHOLD_MONTHS).toBe(6);
  });
});

describe("staleVerifiedMonth (経路の最古 edge で判定)", () => {
  const edge = (over: Partial<ConversionEdge>): ConversionEdge => ({
    id: "e",
    fromCurrencyId: "a",
    toCurrencyId: "b",
    rate: 1,
    ...over,
  });

  it("記入済み step が無ければ null (未検証は古い扱いしない)", () => {
    expect(
      staleVerifiedMonth([edge({}), edge({})], NOW),
    ).toBeNull();
  });

  it("最古 step が stale ならその月を返す", () => {
    const steps = [
      edge({ id: "s1", lastVerifiedAt: "2026-06" }), // 1ヶ月前
      edge({ id: "s2", lastVerifiedAt: "2025-12" }), // 7ヶ月前 = 最古 & stale
    ];
    expect(staleVerifiedMonth(steps, NOW)).toBe("2025-12");
  });

  it("最古 step が stale でなければ null", () => {
    const steps = [
      edge({ id: "s1", lastVerifiedAt: "2026-06" }),
      edge({ id: "s2", lastVerifiedAt: "2026-01" }), // ちょうど 6ヶ月 = stale でない
    ];
    expect(staleVerifiedMonth(steps, NOW)).toBeNull();
  });

  it("未記入 step は無視し、記入済みの最古だけで判定する", () => {
    const steps = [
      edge({ id: "s1" }), // 未記入 (無視)
      edge({ id: "s2", lastVerifiedAt: "2025-10" }), // 9ヶ月前 = stale
      edge({ id: "s3" }), // 未記入 (無視)
    ];
    expect(staleVerifiedMonth(steps, NOW)).toBe("2025-10");
  });

  it("空配列は null", () => {
    expect(staleVerifiedMonth([], NOW)).toBeNull();
  });
});
