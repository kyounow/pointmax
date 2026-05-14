import { describe, it, expect } from "vitest";
import { MASTER_CARD_IDS, isMasterCard, MASTER_PAYMENT_APP_IDS, isMasterPaymentApp } from "./seed";
import { SEED_CARDS, SEED_PAYMENT_APPS } from "./seed-data-cards";

describe("MASTER_CARD_IDS / isMasterCard", () => {
  it("SEED_CARDS の全 id が含まれる", () => {
    for (const c of SEED_CARDS) {
      expect(MASTER_CARD_IDS.has(c.id)).toBe(true);
      expect(isMasterCard(c.id)).toBe(true);
    }
  });

  it("dcard と paypay-card は master 判定される", () => {
    expect(isMasterCard("dcard")).toBe(true);
    expect(isMasterCard("paypay-card")).toBe(true);
  });

  it("ランダムな UUID は master 判定されない", () => {
    expect(isMasterCard("aaaa-bbbb-cccc")).toBe(false);
    expect(isMasterCard("")).toBe(false);
  });
});

describe("MASTER_PAYMENT_APP_IDS / isMasterPaymentApp", () => {
  it("SEED_PAYMENT_APPS の全 id が含まれる", () => {
    for (const p of SEED_PAYMENT_APPS) {
      expect(MASTER_PAYMENT_APP_IDS.has(p.id)).toBe(true);
      expect(isMasterPaymentApp(p.id)).toBe(true);
    }
  });

  it("pa-au-pay / pa-famipay / pa-merpay は master 判定される", () => {
    expect(isMasterPaymentApp("pa-au-pay")).toBe(true);
    expect(isMasterPaymentApp("pa-famipay")).toBe(true);
    expect(isMasterPaymentApp("pa-merpay")).toBe(true);
  });

  it("ランダムな UUID は master 判定されない", () => {
    expect(isMasterPaymentApp("aaaa-bbbb-cccc")).toBe(false);
    expect(isMasterPaymentApp("")).toBe(false);
  });
});
