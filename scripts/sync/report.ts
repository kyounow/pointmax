// proposed-migrations.json を読んで Markdown レポートを生成する。
//
// Outputs:
//   sources/AUTO_SUMMARY.md   - 自動マージされる変更のサマリ (commit message 用)
//   sources/REVIEW_QUEUE.md   - 要レビュー項目の人間向け解説 (PR body 用)
//
// Usage:
//   npm run sync:report

import { readFileSync, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import type {
  AddRecordProposal,
  Proposal,
  ProposalReport,
  RegistryFile,
  ReviewReason,
  SyncHistoryEntry,
  SyncHistoryFile,
  SyncHistoryItem,
  SyncHistorySourceCount,
  UpdateFieldProposal,
} from "./types";
import { SYNC_HISTORY_MAX_ENTRIES } from "./types";
import { seed } from "../../src/state/seed";

// ───────────────────────────────────────────────────────────────
// Paths
// ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const PROPOSAL_PATH = resolve(REPO_ROOT, "sources/proposed-migrations.json");
const AUTO_SUMMARY_PATH = resolve(REPO_ROOT, "sources/AUTO_SUMMARY.md");
const REVIEW_QUEUE_PATH = resolve(REPO_ROOT, "sources/REVIEW_QUEUE.md");
const SYNC_HISTORY_JSON_PATH = resolve(REPO_ROOT, "sources/SYNC_HISTORY.json");
const SYNC_HISTORY_MD_PATH = resolve(REPO_ROOT, "sources/SYNC_HISTORY.md");
const REGISTRY_PATH = resolve(REPO_ROOT, "sources/registry.yaml");
const SOURCES_DIR = resolve(REPO_ROOT, "sources");

// ───────────────────────────────────────────────────────────────
// Japanese label resolver (SYNC_HISTORY 用)
// ───────────────────────────────────────────────────────────────
// 自動マージ履歴を「prog-x → store-y」ではなく「楽天ポイントカード提示 → 幸楽苑」
// と日本語名で表示するため、seed と registry.yaml から ID→名前を解決する。
// AUTO_SUMMARY.md (commit message) は影響を抑えるため従来 slug ベースを温存。

type LabelResolver = {
  store: (id: string) => string;
  program: (id: string) => string;
  currency: (id: string) => string;
  card: (id: string) => string;
  paymentApp: (id: string) => string;
  pointCard: (id: string) => string;
  source: (id: string) => string;
};

const COLLECTION_LABELS: Record<string, string> = {
  stores: "店舗",
  memberships: "提携店舗",
  programs: "プログラム",
  campaigns: "キャンペーン",
  loyaltyRules: "ポイントカード提示",
  cards: "カード",
  paymentApps: "決済アプリ",
  pointCards: "ポイントカード",
  currencies: "通貨",
  edges: "交換ルート",
};

function collectionLabel(collection: string): string {
  return COLLECTION_LABELS[collection] ?? collection;
}

function loadRegistry(): RegistryFile | null {
  if (!existsSync(REGISTRY_PATH)) return null;
  try {
    const text = readFileSync(REGISTRY_PATH, "utf-8");
    const data = parseYaml(text) as RegistryFile;
    if (!data || !Array.isArray(data.sources)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * seed + registry.yaml から ID→Japanese 名解決の lookup を構築する。
 * 第 2 引数 `sameRunAutoProposals` を渡すと、同 run で auto-merge 予定の
 * 新規 programs/stores/cards 等の name も lookup map に注入される。
 * これにより cron が新規 program を auto-merge する run の SYNC_HISTORY
 * summary が「prog-X → 店名」ではなく「program 名 → 店名」で日本語化される。
 */
export function buildLabelResolver(
  sameRunAutoProposals: Proposal[] = [],
): LabelResolver {
  const s = seed();
  const sources = loadRegistry()?.sources ?? [];
  const storeMap = new Map(s.stores.map((x) => [x.id, x.name]));
  const programMap = new Map(s.programs.map((x) => [x.id, x.name]));
  const currencyMap = new Map(s.currencies.map((x) => [x.id, x.name]));
  const cardMap = new Map(s.cards.map((x) => [x.id, x.name]));
  const paymentAppMap = new Map(s.paymentApps.map((x) => [x.id, x.name]));
  const pointCardMap = new Map(s.pointCards.map((x) => [x.id, x.name]));
  const sourceMap = new Map(sources.map((x) => [x.id, x.label]));

  // 同 run の auto 候補も lookup に注入 (新規 program/store が同時に追加される
  // 場合に summary を日本語化するため)。既存 seed の値が優先 (上書きしない)。
  for (const p of sameRunAutoProposals) {
    if (p.type !== "addRecord") continue;
    const rec = (p as { record: Record<string, unknown> }).record;
    const id = typeof rec.id === "string" ? rec.id : null;
    const name = typeof rec.name === "string" ? rec.name : null;
    if (!id || !name) continue;
    switch (p.collection) {
      case "programs":
        if (!programMap.has(id)) programMap.set(id, name);
        break;
      case "stores":
        if (!storeMap.has(id)) storeMap.set(id, name);
        break;
      case "cards":
        if (!cardMap.has(id)) cardMap.set(id, name);
        break;
      case "paymentApps":
        if (!paymentAppMap.has(id)) paymentAppMap.set(id, name);
        break;
      case "pointCards":
        if (!pointCardMap.has(id)) pointCardMap.set(id, name);
        break;
      case "currencies":
        if (!currencyMap.has(id)) currencyMap.set(id, name);
        break;
    }
  }

  // 未解決時は slug を返す (fallback でも debug 可能に)
  return {
    store: (id) => storeMap.get(id) ?? id,
    program: (id) => programMap.get(id) ?? id,
    currency: (id) => currencyMap.get(id) ?? id,
    card: (id) => cardMap.get(id) ?? id,
    paymentApp: (id) => paymentAppMap.get(id) ?? id,
    pointCard: (id) => pointCardMap.get(id) ?? id,
    source: (id) => sourceMap.get(id) ?? id,
  };
}

/** ProposalReport の各 item を日本語化された 1 行要約に変換 (SYNC_HISTORY 専用)。 */
export function formatAutoItemLocalized(
  p: Proposal,
  resolver: LabelResolver,
): string {
  const pct = (v: unknown) =>
    typeof v === "number" ? `${(v * 100).toFixed(2)}%` : String(v);

  if (p.type === "updateField") {
    const u = p as UpdateFieldProposal;
    return `${collectionLabel(u.collection)} ${u.id}.${u.field}: ${pct(u.from)} → ${pct(u.to)}`;
  }
  if (p.type === "delete") {
    const d = p as { collection: string; id: string };
    return `${collectionLabel(d.collection)} 削除 ${d.id}`;
  }
  if (p.type === "referenceChange") {
    const r = p as { collection: string; id: string; field: string; from: unknown; to: unknown };
    return `${collectionLabel(r.collection)} ${r.id}.${r.field}: ${JSON.stringify(r.from)} → ${JSON.stringify(r.to)}`;
  }

  const rec = (p as AddRecordProposal).record;
  const period =
    rec.validFrom || rec.validTo
      ? ` [${rec.validFrom ?? "?"}〜${rec.validTo ?? "?"}]`
      : "";

  switch (p.collection) {
    case "stores":
      return `${rec.name}${rec.category ? ` (${rec.category})` : ""}`;
    case "memberships": {
      const programName = resolver.program(String(rec.programId));
      const storeName = resolver.store(String(rec.storeId));
      const override =
        rec.overrideRate != null ? ` (率上書き ${pct(rec.overrideRate)})` : "";
      return `${programName} → ${storeName}${override}`;
    }
    case "programs":
    case "campaigns": {
      const currencyName = rec.currencyId
        ? resolver.currency(String(rec.currencyId))
        : "";
      return `${rec.name} ${pct(rec.rate)}${currencyName ? ` ${currencyName}` : ""}${period}`.trim();
    }
    case "loyaltyRules": {
      const storeName = resolver.store(String(rec.storeId));
      const pointCardName = resolver.pointCard(String(rec.pointCardId));
      return `${pointCardName} 提示 ${pct(rec.rate)} → ${storeName}`;
    }
    case "cards":
      return `${rec.name}${rec.grade ? ` (${rec.grade})` : ""}`;
    case "paymentApps":
      return `${rec.name}`;
    default:
      return `${rec.id ?? JSON.stringify(rec)}`;
  }
}

// ───────────────────────────────────────────────────────────────
// Loader
// ───────────────────────────────────────────────────────────────

function loadReport(): ProposalReport {
  const text = readFileSync(PROPOSAL_PATH, "utf-8");
  return JSON.parse(text) as ProposalReport;
}

// cron は日曜/水曜 21:00 UTC (= 月曜/木曜 06:00 JST) に走るため、
// toISOString() の UTC 日付だと JST では翌日になり 1 日ずれる。
// レポートの日付ラベルは運用者 (JST) の暦日に揃える。
function jstDate(iso: string): string {
  // en-CA ロケールは YYYY-MM-DD 形式を返す
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

// ───────────────────────────────────────────────────────────────
// AUTO_SUMMARY.md generator
// ───────────────────────────────────────────────────────────────

// 自動適用された 1 レコードを「後から読み解ける」1 行に整形する。
// AUTO_SUMMARY.md は commit message としてのみ使われ git には残らないため、
// このコミットメッセージ本文が唯一の永続的な監査記録になる。
function formatAutoItem(p: Proposal): string {
  if (p.type === "updateField") {
    const u = p as UpdateFieldProposal;
    const fmt = (v: unknown) =>
      typeof v === "number" ? `${(v * 100).toFixed(2)}%` : String(v);
    return `${u.collection} ${u.id}.${u.field}: ${fmt(u.from)} → ${fmt(u.to)}`;
  }
  if (p.type === "delete") {
    const d = p as { collection: string; id: string };
    return `${d.collection} 削除 ${d.id}`;
  }
  if (p.type === "referenceChange") {
    const r = p as { collection: string; id: string; field: string; from: unknown; to: unknown };
    return `${r.collection} ${r.id}.${r.field}: ${JSON.stringify(r.from)} → ${JSON.stringify(r.to)}`;
  }

  const rec = (p as AddRecordProposal).record;
  const pct = (v: unknown) =>
    typeof v === "number" ? `${(v * 100).toFixed(2)}%` : String(v);
  const period =
    rec.validFrom || rec.validTo
      ? ` [${rec.validFrom ?? "?"}〜${rec.validTo ?? "?"}]`
      : "";

  switch (p.collection) {
    case "stores":
      return `${rec.id} — ${rec.name}${rec.category ? ` (${rec.category})` : ""}`;
    case "memberships":
      return `${rec.programId} → ${rec.storeId}${rec.overrideRate != null ? ` (率上書き ${pct(rec.overrideRate)})` : ""}`;
    case "programs":
    case "campaigns":
      return `${rec.id} — ${rec.name} ${pct(rec.rate)} ${rec.currencyId ?? ""}${period}`.trim();
    case "loyaltyRules":
      return `${rec.id} ${rec.storeId} → ${rec.pointCardId} ${pct(rec.rate)}`;
    default:
      return `${rec.id ?? JSON.stringify(rec)}`;
  }
}

/**
 * Build the auto-merge commit message markdown.
 * Used directly as a git commit message via `git commit -F sources/AUTO_SUMMARY.md`.
 */
export function buildAutoSummary(report: ProposalReport): string {
  const date = jstDate(report.generatedAt);
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

  // 追加項目を「ソース / collection」ごとに 1 行ずつ列挙する監査セクション。
  // commit message 本文が唯一の永続記録なので、何が入ったか後から追える。
  const auditLines: string[] = [];
  const groupKey = (p: Proposal) => `${p.sourceId} / ${p.collection ?? "unknown"}`;
  const grouped = new Map<string, Proposal[]>();
  for (const p of report.autoApplicable) {
    const k = groupKey(p);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(p);
  }
  for (const [k, items] of grouped.entries()) {
    auditLines.push(`### ${k} (${items.length})`);
    for (const p of items) auditLines.push(`- ${formatAutoItem(p)}`);
    auditLines.push("");
  }

  const lines: string[] = [
    `auto-sync: ${n} 件の変更を自動反映 (${date})`,
    "",
    "## 内訳",
    ...detailLines,
    "",
    "## 追加項目",
    ...auditLines,
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
  safetyFailed: "🛡 safetyFailed (auto-merge 件数オーバー降格)",
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
  zeroOrInvalidRate: "🔴 zeroOrInvalidRate",
  missingStoreBody: "🟠 missingStoreBody (store 本体なし membership)",
  missingProgramBody: "🟠 missingProgramBody (program 本体なし membership)",
  expiredCampaign: "🟠 expiredCampaign (validTo+30日経過、削除候補)",
};

const REASON_EXPLANATIONS: Record<ReviewReason, string> = {
  safetyFailed:
    "auto-merge 候補だが、件数が maxAutoChangesPerRun を超えたため安全弁で review に降格。" +
    "内容は健全な auto 候補なので、個別精査の上 maxAutoChangesPerRun を一時 bump して再実行 or 手動で取り込み判断。",
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
  zeroOrInvalidRate:
    "rate=0 抽出。Gemini が還元率を読み取れなかった疑い。実際の値を URL で確認の上、手動キュレートで取り込むか、prompt 改善後に再 fetch すること。",
  missingStoreBody:
    "membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。" +
    "そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、" +
    "次回 cron で store 側が auto 化されるのを待つ。",
  missingProgramBody:
    "membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、" +
    "program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。" +
    "program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。",
  expiredCampaign:
    "validTo が 30 日以上前に終了した campaign。Calculator では isRuleActiveAt() で自動 skip されているため機能的影響なし、" +
    "seed のサイズ/可読性のために削除を提案。承認する場合は seed-data-programs.ts (or seed-additions.ts) から該当 program と関連 memberships を手動削除して PR。" +
    "翌年同条件で再開する季節 campaign の場合は削除せず validTo を更新で対応。",
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
  const date = jstDate(report.generatedAt);
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
    // Sort by priority: safetyFailed first (healthy auto items, easy to act on),
    // then data-quality issues, then others, then userBlocked last
    const reasonOrder: ReviewReason[] = [
      "safetyFailed",         // 🛡 件数超過で降格された健全な auto 候補。内容確認の上 bump 判断
      "zeroOrInvalidRate",    // 🔴 rate=0 抽出失敗。データ品質低の auto 候補を確認
      "unsupportedDateClaim", // 🔴 hallucination 疑い、早めに目を通す
      "missingStoreBody",     // 🟠 store 本体なし membership。store 側を手動キュレートで補完
      "missingProgramBody",   // 🟠 program 本体なし membership。program 側を手動キュレートで補完
      "expiredCampaign",      // 🟠 validTo+30日経過。クリーンアップ候補
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
// SYNC_HISTORY (machine-readable JSON + human-readable Markdown)
// ───────────────────────────────────────────────────────────────
//
// 自動マージされた変更を時系列に蓄積する監査ログ。
// scripts/sync/report.ts が cron 実行ごとに先頭追記する。
// アプリ側「更新履歴」タブと GitHub 上の閲覧の両方で参照される。
//
// 設計判断:
// - autoApplicable が 0 件の run は entry を追加しない (空エントリーで履歴を埋めない)
// - 同じ generatedAt が既存 entries に居れば追加しない (workflow 再実行による重複防止)
// - 最大 SYNC_HISTORY_MAX_ENTRIES 件で truncate (古いものから削除)
// - commitSha は backfill 用のみ。新規 cron からは付与しない (squash merge SHA は事後判明のため)

/**
 * ProposalReport → SyncHistoryEntry を構築。0 件なら null。
 * SYNC_HISTORY は日本語化された summary + label を保存 (cron 時点の seed
 * snapshot で resolve、後で seed の名前が変わっても履歴は当時の名前のまま)。
 */
export function buildSyncHistoryEntry(
  report: ProposalReport,
  resolver: LabelResolver = buildLabelResolver(report.autoApplicable),
): SyncHistoryEntry | null {
  const n = report.autoApplicable.length;
  if (n === 0) return null;

  // bySource: source × collection の件数集計
  const counts = new Map<string, SyncHistorySourceCount>();
  for (const p of report.autoApplicable) {
    const collection = p.collection ?? "unknown";
    const key = `${p.sourceId}::${collection}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        sourceId: p.sourceId,
        collection,
        count: 1,
        sourceLabel: resolver.source(p.sourceId),
        collectionLabel: collectionLabel(collection),
      });
    }
  }
  const bySource = [...counts.values()].sort(
    (a, b) =>
      a.sourceId.localeCompare(b.sourceId) ||
      a.collection.localeCompare(b.collection),
  );

  // items: 日本語化された summary を 1 行ずつ保存
  const items: SyncHistoryItem[] = report.autoApplicable.map((p) => ({
    sourceId: p.sourceId,
    collection: p.collection ?? "unknown",
    summary: formatAutoItemLocalized(p, resolver),
    sourceLabel: resolver.source(p.sourceId),
    collectionLabel: collectionLabel(p.collection ?? "unknown"),
  }));

  const avgConfidence =
    report.autoApplicable.reduce((s, p) => s + p.confidence, 0) / n;

  return {
    date: jstDate(report.generatedAt),
    generatedAt: report.generatedAt,
    totalCount: n,
    avgConfidence: Number(avgConfidence.toFixed(3)),
    sourcesProcessed: report.summary.sourcesProcessed,
    bySource,
    items,
  };
}

/**
 * 既存の SYNC_HISTORY.json を読み込み、新規エントリーを先頭に追加した結果を返す。
 * pure function (file I/O なし)。0 件 entry / 同一 generatedAt は no-op。
 */
export function appendSyncHistory(
  existing: SyncHistoryFile | null,
  newEntry: SyncHistoryEntry | null,
): SyncHistoryFile {
  const base: SyncHistoryFile = existing ?? { version: 1, entries: [] };
  if (!newEntry) return base;
  // 同じ generatedAt が既に居れば再実行とみなしスキップ
  if (base.entries.some((e) => e.generatedAt === newEntry.generatedAt)) {
    return base;
  }
  const entries = [newEntry, ...base.entries].slice(0, SYNC_HISTORY_MAX_ENTRIES);
  return { version: 1, entries };
}

/** SYNC_HISTORY.md (人間向け) を生成。最新が上。 */
export function buildSyncHistoryMarkdown(history: SyncHistoryFile): string {
  const lines: string[] = [
    "# 週次マスタ同期 履歴",
    "",
    "> 自動生成。最新が上、最大 " + SYNC_HISTORY_MAX_ENTRIES +
      " 件。`scripts/sync/report.ts` が cron 実行ごとに先頭追記する。",
    "> アプリ内「更新履歴」タブから同じデータを参照可能。",
    "",
  ];

  if (history.entries.length === 0) {
    lines.push("履歴はまだありません。");
    return lines.join("\n");
  }

  for (const e of history.entries) {
    lines.push(`## ${e.date} (${e.totalCount} 件)`);
    lines.push("");
    const meta: string[] = [];
    if (e.commitSha) {
      meta.push(
        `commit: [\`${e.commitSha}\`](https://github.com/kyounow/pointmax/commit/${e.commitSha})`,
      );
    }
    if (e.prNumber) {
      meta.push(
        `PR: [#${e.prNumber}](https://github.com/kyounow/pointmax/pull/${e.prNumber})`,
      );
    }
    meta.push(`平均 confidence: ${e.avgConfidence?.toFixed(2) ?? "-"}`);
    meta.push(`source 数: ${e.sourcesProcessed}`);
    lines.push("- " + meta.join(" / "));
    lines.push("");

    // 内訳テーブル (label があれば優先)
    lines.push("| 取得元 | 種別 | 件数 |");
    lines.push("|---|---|---:|");
    for (const c of e.bySource) {
      const src = c.sourceLabel ?? c.sourceId;
      const col = c.collectionLabel ?? c.collection;
      lines.push(`| ${src} | ${col} | ${c.count} |`);
    }
    lines.push("");

    // 追加項目 (折りたたみ)。グルーピング表記も label 優先
    lines.push(`<details><summary>追加項目 ${e.items.length} 件</summary>`);
    lines.push("");
    const grouped = new Map<string, SyncHistoryItem[]>();
    for (const it of e.items) {
      const src = it.sourceLabel ?? it.sourceId;
      const col = it.collectionLabel ?? it.collection;
      const k = `${src} / ${col}`;
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(it);
    }
    for (const [k, items] of grouped.entries()) {
      lines.push(`### ${k} (${items.length})`);
      for (const it of items) lines.push(`- ${it.summary}`);
      lines.push("");
    }
    lines.push("</details>");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/** 既存の SYNC_HISTORY.json を読み込む。無ければ null。 */
function loadSyncHistory(): SyncHistoryFile | null {
  if (!existsSync(SYNC_HISTORY_JSON_PATH)) return null;
  try {
    const text = readFileSync(SYNC_HISTORY_JSON_PATH, "utf-8");
    const parsed = JSON.parse(text) as SyncHistoryFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      console.warn(
        "⚠️ SYNC_HISTORY.json の形式が想定外、新規ファイルとして再生成します",
      );
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn(
      "⚠️ SYNC_HISTORY.json 読み込み失敗、新規ファイルとして再生成します:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
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

  // SYNC_HISTORY.json / .md は autoApplicable が 1 件以上の run のみ追記。
  // 0 件 run でも MD は最新の history を再生成 (タイトル等の整合用) し、
  // JSON は既存ファイルがあれば touch (なければ作らない) で保つ。
  const newEntry = buildSyncHistoryEntry(report);
  const existingHistory = loadSyncHistory();
  if (newEntry !== null) {
    const updated = appendSyncHistory(existingHistory, newEntry);
    await writeFile(
      SYNC_HISTORY_JSON_PATH,
      JSON.stringify(updated, null, 2) + "\n",
      "utf-8",
    );
    const historyMd = buildSyncHistoryMarkdown(updated);
    await writeFile(SYNC_HISTORY_MD_PATH, historyMd, "utf-8");
    console.log(
      `✓ wrote ${SYNC_HISTORY_JSON_PATH} (${updated.entries.length} entries)`,
    );
    console.log(`✓ wrote ${SYNC_HISTORY_MD_PATH} (${historyMd.length} chars)`);
  } else {
    console.log("ℹ️ autoApplicable=0 のため SYNC_HISTORY は更新スキップ");
  }
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
