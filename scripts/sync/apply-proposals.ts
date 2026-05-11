// sources/proposed-migrations.json の autoApplicable を実コードに反映する。
//
// v1.0 first cut の対応範囲:
//   - addRecord/stores         → ADDED_STORES に追加
//   - addRecord/rules          → ADDED_RULES に追加
//   - addRecord/loyaltyRules   → ADDED_LOYALTY_RULES に追加
//   - addRecord/cards          → ADDED_CARDS に追加
//   - addRecord/paymentApps    → ADDED_PAYMENT_APPS に追加
//   - 上記以外 (updateField / referenceChange / delete) は console.warn して skip
//
// 既存の seed-additions.ts に登録済みの id は重複排除。
// SEED_VERSION は regex で +1 bump。
//
// Usage:
//   npm run sync:apply              # 適用
//   npm run sync:apply -- --dry-run # ファイル変更なし、ログのみ

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AddRecordProposal,
  Proposal,
  ProposalReport,
} from "./types";
import {
  ADDED_CARDS,
  ADDED_LOYALTY_RULES,
  ADDED_PAYMENT_APPS,
  ADDED_RULES,
  ADDED_STORES,
} from "../../src/state/seed-additions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const PROPOSAL_PATH = resolve(REPO_ROOT, "sources/proposed-migrations.json");
const SEED_ADDITIONS_PATH = resolve(REPO_ROOT, "src/state/seed-additions.ts");
const SEED_PATH = resolve(REPO_ROOT, "src/state/seed.ts");

// ───────────────────────────────────────────────────────────────
// CLI
// ───────────────────────────────────────────────────────────────

type CliArgs = { dryRun: boolean };

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      printUsage();
      process.exit(1);
    }
  }
  return { dryRun };
}

function printUsage(): void {
  console.error(
    [
      "Usage: tsx scripts/sync/apply-proposals.ts [--dry-run]",
      "",
      "sources/proposed-migrations.json の autoApplicable を",
      "src/state/seed-additions.ts と src/state/seed.ts に反映します。",
      "",
      "  --dry-run  ファイルを書かず、ログだけ表示",
    ].join("\n"),
  );
}

// ───────────────────────────────────────────────────────────────
// Bucket addRecord proposals by collection
// ───────────────────────────────────────────────────────────────

type Buckets = {
  stores: Record<string, unknown>[];
  rules: Record<string, unknown>[];
  loyaltyRules: Record<string, unknown>[];
  cards: Record<string, unknown>[];
  paymentApps: Record<string, unknown>[];
};

export function bucketProposals(
  proposals: Proposal[],
): { buckets: Buckets; skipped: { type: string; collection: string; count: number }[] } {
  const buckets: Buckets = {
    stores: [],
    rules: [],
    loyaltyRules: [],
    cards: [],
    paymentApps: [],
  };
  const skippedMap = new Map<string, number>();

  for (const p of proposals) {
    if (p.type !== "addRecord") {
      const key = `${p.type}/${p.collection}`;
      skippedMap.set(key, (skippedMap.get(key) ?? 0) + 1);
      continue;
    }
    const ap = p as AddRecordProposal;
    switch (ap.collection) {
      case "stores":
        buckets.stores.push(ap.record);
        break;
      case "rules":
        buckets.rules.push(ap.record);
        break;
      case "loyaltyRules":
        buckets.loyaltyRules.push(ap.record);
        break;
      case "cards":
        buckets.cards.push(ap.record);
        break;
      case "paymentApps":
        buckets.paymentApps.push(ap.record);
        break;
      default: {
        const key = `${p.type}/${ap.collection}`;
        skippedMap.set(key, (skippedMap.get(key) ?? 0) + 1);
      }
    }
  }

  const skipped = Array.from(skippedMap.entries()).map(([key, count]) => {
    const [type, collection] = key.split("/");
    return { type, collection, count };
  });

  return { buckets, skipped };
}

// ───────────────────────────────────────────────────────────────
// Merge with existing additions (dedupe by id)
// ───────────────────────────────────────────────────────────────

type Identifiable = { id?: string };

export function mergeWithExisting<T extends Identifiable>(
  existing: T[],
  newRecords: Record<string, unknown>[],
): { merged: T[]; added: number; skipped: number } {
  const existingIds = new Set(existing.map((x) => x.id).filter(Boolean));
  let added = 0;
  let skipped = 0;
  const newOnes: T[] = [];
  for (const r of newRecords) {
    const id = r.id as string | undefined;
    if (id && existingIds.has(id)) {
      skipped += 1;
      continue;
    }
    newOnes.push(r as unknown as T);
    if (id) existingIds.add(id);
    added += 1;
  }
  return { merged: [...existing, ...newOnes], added, skipped };
}

// ───────────────────────────────────────────────────────────────
// TypeScript code emit
// ───────────────────────────────────────────────────────────────

export function emitObjectLiteral(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return "{}";
  const inner = entries
    .map(([k, v]) => `${quoteKey(k)}: ${JSON.stringify(v)}`)
    .join(", ");
  return `{ ${inner} }`;
}

const SAFE_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function quoteKey(k: string): string {
  return SAFE_IDENT.test(k) ? k : JSON.stringify(k);
}

function emitArrayConst(
  name: string,
  type: string,
  records: Record<string, unknown>[],
): string {
  if (records.length === 0) {
    return `export const ${name}: ${type}[] = [];`;
  }
  const lines = records.map((r) => `  ${emitObjectLiteral(r)},`);
  return `export const ${name}: ${type}[] = [\n${lines.join("\n")}\n];`;
}

export function buildSeedAdditionsContent(buckets: Buckets): string {
  const timestamp = new Date().toISOString();
  return [
    "// ─────────────────────────────────────────────────────────────────────",
    "// AUTO-GENERATED by scripts/sync/apply-proposals.ts — DO NOT EDIT.",
    "// 手書きエントリは seed.ts に直接追加してください。",
    `// Last regenerated: ${timestamp}`,
    "// ─────────────────────────────────────────────────────────────────────",
    "import type {",
    "  Card,",
    "  LoyaltyRule,",
    "  PaymentApp,",
    "  Store,",
    "  StoreRule,",
    "} from \"../domain/types\";",
    "",
    emitArrayConst("ADDED_STORES", "Store", buckets.stores),
    "",
    emitArrayConst("ADDED_RULES", "StoreRule", buckets.rules),
    "",
    emitArrayConst("ADDED_LOYALTY_RULES", "LoyaltyRule", buckets.loyaltyRules),
    "",
    emitArrayConst("ADDED_CARDS", "Card", buckets.cards),
    "",
    emitArrayConst("ADDED_PAYMENT_APPS", "PaymentApp", buckets.paymentApps),
    "",
  ].join("\n");
}

// ───────────────────────────────────────────────────────────────
// SEED_VERSION bump
// ───────────────────────────────────────────────────────────────

const SEED_VERSION_RE = /export const SEED_VERSION = (\d+);/;

export function bumpSeedVersion(seedSource: string): {
  updated: string;
  from: number;
  to: number;
} {
  const m = seedSource.match(SEED_VERSION_RE);
  if (!m) throw new Error("seed.ts に SEED_VERSION の行が見つからない");
  const from = parseInt(m[1], 10);
  const to = from + 1;
  const updated = seedSource.replace(
    SEED_VERSION_RE,
    `export const SEED_VERSION = ${to};`,
  );
  return { updated, from, to };
}

// ───────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(PROPOSAL_PATH)) {
    throw new Error(
      `${PROPOSAL_PATH} が無い。先に \`npm run sync:propose\` を実行してください。`,
    );
  }
  const report = JSON.parse(readFileSync(PROPOSAL_PATH, "utf-8")) as ProposalReport;
  console.log(
    `📥 proposed-migrations.json: auto=${report.summary.autoApplicableCount}, review=${report.summary.needsReviewCount}`,
  );

  if (report.autoApplicable.length === 0) {
    console.log("✋ autoApplicable が 0 件。適用する変更はありません。");
    return;
  }

  // 1. autoApplicable を addRecord ごとに分類
  const { buckets, skipped } = bucketProposals(report.autoApplicable);
  if (skipped.length > 0) {
    console.log("⚠️ 以下は v1.0 first cut では未対応のため skip:");
    for (const s of skipped) {
      console.log(`     ${s.type}/${s.collection}: ${s.count} 件`);
    }
  }

  // 2. 既存 seed-additions.ts とマージ (id 重複は skip)
  const merge = {
    stores: mergeWithExisting(ADDED_STORES, buckets.stores),
    rules: mergeWithExisting(ADDED_RULES, buckets.rules),
    loyaltyRules: mergeWithExisting(ADDED_LOYALTY_RULES, buckets.loyaltyRules),
    cards: mergeWithExisting(ADDED_CARDS, buckets.cards),
    paymentApps: mergeWithExisting(ADDED_PAYMENT_APPS, buckets.paymentApps),
  };
  console.log("📋 merge result (existing + new, deduped by id):");
  console.log(
    `     stores:        +${merge.stores.added} (skipped ${merge.stores.skipped}) → total ${merge.stores.merged.length}`,
  );
  console.log(
    `     rules:         +${merge.rules.added} (skipped ${merge.rules.skipped}) → total ${merge.rules.merged.length}`,
  );
  console.log(
    `     loyaltyRules:  +${merge.loyaltyRules.added} (skipped ${merge.loyaltyRules.skipped}) → total ${merge.loyaltyRules.merged.length}`,
  );
  console.log(
    `     cards:         +${merge.cards.added} (skipped ${merge.cards.skipped}) → total ${merge.cards.merged.length}`,
  );
  console.log(
    `     paymentApps:   +${merge.paymentApps.added} (skipped ${merge.paymentApps.skipped}) → total ${merge.paymentApps.merged.length}`,
  );

  // 3. seed-additions.ts のコンテンツを構築
  const mergedBuckets: Buckets = {
    stores: merge.stores.merged as Record<string, unknown>[],
    rules: merge.rules.merged as Record<string, unknown>[],
    loyaltyRules: merge.loyaltyRules.merged as Record<string, unknown>[],
    cards: merge.cards.merged as Record<string, unknown>[],
    paymentApps: merge.paymentApps.merged as Record<string, unknown>[],
  };
  const newContent = buildSeedAdditionsContent(mergedBuckets);

  // 4. SEED_VERSION bump
  const seedSource = readFileSync(SEED_PATH, "utf-8");
  const { updated: newSeedSource, from, to } = bumpSeedVersion(seedSource);
  console.log(`🔢 SEED_VERSION: ${from} → ${to}`);

  if (args.dryRun) {
    console.log("✋ --dry-run: ファイル書き込み無し");
    return;
  }

  writeFileSync(SEED_ADDITIONS_PATH, newContent);
  console.log(`✓ wrote ${SEED_ADDITIONS_PATH}`);
  writeFileSync(SEED_PATH, newSeedSource);
  console.log(`✓ updated SEED_VERSION in ${SEED_PATH}`);
  console.log("📦 次は npm run build で master.json を再生成、commit してください。");
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error("💥 Error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
