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

  it("pa-au-pay / pa-merpay は master 判定される", () => {
    expect(isMasterPaymentApp("pa-au-pay")).toBe(true);
    expect(isMasterPaymentApp("pa-merpay")).toBe(true);
  });

  it("pa-famipay は v4.0.1 で廃止済 (master 判定されない)", () => {
    expect(isMasterPaymentApp("pa-famipay")).toBe(false);
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

// v4.0.0 ①: ルーティングテーブル拡充に伴い、edges の参照整合性を CI で保証する。
// 通貨を追加 / リネームしたとき、edge の from/to が dangling になるのを検出。
describe("SEED_EDGES の通貨参照整合性", () => {
  it("全 edge の fromCurrencyId / toCurrencyId が SEED_CURRENCIES に存在する", () => {
    const { edges, currencies } = seed();
    const currencyIds = new Set(currencies.map((c) => c.id));
    const dangling: string[] = [];
    for (const e of edges) {
      if (!currencyIds.has(e.fromCurrencyId)) {
        dangling.push(`${e.id}: from='${e.fromCurrencyId}' が未定義`);
      }
      if (!currencyIds.has(e.toCurrencyId)) {
        dangling.push(`${e.id}: to='${e.toCurrencyId}' が未定義`);
      }
    }
    expect(dangling, dangling.join("\n")).toEqual([]);
  });

  it("全 edge の rate は正の有限数", () => {
    const { edges } = seed();
    const bad = edges
      .filter((e) => !(Number.isFinite(e.rate) && e.rate > 0))
      .map((e) => `${e.id}: rate=${e.rate}`);
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("v4.0.0 で追加した orico-pt / mufg-pt の edges が存在する", () => {
    const { edges } = seed();
    const ids = new Set(edges.map((e) => e.id));
    for (const id of [
      "orico-to-waon",
      "orico-to-ponta",
      "orico-to-d",
      "orico-to-ana",
      "orico-to-jal",
      "mufg-to-ponta",
      "mufg-to-d",
      "mufg-to-rakuten",
      "mufg-to-nanaco",
      "mufg-to-waon",
      "mufg-to-jal",
    ]) {
      expect(ids.has(id), `edge ${id} が未登録`).toBe(true);
    }
  });

  // v6.1.0: requiredCardIds は実在する Card.id を参照しなければならない
  // (gate カードを seed-data-cards.ts に追加し忘れると edge が永久に通行不可になる)。
  it("全 edge の requiredCardIds が SEED_CARDS の id を参照する", () => {
    const { edges } = seed();
    const cardIds = new Set(SEED_CARDS.map((c) => c.id));
    const dangling: string[] = [];
    for (const e of edges) {
      for (const id of e.requiredCardIds ?? []) {
        if (!cardIds.has(id)) {
          dangling.push(`${e.id}: requiredCardIds '${id}' が未定義`);
        }
      }
    }
    expect(dangling, dangling.join("\n")).toEqual([]);
  });

  // v6.1.0: カード保有で開く JAL/ANA ルートが登録されている
  it("v6.1.0 のカード保有ルートが存在し、正しい requiredCardIds を持つ", () => {
    const { edges } = seed();
    const byId = new Map(edges.map((e) => [e.id, e]));
    const expected: Record<string, string[]> = {
      "waon-to-jal": ["aeon-card"],
      "jrkyupo-to-jal": ["jmb-jq-sugoca"],
      "jal-to-jrkyupo": ["jmb-jq-sugoca"],
      "jrkyupo-to-ana": ["jq-sugoca-ana"],
      "ana-to-jrkyupo": ["jq-sugoca-ana"],
    };
    for (const [id, req] of Object.entries(expected)) {
      const e = byId.get(id);
      expect(e, `edge ${id} が未登録`).toBeDefined();
      expect(e?.requiredCardIds, `edge ${id} の requiredCardIds`).toEqual(req);
    }
  });

  it("v6.1.0 の gate カード (jmb-jq-sugoca / jq-sugoca-ana) が enabled:false で存在", () => {
    const byId = new Map(SEED_CARDS.map((c) => [c.id, c]));
    for (const id of ["jmb-jq-sugoca", "jq-sugoca-ana"]) {
      const c = byId.get(id);
      expect(c, `card ${id} が未登録`).toBeDefined();
      expect(c?.enabled, `card ${id} は enabled:false 想定`).toBe(false);
    }
  });

  // v6.4.0: JALカードSuica の JRE→JAL マイルをカード grade 別レートに分離
  it("v6.4.0: jre-to-jal (CLUB-Aゴールド) は rate 0.6667 / requiredCardIds ['jal-suica']", () => {
    const { edges } = seed();
    const e = edges.find((x) => x.id === "jre-to-jal");
    expect(e, "edge jre-to-jal が未登録").toBeDefined();
    expect(e?.rate).toBe(0.6667);
    expect(e?.requiredCardIds).toEqual(["jal-suica"]);
  });

  it("v6.4.0: jre-to-jal-normal (普通カード) は rate 0.5 / requiredCardIds ['jal-suica-normal']", () => {
    const { edges } = seed();
    const e = edges.find((x) => x.id === "jre-to-jal-normal");
    expect(e, "edge jre-to-jal-normal が未登録").toBeDefined();
    expect(e?.fromCurrencyId).toBe("jre");
    expect(e?.toCurrencyId).toBe("jal-mile");
    expect(e?.rate).toBe(0.5);
    expect(e?.requiredCardIds).toEqual(["jal-suica-normal"]);
  });

  it("v6.4.0: gate カード jal-suica-normal が enabled:false で存在", () => {
    const c = SEED_CARDS.find((x) => x.id === "jal-suica-normal");
    expect(c, "card jal-suica-normal が未登録").toBeDefined();
    expect(c?.enabled).toBe(false);
    expect(c?.defaultCurrencyId).toBe("jal-mile");
  });
});

// #103 回帰防止: "general" は Calculator の規定還元率確認用ダミー store
// (実店舗ではない)。jcb-jpoint extractor が店舗特定不能な項目 (「クレカ乗車
// ポイント20倍」等) をここに誤って membership 化した事故があり (7/02 本番配信済み、
// REMOVED_MEMBERSHIP_KEYS で除去)、二度と混入しないことを保証する。
describe("#103 回帰: general への membership 混入防止", () => {
  it("seed() の memberships に storeId === 'general' が存在しない", () => {
    const { memberships } = seed();
    const offending = (memberships ?? []).filter((m) => m.storeId === "general");
    expect(offending, JSON.stringify(offending)).toEqual([]);
  });
});
