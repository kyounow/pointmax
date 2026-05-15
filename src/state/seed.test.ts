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

// ─── v3.6.0: nanaco/WAON の loyalty × e-money 排他制約 ───
// nanaco-card / waon-card は「物理的に同じカードを提示 = 支払」なので、
// pointCard loyalty 経路と paymentApp e-money 経路が同じ store で両方発火すると
// 二重取りバグになる (programEvaluator + bestLoyalties が独立に加算)。
//
// ※ V(旧T)ポイント × SMBC タッチや、楽天ポイントカード × 楽天Pay 等は「別物理カード」
// で同一通貨が貯まるパターンであり、両方発火が正しい挙動。そういうケースは flag しない。
// nanaco / WAON は loyalty=payment が同一カードなので例外的に排他が必要。
import { seed } from "./seed";

describe("nanaco/WAON の loyalty × e-money 排他制約 (二重取り防止)", () => {
  it.each([
    {
      loyaltyProgramId: "prog-nanaco-card-1pc",
      emoneyProgramId: "prog-pa-nanaco-base",
    },
    {
      loyaltyProgramId: "prog-waon-card-0.5pc",
      emoneyProgramId: "prog-pa-waon-base",
    },
  ])(
    "$loyaltyProgramId と $emoneyProgramId は同じ store の membership を持たない",
    ({ loyaltyProgramId, emoneyProgramId }) => {
      const { memberships } = seed();
      const loyaltyStores = new Set(
        memberships
          .filter((m) => m.programId === loyaltyProgramId)
          .map((m) => m.storeId),
      );
      const emoneyStores = memberships
        .filter((m) => m.programId === emoneyProgramId)
        .map((m) => m.storeId);
      const overlap = emoneyStores.filter((s) => loyaltyStores.has(s));
      expect(
        overlap,
        `${loyaltyProgramId} と ${emoneyProgramId} が両方 membership する store: ${overlap.join(", ")} (= 二重取りバグ)`,
      ).toEqual([]);
    },
  );
});
