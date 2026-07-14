import { describe, it, expect } from "vitest";
import { evaluatePrograms, isProgramPreferenceActive } from "./programEvaluator";
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
  scope: "member-stores",
  name: "JALカード特約店",
  cardIds: ["jal-suica", "jal-card"],
  rate: 0.02,
  currencyId: "jal-mile",
  bonusType: "primary",
};

const jalTokuyakuMembership: StoreProgramMembership = {
  id: "m-prog-jal-tokuyaku-eneos",
  programId: "prog-jal-tokuyaku",
  storeId: "eneos",
};

const addOnProgram: BenefitProgram = {
  id: "prog-addon-test",
  scope: "member-stores",
  name: "上乗せテスト",
  cardIds: ["jal-suica"],
  rate: 0.005,
  currencyId: "jal-mile",
  bonusType: "addOn",
};

const addOnMembership: StoreProgramMembership = {
  id: "m-prog-addon-test-eneos",
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
      scope: "all-stores",
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
      memberships: [{ id: "m-prog-expired-eneos", programId: "prog-expired", storeId: "eneos" }],
      now: new Date("2026-05-14"),
    });
    expect(result.primary).toBeNull();
  });

  it("primary 複数候補から最大 rate 選択", () => {
    const lowRateProgram: BenefitProgram = {
      id: "prog-low",
      scope: "member-stores",
      name: "低還元",
      cardIds: ["jal-suica"],
      rate: 0.01,
      currencyId: "jal-mile",
      bonusType: "primary",
    };
    const highRateProgram: BenefitProgram = {
      id: "prog-high",
      scope: "member-stores",
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
        { id: "m-prog-low-eneos", programId: "prog-low", storeId: "eneos" },
        { id: "m-prog-high-eneos", programId: "prog-high", storeId: "eneos" },
      ],
    });
    expect(result.primary?.program.id).toBe("prog-high");
    expect(result.primary?.effectiveRate).toBe(0.03);
  });

  it("addOn 複数 → 全部 addOns に含まれる", () => {
    const addOn2: BenefitProgram = {
      id: "prog-addon-2",
      scope: "member-stores",
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
        { id: "m-prog-addon-2-eneos", programId: "prog-addon-2", storeId: "eneos" },
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
      id: "m-prog-jal-tokuyaku-eneos",
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

  // ─── primaryCandidates field (監査残 B 対応で v5.x 追加) ───
  it("primaryCandidates: 候補なしのとき空配列、primary は null", () => {
    const result = evaluatePrograms({
      card: jalSuica,
      store: eneosStore,
      paymentApp: noApp,
      programs: [],
      memberships: [],
    });
    expect(result.primaryCandidates).toEqual([]);
    expect(result.primary).toBeNull();
  });

  it("primaryCandidates: 異種通貨 primary が並ぶと effectiveRate 降順 sort で全件返す。primary は [0]", () => {
    // jal-suica × eneos で primary が 2 件発火するシナリオを構築:
    // - prog-jal-tokuyaku (jal-mile 2%)
    // - prog-fictional-rakuten (rakuten-pt 1%) ※ jal-suica にも適用される架空 primary
    const fictionalRakutenPrimary: BenefitProgram = {
      id: "prog-fictional-rakuten",
      scope: "member-stores",
      name: "架空 rakuten primary",
      cardIds: ["jal-suica"],
      rate: 0.01,
      currencyId: "rakuten-pt",
      bonusType: "primary",
    };
    const result = evaluatePrograms({
      card: jalSuica,
      store: eneosStore,
      paymentApp: noApp,
      programs: [jalTokuyakuProgram, fictionalRakutenPrimary],
      memberships: [
        jalTokuyakuMembership,
        { id: "m-prog-fictional-rakuten-eneos", programId: "prog-fictional-rakuten", storeId: "eneos" },
      ],
    });
    expect(result.primaryCandidates).toHaveLength(2);
    // effectiveRate 降順 sort 済 (0.02 → 0.01)
    expect(result.primaryCandidates[0]?.program.id).toBe("prog-jal-tokuyaku");
    expect(result.primaryCandidates[1]?.program.id).toBe("prog-fictional-rakuten");
    // primary は [0] と同じ (= 旧挙動 back-compat)
    expect(result.primary?.program.id).toBe("prog-jal-tokuyaku");
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
    scope: "member-stores",
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
    scope: "member-stores",
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
    scope: "member-stores",
    name: "楽天カード × 楽天市場 通常",
    cardIds: ["rakuten-card"],
    rate: 0.03,
    currencyId: "rakuten-pt",
    bonusType: "primary",
  };
  const rakutenZeroFiveProg: BenefitProgram = {
    id: "prog-rakuten-ichiba-zero-five-day",
    scope: "member-stores",
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
    scope: "member-stores",
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
    scope: "member-stores",
    name: "メルカード × メルカリ",
    cardIds: ["mercard"],
    rate: 0.04,
    currencyId: "mercari-pt",
    bonusType: "primary",
  };
  const mercardDay8Prog: BenefitProgram = {
    id: "prog-mercard-mercari-day8",
    scope: "member-stores",
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
        { id: "m-prog-smbc-7p-conv-7eleven", programId: "prog-smbc-7p", storeId: "conv-7eleven" },
        { id: "m-prog-olive-8p-conv-7eleven", programId: "prog-olive-8p", storeId: "conv-7eleven" },
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
        { id: "m-prog-smbc-7p-conv-7eleven", programId: "prog-smbc-7p", storeId: "conv-7eleven" },
        { id: "m-prog-olive-8p-conv-7eleven", programId: "prog-olive-8p", storeId: "conv-7eleven" },
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
      memberships: [{ id: "m-prog-smbc-7p-conv-7eleven", programId: "prog-smbc-7p", storeId: "conv-7eleven" }],
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
        { id: "m-prog-rakuten-ichiba-base-rakuten-ichiba", programId: "prog-rakuten-ichiba-base", storeId: "rakuten-ichiba" },
        { id: "m-prog-rakuten-ichiba-zero-five-day-rakuten-ichiba", programId: "prog-rakuten-ichiba-zero-five-day", storeId: "rakuten-ichiba" },
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
        { id: "m-prog-rakuten-ichiba-base-rakuten-ichiba", programId: "prog-rakuten-ichiba-base", storeId: "rakuten-ichiba" },
        { id: "m-prog-rakuten-ichiba-zero-five-day-rakuten-ichiba", programId: "prog-rakuten-ichiba-zero-five-day", storeId: "rakuten-ichiba" },
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
      memberships: [{ id: "m-prog-dcard-bic-camera-may2026-bic-camera", programId: "prog-dcard-bic-camera-may2026", storeId: "bic-camera" }],
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
      memberships: [{ id: "m-prog-dcard-bic-camera-may2026-bic-camera", programId: "prog-dcard-bic-camera-may2026", storeId: "bic-camera" }],
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
        { id: "m-prog-mercard-mercari-mercari", programId: "prog-mercard-mercari", storeId: "mercari" },
        { id: "m-prog-mercard-mercari-day8-mercari", programId: "prog-mercard-mercari-day8", storeId: "mercari" },
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
        { id: "m-prog-mercard-mercari-mercari", programId: "prog-mercard-mercari", storeId: "mercari" },
        { id: "m-prog-mercard-mercari-day8-mercari", programId: "prog-mercard-mercari-day8", storeId: "mercari" },
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
    scope: "all-stores",
    name: "楽天Pay ベース",
    paymentAppId: "pa-rakuten-pay",
    rate: 0.01,
    currencyId: "rakuten-pt",
    bonusType: "primary",
  };
  const rakutenPayAddonProg: BenefitProgram = {
    id: "prog-rakuten-pay-rakuten-card-addon",
    scope: "all-stores",
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

// v5.1.2: chargeBased paymentApp 経由のときは paymentAppId を持たない program を除外する。
// カードが「チャージ元」(0% 還元) として扱われるため、カード単体特典 (cardIds-only) や
// 全カード共通の汎用特典は paymentApp 経由では発動しない論理。
// 該当 bug: v5.1.1 で追加した prog-olive-vpoint-up-selected-benefit (Olive 選べる特典 +1%
// Vポイント) が Olive × 楽天Pay (chargeBased) 経由で誤適用されていた。
describe("chargeBased paymentApp での cardIds-only program 除外 (v5.1.2)", () => {
  const oliveCard: Card = {
    id: "olive",
    name: "Olive",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
  };
  const generalStore: Store = { id: "general", name: "一般店舗", category: "汎用" };
  const rakutenPayChargeBased: PaymentApp = {
    id: "pa-rakuten-pay",
    name: "楽天Pay",
    chargeBased: true,
  };
  const visaTouchDirect: PaymentApp = {
    id: "pa-visa-touch",
    name: "Visaタッチ",
    chargeBased: false,
  };

  // Olive 選べる特典 (cardIds=olive、paymentAppId 未指定、addOn) — 本バグの原因 program
  const oliveSelectableBenefit: BenefitProgram = {
    id: "prog-olive-vpoint-up-selected-benefit",
    scope: "all-stores",
    name: "Olive 選べる特典 +1%",
    cardIds: ["olive"],
    rate: 0.01,
    currencyId: "v-pt",
    bonusType: "addOn",
  };

  // 楽天Pay base (paymentAppId 指定、cardIds 未指定、primary) — 除外対象外
  const rakutenPayBaseProg: BenefitProgram = {
    id: "prog-rakuten-pay-base",
    scope: "all-stores",
    name: "楽天Pay ベース",
    paymentAppId: "pa-rakuten-pay",
    rate: 0.01,
    currencyId: "rakuten-pt",
    bonusType: "primary",
  };

  it("Olive × 楽天Pay (chargeBased) → cardIds-only addOn (Olive 選べる特典) は除外、楽天Pay base のみ", () => {
    const result = evaluatePrograms({
      card: oliveCard,
      store: generalStore,
      paymentApp: rakutenPayChargeBased,
      programs: [oliveSelectableBenefit, rakutenPayBaseProg],
      memberships: [],
    });
    expect(result.primary?.program.id).toBe("prog-rakuten-pay-base");
    expect(result.addOns).toHaveLength(0); // Olive 選べる特典 が paymentAppId 未指定で除外
  });

  it("Olive × Visa タッチ (chargeBased=false) → cardIds-only addOn (Olive 選べる特典) は適用", () => {
    const result = evaluatePrograms({
      card: oliveCard,
      store: generalStore,
      paymentApp: visaTouchDirect,
      programs: [oliveSelectableBenefit, rakutenPayBaseProg],
      memberships: [],
    });
    // 楽天Pay base は paymentAppId 不一致で除外、Olive 選べる特典は適用
    expect(result.primary).toBeNull();
    expect(result.addOns).toHaveLength(1);
    expect(result.addOns[0].program.id).toBe(
      "prog-olive-vpoint-up-selected-benefit",
    );
    expect(result.addOns[0].effectiveRate).toBe(0.01);
  });

  it("paymentAppId 指定 program (rakuten-pay base) は chargeBased でも適用", () => {
    const otherCard: Card = {
      id: "other-card",
      name: "他社カード",
      defaultRate: 0.005,
      defaultCurrencyId: "v-pt",
    };
    const result = evaluatePrograms({
      card: otherCard,
      store: generalStore,
      paymentApp: rakutenPayChargeBased,
      programs: [rakutenPayBaseProg],
      memberships: [],
    });
    expect(result.primary?.program.id).toBe("prog-rakuten-pay-base");
    expect(result.primary?.effectiveRate).toBe(0.01);
  });
});

// v6: 適用範囲 (scope) 分岐の正負。
// membership 有無からの推論を廃止し、program.scope のみで「全店適用 / 加盟店限定」を判定する。
describe("scope 分岐 (v6)", () => {
  const card: Card = {
    id: "some-card",
    name: "カード",
    defaultRate: 0.01,
    defaultCurrencyId: "v-pt",
  };
  const anyStore: Store = { id: "any-store", name: "任意店", category: "汎用" };
  const noApp: PaymentApp = { id: "pa-no-app", name: "直接決済" };

  it("all-stores program は membership が無くても全店で発火する", () => {
    const allStores: BenefitProgram = {
      id: "prog-all",
      name: "全店 primary",
      scope: "all-stores",
      cardIds: ["some-card"],
      rate: 0.01,
      currencyId: "v-pt",
      bonusType: "primary",
    };
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [allStores],
      memberships: [], // membership 一切なし
    });
    expect(result.primary?.program.id).toBe("prog-all");
  });

  it("member-stores program は当該 store の membership が無ければ不発 (旧: 全店発火バグ)", () => {
    const memberOnly: BenefitProgram = {
      id: "prog-member",
      name: "加盟店限定 primary",
      scope: "member-stores",
      cardIds: ["some-card"],
      rate: 0.01,
      currencyId: "v-pt",
      bonusType: "primary",
    };
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [memberOnly],
      // 別 store の membership のみ (any-store には無い)
      memberships: [{ id: "m-prog-member-other-store", programId: "prog-member", storeId: "other-store" }],
    });
    expect(result.primary).toBeNull();
  });

  it("member-stores program は加盟 store で発火する", () => {
    const memberOnly: BenefitProgram = {
      id: "prog-member",
      name: "加盟店限定 primary",
      scope: "member-stores",
      cardIds: ["some-card"],
      rate: 0.01,
      currencyId: "v-pt",
      bonusType: "primary",
    };
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [memberOnly],
      memberships: [{ id: "m-prog-member-any-store", programId: "prog-member", storeId: "any-store" }],
    });
    expect(result.primary?.program.id).toBe("prog-member");
  });
});

// v6 PR-1d: opt-in / enabled / birthdayMonthOnly の per-user preference ゲート。
// R1 規約: seed/master は enabled を出荷せず、opt-in 特典は optIn:true で既定 OFF。
describe("opt-in / enabled / birthdayMonthOnly ゲート (PR-1d)", () => {
  const card: Card = {
    id: "olive",
    name: "Olive",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
  };
  const anyStore: Store = { id: "general", name: "一般店舗", category: "汎用" };
  const noApp: PaymentApp = { id: "pa-no-app", name: "直接決済" };

  // opt-in program (Olive 選べる特典型)。既定 OFF 出荷 (enabled は書かない)。
  const optInAddOn: BenefitProgram = {
    id: "prog-optin",
    name: "opt-in addOn",
    scope: "all-stores",
    cardIds: ["olive"],
    rate: 0.01,
    currencyId: "v-pt",
    bonusType: "addOn",
    optIn: true,
  };

  it("optIn:true かつ enabled 未設定 → 不発 (opt-in 未選択、既定 OFF)", () => {
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [optInAddOn],
      memberships: [],
    });
    expect(result.addOns).toHaveLength(0);
    expect(result.primary).toBeNull();
  });

  it("optIn:true かつ enabled:true → 発火 (ユーザーが「使う」を選択)", () => {
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [{ ...optInAddOn, enabled: true }],
      memberships: [],
    });
    expect(result.addOns).toHaveLength(1);
    expect(result.addOns[0].program.id).toBe("prog-optin");
    expect(result.addOns[0].effectiveRate).toBe(0.01);
  });

  it("optIn:true かつ enabled:false → 不発 (明示 OFF)", () => {
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [{ ...optInAddOn, enabled: false }],
      memberships: [],
    });
    expect(result.addOns).toHaveLength(0);
  });

  it("optIn なし + enabled:false → 明示 OFF で不発 (通常 program の非表示)", () => {
    const normalPrimary: BenefitProgram = {
      id: "prog-normal",
      name: "通常 primary",
      scope: "all-stores",
      cardIds: ["olive"],
      rate: 0.02,
      currencyId: "v-pt",
      bonusType: "primary",
      enabled: false,
    };
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [normalPrimary],
      memberships: [],
    });
    expect(result.primary).toBeNull();
  });

  it("optIn なし + enabled 未設定 → 従来どおり発火 (既定 ON)", () => {
    const normalPrimary: BenefitProgram = {
      id: "prog-normal",
      name: "通常 primary",
      scope: "all-stores",
      cardIds: ["olive"],
      rate: 0.02,
      currencyId: "v-pt",
      bonusType: "primary",
    };
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [normalPrimary],
      memberships: [],
    });
    expect(result.primary?.program.id).toBe("prog-normal");
  });

  // ─── birthdayMonthOnly ───
  const birthdayProgram: BenefitProgram = {
    id: "prog-birthday",
    name: "誕生月ボーナス",
    scope: "all-stores",
    cardIds: ["olive"],
    rate: 0.05,
    currencyId: "v-pt",
    bonusType: "primary",
    birthdayMonthOnly: true,
  };

  it("birthdayMonthOnly: userBirthMonth が今月と一致 → 発火", () => {
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [birthdayProgram],
      memberships: [],
      now: new Date("2026-07-15"), // 7月
      userBirthMonth: 7,
    });
    expect(result.primary?.program.id).toBe("prog-birthday");
  });

  it("birthdayMonthOnly: userBirthMonth が今月と不一致 → 不発", () => {
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [birthdayProgram],
      memberships: [],
      now: new Date("2026-07-15"), // 7月
      userBirthMonth: 3,
    });
    expect(result.primary).toBeNull();
  });

  it("birthdayMonthOnly: userBirthMonth 未設定 → 不発 (安全側)", () => {
    const result = evaluatePrograms({
      card,
      store: anyStore,
      paymentApp: noApp,
      programs: [birthdayProgram],
      memberships: [],
      now: new Date("2026-07-15"),
      // userBirthMonth 未指定
    });
    expect(result.primary).toBeNull();
  });
});

// isProgramPreferenceActive 単体 (通常 program / loyalty program 双方が共有する pure 判定)
describe("isProgramPreferenceActive (PR-1d)", () => {
  const now = new Date("2026-07-15"); // 7月

  it("preference キー無し → 有効", () => {
    expect(isProgramPreferenceActive({}, now)).toBe(true);
  });
  it("enabled:false → 無効", () => {
    expect(isProgramPreferenceActive({ enabled: false }, now)).toBe(false);
  });
  it("optIn:true + enabled 未設定 → 無効", () => {
    expect(isProgramPreferenceActive({ optIn: true }, now)).toBe(false);
  });
  it("optIn:true + enabled:true → 有効", () => {
    expect(isProgramPreferenceActive({ optIn: true, enabled: true }, now)).toBe(true);
  });
  it("birthdayMonthOnly + 一致月 → 有効", () => {
    expect(isProgramPreferenceActive({ birthdayMonthOnly: true }, now, 7)).toBe(true);
  });
  it("birthdayMonthOnly + 不一致月 → 無効", () => {
    expect(isProgramPreferenceActive({ birthdayMonthOnly: true }, now, 12)).toBe(false);
  });
  it("birthdayMonthOnly + 未設定 → 無効", () => {
    expect(isProgramPreferenceActive({ birthdayMonthOnly: true }, now)).toBe(false);
  });
});
