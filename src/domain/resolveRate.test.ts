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

  it("複数の一致ルールがあるとき、最高 rate を採用する (キャンペーン優先)", () => {
    // 通常ルール 2% とキャンペーンルール 5% が共存 → 5% を採用
    const r1: StoreRule = {
      id: "permanent",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.02,
      currencyId: "amazon-pt",
    };
    const r2: StoreRule = {
      id: "campaign",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.05,
      currencyId: "amazon-pt",
    };
    const result = resolveRate(card, "amazon", [r1, r2], stores);
    expect(result.source).toBe("rule");
    if (result.source === "rule") {
      expect(result.ruleId).toBe("campaign");
      expect(result.rate).toBe(0.05);
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

  // ===== キャンペーン期間 (validFrom/validTo) =====

  it("validTo 過去 → そのルール無視、デフォルトに落ちる", () => {
    const r: StoreRule = {
      id: "expired",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.05,
      currencyId: "amazon-pt",
      validTo: "2020-01-01",
    };
    const result = resolveRate(
      card,
      "amazon",
      [r],
      stores,
      new Date("2026-06-15T12:00:00"),
    );
    expect(result.source).toBe("default");
  });

  it("validFrom 未来 → そのルール無視", () => {
    const r: StoreRule = {
      id: "future",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.05,
      currencyId: "amazon-pt",
      validFrom: "2030-01-01",
    };
    const result = resolveRate(
      card,
      "amazon",
      [r],
      stores,
      new Date("2026-06-15T12:00:00"),
    );
    expect(result.source).toBe("default");
  });

  it("通常 1% + キャンペーン 5% が共存、期間中なら 5%", () => {
    const permanent: StoreRule = {
      id: "permanent",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.01,
      currencyId: "amazon-pt",
    };
    const campaign: StoreRule = {
      id: "campaign",
      cardId: "rakuten",
      storeId: "amazon",
      rate: 0.05,
      currencyId: "amazon-pt",
      validFrom: "2026-06-01",
      validTo: "2026-06-30",
    };
    const duringCampaign = resolveRate(
      card,
      "amazon",
      [permanent, campaign],
      stores,
      new Date("2026-06-15T12:00:00"),
    );
    expect(duringCampaign.source).toBe("rule");
    if (duringCampaign.source === "rule") {
      expect(duringCampaign.ruleId).toBe("campaign");
      expect(duringCampaign.rate).toBe(0.05);
      expect(duringCampaign.validTo).toBe("2026-06-30");
    }
    const afterCampaign = resolveRate(
      card,
      "amazon",
      [permanent, campaign],
      stores,
      new Date("2026-07-15T12:00:00"),
    );
    expect(afterCampaign.source).toBe("rule");
    if (afterCampaign.source === "rule") {
      expect(afterCampaign.ruleId).toBe("permanent");
      expect(afterCampaign.rate).toBe(0.01);
      expect(afterCampaign.validTo).toBeUndefined();
    }
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
