// sources/proposed-migrations.json の autoApplicable を実コードに反映する。
//
// 対応範囲:
//   - addRecord/<collection>   → seed-additions.ts の ADDED_* に追加
//   - updateField/programs (rate / validFrom / validTo)
//                              → seed-additions.ts の PROGRAM_OVERRIDES に追加
//                                (手書き seed-data-programs.ts は書き換えず、
//                                 seed() 合成時に部分上書き。改善計画 B-1/B-2)
//   - 上記以外 (delete / referenceChange / 他 collection の updateField) は
//     console.warn して skip (delete は Phase 5 の removals で対応予定)
//
// 既存の seed-additions.ts に登録済みの id は重複排除。
// SEED_VERSION には触れない: 版数は手動リリース粒度。cron は
// seed-additions.ts への add-only のみ。既存ユーザーへの通知は
// SyncUpdateModal が差分検知で担う (SEED_VERSION 非依存)。
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
  UpdateFieldProposal,
} from "./types";
import { OVERRIDABLE_PROGRAM_FIELDS } from "./types";
import {
  ADDED_CARDS,
  ADDED_LOYALTY_RULES,
  ADDED_MEMBERSHIPS,
  ADDED_PAYMENT_APPS,
  ADDED_PROGRAMS,
  ADDED_STORES,
  PROGRAM_OVERRIDES,
} from "../../src/state/seed-additions";
import type { ProgramOverride } from "../../src/state/seed-overrides";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const PROPOSAL_PATH = resolve(REPO_ROOT, "sources/proposed-migrations.json");
const SEED_ADDITIONS_PATH = resolve(REPO_ROOT, "src/state/seed-additions.ts");

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
      "src/state/seed-additions.ts に反映します (SEED_VERSION には触れません)。",
      "",
      "  --dry-run  ファイルを書かず、ログだけ表示",
    ].join("\n"),
  );
}

// ───────────────────────────────────────────────────────────────
// Bucket addRecord proposals by collection
// ───────────────────────────────────────────────────────────────

export type Buckets = {
  stores: Record<string, unknown>[];
  loyaltyRules: Record<string, unknown>[];
  cards: Record<string, unknown>[];
  paymentApps: Record<string, unknown>[];
  programs: Record<string, unknown>[];
  memberships: Record<string, unknown>[];
  // updateField/programs (rate / validFrom / validTo) 由来の部分上書き。
  // seed() が合成の最後に適用する (src/state/seed-overrides.ts)。
  programOverrides: ProgramOverride[];
};

export function bucketProposals(
  proposals: Proposal[],
): { buckets: Buckets; skipped: { type: string; collection: string; count: number }[] } {
  const buckets: Buckets = {
    stores: [],
    loyaltyRules: [],
    cards: [],
    paymentApps: [],
    programs: [],
    memberships: [],
    programOverrides: [],
  };
  const skippedMap = new Map<string, number>();

  for (const p of proposals) {
    // updateField/programs の override 対象フィールドは PROGRAM_OVERRIDES へ
    if (
      p.type === "updateField" &&
      p.collection === "programs" &&
      OVERRIDABLE_PROGRAM_FIELDS.has((p as UpdateFieldProposal).field)
    ) {
      const up = p as UpdateFieldProposal;
      buckets.programOverrides.push({
        id: up.id,
        [up.field]: up.to,
      } as ProgramOverride);
      continue;
    }
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
      case "loyaltyRules":
        buckets.loyaltyRules.push(ap.record);
        break;
      case "cards":
        buckets.cards.push(ap.record);
        break;
      case "paymentApps":
        buckets.paymentApps.push(ap.record);
        break;
      case "programs":
        buckets.programs.push(ap.record);
        break;
      case "memberships":
        buckets.memberships.push(ap.record);
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

// Merge StoreProgramMembership records (dedupe by programId+storeId composite key)
type MembershipLike = { programId?: string; storeId?: string };

export function mergeMemberships<T extends MembershipLike>(
  existing: T[],
  newRecords: Record<string, unknown>[],
): { merged: T[]; added: number; skipped: number } {
  const existingKeys = new Set(
    existing.map((m) => `${m.programId}|${m.storeId}`).filter((k) => !k.startsWith("|")),
  );
  let added = 0;
  let skipped = 0;
  const newOnes: T[] = [];
  for (const r of newRecords) {
    const key = `${r.programId}|${r.storeId}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    newOnes.push(r as unknown as T);
    existingKeys.add(key);
    added += 1;
  }
  return { merged: [...existing, ...newOnes], added, skipped };
}

// PROGRAM_OVERRIDES のマージ: 同 id はフィールド単位で後勝ち
// (新しい cron 値が古い override を上書き。別フィールドは共存)。
export function mergeOverrides(
  existing: ProgramOverride[],
  incoming: ProgramOverride[],
): { merged: ProgramOverride[]; added: number; updated: number } {
  const byId = new Map<string, ProgramOverride>();
  for (const o of existing) {
    const prev = byId.get(o.id);
    byId.set(o.id, prev ? { ...prev, ...o } : { ...o });
  }
  let added = 0;
  let updated = 0;
  for (const o of incoming) {
    const prev = byId.get(o.id);
    if (prev) {
      byId.set(o.id, { ...prev, ...o });
      updated += 1;
    } else {
      byId.set(o.id, { ...o });
      added += 1;
    }
  }
  return { merged: [...byId.values()], added, updated };
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
    "  BenefitProgram,",
    "  Card,",
    "  LoyaltyRule,",
    "  PaymentApp,",
    "  Store,",
    "  StoreProgramMembership,",
    "} from \"../domain/types\";",
    "import type { ProgramOverride } from \"./seed-overrides\";",
    "",
    emitArrayConst("ADDED_STORES", "Store", buckets.stores),
    "",
    emitArrayConst("ADDED_LOYALTY_RULES", "LoyaltyRule", buckets.loyaltyRules),
    "",
    emitArrayConst("ADDED_CARDS", "Card", buckets.cards),
    "",
    emitArrayConst("ADDED_PAYMENT_APPS", "PaymentApp", buckets.paymentApps),
    "",
    emitArrayConst("ADDED_PROGRAMS", "BenefitProgram", buckets.programs),
    "",
    emitArrayConst("ADDED_MEMBERSHIPS", "StoreProgramMembership", buckets.memberships),
    "",
    emitArrayConst(
      "PROGRAM_OVERRIDES",
      "ProgramOverride",
      buckets.programOverrides as unknown as Record<string, unknown>[],
    ),
    "",
  ].join("\n");
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

  // 1. autoApplicable を addRecord / programOverride ごとに分類
  const { buckets, skipped } = bucketProposals(report.autoApplicable);
  if (skipped.length > 0) {
    console.log("⚠️ 以下は実書き込み経路が無いため skip (delete は Phase 5 で対応予定):");
    for (const s of skipped) {
      console.log(`     ${s.type}/${s.collection}: ${s.count} 件`);
    }
  }

  // 2. 既存 seed-additions.ts とマージ (id 重複は skip / override は後勝ち)
  const merge = {
    stores: mergeWithExisting(ADDED_STORES, buckets.stores),
    loyaltyRules: mergeWithExisting(ADDED_LOYALTY_RULES, buckets.loyaltyRules),
    cards: mergeWithExisting(ADDED_CARDS, buckets.cards),
    paymentApps: mergeWithExisting(ADDED_PAYMENT_APPS, buckets.paymentApps),
    programs: mergeWithExisting(ADDED_PROGRAMS, buckets.programs),
    memberships: mergeMemberships(ADDED_MEMBERSHIPS, buckets.memberships),
  };
  const overrideMerge = mergeOverrides(PROGRAM_OVERRIDES, buckets.programOverrides);
  console.log("📋 merge result (existing + new, deduped by id):");
  console.log(
    `     stores:        +${merge.stores.added} (skipped ${merge.stores.skipped}) → total ${merge.stores.merged.length}`,
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
  console.log(
    `     programs:      +${merge.programs.added} (skipped ${merge.programs.skipped}) → total ${merge.programs.merged.length}`,
  );
  console.log(
    `     memberships:   +${merge.memberships.added} (skipped ${merge.memberships.skipped}) → total ${merge.memberships.merged.length}`,
  );
  console.log(
    `     overrides:     +${overrideMerge.added} (updated ${overrideMerge.updated}) → total ${overrideMerge.merged.length}`,
  );

  // 3. seed-additions.ts のコンテンツを構築
  const mergedBuckets: Buckets = {
    stores: merge.stores.merged as Record<string, unknown>[],
    loyaltyRules: merge.loyaltyRules.merged as Record<string, unknown>[],
    cards: merge.cards.merged as Record<string, unknown>[],
    paymentApps: merge.paymentApps.merged as Record<string, unknown>[],
    programs: merge.programs.merged as Record<string, unknown>[],
    memberships: merge.memberships.merged as Record<string, unknown>[],
    programOverrides: overrideMerge.merged,
  };
  const newContent = buildSeedAdditionsContent(mergedBuckets);

  if (args.dryRun) {
    console.log("✋ --dry-run: ファイル書き込み無し");
    return;
  }

  writeFileSync(SEED_ADDITIONS_PATH, newContent);
  console.log(`✓ wrote ${SEED_ADDITIONS_PATH}`);
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
