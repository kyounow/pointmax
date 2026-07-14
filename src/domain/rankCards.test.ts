import { describe, it, expect } from "vitest";
import { rankCards, nearlyEqual, RANK_EPS } from "./rankCards";
import type { BenefitProgram, Card, ConversionEdge, PaymentApp, PointCard, Store, StoreProgramMembership } from "./types";

// v6.0.0: rankCards は RankResult ({ rankings, upgrade }) を返すようになった。
// 既存テストは rankings 配列を期待するので、薄いラッパで .rankings を取り出す。
// upgrade を検証する新規テストは rankCards(...) を直接呼ぶ。
function rankCardsRankings(
  input: Parameters<typeof rankCards>[0],
  options?: Parameters<typeof rankCards>[1],
) {
  return rankCards(input, options).rankings;
}

// A3: ランキングの「実質同値」判定が浮動小数点 dust を許容することの回帰テスト。
// 計算モデルは丸めず精度を保ち (表示は formatNum)、順位比較のみ ε 許容にする方針。
describe("nearlyEqual (RANK_EPS 許容比較)", () => {
  it("浮動小数点 dust (0.1 + 0.2 = 0.30000000000000004) を同値とみなす", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // dust が実在することを文書化
    expect(nearlyEqual(0.1 + 0.2, 0.3)).toBe(true);
  });
  it("RANK_EPS を超える差は別値とみなす", () => {
    expect(nearlyEqual(70, 70 + RANK_EPS * 10)).toBe(false);
    expect(nearlyEqual(100, 101)).toBe(false);
  });
});

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
    const result = rankCardsRankings({
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
    const result = rankCardsRankings({
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
    const result = rankCardsRankings({
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
        scope: "member-stores",
        name: "Amazon 楽天 2%",
        cardIds: ["rakuten"],
        rate: 0.02,
        currencyId: "amazon-pt",
        bonusType: "primary",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { id: "m-prog-amzn-rule-amazon", programId: "prog-amzn-rule", storeId: "amazon" },
    ];
    const result = rankCardsRankings({
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

  it("now 引数がキャンペーン期間判定の基準時刻になる (C-2 単一評価時刻)", () => {
    const programs: BenefitProgram[] = [
      {
        id: "prog-june-camp",
        scope: "member-stores",
        name: "6月限定 5%",
        cardIds: ["rakuten"],
        rate: 0.05,
        currencyId: "rakuten-pt",
        bonusType: "primary",
        validFrom: "2026-06-01",
        validTo: "2026-06-30",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { id: "m-prog-june-camp-amazon", programId: "prog-june-camp", storeId: "amazon" },
    ];
    const base = {
      payment: { storeId: "amazon", amount: 10000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [],
      programs,
      memberships,
    };
    // 期間内: キャンペーン 5% が適用される
    const during = rankCardsRankings({
      ...base,
      now: new Date("2026-06-15T12:00:00"),
    });
    expect(during[0].earnedAmount).toBe(500);
    // 期間終了後: 通常還元 (1%) に戻る
    const after = rankCardsRankings({
      ...base,
      now: new Date("2026-07-01T12:00:00"),
    });
    expect(after[0].earnedAmount).toBe(100);
  });

  it("目標通貨に到達できないカードは reachable=false で末尾に入る", () => {
    const edges = [edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5)];
    const result = rankCardsRankings({
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
    const result = rankCardsRankings({
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
    const result = rankCardsRankings({
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
    const result = rankCardsRankings({
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
    const result = rankCardsRankings({
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
        scope: "member-stores",
        name: "ネット通販 楽天 1.5%",
        cardIds: ["rakuten"],
        rate: 0.015,
        currencyId: "rakuten-pt",
        bonusType: "primary",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { id: "m-prog-cat-net-amazon", programId: "prog-cat-net", storeId: "amazon" },
    ];
    const result = rankCardsRankings({
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

    const result = rankCardsRankings({
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

    const result = rankCardsRankings({
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

    const result = rankCardsRankings({
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
    const result = rankCardsRankings(
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
    const result = rankCardsRankings({
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
        scope: "member-stores",
        name: "楽天 JRE",
        cardIds: ["rakuten"],
        rate: 0.01,
        currencyId: "jre",
        bonusType: "primary",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { id: "m-prog-rakuten-jre-any", programId: "prog-rakuten-jre", storeId: "any" },
    ];
    const result = rankCardsRankings({
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

  // v6.4.0: ゴールド + 普通カード 両保有時、JRE→JAL マイルはゴールド (0.6667) が優先される
  it("両カード保有時は jre-to-jal (ゴールド 0.6667) が jre-to-jal-normal (0.5) より優先される", () => {
    // JRE を貯めるカード + ゴールド/普通の両 gate カードを保有
    const cards: Card[] = [
      { id: "view", name: "ビューカード", defaultRate: 0.01, defaultCurrencyId: "jre" },
      { id: "jal-suica", name: "JALカードSuica", defaultRate: 0.01, defaultCurrencyId: "jal-mile" },
      {
        id: "jal-suica-normal",
        name: "JALカードSuica（普通）",
        defaultRate: 0.01,
        defaultCurrencyId: "jal-mile",
      },
    ];
    const edges: ConversionEdge[] = [
      {
        id: "jre-to-jal",
        fromCurrencyId: "jre",
        toCurrencyId: "jal-mile",
        rate: 0.6667,
        requiredCardIds: ["jal-suica"],
      },
      {
        id: "jre-to-jal-normal",
        fromCurrencyId: "jre",
        toCurrencyId: "jal-mile",
        rate: 0.5,
        requiredCardIds: ["jal-suica-normal"],
      },
    ];
    const result = rankCardsRankings({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "jal-mile",
      cards,
      stores: baseStores,
      edges,
    });
    const view = result.find((r) => r.card.id === "view");
    expect(view, "view カードの ranking が無い").toBeDefined();
    expect(view?.reachable).toBe(true);
    // 100 JRE → ゴールド経路 (0.6667) で 66.67 マイル。普通 (0.5=50) には劣化しない
    expect(view?.pathSteps).toHaveLength(1);
    expect(view?.pathSteps[0].id).toBe("jre-to-jal");
    expect(view?.finalAmount).toBeCloseTo(66.67, 2);
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
        scope: "member-stores",
        name: "WAON e-money base",
        paymentAppId: "pa-test-waon",
        rate: 0.005,
        currencyId: "waon-pt",
        bonusType: "addOn",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { id: "m-prog-test-waon-base-any", programId: "prog-test-waon-base", storeId: "any" },
    ];

    const result = rankCardsRankings({
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
    const result = rankCardsRankings({
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
        scope: "member-stores",
        name: "Test addOn",
        paymentAppId: "pa-test",
        rate: 0.005,
        currencyId: "rakuten-pt",
        bonusType: "addOn",
      },
    ];
    const memberships: StoreProgramMembership[] = [
      { id: "m-prog-test-addon-any", programId: "prog-test-addon", storeId: "any" },
    ];
    const edges = [edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5)];

    const result = rankCardsRankings({
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
    const result = rankCardsRankings({
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
    expect(r.appBonusBreakdown).toEqual([]);
    expect(r.loyalties).toEqual([]);
    expect(r.totalFinalAmount).toBe(100);
  });

  // v5.1.3 audit-fix C: 異種通貨 addOn の breakdown 検証
  it("複数 addOn (異種通貨) は appBonusBreakdown に通貨別 1 件ずつ列挙される", () => {
    // 仮想 seed: v-pt と rakuten-pt の 2 通貨を持つ
    const oliveCard: Card = {
      id: "olive",
      name: "Olive",
      defaultRate: 0.005,
      defaultCurrencyId: "v-pt",
    };
    const genStore: Store = { id: "general", name: "一般店舗", category: "汎用" };
    const noApp: PaymentApp = { id: "pa-no-app", name: "直接決済" };
    // 異種通貨の 2 addOn (どちらも cardIds=olive、paymentAppId 未指定、非 chargeBased なので適用)
    const oliveVptAddon: BenefitProgram = {
      id: "prog-test-olive-vpt-addon",
      scope: "all-stores",
      name: "Olive +1% Vポイント",
      cardIds: ["olive"],
      rate: 0.01,
      currencyId: "v-pt",
      bonusType: "addOn",
    };
    const oliveRakutenAddon: BenefitProgram = {
      id: "prog-test-olive-rakuten-addon",
      scope: "all-stores",
      name: "Olive +0.5% 楽天ポイント (仮想)",
      cardIds: ["olive"],
      rate: 0.005,
      currencyId: "rakuten-pt",
      bonusType: "addOn",
    };
    // RankInput には currencies フィールドが無いため (rankCards は edge から導出) ローカル定義は不要。
    const result = rankCardsRankings({
      payment: { storeId: "general", amount: 10000 },
      targetCurrencyId: "v-pt",
      cards: [{ ...oliveCard, enabled: true }],
      stores: [genStore],
      edges: [
        {
          id: "rakuten-to-v",
          fromCurrencyId: "rakuten-pt",
          toCurrencyId: "v-pt",
          rate: 1,
        },
      ],
      paymentApps: [noApp],
      programs: [oliveVptAddon, oliveRakutenAddon],
      memberships: [],
    });
    const r = result[0];
    expect(r.appBonusBreakdown).toHaveLength(2);
    const vptEntry = r.appBonusBreakdown.find(
      (b) => b.earnedCurrencyId === "v-pt",
    );
    const rakutenEntry = r.appBonusBreakdown.find(
      (b) => b.earnedCurrencyId === "rakuten-pt",
    );
    expect(vptEntry?.rate).toBe(0.01);
    expect(vptEntry?.earnedAmount).toBe(100); // 10000 × 0.01
    expect(vptEntry?.finalAmount).toBe(100); // v-pt → v-pt (same currency)
    expect(rakutenEntry?.rate).toBe(0.005);
    expect(rakutenEntry?.earnedAmount).toBe(50); // 10000 × 0.005
    expect(rakutenEntry?.finalAmount).toBe(50); // rakuten-pt → v-pt rate 1
    // legacy summary フィールドは「rate 合算 / 1 通貨ぶんの earned のみ」のレガシー仕様 (UI は breakdown を使う)
    expect(r.appBonusRate).toBe(0.015); // 1% + 0.5%
    expect(r.appBonusFinalAmount).toBe(150); // 100 + 50
  });

  // ─── 監査残 B: primary 通貨込み比較 (path-aware selection) ───
  // 異種通貨 primary が並ぶ場合、target 通貨への path を踏まえて最適 primary を選ぶことを E2E で確認。
  // 旧挙動 (effectiveRate 数値最大) では target 到達不能な primary が選ばれて「対象外」になっていた
  // ケースを、新挙動では到達可能な primary に切り替えてランキング入りさせる。
  it("primary 競合: target=v-pt なら rakuten-pt 経路 (1%) を選び、jal-mile primary (2%) は選ばれない", () => {
    const dualCard: Card = {
      id: "dual",
      name: "dual カード",
      defaultRate: 0.005,
      defaultCurrencyId: "v-pt",
    };
    const eneos: Store = { id: "eneos", name: "ENEOS", category: "ガソリン" };
    const stores: Store[] = [{ id: "any", name: "any" }, eneos];
    // 同一 (card, store, paymentApp 直決済) で 2 つの primary が発火
    const jalPrimary: BenefitProgram = {
      id: "prog-jal-mile-primary",
      scope: "member-stores",
      name: "JAL マイル primary",
      cardIds: ["dual"],
      rate: 0.02,
      currencyId: "jal-mile",
      bonusType: "primary",
    };
    const rakutenPrimary: BenefitProgram = {
      id: "prog-rakuten-primary",
      scope: "member-stores",
      name: "rakuten primary",
      cardIds: ["dual"],
      rate: 0.01,
      currencyId: "rakuten-pt",
      bonusType: "primary",
    };
    const memberships: StoreProgramMembership[] = [
      { id: "m-prog-jal-mile-primary-eneos", programId: "prog-jal-mile-primary", storeId: "eneos" },
      { id: "m-prog-rakuten-primary-eneos", programId: "prog-rakuten-primary", storeId: "eneos" },
    ];
    // edge: rakuten-pt → v-pt のみ (jal-mile → v-pt は なし = 到達不能)
    const edges = [edge("rakuten-vpt", "rakuten-pt", "v-pt", 0.5)];

    const result = rankCardsRankings({
      payment: { storeId: "eneos", amount: 10000 },
      targetCurrencyId: "v-pt",
      cards: [dualCard],
      stores,
      edges,
      programs: [jalPrimary, rakutenPrimary],
      memberships,
    });
    expect(result).toHaveLength(1);
    const r = result[0];
    // path-aware で rakuten primary が選ばれている (旧挙動なら jal-mile が選ばれて到達不能)
    expect(r.resolved.source).toBe("program");
    if (r.resolved.source === "program") {
      expect(r.resolved.programId).toBe("prog-rakuten-primary");
    }
    expect(r.earnedCurrencyId).toBe("rakuten-pt");
    expect(r.earnedAmount).toBe(100); // 10000 × 0.01
    expect(r.finalAmount).toBe(50); // 100 × 0.5
    expect(r.reachable).toBe(true); // 旧挙動なら false (= 対象外) だったケース
  });

  it("primary 競合: target=jal-mile なら jal-mile primary (2%) を選ぶ (path 同一通貨 ratio=1)", () => {
    // 同じ fixture で target を切り替えるだけで primary 選択も切り替わることを確認
    const dualCard: Card = {
      id: "dual",
      name: "dual カード",
      defaultRate: 0.005,
      defaultCurrencyId: "v-pt",
    };
    const eneos: Store = { id: "eneos", name: "ENEOS", category: "ガソリン" };
    const stores: Store[] = [eneos];
    const jalPrimary: BenefitProgram = {
      id: "prog-jal-mile-primary",
      scope: "member-stores",
      name: "JAL マイル primary",
      cardIds: ["dual"],
      rate: 0.02,
      currencyId: "jal-mile",
      bonusType: "primary",
    };
    const rakutenPrimary: BenefitProgram = {
      id: "prog-rakuten-primary",
      scope: "member-stores",
      name: "rakuten primary",
      cardIds: ["dual"],
      rate: 0.01,
      currencyId: "rakuten-pt",
      bonusType: "primary",
    };
    const memberships: StoreProgramMembership[] = [
      { id: "m-prog-jal-mile-primary-eneos", programId: "prog-jal-mile-primary", storeId: "eneos" },
      { id: "m-prog-rakuten-primary-eneos", programId: "prog-rakuten-primary", storeId: "eneos" },
    ];
    const edges = [edge("rakuten-vpt", "rakuten-pt", "v-pt", 0.5)]; // jal は target 同一通貨

    const result = rankCardsRankings({
      payment: { storeId: "eneos", amount: 10000 },
      targetCurrencyId: "jal-mile",
      cards: [dualCard],
      stores,
      edges,
      programs: [jalPrimary, rakutenPrimary],
      memberships,
    });
    const r = result[0];
    expect(r.resolved.source).toBe("program");
    if (r.resolved.source === "program") {
      expect(r.resolved.programId).toBe("prog-jal-mile-primary");
    }
    expect(r.earnedCurrencyId).toBe("jal-mile");
    expect(r.finalAmount).toBe(200); // 10000 × 0.02 × 1
  });
});

// ─── v6.0.0: PointCard.enabled + usedCurrency ゲート + ScopeUpgrade ───
describe("rankCards v6.0.0: ポイントカード利用選択 + upgrade", () => {
  const dCard: PointCard = { id: "d-card", name: "dポイントカード", currencyId: "d-pt" };
  const rCard: PointCard = { id: "r-card", name: "楽天ポイントカード", currencyId: "rakuten-pt" };

  it("全ポイントカード ON (disabled 無し) なら upgrade は null", () => {
    const res = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [edge("rakuten-to-d", "rakuten-pt", "d-pt", 1)],
      pointCards: [dCard],
      loyaltyRules: [{ id: "loy", storeId: "any", pointCardId: "d-card", rate: 0.01 }],
    });
    expect(res.upgrade).toBeNull();
  });

  it("disabled なポイントカードの二重取りは MAIN に出ず、upgrade.addedLoyalties に出る", () => {
    const res = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [edge("rakuten-to-d", "rakuten-pt", "d-pt", 1)],
      pointCards: [{ ...dCard, enabled: false }],
      loyaltyRules: [{ id: "loy", storeId: "any", pointCardId: "d-card", rate: 0.01 }],
    });
    // MAIN: dカード無効 → loyalty 二重取りなし
    expect(res.rankings[0].loyalties).toHaveLength(0);
    // upgrade: dカードを有効化すれば +100 (10000×0.01)
    expect(res.upgrade).not.toBeNull();
    expect(res.upgrade!.loyaltyDelta).toBe(100);
    expect(res.upgrade!.deltaFinalAmount).toBe(100);
    expect(res.upgrade!.addedLoyalties.map((l) => l.pointCard.id)).toEqual(["d-card"]);
  });

  it("disabled ポイントカードの通貨を経由するルートは MAIN で使えず、有効化で開く (unlockCurrencyIds)", () => {
    // 楽天カードが稼ぐ rakuten-pt → (d-pt 経由) → ana-mile。
    // d-pt は d-card (disabled) でしか「使う通貨」にならない。
    // MAIN: rakuten-pt → ana-mile 直行 (低レート) のみ。d-pt 経由は d-card OFF で不可。
    const edges = [
      edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.3), // 直行 低レート
      edge("rakuten-to-d", "rakuten-pt", "d-pt", 1),
      edge("d-to-ana", "d-pt", "ana-mile", 0.9), // d-pt 経由 高レート
    ];
    const res = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten],
      stores: baseStores,
      edges,
      pointCards: [{ ...dCard, enabled: false }],
    });
    // MAIN: rakuten-pt は使う通貨 (楽天カード)。d-pt は使わない → d-to-ana edge 不可。
    //   直行 rakuten→ana (0.3) のみ。100 楽天pt × 0.3 = 30
    expect(res.rankings[0].finalAmount).toBeCloseTo(30, 10);
    expect(res.rankings[0].pathSteps.map((e) => e.id)).toEqual(["rakuten-to-ana"]);
    // upgrade: d-card 有効化で d-pt 経由 (100×1×0.9=90) が開く → +60、unlock に d-pt
    expect(res.upgrade).not.toBeNull();
    expect(res.upgrade!.deltaFinalAmount).toBeCloseTo(60, 10);
    expect(res.upgrade!.unlockCurrencyIds).toContain("d-pt");
  });

  it("enabled 未設定 (undefined) のポイントカードは使う扱い (後方互換)", () => {
    const res = rankCards({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: [rakuten],
      stores: baseStores,
      edges: [edge("rakuten-to-d", "rakuten-pt", "d-pt", 1)],
      pointCards: [dCard], // enabled 未設定
      loyaltyRules: [{ id: "loy", storeId: "any", pointCardId: "d-card", rate: 0.01 }],
    });
    expect(res.rankings[0].loyalties).toHaveLength(1);
    expect(res.upgrade).toBeNull();
  });

  it("maxStacks=1 で高レート disabled が enabled を押し出す (入れ替え upgrade)", () => {
    const stackStore: Store = { id: "s1", name: "s1", maxLoyaltyStacks: 1 };
    const res = rankCards({
      payment: { storeId: "s1", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: [rakuten],
      stores: [...baseStores, stackStore],
      edges: [edge("rakuten-to-d", "rakuten-pt", "d-pt", 1)],
      pointCards: [rCard, { ...dCard, enabled: false }],
      loyaltyRules: [
        { id: "lr", storeId: "s1", pointCardId: "r-card", rate: 0.005 }, // enabled、低レート
        { id: "ld", storeId: "s1", pointCardId: "d-card", rate: 0.02 }, // disabled、高レート
      ],
    });
    // MAIN: maxStacks=1、r-card のみ → 10000×0.005=50
    expect(res.rankings[0].loyalties).toHaveLength(1);
    expect(res.rankings[0].loyalties[0].pointCard.id).toBe("r-card");
    // FULL: d-card (0.02→200) が r-card を押し出して採用 → loyaltyDelta = 200-50 = 150
    expect(res.upgrade).not.toBeNull();
    expect(res.upgrade!.loyaltyDelta).toBe(150);
    expect(res.upgrade!.addedLoyalties.map((l) => l.pointCard.id)).toEqual(["d-card"]);
  });
});

describe("A1: monthlyCapAmountYen の per-tx クランプ", () => {
  const capStore: Store = { id: "cap-store", name: "上限店" };
  const capProgram: BenefitProgram = {
    id: "prog-cap",
    scope: "member-stores",
    name: "上限付き高還元",
    cardIds: ["rakuten"],
    rate: 0.05,
    currencyId: "rakuten-pt",
    monthlyCapAmountYen: 40000,
  };
  const capMembership: StoreProgramMembership = {
    id: "m-prog-cap-cap-store",
    programId: "prog-cap",
    storeId: "cap-store",
  };

  it("上限超の支払いは付与対象支出が cap でクランプされる (80000円×5%/上限40000円 → 2000)", () => {
    const res = rankCardsRankings({
      payment: { storeId: "cap-store", amount: 80000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten],
      stores: [capStore],
      edges: [],
      programs: [capProgram],
      memberships: [capMembership],
    });
    expect(res[0].resolved.source).toBe("program");
    // min(80000, 40000) * 0.05 = 2000 (クランプ前の 80000 * 0.05 = 4000 ではない)
    expect(res[0].earnedAmount).toBeCloseTo(2000, 6);
    expect(res[0].finalAmount).toBeCloseTo(2000, 6); // 同一通貨 (product 1)
  });

  it("上限以下の支払いはクランプされない (30000円×5% → 1500)", () => {
    const res = rankCardsRankings({
      payment: { storeId: "cap-store", amount: 30000 },
      targetCurrencyId: "rakuten-pt",
      cards: [rakuten],
      stores: [capStore],
      edges: [],
      programs: [capProgram],
      memberships: [capMembership],
    });
    expect(res[0].earnedAmount).toBeCloseTo(1500, 6); // 上限未満なので全額対象
  });
});

describe("pointCard OFF と Calculator (strict 除外は EdgesScreen 限定の確認)", () => {
  it("有効クレカが貯める通貨は、その pointCard を OFF にしても Calculator で reachable", () => {
    // 楽天カード (enabled, rakuten-pt) + 楽天ポイントカード OFF + rakuten-pt→ana-mile。
    // rankCards は通常 computeBlockedCurrencyIds を使うため、rakuten-pt は楽天カードが
    // 貯める = blocked にならず、交換ルートは維持される (EdgesScreen の strict 除外と対照)。
    const res = rankCardsRankings({
      payment: { storeId: "any", amount: 10000 },
      targetCurrencyId: "ana-mile",
      cards: [rakuten],
      stores: baseStores,
      edges: [edge("rakuten-to-ana", "rakuten-pt", "ana-mile", 0.5)],
      pointCards: [
        {
          id: "rakuten-pc",
          name: "楽天ポイントカード",
          currencyId: "rakuten-pt",
          enabled: false,
        },
      ],
    });
    expect(res[0].card.id).toBe("rakuten");
    expect(res[0].reachable).toBe(true);
    expect(res[0].finalAmount).toBeCloseTo(50, 10); // 100 rakuten-pt × 0.5
  });
});
