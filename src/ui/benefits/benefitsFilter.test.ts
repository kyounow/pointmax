import { describe, it, expect } from "vitest";
import {
  classifyProgramPeriod,
  matchesBenefitFilter,
  countBenefitFilters,
  type BenefitFilterKey,
} from "./benefitsFilter";
import type { BenefitProgram } from "../../domain/types";

// 判定基準は 2026-07-15 (ローカル正午) 固定。分類は日付境界のみ見るので時刻は影響しない。
const NOW = new Date(2026, 6, 15, 12, 0, 0);

const mk = (over: Partial<BenefitProgram> & { id: string }): BenefitProgram => ({
  name: over.id,
  scope: "all-stores",
  rate: 0.01,
  currencyId: "pt",
  ...over,
});

describe("classifyProgramPeriod", () => {
  it("validFrom / validTo とも無しは permanent (常設)", () => {
    expect(classifyProgramPeriod(mk({ id: "a" }), NOW)).toBe("permanent");
  });

  it("validFrom のみ (開始済み・終了未告知) は permanent (ongoing を常設へ寄せる)", () => {
    expect(
      classifyProgramPeriod(mk({ id: "b", validFrom: "2020-01-01" }), NOW),
    ).toBe("permanent");
  });

  it("validTo あり・期間内は active", () => {
    expect(
      classifyProgramPeriod(
        mk({ id: "c", validFrom: "2026-07-01", validTo: "2026-07-31" }),
        NOW,
      ),
    ).toBe("active");
  });

  it("validTo が過去は expired", () => {
    expect(
      classifyProgramPeriod(
        mk({ id: "d", validFrom: "2026-06-01", validTo: "2026-06-30" }),
        NOW,
      ),
    ).toBe("expired");
  });

  it("validFrom が未来は future (validTo 有無に関わらず)", () => {
    expect(
      classifyProgramPeriod(
        mk({ id: "e", validFrom: "2026-08-01", validTo: "2026-08-31" }),
        NOW,
      ),
    ).toBe("future");
    // validFrom のみ未来でも ongoing ではなく future が優先される
    expect(
      classifyProgramPeriod(mk({ id: "f", validFrom: "2026-08-01" }), NOW),
    ).toBe("future");
  });

  it("validTo 当日は active (23:59:59 まで有効)", () => {
    expect(
      classifyProgramPeriod(mk({ id: "g", validTo: "2026-07-15" }), NOW),
    ).toBe("active");
  });
});

describe("matchesBenefitFilter", () => {
  const permanent = mk({ id: "p" });
  const active = mk({ id: "a", validFrom: "2026-07-01", validTo: "2026-07-31" });
  const expired = mk({ id: "x", validFrom: "2026-06-01", validTo: "2026-06-30" });
  const future = mk({ id: "u", validFrom: "2026-08-01", validTo: "2026-08-31" });
  const loyalty = mk({ id: "l", pointCardId: "pc-1" });
  const paymentapp = mk({ id: "pa", paymentAppId: "pa-1" });
  const optin = mk({ id: "o", optIn: true });

  it("all は全 program にマッチ", () => {
    for (const p of [permanent, active, expired, future, loyalty]) {
      expect(matchesBenefitFilter(p, "all", NOW)).toBe(true);
    }
  });

  it("期間系フィルタは該当分類のみ (正) / 他分類は除外 (負)", () => {
    expect(matchesBenefitFilter(permanent, "permanent", NOW)).toBe(true);
    expect(matchesBenefitFilter(active, "permanent", NOW)).toBe(false);

    expect(matchesBenefitFilter(active, "active", NOW)).toBe(true);
    expect(matchesBenefitFilter(expired, "active", NOW)).toBe(false);

    expect(matchesBenefitFilter(expired, "expired", NOW)).toBe(true);
    expect(matchesBenefitFilter(active, "expired", NOW)).toBe(false);

    expect(matchesBenefitFilter(future, "future", NOW)).toBe(true);
    expect(matchesBenefitFilter(permanent, "future", NOW)).toBe(false);
  });

  it("横断フィルタ (loyalty / paymentapp / optin) はフラグで判定", () => {
    expect(matchesBenefitFilter(loyalty, "loyalty", NOW)).toBe(true);
    expect(matchesBenefitFilter(permanent, "loyalty", NOW)).toBe(false);

    expect(matchesBenefitFilter(paymentapp, "paymentapp", NOW)).toBe(true);
    expect(matchesBenefitFilter(permanent, "paymentapp", NOW)).toBe(false);

    expect(matchesBenefitFilter(optin, "optin", NOW)).toBe(true);
    expect(matchesBenefitFilter(permanent, "optin", NOW)).toBe(false);
  });

  it("optin は optIn===true のみ (undefined / false は除外)", () => {
    expect(matchesBenefitFilter(mk({ id: "z", optIn: false }), "optin", NOW)).toBe(
      false,
    );
    expect(matchesBenefitFilter(mk({ id: "z2" }), "optin", NOW)).toBe(false);
  });
});

describe("countBenefitFilters", () => {
  it("期間系は排他 (合計 = all)・横断系は重複カウント", () => {
    const programs = [
      mk({ id: "p1" }), // permanent
      mk({ id: "p2", validFrom: "2020-01-01" }), // permanent (ongoing)
      mk({ id: "a1", validFrom: "2026-07-01", validTo: "2026-07-31" }), // active
      mk({ id: "x1", validFrom: "2026-06-01", validTo: "2026-06-30" }), // expired
      mk({ id: "u1", validFrom: "2026-08-01", validTo: "2026-08-31" }), // future
      // 横断: active かつ loyalty かつ optin
      mk({
        id: "mix",
        validFrom: "2026-07-01",
        validTo: "2026-07-31",
        pointCardId: "pc-1",
        optIn: true,
      }),
      mk({ id: "pa1", paymentAppId: "pa-1" }), // permanent + paymentapp
    ];
    const counts: Record<BenefitFilterKey, number> = countBenefitFilters(
      programs,
      NOW,
    );

    expect(counts.all).toBe(7);
    // 期間系の合計は all と一致 (排他分割)
    expect(
      counts.permanent + counts.active + counts.expired + counts.future,
    ).toBe(counts.all);
    expect(counts.permanent).toBe(3); // p1, p2, pa1
    expect(counts.active).toBe(2); // a1, mix
    expect(counts.expired).toBe(1);
    expect(counts.future).toBe(1);
    // 横断系
    expect(counts.loyalty).toBe(1); // mix
    expect(counts.paymentapp).toBe(1); // pa1
    expect(counts.optin).toBe(1); // mix
  });
});
