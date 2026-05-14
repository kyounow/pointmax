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

  it("chargeBased=true なら店舗ルール/カテゴリルールも card.defaultRate も無視され cardEarned=0", () => {
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

    // d払い (chargeBased=true): カテゴリルールも defaultRate も無視 → cardEarned=0
    // チャージ時はカード自身の還元ゼロ、bonus のみ (d払い defaultBonusRate=0.5%)
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
    expect(dpayResults[0].cardEarnedAmount).toBe(0);
  });

  it("cardSpecificBonusRates: 紐付けカードが一致したら default を上書き", () => {
    // d払いは「dカードのみ 1%、他は 0%」想定
    const dPayWithSpecific: PaymentApp = {
      id: "pa-d-pay-v2",
      name: "d払い",
      chargeBased: true,
      defaultBonusRate: 0,
      defaultBonusCurrencyId: "d-pt",
      cardSpecificBonusRates: [{ cardId: "dcard", rate: 0.01 }],
    };
    const dcard: Card = {
      id: "dcard",
      name: "dカード",
      defaultRate: 0.01,
      defaultCurrencyId: "d-pt",
    };
    // dカード × d払い → bonus 1% (cardSpecific 適用)
    const withDcard = evaluatePaymentApps(
      dcard,
      "general",
      10000,
      "d-pt",
      [dPayWithSpecific],
      [],
      stores,
      [],
    );
    expect(withDcard[0].appBonusEarnedAmount).toBeCloseTo(100, 6); // 10000 * 1%

    // 楽天カード × d払い → bonus 0 (default 適用)
    const withRakuten = evaluatePaymentApps(
      rakutenCard,
      "general",
      10000,
      "d-pt",
      [dPayWithSpecific],
      [],
      stores,
      [
        { id: "rp-to-d", fromCurrencyId: "rakuten-pt", toCurrencyId: "d-pt", rate: 1 },
      ],
    );
    expect(withRakuten[0].appBonusEarnedAmount).toBe(0);
  });

  it("cardSpecificBonusRates: currencyId 上書きにも対応", () => {
    const pa: PaymentApp = {
      id: "x-pay",
      name: "X-Pay",
      defaultBonusRate: 0,
      defaultBonusCurrencyId: "rakuten-pt",
      cardSpecificBonusRates: [
        { cardId: "dcard", rate: 0.02, currencyId: "d-pt" },
      ],
    };
    const dcard: Card = {
      id: "dcard",
      name: "dカード",
      defaultRate: 0,
      defaultCurrencyId: "d-pt",
    };
    const result = evaluatePaymentApps(
      dcard,
      "general",
      10000,
      "d-pt",
      [pa],
      [],
      stores,
      [],
    );
    expect(result[0].appBonusEarnedCurrencyId).toBe("d-pt");
    expect(result[0].appBonusEarnedAmount).toBeCloseTo(200, 6);
  });

  it("chargeBased=true ではカード還元は乗らず、アプリ bonus (defaultBonusRate) のみ加算", () => {
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
    // 新モデル: chargeBased=true ではカード還元 (defaultRate) は乗らない
    // → cardFinal = 0
    expect(result[0].cardFinalAmount).toBe(0);
    // d払い bonus: 0.5% で 50 d-pt (defaultBonusRate)
    expect(result[0].appBonusFinalAmount).toBeCloseTo(50, 6);
    expect(result[0].totalFinalAmount).toBeCloseTo(50, 6);
  });
});

describe("累積モデル: baseBonus + cardSpecific.rate", () => {
  it("累積モデル: baseBonus + cardSpecific.rate が加算される (上乗せ式)", () => {
    // au PAY style: defaultBonusRate=0.5%、au-pay-card のみ +1% 上乗せ
    const auPay: PaymentApp = {
      id: "pa-au-pay-mock",
      name: "au PAY (mock)",
      chargeBased: true,
      defaultBonusRate: 0.005,
      defaultBonusCurrencyId: "ponta-pt",
      cardSpecificBonusRates: [{ cardId: "au-pay-card-mock", rate: 0.01 }],
    };
    const auCard: Card = {
      id: "au-pay-card-mock",
      name: "au PAYカード",
      defaultRate: 0.01,
      defaultCurrencyId: "ponta-pt",
    };
    const otherCard: Card = {
      id: "other",
      name: "他のカード",
      defaultRate: 0.005,
      defaultCurrencyId: "ponta-pt",
    };

    // au-pay-card × au PAY: bonus = 0.005 + 0.01 = 1.5%
    const withAu = evaluatePaymentApps(
      auCard,
      "general",
      10000,
      "ponta-pt",
      [auPay],
      [],
      stores,
      [],
    );
    expect(withAu[0].cardFinalAmount).toBe(0); // chargeBased でカード還元なし
    expect(withAu[0].appBonusEarnedAmount).toBeCloseTo(150, 6); // 1.5%

    // 他カード × au PAY: bonus = 0.005 + 0 = 0.5%
    const withOther = evaluatePaymentApps(
      otherCard,
      "general",
      10000,
      "ponta-pt",
      [auPay],
      [],
      stores,
      [],
    );
    expect(withOther[0].cardFinalAmount).toBe(0);
    expect(withOther[0].appBonusEarnedAmount).toBeCloseTo(50, 6); // 0.5%
  });
});

describe("cardSpecificBonusRates validFrom/validTo filtering", () => {
  const dcard: Card = {
    id: "dcard",
    name: "dカード",
    defaultRate: 0.01,
    defaultCurrencyId: "d-pt",
  };

  it("期限切れの cardSpecificBonusRates エントリは無視され defaultBonusRate にフォールバック", () => {
    const dPayExpired: PaymentApp = {
      id: "pa-d-pay-expired",
      name: "d払い",
      chargeBased: true,
      defaultBonusRate: 0,
      defaultBonusCurrencyId: "d-pt",
      cardSpecificBonusRates: [
        {
          cardId: "dcard",
          rate: 0.01,
          validFrom: "2020-01-01",
          validTo: "2020-12-31", // 期限切れ
        },
      ],
    };
    const now = new Date("2026-01-01T12:00:00");
    const result = evaluatePaymentApps(
      dcard,
      "general",
      10000,
      "d-pt",
      [dPayExpired],
      [],
      stores,
      [],
      undefined,
      now,
    );
    // 期限切れ → defaultBonusRate=0 が適用される
    expect(result[0].appBonusEarnedAmount).toBe(0);
  });

  it("validFrom のみ (公式プログラム) のエントリは開始後は有効", () => {
    const dPayProgram: PaymentApp = {
      id: "pa-d-pay-program",
      name: "d払い",
      chargeBased: true,
      defaultBonusRate: 0,
      defaultBonusCurrencyId: "d-pt",
      cardSpecificBonusRates: [
        {
          cardId: "dcard",
          rate: 0.01,
          validFrom: "2024-04-01", // 2024年4月1日以降は常時有効
        },
      ],
    };
    const now = new Date("2026-05-13T12:00:00"); // validFrom 以降
    const result = evaluatePaymentApps(
      dcard,
      "general",
      10000,
      "d-pt",
      [dPayProgram],
      [],
      stores,
      [],
      undefined,
      now,
    );
    // 公式プログラム → 1% bonus が適用される
    expect(result[0].appBonusEarnedAmount).toBeCloseTo(100, 6);
  });

  it("validFrom が未来のエントリは無視される", () => {
    const dPayFuture: PaymentApp = {
      id: "pa-d-pay-future",
      name: "d払い",
      chargeBased: true,
      defaultBonusRate: 0,
      defaultBonusCurrencyId: "d-pt",
      cardSpecificBonusRates: [
        {
          cardId: "dcard",
          rate: 0.01,
          validFrom: "2030-01-01", // まだ始まっていない
        },
      ],
    };
    const now = new Date("2026-05-13T12:00:00"); // validFrom より前
    const result = evaluatePaymentApps(
      dcard,
      "general",
      10000,
      "d-pt",
      [dPayFuture],
      [],
      stores,
      [],
      undefined,
      now,
    );
    // 未来開始 → defaultBonusRate=0 が適用される
    expect(result[0].appBonusEarnedAmount).toBe(0);
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
