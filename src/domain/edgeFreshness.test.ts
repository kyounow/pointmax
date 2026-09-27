import { describe, it, expect } from "vitest";
import {
  FRESHNESS_STALE_MONTHS,
  isValidVerifiedMonth,
  monthsSince,
  isMonthStale,
  staleVerifiedMonth,
  resolveVerifiedMonth,
  collectStaleItems,
  type FreshnessItem,
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
    // ローカル成分コンストラクタで生成 (文字列+オフセットだと実行環境の TZ に
    // よってローカル暦月がずれ、CI (UTC) で 1 ヶ月違いになる)
    expect(monthsSince("2026-01", new Date(2026, 6, 1, 0, 0))).toBe(6);
    expect(monthsSince("2026-01", new Date(2026, 6, 31, 23, 59))).toBe(6);
  });
});

describe("isMonthStale (境界: ちょうど 12ヶ月)", () => {
  it("既定閾値は 12 (B19。edge / program / card で共通)", () => {
    expect(FRESHNESS_STALE_MONTHS).toBe(12);
  });
  it("ちょうど閾値 (12ヶ月) は stale ではない", () => {
    // 2025-07 → 2026-07 = 12ヶ月ちょうど
    expect(isMonthStale("2025-07", NOW)).toBe(false);
  });
  it("閾値超 (13ヶ月) は stale", () => {
    // 2025-06 → 2026-07 = 13ヶ月
    expect(isMonthStale("2025-06", NOW)).toBe(true);
  });
  it("旧閾値 (6ヶ月) を超えても 12ヶ月以内なら stale ではない", () => {
    // 2025-12 → 2026-07 = 7ヶ月 (旧 6ヶ月閾値では stale だった)
    expect(isMonthStale("2025-12", NOW)).toBe(false);
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
      edge({ id: "s2", lastVerifiedAt: "2025-06" }), // 13ヶ月前 = 最古 & stale
    ];
    expect(staleVerifiedMonth(steps, NOW)).toBe("2025-06");
  });

  it("最古 step が stale でなければ null", () => {
    const steps = [
      edge({ id: "s1", lastVerifiedAt: "2026-06" }),
      edge({ id: "s2", lastVerifiedAt: "2025-07" }), // ちょうど 12ヶ月 = stale でない
    ];
    expect(staleVerifiedMonth(steps, NOW)).toBeNull();
  });

  it("未記入 step は無視し、記入済みの最古だけで判定する", () => {
    const steps = [
      edge({ id: "s1" }), // 未記入 (無視)
      edge({ id: "s2", lastVerifiedAt: "2025-04" }), // 15ヶ月前 = stale
      edge({ id: "s3" }), // 未記入 (無視)
    ];
    expect(staleVerifiedMonth(steps, NOW)).toBe("2025-04");
  });

  it("空配列は null", () => {
    expect(staleVerifiedMonth([], NOW)).toBeNull();
  });

  it("edge 以外 (program 等の { lastVerifiedAt }) も同じ関数で判定できる", () => {
    expect(
      staleVerifiedMonth([{ lastVerifiedAt: "2025-01" }, {}], NOW),
    ).toBe("2025-01");
  });
});

describe("resolveVerifiedMonth (同梱 seed 参照)", () => {
  it("userModifiedAt があれば undefined (編集済みは公式の確認月を名乗らない)", () => {
    expect(
      resolveVerifiedMonth(
        { rate: 0.01, lastVerifiedAt: "2026-07", userModifiedAt: "2026-08-01T00:00:00Z" },
        { rate: 0.01, lastVerifiedAt: "2026-07" },
      ),
    ).toBeUndefined();
  });

  it("rate が一致すれば official の月 (local の古い月より seed を優先)", () => {
    expect(
      resolveVerifiedMonth(
        { rate: 0.01, lastVerifiedAt: "2025-01" },
        { rate: 0.01, lastVerifiedAt: "2026-07" },
      ),
    ).toBe("2026-07");
  });

  it("浮動小数点誤差 (0.1+0.2 と 0.3) は一致とみなす", () => {
    expect(
      resolveVerifiedMonth(
        { rate: 0.1 + 0.2 },
        { rate: 0.3, lastVerifiedAt: "2026-07" },
      ),
    ).toBe("2026-07");
  });

  it("rate が一致して official が未記入なら undefined (local に fallback しない)", () => {
    expect(
      resolveVerifiedMonth(
        { rate: 0.01, lastVerifiedAt: "2025-01" },
        { rate: 0.01 },
      ),
    ).toBeUndefined();
  });

  it("rate が不一致なら local の月 (旧 rate のまま残る端末)", () => {
    expect(
      resolveVerifiedMonth(
        { rate: 0.02, lastVerifiedAt: "2025-01" },
        { rate: 0.01, lastVerifiedAt: "2026-07" },
      ),
    ).toBe("2025-01");
  });

  it("official が無ければ (ユーザー作成 / seed から消えた id) local の月", () => {
    expect(resolveVerifiedMonth({ rate: 0.02, lastVerifiedAt: "2025-01" })).toBe(
      "2025-01",
    );
    expect(resolveVerifiedMonth({ rate: 0.02 })).toBeUndefined();
  });
});

describe("collectStaleItems (どれが古いか)", () => {
  it("route と rate が混在しても最古の月と stale 一覧 (入力順) を返す", () => {
    const items: FreshnessItem[] = [
      { kind: "route", label: "エポス→JAL", month: "2025-05" },
      { kind: "rate", label: "マルイ優待", month: "2025-03" },
      { kind: "rate", label: "新しい特典", month: "2026-06" }, // 1ヶ月 = 非 stale
    ];
    expect(collectStaleItems(items, NOW)).toEqual({
      oldest: "2025-03",
      stale: [
        { kind: "route", label: "エポス→JAL", month: "2025-05" },
        { kind: "rate", label: "マルイ優待", month: "2025-03" },
      ],
    });
  });

  it("ちょうど 12ヶ月は stale ではない", () => {
    expect(
      collectStaleItems([{ kind: "rate", label: "x", month: "2025-07" }], NOW),
    ).toBeNull();
  });

  it("未記入・形式不正・未来月は無視する", () => {
    expect(
      collectStaleItems(
        [
          { kind: "rate", label: "未記入" },
          { kind: "rate", label: "不正", month: "2025/01" },
          { kind: "route", label: "未来", month: "2027-01" },
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it("該当なし (空配列) は null", () => {
    expect(collectStaleItems([], NOW)).toBeNull();
  });

  it("閾値を引数で変更できる", () => {
    const items: FreshnessItem[] = [{ kind: "rate", label: "x", month: "2026-01" }];
    expect(collectStaleItems(items, NOW, 3)?.oldest).toBe("2026-01");
    expect(collectStaleItems(items, NOW)).toBeNull();
  });
});
