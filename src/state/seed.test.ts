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
import { CARD_FAMILIES } from "./seed-data-card-families";
import { isValidVerifiedMonth } from "../domain/edgeFreshness";
import { isSafeHttpUrl } from "../domain/urlSafety";

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
import {
  findYenRatioViolations,
  type YenRatioViolation,
} from "../domain/yenValue";
import type { ConversionEdge } from "../domain/types";

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

// v6: BenefitProgram.scope の seed 契約。
//   - 全 program に有効な scope が付いている。
//   - member-stores program は必ず membership を 1 件以上持つ (0 件は「非加盟店で
//     絶対に発火しない死にデータ」= seed バグ)。import 経路では過渡状態として許容するが
//     seed 契約としては禁止。
//   - all-stores program は membership を持たない (validators の矛盾検出と対の関係)。
describe("BenefitProgram.scope の seed 契約 (v6)", () => {
  it("seed() の全 program が有効な scope を持つ", () => {
    const { programs } = seed();
    const bad = programs
      .filter((p) => p.scope !== "all-stores" && p.scope !== "member-stores")
      .map((p) => `${p.id}: scope=${JSON.stringify(p.scope)}`);
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("member-stores program は全て membership を 1 件以上持つ", () => {
    const { programs, memberships } = seed();
    const withMembership = new Set(memberships.map((m) => m.programId));
    const orphan = programs
      .filter((p) => p.scope === "member-stores" && !withMembership.has(p.id))
      .map((p) => p.id);
    expect(
      orphan,
      `membership 0 件の member-stores program (非加盟店で発火しない死にデータ): ${orphan.join(", ")}`,
    ).toEqual([]);
  });

  it("all-stores program は membership を持たない (validators の矛盾検出と整合)", () => {
    const { programs, memberships } = seed();
    const withMembership = new Set(memberships.map((m) => m.programId));
    const contradictory = programs
      .filter((p) => p.scope === "all-stores" && withMembership.has(p.id))
      .map((p) => p.id);
    expect(
      contradictory,
      `all-stores なのに membership を持つ program: ${contradictory.join(", ")}`,
    ).toEqual([]);
  });
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

  // DB-8: minFromUnits (最低交換単位) は optional だが、付与されている場合は正の有限数。
  it("minFromUnits が付与されている edge はすべて正の有限数", () => {
    const { edges } = seed();
    const withMin = edges.filter((e) => e.minFromUnits !== undefined);
    // 主要 edge に値が付いていること (機構が空振りしていない回帰ガード)
    expect(withMin.length).toBeGreaterThan(0);
    const bad = withMin
      .filter((e) => !(Number.isFinite(e.minFromUnits) && e.minFromUnits! > 0))
      .map((e) => `${e.id}: minFromUnits=${e.minFromUnits}`);
    expect(bad, bad.join("\n")).toEqual([]);
  });

  // REM-#2: lastVerifiedAt (最終確認月) は optional だが、付与されている場合は "YYYY-MM"
  // (month 01-12) 形式。stale 判定 (edgeFreshness) はこの形式を前提にするため契約で担保する。
  it("lastVerifiedAt が付与されている edge はすべて YYYY-MM 形式", () => {
    const { edges } = seed();
    const withVerified = edges.filter((e) => e.lastVerifiedAt !== undefined);
    // 主要 edge に記入されていること (機構が空振りしていない回帰ガード)
    expect(withVerified.length).toBeGreaterThan(0);
    const bad = withVerified
      .filter((e) => !isValidVerifiedMonth(e.lastVerifiedAt!))
      .map((e) => `${e.id}: lastVerifiedAt=${e.lastVerifiedAt}`);
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

  it("v6.1.0 の gate カード (jmb-jq-sugoca / jq-sugoca-ana) が enabled 非出荷で存在 (v7 全 OFF 起点)", () => {
    const byId = new Map(SEED_CARDS.map((c) => [c.id, c]));
    for (const id of ["jmb-jq-sugoca", "jq-sugoca-ana"]) {
      const c = byId.get(id);
      expect(c, `card ${id} が未登録`).toBeDefined();
      // v7: seed は enabled を出荷しない (未記述 = OFF)。
      expect(c?.enabled, `card ${id} は enabled 非出荷想定`).toBeUndefined();
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

  // 四半期監査 2026-Q3: 旧 rate 0.5 (1500→750) は公式に存在しないレートだった。
  // 正は SMP 未加入の 0.3333 (1500→500) / 加入で 0.6667。既定は保守的に未加入 0.3333。
  it("Q3監査: jre-to-jal-normal (普通カード) は rate 0.3333 / requiredCardIds ['jal-suica-normal']", () => {
    const { edges } = seed();
    const e = edges.find((x) => x.id === "jre-to-jal-normal");
    expect(e, "edge jre-to-jal-normal が未登録").toBeDefined();
    expect(e?.fromCurrencyId).toBe("jre");
    expect(e?.toCurrencyId).toBe("jal-mile");
    expect(e?.rate).toBe(0.3333);
    expect(e?.rate).not.toBe(0.5); // 旧 1500→750 (公式に無いレート) への退行防止
    expect(e?.requiredCardIds).toEqual(["jal-suica-normal"]);
  });

  it("v6.4.0: gate カード jal-suica-normal が enabled 非出荷で存在 (v7 全 OFF 起点)", () => {
    const c = SEED_CARDS.find((x) => x.id === "jal-suica-normal");
    expect(c, "card jal-suica-normal が未登録").toBeDefined();
    expect(c?.enabled).toBeUndefined(); // v7: seed は enabled を出荷しない
    expect(c?.defaultCurrencyId).toBe("jal-mile");
  });
});

// PR-5a (DB-2): edge レートが円価値目安 (Currency.yenValue) と乖離していないかの契約。
//   各 edge について from/to 両方に yenValue がある場合、
//     ratio = rate × yenValue(to) / yenValue(from)
//   が [1/2.5, 2.5] の範囲内であることを検証する。範囲外 = レートか yenValue のどちらかが
//   おかしい可能性が高い (seed のミス検出)。yenValue が片方でも無い edge は対象外。
//   import 検証には入れない (ユーザー編集 edge は縛らない) = seed 契約テストとしてのみ担保。
describe("PR-5a: edge レートと円価値目安の整合 (findYenRatioViolations)", () => {
  const yenValueOf = () => {
    const { currencies } = seed();
    const byId = new Map(currencies.map((c) => [c.id, c] as const));
    return (id: string): number | undefined => byId.get(id)?.yenValue;
  };

  it("seed の全 edge が [1/2.5, 2.5] の範囲内に収まる", () => {
    const { edges } = seed();
    const violations = findYenRatioViolations(edges, yenValueOf());
    const detail = violations
      .map(
        (v: YenRatioViolation) =>
          `${v.edgeId} (${v.fromCurrencyId}→${v.toCurrencyId}): 係数 ${v.ratio.toFixed(3)}`,
      )
      .join("\n");
    expect(violations, detail).toEqual([]);
  });

  it("yenValue を持つ edge が 1 本以上検証対象になっている (機構が空振りしていない)", () => {
    const { edges, currencies } = seed();
    const byId = new Map(currencies.map((c) => [c.id, c] as const));
    const checked = edges.filter(
      (e) =>
        byId.get(e.fromCurrencyId)?.yenValue !== undefined &&
        byId.get(e.toCurrencyId)?.yenValue !== undefined,
    );
    expect(checked.length).toBeGreaterThan(20);
  });

  it("人工的に乖離させた edge (rate 過大) は violation として検出される", () => {
    // rakuten-pt(1円) → d-pt(1円) を rate 10 にすると ratio=10 で上限 2.5 超。
    const bogus: ConversionEdge[] = [
      { id: "bogus-hi", fromCurrencyId: "rakuten-pt", toCurrencyId: "d-pt", rate: 10 },
    ];
    const violations = findYenRatioViolations(bogus, yenValueOf());
    expect(violations.map((v) => v.edgeId)).toContain("bogus-hi");
  });

  it("人工的に乖離させた edge (rate 過小) も検出される", () => {
    // eikyu(5円) → rakuten-pt(1円) を rate 0.1 にすると ratio=0.1×1/5=0.02 で下限 0.4 未満。
    const bogus: ConversionEdge[] = [
      { id: "bogus-lo", fromCurrencyId: "eikyu", toCurrencyId: "rakuten-pt", rate: 0.1 },
    ];
    const violations = findYenRatioViolations(bogus, yenValueOf());
    expect(violations.map((v) => v.edgeId)).toContain("bogus-lo");
  });

  it("片方でも yenValue が無い edge は検証対象外 (スキップ)", () => {
    // amex-mr は yenValue 未設定 → from が無いので rate に関わらずスキップ。
    const skip: ConversionEdge[] = [
      { id: "skip-amex", fromCurrencyId: "amex-mr", toCurrencyId: "jal-mile", rate: 99 },
    ];
    const violations = findYenRatioViolations(skip, yenValueOf());
    expect(violations).toEqual([]);
  });
});

// #103 回帰防止: "general" は Calculator の規定還元率確認用ダミー store
// (実店舗ではない)。jcb-jpoint extractor が店舗特定不能な項目 (「クレカ乗車
// ポイント20倍」等) をここに誤って membership 化した事故があり (7/02 本番配信済み、
// REMOVED_MEMBERSHIP_IDS で除去)、二度と混入しないことを保証する。
describe("#103 回帰: general への membership 混入防止", () => {
  it("seed() の memberships に storeId === 'general' が存在しない", () => {
    const { memberships } = seed();
    const offending = (memberships ?? []).filter((m) => m.storeId === "general");
    expect(offending, JSON.stringify(offending)).toEqual([]);
  });
});

// M5 回帰防止: prog-d-pointcard-nojima-10000 は rate 捏造疑い濃厚 (evidenceQuote
// 「ノジマで最大10,000ポイントプレゼント」に rate 1% の根拠皆無) のため tombstone 化した。
// REMOVED_PROGRAM_IDS への再登録漏れ / 再混入がないことを保証する。
describe("M5 回帰: prog-d-pointcard-nojima-10000 の除去", () => {
  it("seed() の programs に存在しない", () => {
    const { programs } = seed();
    expect(programs.some((p) => p.id === "prog-d-pointcard-nojima-10000")).toBe(false);
  });
  it("seed() の memberships に紐づく membership も存在しない (cascade)", () => {
    const { memberships } = seed();
    const offending = (memberships ?? []).filter(
      (m) => m.programId === "prog-d-pointcard-nojima-10000",
    );
    expect(offending, JSON.stringify(offending)).toEqual([]);
  });
});

// v6.5.0: エポス 3グレード体制 + たまるマーケットの仕様固定テスト。
// 公式値 (2026-07 確認済み) を CI で固定し、退行 (特に選べるポイントアップの
// 2025-04 改定値 0.01 を旧 3倍 0.015 に戻す等) を防止する。
describe("v6.5.0: エポス 3グレード + たまるマーケット", () => {
  it("epos-gold / epos-platinum が enabled 非出荷で存在し 0.5% / epos 通貨 (v7 全 OFF 起点)", () => {
    const byId = new Map(SEED_CARDS.map((c) => [c.id, c]));
    for (const id of ["epos-gold", "epos-platinum"]) {
      const c = byId.get(id);
      expect(c, `card ${id} が未登録`).toBeDefined();
      expect(c?.enabled).toBeUndefined(); // v7: seed は enabled を出荷しない
      expect(c?.defaultRate).toBe(0.005);
      expect(c?.defaultCurrencyId).toBe("epos");
    }
  });

  it("prog-epos-gp-selectable-pointup は rate 0.01 (2025-04改定の2倍。旧3倍 0.015 への退行防止)", () => {
    const { programs } = seed();
    const p = programs.find((x) => x.id === "prog-epos-gp-selectable-pointup");
    expect(p, "prog-epos-gp-selectable-pointup が未登録").toBeDefined();
    expect(p?.rate).toBe(0.01);
    // 旧 3倍 (0.015) に戻っていないことを明示的にガード
    expect(p?.rate).not.toBe(0.015);
  });

  it("prog-epos-tamaru-{2,3,4}x の rate が 0.005×N と一致", () => {
    const { programs } = seed();
    const byId = new Map(programs.map((p) => [p.id, p]));
    for (const n of [2, 3, 4]) {
      const p = byId.get(`prog-epos-tamaru-${n}x`);
      expect(p, `prog-epos-tamaru-${n}x が未登録`).toBeDefined();
      expect(p?.rate).toBeCloseTo(0.005 * n, 10);
    }
  });

  it("選べるポイントアップの marui membership は overrideRate 0.015", () => {
    const { memberships } = seed();
    const m = memberships.find(
      (x) =>
        x.programId === "prog-epos-gp-selectable-pointup" &&
        x.storeId === "marui",
    );
    expect(m, "選べるポイントアップ × marui membership が未登録").toBeDefined();
    expect(m?.overrideRate).toBe(0.015);
  });

  it("prog-epos-gp-marui の cardIds に一般 (epos-card) が含まれない", () => {
    const { programs } = seed();
    const p = programs.find((x) => x.id === "prog-epos-gp-marui");
    expect(p, "prog-epos-gp-marui が未登録").toBeDefined();
    expect(p?.cardIds).toBeDefined();
    expect(p?.cardIds).not.toContain("epos-card");
  });
});

// PR-1a: JAL特約店 2倍 の「加入要否」2 分割の seed 契約。
// CLUB-A系 (jal-suica) は SMP 自動付帯で常時 2倍 (optIn 無し)、
// 普通カード (jal-card) は SMP 任意加入なので optIn:true で既定 OFF。
// 旧「両カードに一律 2倍」への退行 (jal-card を optIn 無しに戻す等) を防ぐ。
describe("PR-1a: JAL特約店 2倍 の加入要否分割", () => {
  it("prog-jal-tokuyaku (CLUB-A系) は cardIds=[jal-suica]・optIn 無し・2%", () => {
    const { programs } = seed();
    const p = programs.find((x) => x.id === "prog-jal-tokuyaku");
    expect(p, "prog-jal-tokuyaku が未登録").toBeDefined();
    expect(p?.cardIds).toEqual(["jal-suica"]);
    expect(p?.optIn).toBeUndefined(); // CLUB-A系は自動付帯なので既定 ON
    expect(p?.rate).toBe(0.02);
    expect(p?.currencyId).toBe("jal-mile");
  });

  it("prog-jal-tokuyaku-normal (普通カード) は cardIds=[jal-card]・optIn:true・2%", () => {
    const { programs } = seed();
    const p = programs.find((x) => x.id === "prog-jal-tokuyaku-normal");
    expect(p, "prog-jal-tokuyaku-normal が未登録").toBeDefined();
    expect(p?.cardIds).toEqual(["jal-card"]);
    expect(p?.optIn).toBe(true); // SMP 加入者のみ「使う」ON で発火
    expect(p?.rate).toBe(0.02);
  });

  it("両 program が同一店舗集合に加盟している (membership 複製)", () => {
    const { memberships } = seed();
    const club = new Set(
      memberships
        .filter((m) => m.programId === "prog-jal-tokuyaku")
        .map((m) => m.storeId),
    );
    const normal = new Set(
      memberships
        .filter((m) => m.programId === "prog-jal-tokuyaku-normal")
        .map((m) => m.storeId),
    );
    expect(club.size).toBeGreaterThan(0);
    expect(normal).toEqual(club);
  });
});

// PR-1c: 楽天「5と0のつく日」の cap 対応 seed 契約。
// 旧 rate 0.04 / primary への退行を防ぎ、addOn + cap 10万円を固定する。
describe("PR-1c: 楽天「5と0のつく日」の addOn + cap 設定", () => {
  it("prog-rakuten-ichiba-zero-five-day は addOn / rate 0.01 / cap 10万円", () => {
    const { programs } = seed();
    const p = programs.find((x) => x.id === "prog-rakuten-ichiba-zero-five-day");
    expect(p, "prog-rakuten-ichiba-zero-five-day が未登録").toBeDefined();
    expect(p?.bonusType).toBe("addOn");
    expect(p?.rate).toBe(0.01);
    expect(p?.rate).not.toBe(0.04); // 旧 primary 4% への退行防止
    expect(p?.monthlyCapAmountYen).toBe(100000); // 1,000pt/月 ÷ 0.01
    expect(p?.recurringDays).toEqual([5, 10, 15, 20, 25, 30]);
    // REM-#5: 要エントリー (毎回エントリー必須) → requiresEntry:true + タップ可能な entryUrl。
    expect(p?.requiresEntry).toBe(true);
    expect(p?.entryUrl && isSafeHttpUrl(p.entryUrl)).toBe(true);
  });

  it("prog-rakuten-ichiba-base は据え置き (primary 3%)", () => {
    const { programs } = seed();
    const p = programs.find((x) => x.id === "prog-rakuten-ichiba-base");
    expect(p?.bonusType).toBe("primary");
    expect(p?.rate).toBe(0.03);
    // base はエントリー不要 (常時 3%) → requiresEntry は付けない。
    expect(p?.requiresEntry).toBeUndefined();
  });
});

// REM-#5: requiresEntry 構造化の seed 契約。
//   - J-POINT パートナー系は「登録制だが無料・恒久」→ requiresEntry:true (optIn ではない)。
//   - たまるマーケットは「経由型」であって「登録型」ではない → requiresEntry を付けない。
//   - エポス選べるポイントアップは事前選択・ロックのある特典 → optIn:true で表現し
//     requiresEntry は付けない (2 概念を混同しない契約)。
describe("REM-#5: requiresEntry の付与契約", () => {
  const JPOINT_IDS = [
    "prog-jcb-jpoint-2x",
    "prog-jcb-jpoint-3x",
    "prog-jcb-jpoint-20x",
    "prog-jcb-jpoint-gold-2x",
    "prog-jcb-jpoint-gold-3x",
    "prog-jcb-jpoint-gold-4x",
    "prog-jcb-jpoint-gold-20x",
  ];

  it("J-POINT パートナー系は全て requiresEntry:true + タップ可能な entryUrl", () => {
    const { programs } = seed();
    for (const id of JPOINT_IDS) {
      const p = programs.find((x) => x.id === id);
      expect(p, `${id} が未登録`).toBeDefined();
      expect(p?.requiresEntry, `${id} は requiresEntry:true であるべき`).toBe(
        true,
      );
      expect(
        p?.entryUrl && isSafeHttpUrl(p.entryUrl),
        `${id} の entryUrl が安全な http(s) URL であるべき`,
      ).toBe(true);
      // 無料・恒久の都度登録系なので optIn ではない (2 概念の使い分け)。
      expect(p?.optIn, `${id} は optIn ではない`).toBeUndefined();
    }
  });

  it("たまるマーケット (経由型) は requiresEntry を付けない", () => {
    const { programs } = seed();
    for (const id of [
      "prog-epos-tamaru-2x",
      "prog-epos-tamaru-3x",
      "prog-epos-tamaru-4x",
    ]) {
      const p = programs.find((x) => x.id === id);
      expect(p, `${id} が未登録`).toBeDefined();
      expect(p?.requiresEntry, `${id} は経由型なので requiresEntry 非付与`).toBe(
        undefined,
      );
    }
  });

  it("エポス選べるポイントアップは optIn で表現し requiresEntry は付けない", () => {
    const { programs } = seed();
    const p = programs.find(
      (x) => x.id === "prog-epos-gp-selectable-pointup",
    );
    expect(p?.optIn).toBe(true);
    expect(p?.requiresEntry).toBeUndefined();
  });
});

// v6 PR-1c: Card.familyId / gradeLevel の seed 契約。
//   - familyId が指定されているカードは CARD_FAMILIES に実在する family を指す
//     (dangling familyId は排他 invariant が引けず死にデータになる)。
//   - 同一 family 内で gradeLevel が重複しない (並び順の一意性)。
describe("v6 PR-1c: Card family の seed 契約", () => {
  it("全カードの familyId が CARD_FAMILIES に実在する", () => {
    const { cards } = seed();
    const validIds = new Set(CARD_FAMILIES.map((f) => f.id));
    const dangling = cards
      .filter((c) => c.familyId !== undefined && !validIds.has(c.familyId))
      .map((c) => `${c.id}: familyId=${c.familyId}`);
    expect(dangling, dangling.join("\n")).toEqual([]);
  });

  it("family 内で gradeLevel が重複しない", () => {
    const { cards } = seed();
    const byFamily = new Map<string, number[]>();
    for (const c of cards) {
      if (c.familyId === undefined || c.gradeLevel === undefined) continue;
      const arr = byFamily.get(c.familyId) ?? [];
      arr.push(c.gradeLevel);
      byFamily.set(c.familyId, arr);
    }
    const dupes: string[] = [];
    for (const [familyId, levels] of byFamily) {
      if (new Set(levels).size !== levels.length) {
        dupes.push(`${familyId}: gradeLevel=[${levels.join(",")}]`);
      }
    }
    expect(dupes, dupes.join("\n")).toEqual([]);
  });

  it("設計どおり 3 family に 7 カードが割り当てられている", () => {
    const { cards } = seed();
    const idsOf = (familyId: string) =>
      cards
        .filter((c) => c.familyId === familyId)
        .map((c) => c.id)
        .sort();
    expect(idsOf("family-epos")).toEqual([
      "epos-card",
      "epos-gold",
      "epos-platinum",
    ]);
    expect(idsOf("family-jal-suica")).toEqual([
      "jal-suica",
      "jal-suica-normal",
    ]);
    expect(idsOf("family-jcb")).toEqual(["jcb-gold", "jcb-w"]);
  });

  it("family-epos / family-jal-suica は exclusive、family-jcb は非 exclusive", () => {
    const byId = new Map(CARD_FAMILIES.map((f) => [f.id, f]));
    expect(byId.get("family-epos")?.exclusive).toBe(true);
    expect(byId.get("family-jal-suica")?.exclusive).toBe(true);
    expect(byId.get("family-jcb")?.exclusive).toBe(false);
  });
});

// 四半期監査 (2026-Q3): 消滅したルート / 廃止された優待の tombstone 契約。
// 削除した edge / program が seed に再混入しないことを保証する
// (cron auto-sync や手編集での復活を CI で検出)。
describe("四半期監査 2026-Q3: 消滅ルート / 廃止優待の削除固定", () => {
  it("edge eikyu-to-edy は存在しない (永久不滅ウォレット終了 2023-10-31)", () => {
    const { edges } = seed();
    expect(edges.some((e) => e.id === "eikyu-to-edy")).toBe(false);
  });

  it("edge eikyu-to-rakuten は存在しない (STOREE SAISON 交換一覧から消滅)", () => {
    const { edges } = seed();
    expect(edges.some((e) => e.id === "eikyu-to-rakuten")).toBe(false);
  });

  it("program prog-au-pay-card-addon は存在しない (残高チャージ加算廃止 2022-12-01)", () => {
    const { programs, memberships } = seed();
    expect(programs.some((p) => p.id === "prog-au-pay-card-addon")).toBe(false);
    expect(
      (memberships ?? []).some((m) => m.programId === "prog-au-pay-card-addon"),
    ).toBe(false);
  });

  it("program prog-rakuten-pointcard-1pc は存在しない (有効加盟店ゼロ、membership も cascade 削除)", () => {
    const { programs, memberships } = seed();
    expect(programs.some((p) => p.id === "prog-rakuten-pointcard-1pc")).toBe(
      false,
    );
    const offending = (memberships ?? []).filter(
      (m) => m.programId === "prog-rakuten-pointcard-1pc",
    );
    expect(offending, JSON.stringify(offending)).toEqual([]);
  });

  // レート修正の退行防止 (公式値を CI で固定)。
  it("レート修正が反映されている (eikyu-to-d 4.5 / eikyu-to-amazon 4 / 在来線えきねっと 8%)", () => {
    const { edges, programs } = seed();
    const byEdge = new Map(edges.map((e) => [e.id, e]));
    expect(byEdge.get("eikyu-to-d")?.rate).toBe(4.5);
    expect(byEdge.get("eikyu-to-d")?.minFromUnits).toBe(200);
    expect(byEdge.get("eikyu-to-amazon")?.rate).toBe(4);
    expect(byEdge.get("eikyu-to-amazon")?.minFromUnits).toBe(100);
    const zairaisen = programs.find(
      (p) => p.id === "prog-jal-suica-ekinet-zairaisen",
    );
    expect(zairaisen?.rate).toBe(0.08);
  });

  // メルカード毎月8日: primary 8% → addOn +8% (要エントリー・上限P300/月) への実態化。
  it("prog-mercard-mercari-day8 は addOn / requiresEntry / cap 3750 (旧 primary 8% への退行防止)", () => {
    const { programs } = seed();
    const p = programs.find((x) => x.id === "prog-mercard-mercari-day8");
    expect(p, "prog-mercard-mercari-day8 が未登録").toBeDefined();
    expect(p?.bonusType).toBe("addOn");
    expect(p?.bonusType).not.toBe("primary"); // 旧 primary 8% への退行防止
    expect(p?.rate).toBe(0.08);
    expect(p?.requiresEntry).toBe(true);
    expect(p?.monthlyCapAmountYen).toBe(3750); // 300pt/月 ÷ 0.08
  });

  // 楽天Pay 残高払い +0.5%: 2025-07 改定で cardIds 除去 + optIn 化。
  it("prog-rakuten-pay-rakuten-card-addon は cardIds 無し / optIn:true (2025-07 改定条件)", () => {
    const { programs } = seed();
    const p = programs.find(
      (x) => x.id === "prog-rakuten-pay-rakuten-card-addon",
    );
    expect(p, "prog-rakuten-pay-rakuten-card-addon が未登録").toBeDefined();
    expect(p?.cardIds).toBeUndefined();
    expect(p?.optIn).toBe(true);
    expect(p?.rate).toBe(0.005);
  });

  // JCB W 系列: 加算方式 (W 実効 (N+1)×0.5%) の正値固定。
  // 旧「W 基本1% × N倍」乗算モデル (2x=0.02 / 3x=0.03 / 20x=0.2) への退行を防止する。
  // Gold 系列 (特典倍率なし = N×0.5%) は不変。
  it("JCB W 系列は加算方式の正値 (2x=0.015 / 3x=0.02 / 20x=0.105)、Gold は不変", () => {
    const { programs } = seed();
    const byId = new Map(programs.map((p) => [p.id, p]));
    // W 系列 (加算方式: (N+1)×0.5%)
    expect(byId.get("prog-jcb-jpoint-2x")?.rate).toBe(0.015);
    expect(byId.get("prog-jcb-jpoint-2x")?.rate).not.toBe(0.02); // 旧乗算モデルへの退行防止
    expect(byId.get("prog-jcb-jpoint-3x")?.rate).toBe(0.02);
    expect(byId.get("prog-jcb-jpoint-3x")?.rate).not.toBe(0.03);
    expect(byId.get("prog-jcb-jpoint-20x")?.rate).toBe(0.105);
    expect(byId.get("prog-jcb-jpoint-20x")?.rate).not.toBe(0.2);
    // Gold 系列 (N×0.5%、加算方式でも同値なので不変)
    expect(byId.get("prog-jcb-jpoint-gold-2x")?.rate).toBe(0.01);
    expect(byId.get("prog-jcb-jpoint-gold-3x")?.rate).toBe(0.015);
    expect(byId.get("prog-jcb-jpoint-gold-4x")?.rate).toBe(0.02);
    expect(byId.get("prog-jcb-jpoint-gold-20x")?.rate).toBe(0.1);
  });
});
