import { describe, it, expect } from "vitest";
import { rankCards } from "./rankCards";
import type { BenefitProgram, Card, ConversionEdge, Store, StoreProgramMembership } from "./types";

const rakuten: Card = {
  id: "rakuten",
  name: "楽天カード",
  defaultRate: 0.01,
  defaultCurrencyId: "rakuten-pt",
};

const jcb: Card = {
  id: "jcb",
  name: "JCBカード",
  defaultRate: 0.005,
  defaultCurrencyId: "okidoki",
};

const edge = (
  id: string,
  from: string,
  to: string,
  rate: number,
): ConversionEdge => ({ id, fromCurrencyId: from, toCurrencyId: to, rate });

const baseStores: Store[] = [
  { id: "any", name: "any" },
  { id: "amazon", name: "Amazon", category: "ネット通販" },
];

describe("rankCards", () => {
  it("貯まる通貨が目標と一致するなら、変換ゼロホップでそのまま返す", () => {
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].card.id).toBe("rakuten");
    expect(result[0].earnedAmount).toBe(100);
    expect(result[0].earnedCurrencyId).toBe("rakuten-pt");
    expect(result[0].finalAmount).toBe(100);
    expect(result[0].pathSteps).toEqual([]);
    expect(result[0].reachable).toBe(true);
  });

  it("変換が必要なときは bestPath を経由して最終量を計算する", () => {
    const edges = [edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5)];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten],
      stores: baseStores,
      edges,
    });
    expect(result[0].earnedAmount).toBe(100);
    expect(result[0].finalAmount).toBe(50);
    expect(result[0].pathSteps).toHaveLength(1);
    expect(result[0].pathSteps[0].id).toBe("rakuten-to-ana");
  });

  it("複数カードを最終量の降順で並べる", () => {
    const edges = [
      edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5),
      edge("oki-to-ana", "okidoki", "ana-mile", 3),
    ];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten, jcb],
      stores: baseStores,
      edges,
    });
    expect(result.map((r) => r.card.id)).toEqual(["jcb", "rakuten"]);
    expect(result[0].finalAmount).toBe(150);
    expect(result[1].finalAmount).toBe(50);
  });

  it("BenefitProgram が還元率と通貨の両方を上書きする (旧: 店舗ルール)", () => {
    // StoreRule の代わりに BenefitProgram + StoreProgramMembership を使用
    const programs: BenefitProgram[] = [
      {
        id: "prog-amzn-rule",
        name: "Amazon 楽天 2%",
        cardIds: ["rakuten"],
        rate: 0.02,
        currencyId: "amazon-pt",
        bonusType: "primary",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { programId: "prog-amzn-rule", storeId: "amazon" },
    ];
    const result = rankCards({
      payment: { storeId: "amazon", amount: 10000 },
      targetCurrencyId: "amazon-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [],
      programs,
      memberships,
    });
    expect(result[0].earnedCurrencyId).toBe("amazon-pt");
    expect(result[0].earnedAmount).toBe(200);
    expect(result[0].finalAmount).toBe(200);
    expect(result[0].resolved.source).toBe("program");
  });

  it("目標通貨に到達できないカードは reachable=false で末尾に入る", () => {
    const edges = [edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5)];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten, jcb],
      stores: baseStores,
      edges,
    });
    expect(result[0].card.id).toBe("rakuten");
    expect(result[0].reachable).toBe(true);
    expect(result[1].card.id).toBe("jcb");
    expect(result[1].reachable).toBe(false);
    expect(result[1].finalAmount).toBe(0);
  });

  it("複数の交換ルートがある場合、最大価値ルートが選ばれる", () => {
    const edges = [
      edge("direct", "rakuten-pt", "ana-mile", 0.5),
      edge("via-x-1", "rakuten-pt", "x-pt", 1),
      edge("via-x-2", "x-pt", "ana-mile", 0.7),
    ];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten],
      stores: baseStores,
      edges,
    });
    expect(result[0].finalAmount).toBeCloseTo(70, 10);
    expect(result[0].pathSteps.map((e) => e.id)).toEqual([
      "via-x-1",
      "via-x-2",
    ]);
  });

  it("ポイントカード併用ボーナスが totalFinalAmount に加算される", () => {
    const dCard = {
      id: "d-card",
      name: "dポイントカード",
      currencyId: "d-pt",
    };
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [
        edge("rakuten-to-d", "rakuten-pt", "d-pt", 1),
      ],
      pointCards: [dCard],
      loyaltyRules: [
        { id: "loy", storeId: "any", pointCardId: "d-card", rate: 0.01 },
      ],
    });
    // 楽天カード: 100 楽天pt → d-pt 100 (rate 1)
    // ロイヤリティ: 100 dpt direct
    // total: 200
    expect(result[0].finalAmount).toBe(100);
    expect(result[0].loyalties).toHaveLength(1);
    expect(result[0].loyalties[0].finalAmount).toBe(100);
    expect(result[0].totalFinalAmount).toBe(200);
  });

  it("Store.maxLoyaltyStacks=2 で2枚のポイントカードが同時加算される（三重取り）", () => {
    const dCard = {
      id: "d-card",
      name: "dカード",
      currencyId: "d-pt",
    };
    const rakutenCard = {
      id: "r-card",
      name: "楽天カード",
      currencyId: "rakuten-pt",
    };
    const stackStore: Store = {
      id: "stack-shop",
      name: "重ね取り店",
      maxLoyaltyStacks: 2,
    };
    const result = rankCards({
      payment: { storeId: "stack-shop", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: [rakuten],
      stores: [...baseStores, stackStore],
      edges: [
        edge("rakuten-to-d", "rakuten-pt", "d-pt", 1),
      ],
      pointCards: [dCard, rakutenCard],
      loyaltyRules: [
        { id: "l1", storeId: "stack-shop", pointCardId: "d-card", rate: 0.01 },
        { id: "l2", storeId: "stack-shop", pointCardId: "r-card", rate: 0.005 },
      ],
    });
    // クレカ(楽天): 100 楽天pt → 100 d-pt
    // ロイヤリティ1: dカード 100 d-pt
    // ロイヤリティ2: 楽天カード 50 楽天pt → 50 d-pt
    // total: 100 + 100 + 50 = 250
    expect(result[0].loyalties).toHaveLength(2);
    expect(result[0].totalFinalAmount).toBe(250);
  });

  it("enabled=false のカードは順位付け結果に含まれない", () => {
    const disabledCard: Card = {
      id: "disabled-card",
      name: "無効カード",
      defaultRate: 0.05, // 高還元率でも除外される
      defaultCurrencyId: "rakuten-pt",
      enabled: false,
    };
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten, disabledCard],
      stores: baseStores,
      edges: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].card.id).toBe("rakuten");
  });

  it("BenefitProgram が Amazon の還元率を上書きする (旧: カテゴリルール)", () => {
    // StoreRule category の代わりに BenefitProgram + StoreProgramMembership を使用
    const programs: BenefitProgram[] = [
      {
        id: "prog-cat-net",
        name: "ネット通販 楽天 1.5%",
        cardIds: ["rakuten"],
        rate: 0.015,
        currencyId: "rakuten-pt",
        bonusType: "primary",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { programId: "prog-cat-net", storeId: "amazon" },
    ];
    const result = rankCards({
      payment: { storeId: "amazon", amount: 10000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [],
      programs,
      memberships,
    });
    expect(result[0].resolved.source).toBe("program");
    expect(result[0].earnedAmount).toBe(150);
    expect(result[0].finalAmount).toBe(150);
  });

  it("tie-break 1次維持: 同 reachable で totalFinalAmount が違えば高い方が前 (既存動作の確認)", () => {
    // cardA: rate=0.02 → finalAmount=200; cardB: rate=0.01 → finalAmount=100
    // loyalty なし → totalFinalAmount = finalAmount のまま
    const cardA: Card = {
      id: "cardA",
      name: "カード A",
      defaultRate: 0.02,
      defaultCurrencyId: "target-pt",
    };
    const cardB: Card = {
      id: "cardB",
      name: "カード B",
      defaultRate: 0.01,
      defaultCurrencyId: "target-pt",
    };

    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "target-pt",
      cards: [cardB, cardA], // 意図的に B を先に渡す
      stores: baseStores,
      edges: [],
    });

    expect(result[0].card.id).toBe("cardA"); // totalFinalAmount 200 > 100
    expect(result[1].card.id).toBe("cardB");
    expect(result[0].totalFinalAmount).toBe(200);
    expect(result[1].totalFinalAmount).toBe(100);
  });

  it("同 totalFinalAmount のカードは reachable / 値とも一致する (sort stability)", () => {
    // 注: 旧テスト名「tie-break 2次」は誤解を招くため改名。
    // 真の 2次 tie-break (同 total / 異 pay) は paymentApps + addOn が違うときに
    // 発生するが、その複雑な setup は paymentApp 系の独立テストでカバー済。
    const cardA: Card = {
      id: "cardA",
      name: "カード A",
      defaultRate: 0.02,
      defaultCurrencyId: "target-pt",
    };
    const cardB: Card = {
      id: "cardB",
      name: "カード B",
      defaultRate: 0.02, // 同 rate
      defaultCurrencyId: "target-pt",
    };

    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "target-pt",
      cards: [cardB, cardA],
      stores: baseStores,
      edges: [],
    });

    expect(result[0].totalFinalAmount).toBe(result[1].totalFinalAmount);
    expect(result[0].reachable).toBe(true);
    expect(result[1].reachable).toBe(true);
  });

  it("loyalty が共通で加算される場合、1次 (totalFinalAmount) で順序が決まる", () => {
    // 注: 旧テスト名「tie-break 3次」は誤解を招くため改名。
    // loyalty が全カードに共通加算されても、relative order は card 側の差で決まる。
    const cardA: Card = {
      id: "cardA",
      name: "カード A",
      defaultRate: 0.02,
      defaultCurrencyId: "target-pt",
    };
    const cardB: Card = {
      id: "cardB",
      name: "カード B",
      defaultRate: 0.01,
      defaultCurrencyId: "target-pt",
    };

    const loyPtCard = { id: "loy-pt", name: "ポイントカード", currencyId: "target-pt" };
    const partsStore: Store = { id: "parts-shop", name: "構成要素店", maxLoyaltyStacks: 1 };

    const result = rankCards({
      payment: { storeId: "parts-shop", amount: 10000 },
      targetCurrencyId: "target-pt",
      cards: [cardB, cardA],
      stores: [...baseStores, partsStore],
      edges: [],
      pointCards: [loyPtCard],
      loyaltyRules: [
        { id: "lr-pt", storeId: "parts-shop", pointCardId: "loy-pt", rate: 0.01 },
      ],
    });

    // cardA: finalAmount=200, loyaltyTotal=100 → total=300
    // cardB: finalAmount=100, loyaltyTotal=100 → total=200
    expect(result[0].card.id).toBe("cardA");
    expect(result[1].card.id).toBe("cardB");
    expect(result[0].totalFinalAmount).toBe(300);
    expect(result[1].totalFinalAmount).toBe(200);
  });

  it("includeDisabled: true で disabled (enabled=false) カードも結果に含まれる", () => {
    const cards: Card[] = [
      { id: "active", name: "A", defaultRate: 0.01, defaultCurrencyId: "c1" },
      { id: "disabled", name: "B", defaultRate: 0.05, defaultCurrencyId: "c1", enabled: false },
    ];
    const result = rankCards(
      {
        payment: { storeId: "any", amount: 10000 },
        targetCurrencyId: "c1",
        cards,
        stores: baseStores,
        edges: [],
      },
      { includeDisabled: true },
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.card.id)).toContain("disabled");
  });

  it("includeDisabled なし (デフォルト) は disabled を除外 (既存挙動)", () => {
    const cards: Card[] = [
      { id: "active", name: "A", defaultRate: 0.01, defaultCurrencyId: "c1" },
      { id: "disabled", name: "B", defaultRate: 0.05, defaultCurrencyId: "c1", enabled: false },
    ];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "c1",
      cards,
      stores: baseStores,
      edges: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].card.id).toBe("active");
  });

  it("requiredCardIds: 必要なカードを持たないユーザーは制約エッジを経由したパスを取れない", () => {
    // 楽天カードのみ保有 (jal-suica 無し)
    const cards: Card[] = [rakuten];
    const edges: ConversionEdge[] = [
      {
        id: "jre-to-jal",
        fromCurrencyId: "jre",
        toCurrencyId: "jal-mile",
        rate: 0.5,
        requiredCardIds: ["jal-suica"],
      },
    ];
    // 楽天カードが JRE で貯まると仮定するプログラムを 1 件
    const programs: BenefitProgram[] = [
      {
        id: "prog-rakuten-jre",
        name: "楽天 JRE",
        cardIds: ["rakuten"],
        rate: 0.01,
        currencyId: "jre",
        bonusType: "primary",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { programId: "prog-rakuten-jre", storeId: "any" },
    ];
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "jal-mile",
      cards,
      stores: baseStores,
      edges,
      programs,
      memberships,
    });
    expect(result).toHaveLength(1);
    expect(result[0].reachable).toBe(false); // パスが見つからない
  });

  // v3.6.0 で発覚したバグの回帰テスト:
  // 「target 通貨に primary 経路で到達できないが、chargeBased paymentApp の
  //   addOn 経由で earn できる場合、reachable=true で earn 量を正しく表示する」
  // 以前は reachable=best.cardReachable のみだったので header に「対象外」と
  // 表示されつつ詳細パネルで「+5 WAON POINT」が出る矛盾が発生していた。
  it("primary 不到達でも addOn で target 通貨が earn できれば reachable=true", () => {
    // pa-waon を模した chargeBased paymentApp + addOn program。
    // target=waon-pt、card は rakuten-pt 起源で waon-pt への path 無し。
    const waonPay = {
      id: "pa-test-waon",
      name: "WAON e-money",
      chargeBased: true,
      paymentMode: "charge" as const,
    };
    const programs: BenefitProgram[] = [
      {
        id: "prog-test-waon-base",
        name: "WAON e-money base",
        paymentAppId: "pa-test-waon",
        rate: 0.005,
        currencyId: "waon-pt",
        bonusType: "addOn",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { programId: "prog-test-waon-base", storeId: "any" },
    ];

    const result = rankCards({
      payment: { storeId: "any", amount: 1000 },
      targetCurrencyId: "waon-pt",
      cards: [rakuten], // defaultCurrencyId="rakuten-pt"
      stores: baseStores,
      edges: [], // rakuten-pt → waon-pt の path 無し
      programs,
      memberships,
      paymentApps: [waonPay],
    });
    expect(result).toHaveLength(1);
    expect(result[0].reachable).toBe(true); // addOn 単独でも earn してる
    expect(result[0].appBonusFinalAmount).toBe(5); // 1000 * 0.005
    expect(result[0].totalFinalAmount).toBe(5);
  });

  it("primary も addOn も loyalty も発火しなければ reachable=false", () => {
    const result = rankCards({
      payment: { storeId: "any", amount: 1000 },
      targetCurrencyId: "waon-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [], // path 無し、何も加算されない
    });
    expect(result).toHaveLength(1);
    expect(result[0].reachable).toBe(false);
    expect(result[0].totalFinalAmount).toBe(0);
  });

  // v3.6.0 で修正された別バグ: appBonusEarnedAmount に post-conversion 値
  // (= appBonusFinal) が入っていたため UI で「earn → final」が同値表示になり
  // 変換ロスが見えなかった。pre-conversion 値が入ることをテスト。
  it("appBonusEarnedAmount は pre-conversion、appBonusFinalAmount は post-conversion", () => {
    // addOn currency = rakuten-pt → target ana-mile (0.5 倍 path)
    const testPa = {
      id: "pa-test",
      name: "Test Pay",
      chargeBased: true,
      paymentMode: "charge" as const,
    };
    const programs: BenefitProgram[] = [
      {
        id: "prog-test-addon",
        name: "Test addOn",
        paymentAppId: "pa-test",
        rate: 0.005,
        currencyId: "rakuten-pt",
        bonusType: "addOn",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { programId: "prog-test-addon", storeId: "any" },
    ];
    const edges = [edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5)];

    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten],
      stores: baseStores,
      edges,
      programs,
      memberships,
      paymentApps: [testPa],
    });

    // addOn の raw earn (rakuten-pt 通貨): 10000 * 0.005 = 50
    expect(result[0].appBonusEarnedAmount).toBe(50);
    // 変換後 (ana-mile 通貨): 50 * 0.5 = 25
    expect(result[0].appBonusFinalAmount).toBe(25);
    // appBonusCurrencyId は earn 側の通貨
    expect(result[0].appBonusCurrencyId).toBe("rakuten-pt");
  });

  // V4 prep: 単一 target currency 呼び出しの contract snapshot。
  // V4 で multi-currency 対応のため return shape が変わる可能性があるが、
  // 単一 target で呼び出した場合の挙動を pin して回帰を検出する。
  it("contract: 単一 target 呼び出しの CardRanking 完全 shape", () => {
    const result = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [],
    });

    expect(result).toHaveLength(1);
    const r = result[0];

    // CardRanking 型の必須フィールドが全て存在し、想定の型を持っている
    expect(r.card).toEqual(rakuten);
    expect(r.resolved).toEqual({
      rate: 0.01,
      currencyId: "rakuten-pt",
      source: "default",
    });
    expect(r.earnedAmount).toBe(100);
    expect(r.earnedCurrencyId).toBe("rakuten-pt");
    expect(r.pathSteps).toEqual([]);
    expect(r.pathProduct).toBe(1);
    expect(r.finalAmount).toBe(100);
    expect(r.reachable).toBe(true);
    expect(r.paymentApp).toBeNull();
    expect(r.appBonusRate).toBe(0);
    expect(r.appBonusFinalAmount).toBe(0);
    expect(r.appBonusEarnedAmount).toBe(0);
    expect(r.appBonusCurrencyId).toBeNull();
    expect(r.appBonusReachable).toBe(false);
    expect(r.loyalties).toEqual([]);
    expect(r.totalFinalAmount).toBe(100);
  });
});
