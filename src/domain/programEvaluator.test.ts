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

// ─── PR 2 programs の結合テスト ───

describe("PR 2 StoreRule 系 programs (evaluatePrograms)", () => {
  const smbcCard: Card = {
    id: "smbc-v",
    name: "三井住友カード",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
  };
  const oliveCard: Card = {
    id: "olive",
    name: "Oliveフレキシブルペイ",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
  };
  const rakutenCard: Card = {
    id: "rakuten-card",
    name: "楽天カード",
    defaultRate: 0.01,
    defaultCurrencyId: "rakuten-pt",
  };
  const dcardCard: Card = {
    id: "dcard",
    name: "dカード",
    defaultRate: 0.01,
    defaultCurrencyId: "d-pt",
  };
  const mercardCard: Card = {
    id: "mercard",
    name: "メルカード",
    defaultRate: 0.01,
    defaultCurrencyId: "mercari-pt",
  };

  const sevenElevenStore: Store = { id: "conv-7eleven", name: "セブン-イレブン", category: "コンビニ" };
  const rakutenIchibaStore: Store = { id: "rakuten-ichiba", name: "楽天市場", category: "ネット通販" };
  const bicCameraStore: Store = { id: "bic-camera", name: "ビックカメラ", category: "家電量販店" };
  const mercariStore: Store = { id: "mercari", name: "メルカリ", category: "ネット通販" };

  const visaTouch: PaymentApp = { id: "pa-visa-touch", name: "Visaタッチ" };
  const dPay: PaymentApp = { id: "pa-d-pay", name: "d払い" };
  const noApp: PaymentApp = { id: "pa-default", name: "通常クレカ" };

  const smbcProg: BenefitProgram = {
    id: "prog-smbc-7p",
    name: "SMBC 7%",
    cardIds: ["smbc-v"],
    paymentAppId: "pa-visa-touch",
    rate: 0.07,
    currencyId: "v-pt",
    bonusType: "primary",
    validFrom: "2023-04-03",
  };
  const oliveProg: BenefitProgram = {
    id: "prog-olive-8p",
    name: "Olive 8%",
    cardIds: ["olive"],
    paymentAppId: "pa-visa-touch",
    rate: 0.08,
    currencyId: "v-pt",
    bonusType: "primary",
    validFrom: "2023-04-03",
  };
  const rakutenBaseProg: BenefitProgram = {
    id: "prog-rakuten-ichiba-base",
    name: "楽天カード × 楽天市場 通常",
    cardIds: ["rakuten-card"],
    rate: 0.03,
    currencyId: "rakuten-pt",
    bonusType: "primary",
  };
  const rakutenZeroFiveProg: BenefitProgram = {
    id: "prog-rakuten-ichiba-zero-five-day",
    name: "楽天市場 5/0のつく日",
    cardIds: ["rakuten-card"],
    rate: 0.04,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    validFrom: "2020-01-01",
    recurringDays: [5, 10, 15, 20, 25, 30],
  };
  const dcardBicProg: BenefitProgram = {
    id: "prog-dcard-bic-camera-may2026",
    name: "d払い × ビックカメラ",
    cardIds: ["dcard"],
    paymentAppId: "pa-d-pay",
    rate: 0.06,
    currencyId: "d-pt",
    bonusType: "primary",
    validFrom: "2026-05-16",
    validTo: "2026-05-31",
  };
  const mercardProg: BenefitProgram = {
    id: "prog-mercard-mercari",
    name: "メルカード × メルカリ",
    cardIds: ["mercard"],
    rate: 0.04,
    currencyId: "mercari-pt",
    bonusType: "primary",
  };
  const mercardDay8Prog: BenefitProgram = {
    id: "prog-mercard-mercari-day8",
    name: "メルカード × メルカリ 毎月8日",
    cardIds: ["mercard"],
    rate: 0.08,
    currencyId: "mercari-pt",
    bonusType: "primary",
    recurringDays: [8],
  };

  it("smbc-v × conv-7eleven × pa-visa-touch → prog-smbc-7p (7%)", () => {
    const result = evaluatePrograms({
      card: smbcCard,
      store: sevenElevenStore,
      paymentApp: visaTouch,
      programs: [smbcProg, oliveProg],
      memberships: [
        { programId: "prog-smbc-7p", storeId: "conv-7eleven" },
        { programId: "prog-olive-8p", storeId: "conv-7eleven" },
      ],
      now: new Date("2026-05-14"),
    });
    expect(result.primary?.program.id).toBe("prog-smbc-7p");
    expect(result.primary?.effectiveRate).toBe(0.07);
  });

  it("olive × conv-7eleven × pa-visa-touch → prog-olive-8p (8%)", () => {
    const result = evaluatePrograms({
      card: oliveCard,
      store: sevenElevenStore,
      paymentApp: visaTouch,
      programs: [smbcProg, oliveProg],
      memberships: [
        { programId: "prog-smbc-7p", storeId: "conv-7eleven" },
        { programId: "prog-olive-8p", storeId: "conv-7eleven" },
      ],
      now: new Date("2026-05-14"),
    });
    expect(result.primary?.program.id).toBe("prog-olive-8p");
    expect(result.primary?.effectiveRate).toBe(0.08);
  });

  it("smbc-v × conv-7eleven × 通常クレカ (paymentAppId 不一致) → 該当なし", () => {
    const result = evaluatePrograms({
      card: smbcCard,
      store: sevenElevenStore,
      paymentApp: noApp,
      programs: [smbcProg],
      memberships: [{ programId: "prog-smbc-7p", storeId: "conv-7eleven" }],
      now: new Date("2026-05-14"),
    });
    expect(result.primary).toBeNull();
  });

  it("rakuten-card × rakuten-ichiba 通常日 → prog-rakuten-ichiba-base (3%)", () => {
    const result = evaluatePrograms({
      card: rakutenCard,
      store: rakutenIchibaStore,
      paymentApp: noApp,
      programs: [rakutenBaseProg, rakutenZeroFiveProg],
      memberships: [
        { programId: "prog-rakuten-ichiba-base", storeId: "rakuten-ichiba" },
        { programId: "prog-rakuten-ichiba-zero-five-day", storeId: "rakuten-ichiba" },
      ],
      now: new Date("2026-05-14"), // 14日 = 5/0のつく日ではない
    });
    // 5/0のつく日は 14日はアクティブでない → base のみ
    expect(result.primary?.program.id).toBe("prog-rakuten-ichiba-base");
    expect(result.primary?.effectiveRate).toBe(0.03);
  });

  it("rakuten-card × rakuten-ichiba 5/0のつく日 → prog-rakuten-ichiba-zero-five-day (4%)", () => {
    const result = evaluatePrograms({
      card: rakutenCard,
      store: rakutenIchibaStore,
      paymentApp: noApp,
      programs: [rakutenBaseProg, rakutenZeroFiveProg],
      memberships: [
        { programId: "prog-rakuten-ichiba-base", storeId: "rakuten-ichiba" },
        { programId: "prog-rakuten-ichiba-zero-five-day", storeId: "rakuten-ichiba" },
      ],
      now: new Date("2026-05-05"), // 5日 = 5/0のつく日
    });
    expect(result.primary?.program.id).toBe("prog-rakuten-ichiba-zero-five-day");
    expect(result.primary?.effectiveRate).toBe(0.04);
  });

  it("dcard × bic-camera × pa-d-pay (期間内) → prog-dcard-bic-camera-may2026 (6%)", () => {
    const result = evaluatePrograms({
      card: dcardCard,
      store: bicCameraStore,
      paymentApp: dPay,
      programs: [dcardBicProg],
      memberships: [{ programId: "prog-dcard-bic-camera-may2026", storeId: "bic-camera" }],
      now: new Date("2026-05-20"),
    });
    expect(result.primary?.program.id).toBe("prog-dcard-bic-camera-may2026");
    expect(result.primary?.effectiveRate).toBe(0.06);
  });

  it("dcard × bic-camera × pa-d-pay (期間外) → 該当なし", () => {
    const result = evaluatePrograms({
      card: dcardCard,
      store: bicCameraStore,
      paymentApp: dPay,
      programs: [dcardBicProg],
      memberships: [{ programId: "prog-dcard-bic-camera-may2026", storeId: "bic-camera" }],
      now: new Date("2026-06-01"), // 期間後
    });
    expect(result.primary).toBeNull();
  });

  it("mercard × mercari 8日以外 → prog-mercard-mercari (4%)", () => {
    const result = evaluatePrograms({
      card: mercardCard,
      store: mercariStore,
      paymentApp: noApp,
      programs: [mercardProg, mercardDay8Prog],
      memberships: [
        { programId: "prog-mercard-mercari", storeId: "mercari" },
        { programId: "prog-mercard-mercari-day8", storeId: "mercari" },
      ],
      now: new Date("2026-05-14"),
    });
    expect(result.primary?.program.id).toBe("prog-mercard-mercari");
    expect(result.primary?.effectiveRate).toBe(0.04);
  });

  it("mercard × mercari 毎月8日 → prog-mercard-mercari-day8 (8%)", () => {
    const result = evaluatePrograms({
      card: mercardCard,
      store: mercariStore,
      paymentApp: noApp,
      programs: [mercardProg, mercardDay8Prog],
      memberships: [
        { programId: "prog-mercard-mercari", storeId: "mercari" },
        { programId: "prog-mercard-mercari-day8", storeId: "mercari" },
      ],
      now: new Date("2026-05-08"), // 8日
    });
    expect(result.primary?.program.id).toBe("prog-mercard-mercari-day8");
    expect(result.primary?.effectiveRate).toBe(0.08);
  });
});

describe("PR 2 PaymentApp 系 programs (global programs, addOn)", () => {
  const rakutenCard: Card = {
    id: "rakuten-card",
    name: "楽天カード",
    defaultRate: 0.01,
    defaultCurrencyId: "rakuten-pt",
  };
  const otherCard: Card = {
    id: "other-card",
    name: "他社カード",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
  };

  const generalStore: Store = { id: "general", name: "一般店舗", category: "汎用" };
  const rakutenPay: PaymentApp = { id: "pa-rakuten-pay", name: "楽天Pay" };

  const rakutenPayBaseProg: BenefitProgram = {
    id: "prog-rakuten-pay-base",
    name: "楽天Pay ベース",
    paymentAppId: "pa-rakuten-pay",
    rate: 0.01,
    currencyId: "rakuten-pt",
    bonusType: "primary",
  };
  const rakutenPayAddonProg: BenefitProgram = {
    id: "prog-rakuten-pay-rakuten-card-addon",
    name: "楽天Pay × 楽天カード 上乗せ",
    paymentAppId: "pa-rakuten-pay",
    cardIds: ["rakuten-card"],
    rate: 0.005,
    currencyId: "rakuten-pt",
    bonusType: "addOn",
  };

  it("楽天Pay × 他社カード → base primary only (1%), addOn なし", () => {
    const result = evaluatePrograms({
      card: otherCard,
      store: generalStore,
      paymentApp: rakutenPay,
      programs: [rakutenPayBaseProg, rakutenPayAddonProg],
      memberships: [], // global programs
    });
    expect(result.primary?.program.id).toBe("prog-rakuten-pay-base");
    expect(result.primary?.effectiveRate).toBe(0.01);
    expect(result.addOns).toHaveLength(0);
  });

  it("楽天Pay × 楽天カード → base primary (1%) + addOn (0.5%)", () => {
    const result = evaluatePrograms({
      card: rakutenCard,
      store: generalStore,
      paymentApp: rakutenPay,
      programs: [rakutenPayBaseProg, rakutenPayAddonProg],
      memberships: [], // global programs
    });
    expect(result.primary?.program.id).toBe("prog-rakuten-pay-base");
    expect(result.primary?.effectiveRate).toBe(0.01);
    expect(result.addOns).toHaveLength(1);
    expect(result.addOns[0].program.id).toBe("prog-rakuten-pay-rakuten-card-addon");
    expect(result.addOns[0].effectiveRate).toBe(0.005);
  });

  it("paymentAppId 不一致 (pa-d-pay) → global programs は pa-rakuten-pay に一致しないため除外", () => {
    const dPay: PaymentApp = { id: "pa-d-pay", name: "d払い" };
    const result = evaluatePrograms({
      card: rakutenCard,
      store: generalStore,
      paymentApp: dPay,
      programs: [rakutenPayBaseProg, rakutenPayAddonProg],
      memberships: [],
    });
    expect(result.primary).toBeNull();
    expect(result.addOns).toHaveLength(0);
  });
});
