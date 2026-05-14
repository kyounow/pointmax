// Filter script for PR #3 autoApplicable items.
//
// フィルタ方針:
//   - stores (81 件): 全件 skip (新規店舗マスタ拡大は別議題)
//   - loyaltyRules (113 件):
//     storeId が現在の seed (SEED_STORES + ADDED_STORES) に存在するもの only keep
//     storeId が既存にないものは skip (新規 store に紐づくはずだったが stores を skip したため)
//
// Usage:
//   tsx scripts/sync/filter-auto-rakuten.ts

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProposalReport } from "./types";
import { SEED_STORES } from "../../src/state/seed-data-stores";
import { ADDED_STORES } from "../../src/state/seed-additions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const PROPOSAL_PATH = resolve(REPO_ROOT, "sources/proposed-migrations.json");

function main(): void {
  // 1. 現在の seed の store id 集合を構築
  const existingStoreIds = new Set([
    ...SEED_STORES.map((s) => s.id),
    ...ADDED_STORES.map((s) => s.id),
  ]);
  console.log(`✅ 既存 store 件数: ${existingStoreIds.size}`);

  // 2. proposed-migrations.json を読む
  const m = JSON.parse(readFileSync(PROPOSAL_PATH, "utf-8")) as ProposalReport;
  const before = m.autoApplicable.length;
  console.log(`📥 autoApplicable (before): ${before}`);

  // 3. フィルタ
  const filtered = m.autoApplicable.filter((p) => {
    if (p.collection === "stores") return false; // 全 skip
    if (p.collection === "loyaltyRules") {
      const storeId = (p as { record: { storeId?: string } }).record?.storeId;
      return storeId !== undefined && existingStoreIds.has(storeId);
    }
    return false; // その他 (rules / cards 等) も skip
  });

  const after = filtered.length;
  const skippedStores = m.autoApplicable.filter((p) => p.collection === "stores").length;
  const skippedLoyaltyNoStore = m.autoApplicable.filter((p) => {
    if (p.collection !== "loyaltyRules") return false;
    const storeId = (p as { record: { storeId?: string } }).record?.storeId;
    return !storeId || !existingStoreIds.has(storeId);
  }).length;

  console.log(`🔴 skip: stores=${skippedStores}, loyaltyRules(unknown storeId)=${skippedLoyaltyNoStore}`);
  console.log(`✅ keep: loyaltyRules(既存 store)=${after}`);
  console.log(`Filter: ${before} → ${after} 件`);

  // kept storeIds を表示
  const keptStoreIds = [...new Set(filtered.map((p) => (p as { record: { storeId?: string } }).record?.storeId))].sort();
  console.log(`📋 kept storeIds (${keptStoreIds.length}):`, keptStoreIds.join(", "));

  // 4. 書き戻し
  m.autoApplicable = filtered;
  m.summary.autoApplicableCount = after;

  writeFileSync(PROPOSAL_PATH, JSON.stringify(m, null, 2));
  console.log(`✓ wrote ${PROPOSAL_PATH}`);
}

main();
