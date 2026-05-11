import { describe, it, expect } from "vitest";
import { evaluatePaymentApps, bestPaymentApp } from "./paymentApp";
import type { Card, PaymentApp, Store, StoreRule } from "./types";

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
  defaultBonusRate: 0.01,
  defaultBonusCurrencyId: "rakuten-pt",
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

  it("PaymentApp の defaultBonusRate がアプリbonusとして加算される", () => {
    const results = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "rakuten-pt",
      [rakutenPay],
      [],
      stores,
      [],
    );
    expect(results).toHaveLength(1);
    const r = results[0];
    // クレカ部分: 楽天カード 1% で 100 rakuten-pt
    expect(r.cardEarnedAmount).toBe(100);
    // アプリ部分: 楽天Pay 1% で 100 rakuten-pt
    expect(r.appBonusEarnedAmount).toBe(100);
    // 合計: 200 rakuten-pt
    expect(r.totalFinalAmount).toBe(200);
  });

  it("店舗ルールでpaymentAppIdが指定されていれば、そのアプリ使用時のレートが適用される", () => {
    const rules: StoreRule[] = [
      {
        id: "lawson-visa",
        cardId: "smbc",
        storeId: "lawson",
        paymentAppId: "pa-visa-touch",
        rate: 0.07,
        currencyId: "v-pt",
      },
    ];
    const results = evaluatePaymentApps(
      smbcCard,
      "lawson",
      10000,
      "v-pt",
      [defaultApp, visaTouch],
      rules,
      stores,
      [],
    );
    const visa = results.find((r) => r.paymentApp.id === "pa-visa-touch");
    const def = results.find((r) => r.paymentApp.id === "pa-default");
    // Visaタッチ使用時 7%
    expect(visa!.cardEarnedAmount).toBeCloseTo(700, 6);
    // 通常クレカ決済は paymentAppId 一致しないため デフォルト 0.5%
    expect(def!.cardEarnedAmount).toBeCloseTo(50, 6);
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
});

describe("chargeBased PaymentApp", () => {
  const dPay: PaymentApp = {
    id: "pa-d-pay",
    name: "d払い",
    chargeBased: true,
    defaultBonusRate: 0.005,
    defaultBonusCurrencyId: "d-pt",
  };

  it("chargeBased=true なら店舗ルール/カテゴリルールは無視され、カードのdefaultRate のみ適用", () => {
    // ツルハ × JAL特約店カテゴリで JAL Suica 2% のルール
    const jalSuica: Card = {
      id: "jal-suica",
      name: "JALカードSuica",
      defaultRate: 0.01, // 1%
      defaultCurrencyId: "jal-mile",
    };
    const tsuruhaStore: Store = {
      id: "tsuruha",
      name: "ツルハドラッグ",
      category: "JAL特約店",
    };
    const jalTokuyakuRule: StoreRule = {
      id: "jal-tokuyaku",
      cardId: "jal-suica",
      category: "JAL特約店",
      rate: 0.02, // 2%
      currencyId: "jal-mile",
    };
    // 通常クレカ決済: 2% (カテゴリルール適用)
    const directResults = evaluatePaymentApps(
      jalSuica,
      "tsuruha",
      10000,
      "jal-mile",
      [defaultApp],
      [jalTokuyakuRule],
      [tsuruhaStore],
      [],
    );
    expect(directResults[0].cardEarnedAmount).toBeCloseTo(200, 6);

    // d払い (chargeBased): カテゴリルール無視 → 1%
    const dpayResults = evaluatePaymentApps(
      jalSuica,
      "tsuruha",
      10000,
      "jal-mile",
      [dPay],
      [jalTokuyakuRule],
      [tsuruhaStore],
      [],
    );
    expect(dpayResults[0].cardEarnedAmount).toBeCloseTo(100, 6);
  });

  it("chargeBased=true でも アプリbonus自体は加算される", () => {
    const result = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "d-pt",
      [dPay],
      [],
      stores,
      [
        { id: "rp-to-d", fromCurrencyId: "rakuten-pt", toCurrencyId: "d-pt", rate: 1 },
      ],
    );
    // クレカ: 楽天カード 1% で 100 楽天pt → d-pt 100
    expect(result[0].cardFinalAmount).toBeCloseTo(100, 6);
    // d払い bonus: 0.5% で 50 d-pt (直接target)
    expect(result[0].appBonusFinalAmount).toBeCloseTo(50, 6);
    expect(result[0].totalFinalAmount).toBeCloseTo(150, 6);
  });
});

describe("bestPaymentApp", () => {
  it("複数候補から totalFinalAmount が最大のものを返す", () => {
    const rules: StoreRule[] = [
      {
        id: "lawson-visa",
        cardId: "smbc",
        storeId: "lawson",
        paymentAppId: "pa-visa-touch",
        rate: 0.07,
        currencyId: "v-pt",
      },
    ];
    const best = bestPaymentApp(
      smbcCard,
      "lawson",
      10000,
      "v-pt",
      [defaultApp, visaTouch],
      rules,
      stores,
      [],
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
