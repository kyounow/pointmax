import { describe, it, expect } from "vitest";
import { evaluatePrograms } from "./programEvaluator";
import type { BenefitProgram, Card, PaymentApp, Store, StoreProgramMembership } from "./types";

// ─── テスト用フィクスチャ ───

const jalSuica: Card = {
  id: "jal-suica",
  name: "JALカードSuica",
  defaultRate: 0.01,
  defaultCurrencyId: "jal-mile",
};

const otherCard: Card = {
  id: "other-card",
  name: "他社カード",
  defaultRate: 0.01,
  defaultCurrencyId: "rakuten-pt",
};

const eneosStore: Store = {
  id: "eneos",
  name: "ENEOS",
  category: "ガソリンスタンド",
};

const generalStore: Store = {
  id: "general",
  name: "一般店舗",
  category: "汎用",
};

const noApp: PaymentApp = {
  id: "pa-no-app",
  name: "直接決済",
};

const visaTouch: PaymentApp = {
  id: "pa-visa-touch",
  name: "Visaタッチ",
};

const jalTokuyakuProgram: BenefitProgram = {
  id: "prog-jal-tokuyaku",
  name: "JALカード特約店",
  cardIds: ["jal-suica", "jal-card"],
  rate: 0.02,
  currencyId: "jal-mile",
  bonusType: "primary",
};

const jalTokuyakuMembership: StoreProgramMembership = {
  programId: "prog-jal-tokuyaku",
  storeId: "eneos",
};

const addOnProgram: BenefitProgram = {
  id: "prog-addon-test",
  name: "上乗せテスト",
  cardIds: ["jal-suica"],
  rate: 0.005,
  currencyId: "jal-mile",
  bonusType: "addOn",
};

const addOnMembership: StoreProgramMembership = {
  programId: "prog-addon-test",
  storeId: "eneos",
};

// ─── テスト ───

describe("evaluatePrograms", () => {
  it("該当 program なし → primary: null, addOns: []", () => {
    const result = evaluatePrograms({
      card: jalSuica,
      store: eneosStore,
      paymentApp: noApp,
      programs: [],
      memberships: [],
    });
    expect(result.primary).toBeNull();
    expect(result.addOns).toHaveLength(0);
  });

  it("card.id が cardIds[] に含まれる + active 期間 + membership あり → primary に match", () => {
    const result = evaluatePrograms({
      card: jalSuica,
      store: eneosStore,
      paymentApp: noApp,
      programs: [jalTokuyakuProgram],
      memberships: [jalTokuyakuMembership],
    });
    expect(result.primary).not.toBeNull();
    expect(result.primary?.program.id).toBe("prog-jal-tokuyaku");
    expect(result.primary?.effectiveRate).toBe(0.02);
    expect(result.primary?.effectiveCurrencyId).toBe("jal-mile");
    expect(result.addOns).toHaveLength(0);
  });

  it("card.id mismatch → no match", () => {
    const result = evaluatePrograms({
      card: otherCard,
      store: eneosStore,
      paymentApp: noApp,
      programs: [jalTokuyakuProgram],
      memberships: [jalTokuyakuMembership],
    });
    expect(result.primary).toBeNull();
    expect(result.addOns).toHaveLength(0);
  });

  it("membership 無し program (= global) で paymentAppId match → primary に match", () => {
    const globalProgram: BenefitProgram = {
      id: "prog-global-visa",
      name: "Visa タッチ上乗せ",
      paymentAppId: "pa-visa-touch",
      rate: 0.01,
      currencyId: "v-pt",
      bonusType: "primary",
    };
    // memberships には prog-global-visa の membership を追加しない → global program
    const result = evaluatePrograms({
      card: jalSuica,
      store: generalStore,
      paymentApp: visaTouch,
      programs: [globalProgram],
      memberships: [], // no memberships at all
    });
    expect(result.primary).not.toBeNull();
    expect(result.primary?.program.id).toBe("prog-global-visa");
    expect(result.primary?.effectiveRate).toBe(0.01);
  });

  it("期間外 (validTo past) → 除外", () => {
    const expiredProgram: BenefitProgram = {
      ...jalTokuyakuProgram,
      id: "prog-expired",
      validTo: "2020-01-01",
    };
    const result = evaluatePrograms({
      card: jalSuica,
      store: eneosStore,
      paymentApp: noApp,
      programs: [expiredProgram],
      memberships: [{ programId: "prog-expired", storeId: "eneos" }],
      now: new Date("2026-05-14"),
    });
    expect(result.primary).toBeNull();
  });

  it("primary 複数候補から最大 rate 選択", () => {
    const lowRateProgram: BenefitProgram = {
      id: "prog-low",
      name: "低還元",
      cardIds: ["jal-suica"],
      rate: 0.01,
      currencyId: "jal-mile",
      bonusType: "primary",
    };
    const highRateProgram: BenefitProgram = {
      id: "prog-high",
      name: "高還元",
      cardIds: ["jal-suica"],
      rate: 0.03,
      currencyId: "jal-mile",
      bonusType: "primary",
    };
    const result = evaluatePrograms({
      card: jalSuica,
      store: eneosStore,
      paymentApp: noApp,
      programs: [lowRateProgram, highRateProgram],
      memberships: [
        { programId: "prog-low", storeId: "eneos" },
        { programId: "prog-high", storeId: "eneos" },
      ],
    });
    expect(result.primary?.program.id).toBe("prog-high");
    expect(result.primary?.effectiveRate).toBe(0.03);
  });

  it("addOn 複数 → 全部 addOns に含まれる", () => {
    const addOn2: BenefitProgram = {
      id: "prog-addon-2",
      name: "上乗せ2",
      cardIds: ["jal-suica"],
      rate: 0.003,
      currencyId: "jal-mile",
      bonusType: "addOn",
    };
    const result = evaluatePrograms({
      card: jalSuica,
      store: eneosStore,
      paymentApp: noApp,
      programs: [jalTokuyakuProgram, addOnProgram, addOn2],
      memberships: [
        jalTokuyakuMembership,
        addOnMembership,
        { programId: "prog-addon-2", storeId: "eneos" },
      ],
    });
    expect(result.primary?.program.id).toBe("prog-jal-tokuyaku");
    expect(result.addOns).toHaveLength(2);
    const addOnIds = result.addOns.map((a) => a.program.id);
    expect(addOnIds).toContain("prog-addon-test");
    expect(addOnIds).toContain("prog-addon-2");
  });

  it("membership の overrideRate が program.rate を上書きする", () => {
    const membershipWithOverride: StoreProgramMembership = {
      programId: "prog-jal-tokuyaku",
      storeId: "eneos",
      overrideRate: 0.03,
      overrideCurrencyId: "jal-mile",
    };
    const result = evaluatePrograms({
      card: jalSuica,
      store: eneosStore,
      paymentApp: noApp,
      programs: [jalTokuyakuProgram],
      memberships: [membershipWithOverride],
    });
    expect(result.primary?.effectiveRate).toBe(0.03);
  });
});
