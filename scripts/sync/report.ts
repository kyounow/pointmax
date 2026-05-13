// proposed-migrations.json を読んで Markdown レポートを生成する。
//
// Outputs:
//   sources/AUTO_SUMMARY.md   - 自動マージされる変更のサマリ (commit message 用)
//   sources/REVIEW_QUEUE.md   - 要レビュー項目の人間向け解説 (PR body 用)
//
// Usage:
//   npm run sync:report

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AddRecordProposal,
  Proposal,
  ProposalReport,
  ReviewReason,
  UpdateFieldProposal,
} from "./types";

// ───────────────────────────────────────────────────────────────
// Paths
// ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const PROPOSAL_PATH = resolve(REPO_ROOT, "sources/proposed-migrations.json");
const AUTO_SUMMARY_PATH = resolve(REPO_ROOT, "sources/AUTO_SUMMARY.md");
const REVIEW_QUEUE_PATH = resolve(REPO_ROOT, "sources/REVIEW_QUEUE.md");
const SOURCES_DIR = resolve(REPO_ROOT, "sources");

// ───────────────────────────────────────────────────────────────
// Loader
// ───────────────────────────────────────────────────────────────

function loadReport(): ProposalReport {
  const text = readFileSync(PROPOSAL_PATH, "utf-8");
  return JSON.parse(text) as ProposalReport;
}

// ───────────────────────────────────────────────────────────────
// AUTO_SUMMARY.md generator
// ───────────────────────────────────────────────────────────────

/**
 * Build the auto-merge commit message markdown.
 * Used directly as a git commit message via `git commit -F sources/AUTO_SUMMARY.md`.
 */
export function buildAutoSummary(report: ProposalReport): string {
  const date = new Date(report.generatedAt).toISOString().slice(0, 10);
  const n = report.autoApplicable.length;

  if (n === 0) {
    return [
      `auto-sync: 変更なし (${date})`,
      "",
      "## 統計",
      "- autoApplicable: 0 件",
      `- needsReview: ${report.needsReview.length} 件`,
      `- source 数: ${report.summary.sourcesProcessed}`,
      "",
      `🤖 GitHub Actions weekly sync`,
    ].join("\n");
  }

  // Group autoApplicable by collection
  const byCollection = new Map<string, number>();
  const bySource = new Map<string, Map<string, number>>();

  for (const p of report.autoApplicable) {
    const col = p.collection ?? "unknown";
    byCollection.set(col, (byCollection.get(col) ?? 0) + 1);

    if (!bySource.has(p.sourceId)) bySource.set(p.sourceId, new Map());
    const srcMap = bySource.get(p.sourceId)!;
    srcMap.set(col, (srcMap.get(col) ?? 0) + 1);
  }

  // Detail lines per source
  const detailLines: string[] = [];
  for (const [srcId, colMap] of bySource.entries()) {
    const parts: string[] = [];
    for (const [col, cnt] of colMap.entries()) {
      // For updateField proposals, show field change detail
      const updates = report.autoApplicable.filter(
        (p) =>
          p.sourceId === srcId &&
          p.collection === col &&
          p.type === "updateField",
      ) as UpdateFieldProposal[];
      if (updates.length > 0 && updates.length <= 3) {
        for (const u of updates) {
          const fromStr = typeof u.from === "number" ? (u.from * 100).toFixed(2) + "%" : String(u.from);
          const toStr = typeof u.to === "number" ? (u.to * 100).toFixed(2) + "%" : String(u.to);
          parts.push(`${col}.${u.field} update ${updates.length} 件 (${u.id}: ${fromStr} → ${toStr})`);
        }
      } else {
        parts.push(`${col} +${cnt}`);
      }
    }
    detailLines.push(`- ${srcId}: ${parts.join(", ")}`);
  }

  // Average confidence
  const avgConfidence =
    n > 0
      ? (
          report.autoApplicable.reduce((s, p) => s + p.confidence, 0) / n
        ).toFixed(2)
      : "N/A";

  const lines: string[] = [
    `auto-sync: ${n} 件の変更を自動反映 (${date})`,
    "",
    "## 内訳",
    ...detailLines,
    "",
    "## 統計",
    `- autoApplicable: ${n} 件`,
    `- 平均 confidence: ${avgConfidence}`,
    `- source 数: ${report.summary.sourcesProcessed}`,
    "",
    `🤖 GitHub Actions weekly sync (sync.config.json: maxAutoChangesPerRun=50)`,
  ];

  return lines.join("\n");
}

// ───────────────────────────────────────────────────────────────
// REVIEW_QUEUE.md generator
// ───────────────────────────────────────────────────────────────

const REASON_LABELS: Record<ReviewReason, string> = {
  lowConfidence: "🟡 lowConfidence",
  rateDeltaTooLarge: "🟠 rateDeltaTooLarge",
  rateRatioOutOfRange: "🟠 rateRatioOutOfRange",
  deletion: "🔴 deletion",
  referenceChange: "🟠 referenceChange",
  idCollision: "🟠 idCollision",
  multiSourceConflict: "🔴 multiSourceConflict",
  excludedCategory: "🟠 excludedCategory",
  userBlocked: "⚫ userBlocked",
  selfReportedExclusion: "🟠 selfReportedExclusion",
  unsupportedDateClaim: "🔴 unsupportedDateClaim",
};

const REASON_EXPLANATIONS: Record<ReviewReason, string> = {
  lowConfidence:
    "Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。",
  rateDeltaTooLarge:
    "還元率の絶対値変動が ±10pp を超える。誤抽出の可能性が高い。",
  rateRatioOutOfRange:
    "還元率の倍率が 0.5x〜2x の範囲外。大幅な変化は要確認。",
  deletion:
    "レコードの削除提案。誤削除を防ぐため自動適用しない。",
  referenceChange:
    "通貨 ID / カード ID などの参照フィールドの変更。整合性要確認。",
  idCollision:
    "新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。",
  multiSourceConflict:
    "複数ソースで同じフィールドが矛盾している。どちらが正しいか要判断。",
  excludedCategory:
    "Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。",
  userBlocked:
    "seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。",
  selfReportedExclusion:
    "Gemini 自身が evidenceQuote で「対象外」「見送り」「記載なし」等と表明。Gemini の良心 hallucination 抑制が機能した結果。基本は無視で OK。",
  unsupportedDateClaim:
    "validFrom/validTo が抽出されたが evidenceQuote に日付の根拠 (期間 / YYYY年 / まで 等) が見当たらない。日付の hallucination 疑い。元 URL を直接確認の上採否を判断。",
};

function formatProposalDetail(p: Proposal): string {
  const lines: string[] = [];

  if (p.type === "addRecord") {
    const ap = p as AddRecordProposal;
    const rec = ap.record;
    lines.push(`#### \`${p.type}/${p.collection}\` from \`${p.sourceId}\``);
    // Show key record fields
    const recStr = Object.entries(rec)
      .filter(([k]) => k !== "notes")
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(", ");
    lines.push(`- 内容: \`${recStr}\``);
    if (rec.notes) lines.push(`- notes: ${String(rec.notes)}`);
  } else if (p.type === "updateField") {
    const up = p as UpdateFieldProposal;
    const fromStr =
      typeof up.from === "number"
        ? `${(up.from * 100).toFixed(3)}%`
        : JSON.stringify(up.from);
    const toStr =
      typeof up.to === "number"
        ? `${(up.to * 100).toFixed(3)}%`
        : JSON.stringify(up.to);
    lines.push(`#### \`${p.type}/${p.collection}\` \`${up.id}\` from \`${p.sourceId}\``);
    lines.push(`- フィールド: \`${up.field}\``);
    lines.push(`- 変更: \`${fromStr}\` → \`${toStr}\``);
  } else if (p.type === "delete") {
    lines.push(`#### \`${p.type}/${p.collection}\` \`${(p as { id: string }).id}\` from \`${p.sourceId}\``);
  } else if (p.type === "referenceChange") {
    const rp = p as { type: string; collection: string; id: string; field: string; from: unknown; to: unknown; sourceId: string };
    lines.push(`#### \`${p.type}/${p.collection}\` \`${rp.id}\` from \`${p.sourceId}\``);
    lines.push(`- フィールド: \`${rp.field}\``);
    lines.push(`- 変更: \`${JSON.stringify(rp.from)}\` → \`${JSON.stringify(rp.to)}\``);
  }

  lines.push(`- confidence: ${p.confidence.toFixed(2)}`);
  if (p.evidence?.evidenceQuote) {
    lines.push(`- 評価: \`evidenceQuote="${p.evidence.evidenceQuote.slice(0, 120)}"\``);
  }
  lines.push(`- 対応案: 手動で seed ファイルに反映するか、不要なら無視`);

  return lines.join("\n");
}

/**
 * Build the review queue PR body markdown.
 */
export function buildReviewQueue(report: ProposalReport): string {
  const date = new Date(report.generatedAt).toISOString().slice(0, 10);
  const n = report.needsReview.length;

  // Group by reviewReason
  const byReason = new Map<ReviewReason, Proposal[]>();
  for (const p of report.needsReview) {
    const reason = (p.reviewReason ?? "lowConfidence") as ReviewReason;
    if (!byReason.has(reason)) byReason.set(reason, []);
    byReason.get(reason)!.push(p);
  }

  // Per-source counts
  const bySource = new Map<string, number>();
  for (const p of report.needsReview) {
    bySource.set(p.sourceId, (bySource.get(p.sourceId) ?? 0) + 1);
  }
  const sourceStr = [...bySource.entries()]
    .map(([src, cnt]) => `${src.replace(/-partners$/, "")}=${cnt}`)
    .join(", ");

  // Reason summary
  const reasonSummary = [...byReason.entries()]
    .map(([r, ps]) => `${r}=${ps.length}`)
    .join(", ");

  const lines: string[] = [
    `# 📋 週次マスタ同期: 要レビュー項目`,
    "",
    `(自動生成 ${date}。merge 前に項目を確認してください。)`,
    "",
    "## サマリ",
    `- 要レビュー: ${n} 件`,
    `- ソース別: ${sourceStr || "なし"}`,
    `- 主な理由: ${reasonSummary || "なし"}`,
    "",
  ];

  if (n === 0) {
    lines.push("## 項目");
    lines.push("");
    lines.push("要レビュー項目はありません。");
  } else {
    lines.push("## 項目 (理由別)");
    lines.push("");

    // Render each reason group
    // Sort by priority: lowConfidence first, then others, then userBlocked last
    const reasonOrder: ReviewReason[] = [
      "unsupportedDateClaim", // 🔴 hallucination 疑い、最優先で目を通す
      "rateDeltaTooLarge",
      "rateRatioOutOfRange",
      "multiSourceConflict",
      "referenceChange",
      "deletion",
      "lowConfidence",
      "idCollision",
      "excludedCategory",
      "selfReportedExclusion",
      "userBlocked",
    ];

    for (const reason of reasonOrder) {
      const items = byReason.get(reason);
      if (!items || items.length === 0) continue;

      const label = REASON_LABELS[reason] ?? reason;
      const explanation = REASON_EXPLANATIONS[reason] ?? "";

      lines.push(`### ${label} (${items.length} 件)`);
      lines.push(`理由: ${explanation}`);
      lines.push("");
      lines.push("<details><summary>展開</summary>");
      lines.push("");

      // Show up to 20 items per reason to keep PR body manageable
      const shown = items.slice(0, 20);
      const hidden = items.length - shown.length;

      for (const p of shown) {
        lines.push(formatProposalDetail(p));
        lines.push("");
      }

      if (hidden > 0) {
        lines.push(`_他 ${hidden} 件は省略 (sources/proposed-migrations.json を参照)_`);
        lines.push("");
      }

      lines.push("</details>");
      lines.push("");
    }
  }

  lines.push("## 操作");
  lines.push(
    "- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)",
  );
  lines.push(
    "- 手動キュレートしたい場合は、このブランチに追加 commit してから merge",
  );
  lines.push("- 不要なら **close** で次週まで保留");

  return lines.join("\n");
}

// ───────────────────────────────────────────────────────────────
// Main (CLI entry)
// ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`📥 reading ${PROPOSAL_PATH} ...`);
  const report = loadReport();
  console.log(
    `   autoApplicable: ${report.autoApplicable.length}, needsReview: ${report.needsReview.length}`,
  );

  await mkdir(SOURCES_DIR, { recursive: true });

  const autoMd = buildAutoSummary(report);
  await writeFile(AUTO_SUMMARY_PATH, autoMd, "utf-8");
  console.log(`✓ wrote ${AUTO_SUMMARY_PATH} (${autoMd.length} chars)`);

  const reviewMd = buildReviewQueue(report);
  await writeFile(REVIEW_QUEUE_PATH, reviewMd, "utf-8");
  console.log(`✓ wrote ${REVIEW_QUEUE_PATH} (${reviewMd.length} chars)`);
}

// CLI として実行された場合のみ main を呼ぶ
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    console.error("💥 Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
