// 全 sources/extracted/*.json を読み、現在の seed と突合して
// sources/proposed-migrations.json を生成する CLI エントリポイント。
//
// 流れ:
//   seed() + extracted/*.json
//     ↓ propose<Entity>: addRecord / updateField / referenceChange を提案
//        (個別ロジックは scripts/sync/propose-helpers.ts に分割)
//     ↓ dedupeAcrossProposals: 同 run 内の同 name/id を idCollision に格下げ
//     ↓ applyCategoryCap: stores の新規追加をカテゴリあたり N 件に制限 (Q2-C)
//     ↓ classify: reviewReason が無いものを autoApplicable へ
//     ↓ ProposalReport を proposed-migrations.json に書き出し
//
// 使い方:
//   npm run sync:propose                  # デフォルト: cap = 5/category
//   CAP_PER_CATEGORY=10 npm run sync:propose
//   CAP_PER_CATEGORY=0  npm run sync:propose # cap 無効

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { seed, SEED_VERSION } from "../../src/state/seed";
import type {
  AddRecordProposal,
  ExtractedSource,
  Proposal,
  ProposalReport,
} from "./types";
import {
  proposeCards,
  proposeExpiredCampaignDeletions,
  proposeJalTokuyakuMemberships,
  proposeLoyaltyRules,
  proposeMemberships,
  proposePaymentApps,
  proposePrograms,
  proposeStores,
} from "./propose-helpers";
import { resolveCardId, resolveStoreId } from "./aliases";

// 再エクスポート (テスト互換性のため diff-and-propose 経由で参照される旧APIを温存)
export {
  proposeCards,
  proposeExpiredCampaignDeletions,
  proposeJalTokuyakuMemberships,
  proposeLoyaltyRules,
  proposeMemberships,
  proposePaymentApps,
  proposePrograms,
  proposeStores,
};

// ───────────────────────────────────────────────────────────────
// Paths / config
// ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const EXTRACTED_DIR = resolve(REPO_ROOT, "sources/extracted");
const OUTPUT_PATH = resolve(REPO_ROOT, "sources/proposed-migrations.json");

const DEFAULT_CAP_PER_CATEGORY = 5;

function readCapPerCategory(): number | null {
  const raw = process.env.CAP_PER_CATEGORY;
  if (raw == null) return DEFAULT_CAP_PER_CATEGORY;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return DEFAULT_CAP_PER_CATEGORY;
  return n === 0 ? null : n; // 0 で cap 無効
}

// ───────────────────────────────────────────────────────────────
// Extracted loader + failure detection
// ───────────────────────────────────────────────────────────────

function readExtractedSources(): ExtractedSource[] {
  let files: string[];
  try {
    files = readdirSync(EXTRACTED_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const result: ExtractedSource[] = [];
  for (const f of files) {
    const text = readFileSync(resolve(EXTRACTED_DIR, f), "utf-8");
    try {
      result.push(JSON.parse(text) as ExtractedSource);
    } catch (e) {
      console.warn(`  ⚠️ ${f}: JSON 解析失敗 - スキップ (${(e as Error).message})`);
    }
  }
  return result;
}

// notes / 配列空 から fetch 失敗を判定。雑だが運用には十分。
export function isFailedExtraction(d: ExtractedSource): boolean {
  if (!d.notes) return false;
  const failurePatterns: RegExp[] = [
    /could not be fetched/i,
    /unable to.*(extract|read)/i,
    /URL.*(could not|unable).*load/i,
    /取得できま(せん|せんで)/,
    /アクセスできま(せん|せんで)/,
  ];
  return failurePatterns.some((p) => p.test(d.notes ?? ""));
}

// ───────────────────────────────────────────────────────────────
// ID 正規化 (aliases.json に基づく cardId / storeId 揺れ補正)
// ───────────────────────────────────────────────────────────────

export function normalizeIds(ex: ExtractedSource): ExtractedSource {
  return {
    ...ex,
    cards: ex.cards?.map((c) => ({ ...c, cardId: resolveCardId(c.cardId) })),
    categoryRules: ex.categoryRules?.map((r) => ({ ...r, cardId: resolveCardId(r.cardId) })),
    stores: ex.stores?.map((s) => ({ ...s, storeId: resolveStoreId(s.storeId) })),
    loyaltyRules: ex.loyaltyRules?.map((r) => ({
      ...r,
      storeId: r.storeId ? resolveStoreId(r.storeId) : r.storeId,
    })),
    programs: ex.programs?.map((p) => ({
      ...p,
      cardIds: p.cardIds?.map((id) => resolveCardId(id)),
    })),
    memberships: ex.memberships?.map((m) => ({
      ...m,
      storeId: m.storeId ? resolveStoreId(m.storeId) : m.storeId,
    })),
  };
}

// ───────────────────────────────────────────────────────────────
// Within-run dedup (Phase C MUST-fix)
// ───────────────────────────────────────────────────────────────
// 同一 propose 実行内で複数 source から「同じ name の store」が提案される
// ケースを名寄せする。例: rakuten が "ローソンストア100" を storeId="lawson-store100"
// で出してきた直後に、ponta が同じ店を "lawson-store-100" で出してくる。
// 既存 seed と比較する existingNames だけだとどちらも未存在で通過してしまうので、
// 「先に通過した proposal の name/id」を後続の比較対象に積み増す。
//
// 同 name / 同 id がぶつかった 2 つ目以降は reviewReason=idCollision に格下げ。

export function dedupeAcrossProposals(proposals: Proposal[]): {
  proposals: Proposal[];
  collisions: number;
} {
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  let collisions = 0;
  const out: Proposal[] = [];

  for (const p of proposals) {
    if (p.type !== "addRecord" || p.collection !== "stores") {
      out.push(p);
      continue;
    }
    const r = (p as AddRecordProposal).record as {
      id?: string;
      name?: string;
    };
    const id = typeof r.id === "string" ? r.id : undefined;
    const name = typeof r.name === "string" ? r.name : undefined;
    const dup = (id && seenIds.has(id)) || (name && seenNames.has(name));
    if (dup) {
      // 2 件目以降は idCollision に格下げ (元の reviewReason より優先)
      out.push({ ...p, reviewReason: "idCollision" } as Proposal);
      collisions += 1;
    } else {
      out.push(p);
    }
    if (id) seenIds.add(id);
    if (name) seenNames.add(name);
  }
  return { proposals: out, collisions };
}

// ───────────────────────────────────────────────────────────────
// Category cap (Q2-C: 大量の stores 新規追加を categoryあたり N 件に絞る)
// ───────────────────────────────────────────────────────────────

export function applyCategoryCap(
  proposals: Proposal[],
  cap: number,
): { kept: Proposal[]; deferred: Proposal[] } {
  // 対象: addRecord × stores のみ
  const counts = new Map<string, number>();
  const kept: Proposal[] = [];
  const deferred: Proposal[] = [];

  // 安定性のため、stores の addRecord を storeId でソートしてから cap 適用
  const sortable: Proposal[] = [];
  const others: Proposal[] = [];
  for (const p of proposals) {
    if (p.type === "addRecord" && p.collection === "stores") {
      sortable.push(p);
    } else {
      others.push(p);
    }
  }
  sortable.sort((a, b) =>
    String((a as AddRecordProposal).record.id).localeCompare(
      String((b as AddRecordProposal).record.id),
    ),
  );

  for (const p of sortable) {
    const cat =
      ((p as AddRecordProposal).record.category as string | undefined) ??
      "(未分類)";
    const n = (counts.get(cat) ?? 0) + 1;
    counts.set(cat, n);
    if (n <= cap) {
      kept.push(p);
    } else {
      deferred.push(p);
    }
  }
  return { kept: [...others, ...kept], deferred };
}

// ───────────────────────────────────────────────────────────────
// Orphan membership guard
// ───────────────────────────────────────────────────────────────
// category cap や idCollision 等で store 本体が auto 通過しなかった場合、
// 同 run の membership 提案が「店舗本体なし」のまま auto-merge されると
// seed に孤児 membership が残る (UI で店名解決できない・履歴で slug fallback)。
// 防止策: membership の storeId が「既存 seed」or「同 run の auto 候補 store」
// どちらにも含まれなければ reviewReason="missingStoreBody" で降格させる。
//
// 注意: programId 側にも同様のロジックを掛けるべきだが、program 提案は
// category cap 対象外で deferred されにくいため、ひとまず store だけ守る
// (実害が観測された範囲に対応)。

export function downgradeOrphanMemberships(
  proposals: Proposal[],
  existingStoreIds: ReadonlySet<string>,
): { proposals: Proposal[]; downgraded: number } {
  // 「同 run で auto 通過する予定の store id 集合」を構築
  // = reviewReason 未設定の addRecord/stores
  const sameRunAutoStoreIds = new Set<string>();
  for (const p of proposals) {
    if (
      p.type === "addRecord" &&
      p.collection === "stores" &&
      !p.reviewReason
    ) {
      const id = (p as AddRecordProposal).record.id;
      if (typeof id === "string") sameRunAutoStoreIds.add(id);
    }
  }

  let downgraded = 0;
  const out: Proposal[] = proposals.map((p) => {
    if (
      p.type !== "addRecord" ||
      p.collection !== "memberships" ||
      p.reviewReason // 既に他理由で降格済なら触らない
    ) {
      return p;
    }
    const storeId = (p as AddRecordProposal).record.storeId;
    if (typeof storeId !== "string") return p;
    if (existingStoreIds.has(storeId)) return p; // 既存 seed → OK
    if (sameRunAutoStoreIds.has(storeId)) return p; // 同 run auto → OK
    // 孤児: store 本体が seed にも auto 候補にも無い
    downgraded += 1;
    return { ...p, reviewReason: "missingStoreBody" } as Proposal;
  });
  return { proposals: out, downgraded };
}

// ───────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────

function main(): void {
  console.log("📥 reading extracted/*.json ...");
  const extracted = readExtractedSources();
  console.log(`   loaded: ${extracted.length} file(s)`);

  const current = seed();
  const allProposals: Proposal[] = [];
  let processed = 0;
  let failed = 0;

  for (const raw of extracted) {
    if (isFailedExtraction(raw)) {
      console.log(`   ⚠️  ${raw.sourceId}: 取得失敗 (notes) - スキップ`);
      failed += 1;
      continue;
    }
    processed += 1;
    // alias 正規化: smbc-v-gold → smbc-v, seven-eleven → conv-7eleven 等
    const data = normalizeIds(raw);
    allProposals.push(...proposeStores(data, current));
    allProposals.push(...proposeCards(data, current));
    allProposals.push(...proposeLoyaltyRules(data, current));
    allProposals.push(...proposePaymentApps(data, current));
    allProposals.push(...proposePrograms(data, current));
    allProposals.push(...proposeMemberships(data, current));
    allProposals.push(...proposeJalTokuyakuMemberships(data, current));
  }

  // 期限切れキャンペーンの削除提案 (seed 全体 1 回だけ評価、ソース非依存)
  const expiredProposals = proposeExpiredCampaignDeletions(current);
  if (expiredProposals.length > 0) {
    console.log(
      `🧹 expired-cleanup: ${expiredProposals.length} 件の campaign を削除候補に追加`,
    );
  }
  allProposals.push(...expiredProposals);

  // within-run dedup: 異なるソースから同 name/id の store が提案された場合、
  // 2 件目以降は idCollision で要レビューに格下げする
  const dedup = dedupeAcrossProposals(allProposals);
  if (dedup.collisions > 0) {
    console.log(
      `🔁 within-run dedup: ${dedup.collisions} 件の store 提案を idCollision にダウングレード`,
    );
  }

  // Category cap (stores の新規追加のみ対象)
  const cap = readCapPerCategory();
  let finalProposals = dedup.proposals;
  let deferredCount = 0;
  if (cap !== null) {
    const { kept, deferred } = applyCategoryCap(dedup.proposals, cap);
    finalProposals = kept;
    deferredCount = deferred.length;
    if (deferred.length > 0) {
      const byCat = new Map<string, number>();
      for (const d of deferred) {
        const cat =
          ((d as AddRecordProposal).record.category as string | undefined) ??
          "(未分類)";
        byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
      }
      console.log(
        `📐 category cap = ${cap}/cat: ${deferred.length} 件を deferred`,
      );
      for (const [cat, n] of byCat.entries()) {
        console.log(`     ${cat}: ${n} 件先送り`);
      }
    }
  }

  // Orphan membership guard: store 本体が auto に居ない場合は降格
  // category cap で deferred されたり既存と衝突した場合の整合性を保つ
  const existingStoreIds = new Set(current.stores.map((s) => s.id));
  const orphan = downgradeOrphanMemberships(finalProposals, existingStoreIds);
  finalProposals = orphan.proposals;
  if (orphan.downgraded > 0) {
    console.log(
      `🧯 orphan guard: ${orphan.downgraded} 件の membership を missingStoreBody で降格`,
    );
  }

  const autoApplicable: Proposal[] = [];
  const needsReview: Proposal[] = [];
  for (const p of finalProposals) {
    if (p.reviewReason) needsReview.push(p);
    else autoApplicable.push(p);
  }

  const report: ProposalReport = {
    generatedAt: new Date().toISOString(),
    // cron は SEED_VERSION を bump しない (リリース粒度)。
    // from == to で「版数は据え置き」を正直に表す。
    fromSeedVersion: SEED_VERSION,
    toSeedVersion: SEED_VERSION,
    autoApplicable,
    needsReview,
    summary: {
      autoApplicableCount: autoApplicable.length,
      needsReviewCount: needsReview.length,
      sourcesProcessed: processed,
      sourcesFailed: failed,
    },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(`✓ wrote ${OUTPUT_PATH}`);
  console.log(
    `📊 summary: auto=${autoApplicable.length}, review=${needsReview.length}, deferred=${deferredCount}, sources_ok=${processed}, sources_failed=${failed}`,
  );
}

// CLI として実行された場合のみ main を呼ぶ (テストからの import 時は呼ばない)
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
