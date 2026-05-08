import { describe, it, expect } from "vitest";
import { resolveRate } from "./resolveRate";
import type { Card, Store, StoreRule } from "./types";

const card: Card = {
  id: "rakuten",
  name: "楽天カード",
  defaultRate: 0.01,
  defaultCurrencyId: "rakuten-pt",
};

const stores: Store[] = [
  { id: "starbucks", name: "スターバックス", category: "飲食" },
  { id: "amazon", name: "Amazon", category: "ネット通販" },
  { id: "rakuten-ichiba", name: "楽天市場", category: "ネット通販" },
  { id: "no-cat", name: "カテゴリなし店舗" },
];

describe("resolveRate", () => {
  it("該当ルールが無いとき、カードのデフォルトを返す", () => {
    const result = resolveRate(card, "starbucks", [], stores);
    expect(result).toEqual({
      rate: 0.01,
      currencyId: "rakuten-pt",
      source: "default",
    });
  });

  it("(card, storeId) 一致のルールがあればそれを優先する", () => {
    const rule: StoreRule = {
      id: "r1",
      cardId: "rakuten",
      storeId: "rakuten-ichiba",
      rate: 0.03,
      currencyId: "rakuten-pt",
    };
    const result = resolveRate(card, "rakuten-ichiba", [rule], stores);
    expect(result).toEqual({
      rate: 0.03,
      currencyId: "rakuten-pt",
      source: "rule",
      ruleId: "r1",
    });
  });

  it("店舗ルールは還元率と通貨を両方上書きできる", () => {
    const rule: StoreRule = {
      id: "r2",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.02,
      currencyId: "amazon-pt",
    };
    const result = resolveRate(card, "amazon", [rule], stores);
    expect(result.currencyId).toBe("amazon-pt");
    expect(result.rate).toBe(0.02);
    expect(result.source).toBe("rule");
  });

  it("別カードのルールは無視する", () => {
    const rule: StoreRule = {
      id: "r3",
      cardId: "other-card",
      storeId: "amazon",
      rate: 0.05,
      currencyId: "amazon-pt",
    };
    const result = resolveRate(card, "amazon", [rule], stores);
    expect(result.source).toBe("default");
    expect(result.rate).toBe(0.01);
  });

  it("別店舗のルールは無視する", () => {
    const rule: StoreRule = {
      id: "r4",
      cardId: "rakuten",
      storeId: "different-store",
      rate: 0.05,
      currencyId: "rakuten-pt",
    };
    const result = resolveRate(card, "amazon", [rule], stores);
    expect(result.source).toBe("default");
  });

  it("複数の一致ルールがあるとき、配列の先頭を採用する", () => {
    const r1: StoreRule = {
      id: "first",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.02,
      currencyId: "amazon-pt",
    };
    const r2: StoreRule = {
      id: "second",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.05,
      currencyId: "amazon-pt",
    };
    const result = resolveRate(card, "amazon", [r1, r2], stores);
    expect(result.source).toBe("rule");
    if (result.source === "rule") {
      expect(result.ruleId).toBe("first");
    }
  });

  // ===== カテゴリルール =====

  it("カテゴリルールが店舗のカテゴリと一致すれば適用される", () => {
    const rule: StoreRule = {
      id: "cat1",
      cardId: "rakuten",
      category: "ネット通販",
      rate: 0.015,
      currencyId: "rakuten-pt",
    };
    const result = resolveRate(card, "amazon", [rule], stores);
    expect(result.source).toBe("category");
    if (result.source === "category") {
      expect(result.ruleId).toBe("cat1");
    }
    expect(result.rate).toBe(0.015);
  });

  it("直接ルールはカテゴリルールより優先される", () => {
    const direct: StoreRule = {
      id: "direct",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.03,
      currencyId: "amazon-pt",
    };
    const cat: StoreRule = {
      id: "cat",
      cardId: "rakuten",
      category: "ネット通販",
      rate: 0.015,
      currencyId: "rakuten-pt",
    };
    const result = resolveRate(card, "amazon", [direct, cat], stores);
    expect(result.source).toBe("rule");
    expect(result.rate).toBe(0.03);
    expect(result.currencyId).toBe("amazon-pt");
  });

  it("店舗のカテゴリが未設定ならカテゴリルールはマッチしない", () => {
    const rule: StoreRule = {
      id: "cat-no",
      cardId: "rakuten",
      category: "ネット通販",
      rate: 0.015,
      currencyId: "rakuten-pt",
    };
    const result = resolveRate(card, "no-cat", [rule], stores);
    expect(result.source).toBe("default");
  });

  it("カテゴリ不一致ならカテゴリルールは無視される", () => {
    const rule: StoreRule = {
      id: "cat-mis",
      cardId: "rakuten",
      category: "コンビニ",
      rate: 0.07,
      currencyId: "v-pt",
    };
    const result = resolveRate(card, "amazon", [rule], stores);
    expect(result.source).toBe("default");
  });

  it("カテゴリルールも還元率と通貨を上書きできる", () => {
    const rule: StoreRule = {
      id: "cat-override",
      cardId: "rakuten",
      category: "ネット通販",
      rate: 0.025,
      currencyId: "amazon-pt",
    };
    const result = resolveRate(card, "rakuten-ichiba", [rule], stores);
    expect(result.source).toBe("category");
    expect(result.rate).toBe(0.025);
    expect(result.currencyId).toBe("amazon-pt");
  });

  // ===== 支払い方法 (paymentMethod) =====

  it("ルールに paymentMethod が指定されているとき、一致しないと適用されない", () => {
    const rule: StoreRule = {
      id: "touch",
      cardId: "rakuten",
      storeId: "amazon",
      paymentMethod: "Visaタッチ",
      rate: 0.07,
      currencyId: "v-pt",
    };
    const r1 = resolveRate(card, "amazon", [rule], stores, "通常");
    expect(r1.source).toBe("default");

    const r2 = resolveRate(card, "amazon", [rule], stores, "Visaタッチ");
    expect(r2.source).toBe("rule");
    expect(r2.rate).toBe(0.07);
  });

  it("paymentMethod 無しのルールは支払い方法に関係なく適用される", () => {
    const rule: StoreRule = {
      id: "any",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.02,
      currencyId: "amazon-pt",
    };
    const r = resolveRate(card, "amazon", [rule], stores, "Visaタッチ");
    expect(r.source).toBe("rule");
    expect(r.rate).toBe(0.02);
  });

  it("paymentMethod 一致ルールが、無印ルールより優先される", () => {
    const generic: StoreRule = {
      id: "generic",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.01,
      currencyId: "amazon-pt",
    };
    const specific: StoreRule = {
      id: "specific",
      cardId: "rakuten",
      storeId: "amazon",
      paymentMethod: "QUICPay",
      rate: 0.04,
      currencyId: "amazon-pt",
    };
    const r1 = resolveRate(card, "amazon", [generic, specific], stores, "QUICPay");
    expect(r1.rate).toBe(0.04); // QUICPay優先
    const r2 = resolveRate(card, "amazon", [generic, specific], stores, "通常");
    expect(r2.rate).toBe(0.01); // genericへフォールバック
  });

  it("paymentMethod 引数を省略した場合、無印ルールのみマッチする", () => {
    const onlyTouch: StoreRule = {
      id: "x",
      cardId: "rakuten",
      storeId: "amazon",
      paymentMethod: "Visaタッチ",
      rate: 0.07,
      currencyId: "v-pt",
    };
    const r = resolveRate(card, "amazon", [onlyTouch], stores);
    expect(r.source).toBe("default");
  });

  it("不明な storeId のときは store が見つからずデフォルトに落ちる", () => {
    const rule: StoreRule = {
      id: "any",
      cardId: "rakuten",
      category: "ネット通販",
      rate: 0.015,
      currencyId: "rakuten-pt",
    };
    const result = resolveRate(card, "unknown-store-id", [rule], stores);
    expect(result.source).toBe("default");
  });
});
