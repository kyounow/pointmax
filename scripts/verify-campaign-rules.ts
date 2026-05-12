// キャンペーン期間ルールの挙動確認スクリプト。
//
// 期待動作:
//   1. validFrom/validTo 未指定の通常ルールは常時アクティブ
//   2. 期間内なら キャンペーン rate、期間外なら 通常 rate
//   3. 通常 + キャンペーン 共存時、期間中は高い rate、期間外は通常 rate
//   4. LoyaltyRule (ポイントカード提示) でも同じ
//
// 使い方: npx tsx scripts/verify-campaign-rules.ts

import type { Card, Store, StoreRule, LoyaltyRule, PointCard, ConversionEdge } from "../src/domain/types";
import { resolveRate } from "../src/domain/resolveRate";
import { bestLoyalty } from "../src/domain/loyalty";

const card: Card = {
  id: "jal-suica",
  name: "JALカードSuica",
  defaultRate: 0.01,
  defaultCurrencyId: "jal-mile",
};

const store: Store = {
  id: "tsuruha",
  name: "ツルハドラッグ",
  category: "JAL特約店",
};

// 通常ルール: ツルハ (JAL特約店カテゴリ) で 2% (常時)
const permanent: StoreRule = {
  id: "permanent-jal-tokuyaku",
  cardId: "jal-suica",
  category: "JAL特約店",
  rate: 0.02,
  currencyId: "jal-mile",
};

// キャンペーン: ツルハ直接ルールで 5% (2026/06 のみ)
const campaign: StoreRule = {
  id: "campaign-tsuruha-june",
  cardId: "jal-suica",
  storeId: "tsuruha",
  rate: 0.05,
  currencyId: "jal-mile",
  validFrom: "2026-06-01",
  validTo: "2026-06-30",
};

// キャンペーン (validTo のみ): 5% (永遠の昔から〜2026/06/30)
const campaignOpenStart: StoreRule = {
  id: "campaign-open-start",
  cardId: "jal-suica",
  storeId: "tsuruha",
  rate: 0.05,
  currencyId: "jal-mile",
  validTo: "2026-06-30",
};

// 期限切れキャンペーン: 8% だが過去で終了
const expired: StoreRule = {
  id: "expired-campaign",
  cardId: "jal-suica",
  storeId: "tsuruha",
  rate: 0.08,
  currencyId: "jal-mile",
  validTo: "2020-12-31",
};

// 未来開始: 10% だがまだ始まってない
const future: StoreRule = {
  id: "future-campaign",
  cardId: "jal-suica",
  storeId: "tsuruha",
  rate: 0.1,
  currencyId: "jal-mile",
  validFrom: "2030-01-01",
};

const dates = [
  { label: "2026-05-15 (キャンペーン前)", now: new Date("2026-05-15T12:00:00") },
  { label: "2026-06-01 (キャンペーン開始日)", now: new Date("2026-06-01T00:00:00") },
  { label: "2026-06-15 (キャンペーン中)", now: new Date("2026-06-15T12:00:00") },
  { label: "2026-06-30 (キャンペーン最終日 23:59)", now: new Date("2026-06-30T23:59:00") },
  { label: "2026-07-01 (キャンペーン後)", now: new Date("2026-07-01T00:00:00") },
];

console.log("=".repeat(78));
console.log("Scenario 1: 通常ルール (JAL特約店 2%) + キャンペーン (ツルハ 5% 2026/06)");
console.log("=".repeat(78));
console.log("Expected: キャンペーン中=5%, それ以外=2% (カテゴリルールにフォールバック)");
for (const { label, now } of dates) {
  const r = resolveRate(card, "tsuruha", [permanent, campaign], [store], now);
  const validTo = r.source !== "default" ? r.validTo ?? "-" : "-";
  console.log(
    `  ${label.padEnd(40)} → ${(r.rate * 100).toFixed(2)}% (${r.source}, validTo: ${validTo})`,
  );
}

console.log("\n" + "=".repeat(78));
console.log("Scenario 2: validTo のみ (永遠の昔から〜2026/06/30)");
console.log("=".repeat(78));
console.log("Expected: 〜6/30 まで 5%, 7/1 以降 2% (フォールバック)");
for (const { label, now } of dates) {
  const r = resolveRate(card, "tsuruha", [permanent, campaignOpenStart], [store], now);
  console.log(`  ${label.padEnd(40)} → ${(r.rate * 100).toFixed(2)}% (${r.source})`);
}

console.log("\n" + "=".repeat(78));
console.log("Scenario 3: 期限切れ 8% + 未来 10% + 通常 2%");
console.log("=".repeat(78));
console.log("Expected: 全部 2% (期限切れも未来も無視されカテゴリにフォールバック)");
for (const { label, now } of dates) {
  const r = resolveRate(
    card,
    "tsuruha",
    [permanent, expired, future],
    [store],
    now,
  );
  console.log(`  ${label.padEnd(40)} → ${(r.rate * 100).toFixed(2)}% (${r.source})`);
}

console.log("\n" + "=".repeat(78));
console.log("Scenario 4: 期限切れ 8% + 未来 10% + 通常 2% + 現行キャンペーン 5%");
console.log("=".repeat(78));
console.log("Expected: 6月 5%、それ以外 2% (期限切れ/未来は無視)");
for (const { label, now } of dates) {
  const r = resolveRate(
    card,
    "tsuruha",
    [permanent, expired, future, campaign],
    [store],
    now,
  );
  console.log(
    `  ${label.padEnd(40)} → ${(r.rate * 100).toFixed(2)}% (${r.source}, id: ${r.source !== "default" ? r.ruleId : "-"})`,
  );
}

// === LoyaltyRule ===
console.log("\n" + "=".repeat(78));
console.log("Scenario 5: LoyaltyRule (ローソン × Ponta) 通常 0.5% + キャンペーン 2%");
console.log("=".repeat(78));
console.log("Expected: 6月 2%、それ以外 0.5%");
const pontaCard: PointCard = {
  id: "ponta-card",
  name: "Pontaカード",
  currencyId: "ponta-pt",
};
const lawsonStore: Store = { id: "conv-lawson", name: "ローソン", category: "コンビニ" };
const loyaltyPermanent: LoyaltyRule = {
  id: "loy-permanent",
  pointCardId: "ponta-card",
  storeId: "conv-lawson",
  rate: 0.005,
};
const loyaltyCampaign: LoyaltyRule = {
  id: "loy-campaign",
  pointCardId: "ponta-card",
  storeId: "conv-lawson",
  rate: 0.02,
  validFrom: "2026-06-01",
  validTo: "2026-06-30",
};
const edges: ConversionEdge[] = []; // ポイント→ポイント 直接 (経路不要)
for (const { label, now } of dates) {
  const result = bestLoyalty(
    "conv-lawson",
    10000,
    "ponta-pt",
    [pontaCard],
    [loyaltyPermanent, loyaltyCampaign],
    edges,
    undefined,
    now,
  );
  if (!result) {
    console.log(`  ${label.padEnd(40)} → no loyalty (unexpected!)`);
  } else {
    const validTo = result.rule.validTo ?? "-";
    console.log(
      `  ${label.padEnd(40)} → ${(result.rule.rate * 100).toFixed(2)}% (rule id: ${result.rule.id}, validTo: ${validTo})`,
    );
  }
}

console.log("\n" + "=".repeat(78));
console.log("✓ 検証スクリプト完了");
console.log("=".repeat(78));
