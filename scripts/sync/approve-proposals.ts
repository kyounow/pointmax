// needsReview の proposal を ID 指定で seed-additions.ts に選択適用する CLI。
// 「review queue の承認 = seed ファイル手編集」だった運用を
// 「ID を列挙して 1 コマンド」に置き換える (改善計画 Phase 2 / B-4)。
//
// Usage:
//   npm run sync:approve -- --list                 # needsReview 一覧を ID 付きで表示
//   npm run sync:approve -- <ID> [<ID> ...]        # 指定項目を seed-additions.ts に適用
//   npm run sync:approve -- <ID> --dry-run         # 書き込まずに内容確認
//
// ID は sync:propose が各 proposal に付与する安定 ID (REVIEW_QUEUE.md の
// 各項目見出し / --list で確認)。適用すると:
//   1. seed-additions.ts を再生成 (apply-proposals と同じ writer / dedupe)
//   2. proposed-migrations.json の needsReview から除去し manuallyApproved へ移動
//   3. REVIEW_QUEUE.md を残件で再生成
// 適用後は `npm test && npm run build` を確認して commit すること。
//
// 対応 type:
//   - addRecord 全般 (ADDED_* へ)
//   - updateField/programs の rate / validFrom / validTo (PROGRAM_OVERRIDES へ。
//     キャンペーンの率改定・期間延長の承認経路、Phase 4 override layer)
//   - delete/programs (REMOVED_PROGRAM_IDS = tombstone へ。期限切れキャンペーン
//     削除の承認経路、Phase 5。seed() が cascade 除外、mergeSeed が既存ユーザー
//     からも除去。手書き seed ファイルの物理削除は不要)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Proposal, ProposalReport } from "./types";
import { computeProposalId, isApplicableProposal } from "./types";
import {
  bucketProposals,
  buildSeedAdditionsContent,
  mergeMemberships,
  mergeOverrides,
  mergeRemovals,
  mergeWithExisting,
  pruneRemovedFromBuckets,
  type Buckets,
} from "./apply-proposals";
import { buildReviewQueue } from "./report";
import {
  ADDED_CARDS,
  ADDED_MEMBERSHIPS,
  ADDED_PAYMENT_APPS,
  ADDED_PROGRAMS,
  ADDED_STORES,
  PROGRAM_OVERRIDES,
  REMOVED_PROGRAM_IDS,
} from "../../src/state/seed-additions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const PROPOSAL_PATH = resolve(REPO_ROOT, "sources/proposed-migrations.json");
const SEED_ADDITIONS_PATH = resolve(REPO_ROOT, "src/state/seed-additions.ts");
const REVIEW_QUEUE_PATH = resolve(REPO_ROOT, "sources/REVIEW_QUEUE.md");

// ───────────────────────────────────────────────────────────────
// CLI parsing
// ───────────────────────────────────────────────────────────────

type CliArgs = { ids: string[]; list: boolean; dryRun: boolean };

function parseArgs(argv: string[]): CliArgs {
  const ids: string[] = [];
  let list = false;
  let dryRun = false;
  for (const a of argv) {
    if (a === "--list") list = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    } else if (a.startsWith("--")) {
      console.error(`unknown flag: ${a}`);
      printUsage();
      process.exit(1);
    } else {
      // カンマ区切り (`a,b,c`) と空白区切りの両方を受ける
      for (const part of a.split(",")) {
        const t = part.trim();
        if (t) ids.push(t);
      }
    }
  }
  return { ids, list, dryRun };
}

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  npm run sync:approve -- --list                 needsReview 一覧を ID 付きで表示",
      "  npm run sync:approve -- <ID> [<ID> ...]        指定項目を seed-additions.ts に適用",
      "  npm run sync:approve -- <ID> --dry-run         書き込まずに内容確認",
      "",
      "ID は REVIEW_QUEUE.md の各項目見出し先頭 (例: pro-1a2b3c4d5e) か --list で確認。",
      "対応 type: addRecord 全般 + updateField/programs (rate/validFrom/validTo)",
      "         + delete/programs (期限切れキャンペーン削除 = tombstone)。",
    ].join("\n"),
  );
}

// ───────────────────────────────────────────────────────────────
// Pure helpers (テスト対象)
// ───────────────────────────────────────────────────────────────

export type ApproveSelection = {
  /** 適用対象 (isApplicableProposal を満たし needsReview に存在) */
  found: Proposal[];
  /** needsReview に見つからなかった指定 ID */
  missing: string[];
  /** 見つかったが実書き込み経路の無い type/field で未対応 */
  unsupported: Proposal[];
};

export function proposalIdOf(p: Proposal): string {
  return p.proposalId ?? computeProposalId(p);
}

export function selectProposalsByIds(
  report: ProposalReport,
  ids: string[],
): ApproveSelection {
  const byId = new Map<string, Proposal>();
  for (const p of report.needsReview) {
    byId.set(proposalIdOf(p), p);
  }
  const found: Proposal[] = [];
  const missing: string[] = [];
  const unsupported: Proposal[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue; // 同一 ID の重複指定は 1 回として扱う
    seen.add(id);
    const p = byId.get(id);
    if (p === undefined) {
      missing.push(id);
      continue;
    }
    if (!isApplicableProposal(p)) {
      unsupported.push(p);
      continue;
    }
    found.push(p);
  }
  return { found, missing, unsupported };
}

// 承認済み項目を needsReview から除去し manuallyApproved に移動した
// 新しい ProposalReport を返す (summary の件数も更新)。
export function moveToManuallyApproved(
  report: ProposalReport,
  approved: Proposal[],
): ProposalReport {
  const approvedIds = new Set(approved.map(proposalIdOf));
  const remaining = report.needsReview.filter(
    (p) => !approvedIds.has(proposalIdOf(p)),
  );
  return {
    ...report,
    needsReview: remaining,
    manuallyApproved: [...(report.manuallyApproved ?? []), ...approved],
    summary: {
      ...report.summary,
      needsReviewCount: remaining.length,
    },
  };
}

// --list 用の 1 行サマリ。
export function formatListLine(p: Proposal): string {
  const pid = proposalIdOf(p);
  let desc: string;
  if (p.type === "addRecord") {
    const rec = p.record as Record<string, unknown>;
    desc =
      (rec.id as string | undefined) ??
      (rec.programId !== undefined || rec.storeId !== undefined
        ? `${rec.programId ?? "?"}|${rec.storeId ?? "?"}`
        : JSON.stringify(rec).slice(0, 40));
    const name = rec.name as string | undefined;
    if (name) desc += ` (${name})`;
  } else if (p.type === "updateField" || p.type === "referenceChange") {
    desc = `${(p as { id: string }).id}.${(p as { field: string }).field}`;
  } else {
    desc = (p as { id: string }).id;
  }
  const reason = p.reviewReason ?? "-";
  const approvable = isApplicableProposal(p) ? "  " : "✋"; // ✋ = sync:approve 未対応 type/field
  return `${pid}  ${approvable}${p.type}/${p.collection}  [${reason}]  ${desc}  <${p.sourceId}>`;
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
  const report = JSON.parse(
    readFileSync(PROPOSAL_PATH, "utf-8"),
  ) as ProposalReport;

  if (args.list) {
    console.log(
      `📋 needsReview: ${report.needsReview.length} 件 (generatedAt ${report.generatedAt})`,
    );
    // reviewReason → collection でソートして眺めやすく
    const sorted = [...report.needsReview].sort((a, b) => {
      const ra = a.reviewReason ?? "";
      const rb = b.reviewReason ?? "";
      if (ra !== rb) return ra < rb ? -1 : 1;
      return a.collection < b.collection ? -1 : a.collection > b.collection ? 1 : 0;
    });
    for (const p of sorted) console.log(`  ${formatListLine(p)}`);
    if (report.manuallyApproved?.length) {
      console.log(`✅ manuallyApproved (適用済): ${report.manuallyApproved.length} 件`);
    }
    console.log(
      "\n承認: npm run sync:approve -- <ID> [<ID> ...]   (✋ 付きの type は未対応)",
    );
    return;
  }

  if (args.ids.length === 0) {
    printUsage();
    process.exit(1);
  }

  const sel = selectProposalsByIds(report, args.ids);

  // 全件 or 中止 (部分適用は operator の意図とズレた seed を作りやすい)
  if (sel.missing.length > 0) {
    console.error(`💥 needsReview に見つからない ID: ${sel.missing.join(", ")}`);
    console.error(
      "   `npm run sync:approve -- --list` で現在の ID を確認してください " +
        "(内容が変わると ID も変わります。古い REVIEW_QUEUE.md の ID は失効している可能性)",
    );
    process.exit(1);
  }
  if (sel.unsupported.length > 0) {
    console.error(
      "💥 以下は sync:approve 未対応の type/field です " +
        "(対応: addRecord 全般 / updateField/programs の rate/validFrom/validTo / delete/programs):",
    );
    for (const p of sel.unsupported) {
      console.error(`   ${proposalIdOf(p)}  ${p.type}/${p.collection}`);
    }
    console.error("   未対応分は手動で seed ファイルを編集してください。");
    process.exit(1);
  }
  if (sel.found.length === 0) {
    console.error("💥 適用対象が 0 件です。");
    process.exit(1);
  }

  console.log(`📥 承認対象: ${sel.found.length} 件`);
  for (const p of sel.found) {
    console.log(`  ${formatListLine(p)}`);
    if (p.reviewReason === "userBlocked") {
      console.log(
        "  ⚠️ userBlocked 項目です。src/state/seed-blocklist.ts から該当 ID を外さないと" +
          "次回 cron で再び除外提案されます",
      );
    }
  }

  // apply-proposals と同じ bucket → merge → emit 経路で seed-additions.ts を再生成
  const { buckets } = bucketProposals(sel.found);
  const merge = {
    stores: mergeWithExisting(ADDED_STORES, buckets.stores),
    cards: mergeWithExisting(ADDED_CARDS, buckets.cards),
    paymentApps: mergeWithExisting(ADDED_PAYMENT_APPS, buckets.paymentApps),
    programs: mergeWithExisting(ADDED_PROGRAMS, buckets.programs),
    memberships: mergeMemberships(ADDED_MEMBERSHIPS, buckets.memberships),
  };
  const overrideMerge = mergeOverrides(PROGRAM_OVERRIDES, buckets.programOverrides);
  const removalMerge = mergeRemovals(REMOVED_PROGRAM_IDS, buckets.removedProgramIds);
  const added = Object.entries(merge)
    .map(([k, v]) => [k, v.added] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k} +${n}`)
    .join(", ");
  const overrideStr =
    overrideMerge.added + overrideMerge.updated > 0
      ? `, overrides +${overrideMerge.added}/upd ${overrideMerge.updated}`
      : "";
  const removalStr =
    removalMerge.added > 0 ? `, removals +${removalMerge.added}` : "";
  const skipped = Object.values(merge).reduce((s, v) => s + v.skipped, 0);
  console.log(
    `📋 seed-additions 反映: ${added || "なし"}${overrideStr}${removalStr}${skipped > 0 ? ` (既存重複 skip ${skipped})` : ""}`,
  );

  if (args.dryRun) {
    console.log("✋ --dry-run: ファイル書き込み無し");
    return;
  }

  const mergedBuckets: Buckets = pruneRemovedFromBuckets({
    stores: merge.stores.merged as Record<string, unknown>[],
    cards: merge.cards.merged as Record<string, unknown>[],
    paymentApps: merge.paymentApps.merged as Record<string, unknown>[],
    programs: merge.programs.merged as Record<string, unknown>[],
    memberships: merge.memberships.merged as Record<string, unknown>[],
    programOverrides: overrideMerge.merged,
    removedProgramIds: removalMerge.merged,
  });
  writeFileSync(SEED_ADDITIONS_PATH, buildSeedAdditionsContent(mergedBuckets));
  console.log(`✓ wrote ${SEED_ADDITIONS_PATH}`);

  const updated = moveToManuallyApproved(report, sel.found);
  writeFileSync(PROPOSAL_PATH, JSON.stringify(updated, null, 2));
  console.log(
    `✓ wrote ${PROPOSAL_PATH} (needsReview ${report.needsReview.length} → ${updated.needsReview.length}, manuallyApproved +${sel.found.length})`,
  );

  writeFileSync(REVIEW_QUEUE_PATH, buildReviewQueue(updated));
  console.log(`✓ wrote ${REVIEW_QUEUE_PATH} (残件で再生成)`);

  console.log(
    "📦 次は `npm test && npm run build` で整合確認のうえ commit してください。",
  );
  console.log(
    "⚠ このブランチ (chore/sync-review-queue) 上の commit は次回 cron でブランチが" +
      "再構築されると失われます。approve 後は速やかに PR をマージしてください。",
  );
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
