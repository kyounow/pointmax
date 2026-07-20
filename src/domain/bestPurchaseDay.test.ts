import { describe, it, expect, vi } from "vitest";
import {
  findBestPurchaseDay,
  isDateGatedProgram,
  formatBestDayLabel,
} from "./bestPurchaseDay";
import { rankCards } from "./rankCards";
import {
  SEED_BENEFIT_PROGRAMS,
  SEED_STORE_PROGRAM_MEMBERSHIPS,
} from "../state/seed-data-programs";
import type {
  BenefitProgram,
  Card,
  Store,
  StoreProgramMembership,
} from "./types";

// 日付は全てローカル暦日の構築子 (new Date(y, mIdx, d, ...)) を使う。
// findBestPurchaseDay / isRuleActiveAt / recurringDays 判定は全てローカルの getDate/getDay を
// 見るため、テストランナーの TZ に依存せず決定的になる (mIdx=6 は 7 月)。
function localNoon(y: number, mIdx: number, d: number): Date {
  return new Date(y, mIdx, d, 12, 0, 0, 0);
}

const rakutenCard: Card = {
  id: "rakuten-card",
  name: "楽天カード",
  defaultRate: 0.01,
  defaultCurrencyId: "rakuten-pt",
  enabled: true,
};

const rakutenStore: Store = { id: "rakuten-ichiba", name: "楽天市場" };

// (a) 楽天「5と0のつく日」: seed 実データで rakuten-ichiba + rakuten-card 有効時、
//     非対象日には「次の 5/0 の日 + gain」が出て、対象日当日は「今日が最良」なので出ない。
describe("findBestPurchaseDay: 楽天「5と0のつく日」(seed 実データ)", () => {
  const baseInput = {
    payment: { storeId: "rakuten-ichiba", amount: 10000 },
    targetCurrencyId: "rakuten-pt",
    cards: [rakutenCard],
    stores: [rakutenStore],
    edges: [],
    programs: SEED_BENEFIT_PROGRAMS,
    memberships: SEED_STORE_PROGRAM_MEMBERSHIPS,
  };

  it("非対象日 (7/21) には次の 5/0 の日 (25 日) と +1% ゲインを返す", () => {
    const result = findBestPurchaseDay({
      ...baseInput,
      now: localNoon(2026, 6, 21),
    });
    expect(result).not.toBeNull();
    // 次の 5/0 の日は 25 日 (30 日も同ゲインだが「最も近い日」= 25 を採る)。
    expect(result!.date.getDate()).toBe(25);
    expect(result!.date.getMonth()).toBe(6); // 同月 7 月
    // base 3% は両日不変、5/0 の +1% (= 10000 円 × 0.01 = 100 rakuten-pt) がゲイン。
    expect(result!.gainAmount).toBeCloseTo(100, 6);
    expect(result!.topCard.id).toBe("rakuten-card");
    expect(result!.drivingProgramName).toContain("5と0");
  });

  it("対象日当日 (7/20 = 0 のつく日) は今日が最良なので null", () => {
    const result = findBestPurchaseDay({
      ...baseInput,
      now: localNoon(2026, 6, 20),
    });
    expect(result).toBeNull();
  });
});

// (b) 未来 validFrom を持つ program の汎用 fixture で、開始日に正しく発火する。
describe("findBestPurchaseDay: 未来 validFrom program", () => {
  const card: Card = {
    id: "c1",
    name: "C1",
    defaultRate: 0.01,
    defaultCurrencyId: "cur",
    enabled: true,
  };
  const store: Store = { id: "s1", name: "S1" };
  const futureProg: BenefitProgram = {
    id: "p-future",
    name: "未来キャンペーン +2%",
    scope: "member-stores",
    cardIds: ["c1"],
    rate: 0.02,
    currencyId: "cur",
    bonusType: "addOn",
    validFrom: "2026-07-15", // today (7/10) より 5 日後に開始
  };
  const memberships: StoreProgramMembership[] = [
    { id: "m-p-future-s1", programId: "p-future", storeId: "s1" },
  ];

  it("開始日 (7/15) にベスト日として発火し、+2% をゲインとして返す", () => {
    const result = findBestPurchaseDay({
      payment: { storeId: "s1", amount: 10000 },
      targetCurrencyId: "cur",
      cards: [card],
      stores: [store],
      edges: [],
      programs: [futureProg],
      memberships,
      now: localNoon(2026, 6, 10),
    });
    expect(result).not.toBeNull();
    expect(result!.date.getDate()).toBe(15);
    expect(result!.gainAmount).toBeCloseTo(200, 6); // 10000 × 0.02
    expect(result!.topCard.id).toBe("c1");
    expect(result!.drivingProgramName).toBe("未来キャンペーン +2%");
  });
});

// (c) 対象 program の無い店では判定関数が即 null を返し、rankCards を 1 度も呼ばない
//     (無関係な店で 30 回計算しないことを spy で担保)。
describe("findBestPurchaseDay: 日限定 program の無い店では即 null", () => {
  const card: Card = {
    id: "c1",
    name: "C1",
    defaultRate: 0.01,
    defaultCurrencyId: "cur",
    enabled: true,
  };
  // 常設 primary のみ (recurringDays/recurringWeekdays/未来 validFrom を持たない)。
  const plainProg: BenefitProgram = {
    id: "p-plain",
    name: "常設 2%",
    scope: "member-stores",
    cardIds: ["c1"],
    rate: 0.02,
    currencyId: "cur",
    bonusType: "primary",
  };
  const memberships: StoreProgramMembership[] = [
    { id: "m-p-plain-s2", programId: "p-plain", storeId: "s2" },
  ];

  it("null を返し、rankFn (rankCards) は一度も呼ばれない", () => {
    const spy = vi.fn();
    const result = findBestPurchaseDay(
      {
        payment: { storeId: "s2", amount: 10000 },
        targetCurrencyId: "cur",
        cards: [card],
        stores: [{ id: "s2", name: "S2" }],
        edges: [],
        programs: [plainProg],
        memberships,
        now: localNoon(2026, 6, 21),
      },
      { rankFn: spy as unknown as typeof rankCards },
    );
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("isDateGatedProgram", () => {
  const today = localNoon(2026, 6, 10);
  const base: BenefitProgram = {
    id: "p",
    name: "p",
    scope: "member-stores",
    rate: 0.01,
    currencyId: "cur",
  };
  it("recurringDays を持つ program は日限定", () => {
    expect(isDateGatedProgram({ ...base, recurringDays: [5] }, today)).toBe(true);
  });
  it("recurringWeekdays を持つ program は日限定", () => {
    expect(isDateGatedProgram({ ...base, recurringWeekdays: [0] }, today)).toBe(
      true,
    );
  });
  it("未来 validFrom は日限定 / 過去 validFrom は非対象", () => {
    expect(isDateGatedProgram({ ...base, validFrom: "2026-08-01" }, today)).toBe(
      true,
    );
    expect(isDateGatedProgram({ ...base, validFrom: "2020-01-01" }, today)).toBe(
      false,
    );
  });
  it("期間・繰り返し指定の無い常設 program は非対象", () => {
    expect(isDateGatedProgram(base, today)).toBe(false);
  });
});

describe("formatBestDayLabel", () => {
  const today = localNoon(2026, 6, 21); // 2026-07-21
  it("同じ暦月内は「N日」表記", () => {
    expect(formatBestDayLabel(localNoon(2026, 6, 25), today)).toBe("25日");
  });
  it("月をまたぐと「M/D」表記", () => {
    expect(formatBestDayLabel(localNoon(2026, 7, 5), today)).toBe("8/5");
  });
});
