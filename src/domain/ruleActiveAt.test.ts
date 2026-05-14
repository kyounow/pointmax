import { describe, it, expect } from "vitest";
import { isRuleActiveAt, daysUntilValidTo } from "./ruleActiveAt";

describe("isRuleActiveAt", () => {
  const now = new Date("2026-06-15T12:00:00");

  it("validFrom / validTo 両方未指定なら常時 active", () => {
    expect(isRuleActiveAt({}, now)).toBe(true);
  });

  it("validFrom 未来日 → inactive", () => {
    expect(isRuleActiveAt({ validFrom: "2026-07-01" }, now)).toBe(false);
  });

  it("validFrom 過去日 → active", () => {
    expect(isRuleActiveAt({ validFrom: "2026-01-01" }, now)).toBe(true);
  });

  it("validFrom == 今日の 0:00 でも active (当日含む)", () => {
    expect(isRuleActiveAt({ validFrom: "2026-06-15" }, now)).toBe(true);
  });

  it("validTo 過去日 → inactive", () => {
    expect(isRuleActiveAt({ validTo: "2026-05-31" }, now)).toBe(false);
  });

  it("validTo == 今日 → active (23:59:59 まで含む)", () => {
    expect(isRuleActiveAt({ validTo: "2026-06-15" }, now)).toBe(true);
  });

  it("validTo == 昨日 23:59:59 → inactive", () => {
    // 2026-06-14 23:59:59.999 まで → 6-15 12:00 は外
    expect(isRuleActiveAt({ validTo: "2026-06-14" }, now)).toBe(false);
  });

  it("両方指定 + 区間内 → active", () => {
    expect(
      isRuleActiveAt({ validFrom: "2026-06-01", validTo: "2026-06-30" }, now),
    ).toBe(true);
  });

  it("両方指定 + 区間外 (前) → inactive", () => {
    expect(
      isRuleActiveAt({ validFrom: "2026-07-01", validTo: "2026-07-31" }, now),
    ).toBe(false);
  });

  it("両方指定 + 区間外 (後) → inactive", () => {
    expect(
      isRuleActiveAt({ validFrom: "2026-05-01", validTo: "2026-05-31" }, now),
    ).toBe(false);
  });

  it("validFrom と validTo が同日 → その日だけ active", () => {
    expect(
      isRuleActiveAt({ validFrom: "2026-06-15", validTo: "2026-06-15" }, now),
    ).toBe(true);
    expect(
      isRuleActiveAt(
        { validFrom: "2026-06-15", validTo: "2026-06-15" },
        new Date("2026-06-16T00:00:01"),
      ),
    ).toBe(false);
  });

  it("不正な日付文字列 → inactive (安全側)", () => {
    expect(isRuleActiveAt({ validFrom: "not-a-date" }, now)).toBe(false);
    expect(isRuleActiveAt({ validTo: "abc" }, now)).toBe(false);
  });

  it("now 引数を省略すると現在時刻が使われる (smoke)", () => {
    // 今日を含む長期間ルール
    const today = new Date();
    const year = today.getFullYear();
    expect(
      isRuleActiveAt({
        validFrom: `${year - 1}-01-01`,
        validTo: `${year + 1}-12-31`,
      }),
    ).toBe(true);
  });

  // ─── recurringDays ───

  it("recurringDays [5,10,15,20,25,30] かつ now.getDate() === 10 → active", () => {
    const day10 = new Date("2026-06-10T12:00:00");
    expect(
      isRuleActiveAt({ recurringDays: [5, 10, 15, 20, 25, 30] }, day10),
    ).toBe(true);
  });

  it("recurringDays [5,10,15,20,25,30] かつ now.getDate() === 11 → not active", () => {
    const day11 = new Date("2026-06-11T12:00:00");
    expect(
      isRuleActiveAt({ recurringDays: [5, 10, 15, 20, 25, 30] }, day11),
    ).toBe(false);
  });

  it("recurringDays + validFrom 期限切れ → not active (AND 結合)", () => {
    // validFrom が未来 → validFrom チェックで弾かれる
    const day10 = new Date("2026-06-10T12:00:00");
    expect(
      isRuleActiveAt(
        { validFrom: "2026-07-01", recurringDays: [5, 10, 15, 20, 25, 30] },
        day10,
      ),
    ).toBe(false);
  });

  it("recurringDays 空配列 → 制限なし扱い (常時 active)", () => {
    const day11 = new Date("2026-06-11T12:00:00");
    expect(isRuleActiveAt({ recurringDays: [] }, day11)).toBe(true);
  });
});

describe("daysUntilValidTo", () => {
  // 今日 2026-05-14 の正午を基準に
  const today = new Date("2026-05-14T12:00:00");

  it("validTo=2026-05-31 → 17 日", () => {
    expect(daysUntilValidTo("2026-05-31", today)).toBe(17);
  });

  it("同日 (validTo=2026-05-14) → 0 (23:59:59 まで有効)", () => {
    expect(daysUntilValidTo("2026-05-14", today)).toBe(0);
  });

  it("1 日経過後 (validTo=2026-05-13) → -1", () => {
    expect(daysUntilValidTo("2026-05-13", today)).toBe(-1);
  });

  it("undefined → null", () => {
    expect(daysUntilValidTo(undefined, today)).toBeNull();
  });

  it("不正フォーマット (例 '2026/05/31') → null", () => {
    expect(daysUntilValidTo("2026/05/31", today)).toBeNull();
  });
});
