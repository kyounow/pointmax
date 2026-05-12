// 全 sources/extracted/*.json を読み、現在の seed と突合して
// sources/proposed-migrations.json を生成する。
//
// 流れ:
//   seed() + extracted/*.json
//     ↓ propose<Entity>: addRecord / updateField / referenceChange を提案
//     ↓ applyCategoryCap: stores の新規追加をカテゴリあたり N 件に制限 (Q2-C)
//     ↓ classify: confidence × pp × ratio で auto / review を判定
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
import type { SeedShape } from "../../src/domain/mergeSeed";
import {
  CONFIDENCE_AUTO_THRESHOLD,
  EXCLUDED_CATEGORIES,
  computeConfidence,
  judgeRateChange,
} from "./types";
import type {
  AddRecordProposal,
  Evidence,
  ExtractedSource,
  Proposal,
  ProposalReport,
  ReferenceChangeProposal,
  ReviewReason,
  UpdateFieldProposal,
} from "./types";

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
// Evidence の生成 (Extracted* の共通フィールドを抜く)
// ───────────────────────────────────────────────────────────────

function toEvidence(x: Evidence): Evidence {
  return {
    evidenceQuote: x.evidenceQuote,
    evidenceUrl: x.evidenceUrl,
    explicitness: x.explicitness,
    ambiguity: x.ambiguity,
  };
}

// ───────────────────────────────────────────────────────────────
// Per-entity propose functions
// ───────────────────────────────────────────────────────────────

export function proposeStores(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.stores || data.stores.length === 0) return [];
  const existingIds = new Set(current.stores.map((s) => s.id));
  const existingNames = new Set(current.stores.map((s) => s.name));
  const result: Proposal[] = [];

  for (const s of data.stores) {
    const evidence = toEvidence(s);
    const confidence = computeConfidence(evidence);
    let reviewReason: ReviewReason | undefined;

    // Policy B: 対象外カテゴリは強制的に needsReview に
    // (Gemini の scope 指示遵守が完璧でない場合の防御)
    if (s.category && EXCLUDED_CATEGORIES.has(s.category)) {
      reviewReason = "excludedCategory";
    } else if (existingIds.has(s.storeId) || existingNames.has(s.name)) {
      reviewReason = "idCollision";
    } else if (confidence < CONFIDENCE_AUTO_THRESHOLD) {
      reviewReason = "lowConfidence";
    }

    const prop: AddRecordProposal = {
      type: "addRecord",
      collection: "stores",
      record: {
        id: s.storeId,
        name: s.name,
        category: s.category,
      },
      sourceId: data.sourceId,
      confidence,
      evidence,
      reviewReason,
    };
    result.push(prop);
  }
  return result;
}

export function proposeStoreRules(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.storeRules || data.storeRules.length === 0) return [];
  const result: Proposal[] = [];
  for (const r of data.storeRules) {
    const evidence = toEvidence(r);
    const confidence = computeConfidence(evidence);
    const existing = current.rules.find(
      (x) =>
        x.cardId === r.cardId &&
        x.storeId === r.storeId &&
        x.paymentAppId === r.paymentAppId,
    );

    if (!existing) {
      // 新規追加 (id は deterministic に生成して冪等性確保)
      const reviewReason: ReviewReason | undefined =
        confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined;
      const ruleId = `rule-${r.cardId}-${r.storeId}${r.paymentAppId ? `-${r.paymentAppId}` : ""}`;
      result.push({
        type: "addRecord",
        collection: "rules",
        record: {
          id: ruleId,
          cardId: r.cardId,
          storeId: r.storeId,
          paymentAppId: r.paymentAppId,
          rate: r.rate,
          currencyId: r.currencyId,
          monthlyCapAmountYen: r.monthlyCapAmountYen,
          notes: r.notes,
        },
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason,
      });
      continue;
    }

    // 既存あり: rate / currencyId のいずれかが変わっていれば提案
    if (existing.rate !== r.rate) {
      result.push(buildRateUpdate(existing.id, "rules", existing.rate, r.rate, data.sourceId, confidence, evidence));
    }
    if (existing.currencyId !== r.currencyId) {
      result.push({
        type: "referenceChange",
        collection: "rules",
        id: existing.id,
        field: "currencyId",
        from: existing.currencyId,
        to: r.currencyId,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "referenceChange",
      } satisfies ReferenceChangeProposal);
    }
  }
  return result;
}

export function proposeCategoryRules(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.categoryRules || data.categoryRules.length === 0) return [];
  const result: Proposal[] = [];
  for (const r of data.categoryRules) {
    const evidence = toEvidence(r);
    const confidence = computeConfidence(evidence);
    const existing = current.rules.find(
      (x) =>
        x.cardId === r.cardId &&
        x.category === r.category &&
        x.paymentAppId === r.paymentAppId &&
        !x.storeId,
    );
    if (!existing) {
      const catRuleId = `catrule-${r.cardId}-${r.category}${r.paymentAppId ? `-${r.paymentAppId}` : ""}`;
      result.push({
        type: "addRecord",
        collection: "rules",
        record: {
          id: catRuleId,
          cardId: r.cardId,
          category: r.category,
          paymentAppId: r.paymentAppId,
          rate: r.rate,
          currencyId: r.currencyId,
          monthlyCapAmountYen: r.monthlyCapAmountYen,
          notes: r.notes,
        },
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason:
          confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined,
      });
      continue;
    }
    if (existing.rate !== r.rate) {
      result.push(buildRateUpdate(existing.id, "rules", existing.rate, r.rate, data.sourceId, confidence, evidence));
    }
    if (existing.currencyId !== r.currencyId) {
      result.push({
        type: "referenceChange",
        collection: "rules",
        id: existing.id,
        field: "currencyId",
        from: existing.currencyId,
        to: r.currencyId,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "referenceChange",
      } satisfies ReferenceChangeProposal);
    }
  }
  return result;
}

export function proposeCards(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.cards || data.cards.length === 0) return [];
  const result: Proposal[] = [];
  for (const c of data.cards) {
    const evidence = toEvidence(c);
    const confidence = computeConfidence(evidence);
    const existing = current.cards.find((x) => x.id === c.cardId);
    if (!existing) {
      // 既存にない cardId が抽出された (通常想定外)
      result.push({
        type: "addRecord",
        collection: "cards",
        record: {
          id: c.cardId,
          name: c.name ?? c.cardId,
          grade: c.grade,
          defaultRate: c.defaultRate ?? 0,
          defaultCurrencyId: c.defaultCurrencyId ?? "",
        },
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "idCollision", // 新規カードは要レビュー
      });
      continue;
    }
    if (c.defaultRate != null && existing.defaultRate !== c.defaultRate) {
      result.push(
        buildRateUpdate(
          existing.id,
          "cards",
          existing.defaultRate,
          c.defaultRate,
          data.sourceId,
          confidence,
          evidence,
          "defaultRate",
        ),
      );
    }
    if (c.defaultCurrencyId && existing.defaultCurrencyId !== c.defaultCurrencyId) {
      result.push({
        type: "referenceChange",
        collection: "cards",
        id: existing.id,
        field: "defaultCurrencyId",
        from: existing.defaultCurrencyId,
        to: c.defaultCurrencyId,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "referenceChange",
      } satisfies ReferenceChangeProposal);
    }
  }
  return result;
}

export function proposeLoyaltyRules(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.loyaltyRules || data.loyaltyRules.length === 0) return [];
  const result: Proposal[] = [];
  for (const r of data.loyaltyRules) {
    const evidence = toEvidence(r);
    const confidence = computeConfidence(evidence);
    const existing = current.loyaltyRules.find(
      (x) => x.storeId === r.storeId && x.pointCardId === r.pointCardId,
    );
    if (!existing) {
      const loyaltyId = `loy-${r.pointCardId}-${r.storeId}`;
      result.push({
        type: "addRecord",
        collection: "loyaltyRules",
        record: {
          id: loyaltyId,
          storeId: r.storeId,
          pointCardId: r.pointCardId,
          rate: r.rate,
          currencyId: r.currencyId,
          notes: r.notes,
        },
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason:
          confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined,
      });
      continue;
    }
    if (existing.rate !== r.rate) {
      result.push(buildRateUpdate(existing.id, "loyaltyRules", existing.rate, r.rate, data.sourceId, confidence, evidence));
    }
  }
  return result;
}

export function proposePaymentApps(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.paymentApps || data.paymentApps.length === 0) return [];
  const result: Proposal[] = [];
  for (const a of data.paymentApps) {
    const evidence = toEvidence(a);
    const confidence = computeConfidence(evidence);
    const existing = current.paymentApps.find((x) => x.id === a.paymentAppId);
    if (!existing) {
      result.push({
        type: "addRecord",
        collection: "paymentApps",
        record: {
          id: a.paymentAppId,
          name: a.name ?? a.paymentAppId,
          chargeBased: a.chargeBased,
          defaultBonusRate: a.defaultBonusRate,
          defaultBonusCurrencyId: a.defaultBonusCurrencyId,
          compatibleCardIds: a.compatibleCardIds,
        },
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "idCollision",
      });
      continue;
    }
    if (a.defaultBonusRate != null && existing.defaultBonusRate !== a.defaultBonusRate) {
      result.push(
        buildRateUpdate(
          existing.id,
          "paymentApps",
          existing.defaultBonusRate ?? 0,
          a.defaultBonusRate,
          data.sourceId,
          confidence,
          evidence,
          "defaultBonusRate",
        ),
      );
    }
    if (a.chargeBased != null && existing.chargeBased !== a.chargeBased) {
      // boolean 変更は構造変更扱い → reviewReason
      result.push({
        type: "updateField",
        collection: "paymentApps",
        id: existing.id,
        field: "chargeBased",
        from: existing.chargeBased,
        to: a.chargeBased,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "referenceChange", // 構造変更扱いで人間レビュー
      } satisfies UpdateFieldProposal);
    }
  }
  return result;
}

// ───────────────────────────────────────────────────────────────
// 共通: rate 変更の autoMergeable 判定
// ───────────────────────────────────────────────────────────────

function buildRateUpdate(
  id: string,
  collection: UpdateFieldProposal["collection"],
  from: number,
  to: number,
  sourceId: string,
  confidence: number,
  evidence: Evidence,
  field: string = "rate",
): UpdateFieldProposal {
  const judge = judgeRateChange(from, to);
  let reviewReason: ReviewReason | undefined;
  if (confidence < CONFIDENCE_AUTO_THRESHOLD) {
    reviewReason = "lowConfidence";
  } else if (!judge.withinPp) {
    reviewReason = "rateDeltaTooLarge";
  } else if (!judge.withinRatio) {
    reviewReason = "rateRatioOutOfRange";
  }
  return {
    type: "updateField",
    collection,
    id,
    field,
    from,
    to,
    sourceId,
    confidence,
    evidence,
    reviewReason,
  };
}

// ───────────────────────────────────────────────────────────────
// Category cap (Q2-C: 大量の stores 新規追加を categoryあたり N 件に絞る)
// ───────────────────────────────────────────────────────────────

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
      (((p as AddRecordProposal).record.category as string | undefined) ?? "(未分類)");
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

  for (const data of extracted) {
    if (isFailedExtraction(data)) {
      console.log(`   ⚠️  ${data.sourceId}: 取得失敗 (notes) - スキップ`);
      failed += 1;
      continue;
    }
    processed += 1;
    allProposals.push(...proposeStores(data, current));
    allProposals.push(...proposeStoreRules(data, current));
    allProposals.push(...proposeCategoryRules(data, current));
    allProposals.push(...proposeCards(data, current));
    allProposals.push(...proposeLoyaltyRules(data, current));
    allProposals.push(...proposePaymentApps(data, current));
  }

  // within-run dedup: 異なるソースから同 name/id の store が提案された場合、
  // 2 件目以降は idCollision で要レビューに格下げする (MUST-fix for v1)
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
          (((d as AddRecordProposal).record.category as string | undefined) ??
            "(未分類)");
        byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
      }
      console.log(`📐 category cap = ${cap}/cat: ${deferred.length} 件を deferred`);
      for (const [cat, n] of byCat.entries()) {
        console.log(`     ${cat}: ${n} 件先送り`);
      }
    }
  }

  const autoApplicable: Proposal[] = [];
  const needsReview: Proposal[] = [];
  for (const p of finalProposals) {
    if (p.reviewReason) needsReview.push(p);
    else autoApplicable.push(p);
  }

  const report: ProposalReport = {
    generatedAt: new Date().toISOString(),
    fromSeedVersion: SEED_VERSION,
    toSeedVersion: SEED_VERSION + 1,
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
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error("💥 Error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
