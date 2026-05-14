// paymentApp.test.ts - v3 PR 3
// PaymentApp の評価は programEvaluator ベースに統一。
// 旧 defaultBonusRate / cardSpecificBonusRates のテストは
// BenefitProgram (prog-*-base / prog-*-addon) ベースに書き換え。
import { describe, it, expect } from "vitest";
import { evaluatePaymentApps, bestPaymentApp } from "./paymentApp";
import type { BenefitProgram, Card, PaymentApp, Store, StoreProgramMembership } from "./types";

const rakutenCard: Card = {
  id: "rakuten",
  name: "楽天カード",
  defaultRate: 0.01,
  defaultCurrencyId: "rakuten-pt",
};
const smbcCard: Card = {
  id: "smbc",
  name: "三井住友 NL",
  defaultRate: 0.005,
  defaultCurrencyId: "v-pt",
};

const stores: Store[] = [
  { id: "lawson", name: "ローソン", category: "コンビニ" },
  { id: "general", name: "(その他)", category: "汎用" },
];

const defaultApp: PaymentApp = {
  id: "pa-default",
  name: "通常クレカ決済",
};
const visaTouch: PaymentApp = {
  id: "pa-visa-touch",
  name: "Visaタッチ",
};
const rakutenPay: PaymentApp = {
  id: "pa-rakuten-pay",
  name: "楽天Pay",
  compatibleCardIds: ["rakuten"],
};

describe("evaluatePaymentApps", () => {
  it("どのカードでも使えるアプリは試算対象に入る", () => {
    const results = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "rakuten-pt",
      [defaultApp, visaTouch],
      [],
      stores,
      [],
    );
    expect(results.map((r) => r.paymentApp.id).sort()).toEqual([
      "pa-default",
      "pa-visa-touch",
    ]);
  });

  it("compatibleCardIds に含まれないカードでは対象アプリ除外", () => {
    const results = evaluatePaymentApps(
      smbcCard, // 楽天Pay は楽天カード専用なので対象外
      "general",
      10000,
      "v-pt",
      [defaultApp, rakutenPay],
      [],
      stores,
      [],
    );
    expect(results.map((r) => r.paymentApp.id)).toEqual(["pa-default"]);
  });

  it("交換ルートが無くて target に到達できない場合は reachable=false", () => {
    const results = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "unknown-currency",
      [defaultApp],
      [],
      stores,
      [],
    );
    expect(results[0].reachable).toBe(false);
    expect(results[0].totalFinalAmount).toBe(0);
  });

  it("BenefitProgram addOn で appBonus が加算される (programEvaluator ベース)", () => {
    // 楽天Pay ベース 1% (primary, paymentApp 適用)
    const baseProgram: BenefitProgram = {
      id: "prog-rakuten-pay-base",
      name: "楽天Pay ベース",
      paymentAppId: "pa-rakuten-pay",
      rate: 0.01,
      currencyId: "rakuten-pt",
      bonusType: "primary",
    };
    // 楽天Pay × 楽天カード addOn 0.5%
    const addonProgram: BenefitProgram = {
      id: "prog-rakuten-pay-addon",
      name: "楽天Pay addOn",
      paymentAppId: "pa-rakuten-pay",
      cardIds: ["rakuten"],
      rate: 0.005,
      currencyId: "rakuten-pt",
      bonusType: "addOn",
    };
    const results = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "rakuten-pt",
      [rakutenPay],
      [],
      stores,
      [],
      undefined,
      new Date(),
      [baseProgram, addonProgram],
      [],
    );
    expect(results).toHaveLength(1);
    const r = results[0];
    // addOn: 0.5% × 10000 = 50
    expect(r.appBonusEarnedAmount).toBeCloseTo(50, 6);
    expect(r.appBonusFinalAmount).toBeCloseTo(50, 6);
  });

  it("chargeBased=true なら cardEarned=0 で primary が card rate を表す", () => {
    const dPay: PaymentApp = {
      id: "pa-d-pay",
      name: "d払い",
      chargeBased: true,
    };
    // d払いベース 0.5% primary program
    const baseProgram: BenefitProgram = {
      id: "prog-d-pay-base",
      name: "d払いベース",
      paymentAppId: "pa-d-pay",
      rate: 0.005,
      currencyId: "d-pt",
      bonusType: "primary",
    };
    const results = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "d-pt",
      [dPay],
      [],
      stores,
      [{ id: "rp-to-d", fromCurrencyId: "rakuten-pt", toCurrencyId: "d-pt", rate: 1 }],
      undefined,
      new Date(),
      [baseProgram],
      [],
    );
    // chargeBased: cardEarned = 0 (resolved.rate = 0), primary bonus = 0.5% = 50 d-pt
    expect(results[0].cardFinalAmount).toBeCloseTo(50, 6); // primary rate via chargeBased path
    expect(results[0].totalFinalAmount).toBeCloseTo(50, 6);
  });
});

describe("chargeBased PaymentApp", () => {
  const dPay: PaymentApp = {
    id: "pa-d-pay",
    name: "d払い",
    chargeBased: true,
  };

  it("chargeBased=true なら card.defaultRate は無視され resolved.rate=0", () => {
    const results = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "rakuten-pt",
      [dPay],
      [],
      stores,
      [],
    );
    // chargeBased: resolved は charge source、cardEarned = 0
    expect(results[0].resolved.source).toBe("charge");
    expect(results[0].cardEarnedAmount).toBe(0);
  });
});

describe("PaymentApp.enabled フィルタリング", () => {
  it("enabled=false の PaymentApp は evaluatePaymentApps の結果から除外される", () => {
    const enabledPa: PaymentApp = {
      id: "pa-on",
      name: "On",
    };
    const disabledPa: PaymentApp = {
      id: "pa-off",
      name: "Off",
      enabled: false,
    };
    const results = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "rakuten-pt",
      [enabledPa, disabledPa],
      [],
      stores,
      [],
    );
    expect(results.map((r) => r.paymentApp.id)).toEqual(["pa-on"]);
  });

  it("enabled undefined は有効扱い (後方互換)", () => {
    const pa: PaymentApp = { id: "pa-undef", name: "Undef" };
    const results = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "rakuten-pt",
      [pa],
      [],
      stores,
      [],
    );
    expect(results).toHaveLength(1);
  });
});

describe("bestPaymentApp", () => {
  it("複数候補から totalFinalAmount が最大のものを返す (programs ベース)", () => {
    // smbc × visaTouch で SMBC 7% program
    const smbcVisaProgram: BenefitProgram = {
      id: "prog-smbc-7p",
      name: "SMBC 7%",
      cardIds: ["smbc"],
      paymentAppId: "pa-visa-touch",
      rate: 0.07,
      currencyId: "v-pt",
      bonusType: "primary",
    };
    const memberships: StoreProgramMembership[] = [
      { programId: "prog-smbc-7p", storeId: "lawson" },
    ];
    const best = bestPaymentApp(
      smbcCard,
      "lawson",
      10000,
      "v-pt",
      [defaultApp, visaTouch],
      [],
      stores,
      [],
      undefined,
      new Date(),
      [smbcVisaProgram],
      memberships,
    );
    expect(best?.paymentApp.id).toBe("pa-visa-touch");
    expect(best?.totalFinalAmount).toBeCloseTo(700, 6);
  });

  it("適用可能アプリ無しなら null", () => {
    const onlyIncompat: PaymentApp = {
      id: "pa-only-for-other",
      name: "他カード専用",
      compatibleCardIds: ["other-card"],
    };
    const best = bestPaymentApp(
      smbcCard,
      "lawson",
      10000,
      "v-pt",
      [onlyIncompat],
      [],
      stores,
      [],
    );
    expect(best).toBeNull();
  });
});
