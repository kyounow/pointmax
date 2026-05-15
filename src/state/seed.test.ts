import { describe, it, expect } from "vitest";
import {
  MASTER_CARD_IDS,
  isMasterCard,
  MASTER_PAYMENT_APP_IDS,
  isMasterPaymentApp,
  getSeedCard,
  getSeedPaymentApp,
} from "./seed";
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

describe("getSeedCard", () => {
  it("既知の seed id を渡すと該当 Card を返す", () => {
    const c = getSeedCard("rakuten-card");
    expect(c).toBeDefined();
    expect(c?.id).toBe("rakuten-card");
    expect(c?.name).toContain("楽天");
  });

  it("master pool にない id は undefined を返す (リセット対象外)", () => {
    expect(getSeedCard("some-random-uuid-12345")).toBeUndefined();
    expect(getSeedCard("")).toBeUndefined();
  });

  it("SEED_CARDS の全 id でルックアップが成功する", () => {
    for (const c of SEED_CARDS) {
      const found = getSeedCard(c.id);
      expect(found?.id).toBe(c.id);
    }
  });

  it("複数回呼んでも同じ結果 (lazy cache が壊れていない)", () => {
    const first = getSeedCard("rakuten-card");
    const second = getSeedCard("rakuten-card");
    expect(first).toEqual(second);
  });
});

describe("getSeedPaymentApp", () => {
  it("既知の seed id を渡すと該当 PaymentApp を返す", () => {
    const p = getSeedPaymentApp("pa-rakuten-pay");
    expect(p).toBeDefined();
    expect(p?.id).toBe("pa-rakuten-pay");
  });

  it("master pool にない id は undefined を返す", () => {
    expect(getSeedPaymentApp("some-random-uuid")).toBeUndefined();
    expect(getSeedPaymentApp("")).toBeUndefined();
  });

  it("SEED_PAYMENT_APPS の全 id でルックアップが成功する", () => {
    for (const p of SEED_PAYMENT_APPS) {
      const found = getSeedPaymentApp(p.id);
      expect(found?.id).toBe(p.id);
    }
  });

  it("v3.6.0 で追加した pa-nanaco / pa-waon が引ける", () => {
    expect(getSeedPaymentApp("pa-nanaco")?.chargeBased).toBe(true);
    expect(getSeedPaymentApp("pa-waon")?.chargeBased).toBe(true);
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
//
// seed() を呼ぶ理由: SEED_STORE_PROGRAM_MEMBERSHIPS 単体ではなく cron の
// ADDED_MEMBERSHIPS や BLOCKED_STORE_IDS フィルタ後の最終 memberships を検査する。
// cron 同期で誤って二重取り組み合わせを追加した場合も検出できる。
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
