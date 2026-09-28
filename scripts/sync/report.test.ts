import { describe, it, expect } from "vitest";
import {
  REASON_EXPLANATIONS,
  REASON_LABELS,
  REASON_ORDER,
  appendSyncHistory,
  buildAutoSummary,
  buildLabelResolver,
  buildReviewQueue,
  buildSyncHistoryEntry,
  buildSyncHistoryMarkdown,
  reclassifyAutoAsReview,
} from "./report";
import type { Proposal, ProposalReport, SyncHistoryFile } from "./types";
import { SYNC_HISTORY_MAX_ENTRIES } from "./types";

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

const baseReport = (overrides: Partial<ProposalReport>): ProposalReport => ({
  generatedAt: "2026-05-12T05:56:33.149Z",
  fromSeedVersion: 11,
  toSeedVersion: 12,
  autoApplicable: [],
  needsReview: [],
  summary: {
    autoApplicableCount: 0,
    needsReviewCount: 0,
    sourcesProcessed: 5,
    sourcesFailed: 0,
  },
  ...overrides,
});

// ───────────────────────────────────────────────────────────────
// AUTO_SUMMARY.md
// ───────────────────────────────────────────────────────────────

describe("buildAutoSummary", () => {
  it("autoApplicable が空でも markdown が生成できる", () => {
    const md = buildAutoSummary(baseReport({}));
    expect(md).toBeTruthy();
    expect(md).toContain("変更なし");
    expect(md).toContain("2026-05-12");
    expect(md).toContain("autoApplicable: 0 件");
  });

  it("autoApplicable に addRecord がある場合、件数と collection が表示される", () => {
    const report = baseReport({
      autoApplicable: [
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "test-store", name: "テスト店舗", category: "コンビニ" },
          sourceId: "rakuten-point-partners",
          confidence: 0.95,
          evidence: {
            evidenceQuote: "テスト引用",
            explicitness: 1.0,
            ambiguity: 0.05,
          },
        },
        {
          type: "addRecord",
          collection: "memberships",
          record: {
            programId: "prog-rakuten-pointcard-1pc",
            storeId: "test-store",
          },
          sourceId: "rakuten-point-partners",
          confidence: 0.96,
          evidence: {
            evidenceQuote: "テスト引用2",
            explicitness: 1.0,
            ambiguity: 0.04,
          },
        },
      ],
      summary: {
        autoApplicableCount: 2,
        needsReviewCount: 0,
        sourcesProcessed: 5,
        sourcesFailed: 0,
      },
    });
    const md = buildAutoSummary(report);
    expect(md).toContain("2 件の変更を自動反映");
    expect(md).toContain("rakuten-point-partners");
    expect(md).toContain("stores +1");
    expect(md).toContain("memberships +1");
    expect(md).toContain("平均 confidence:");
    expect(md).toContain("🤖 GitHub Actions weekly sync");
  });

  it("日付ラベルは UTC ではなく JST 暦日 (cron 21:00 UTC → 翌日 JST のずれを補正)", () => {
    // 日曜 21:00 UTC 過ぎ = 月曜 06:00 JST。UTC だと 05-17 だが JST では 05-18。
    const md = buildAutoSummary(
      baseReport({ generatedAt: "2026-05-17T22:02:02.758Z" }),
    );
    expect(md).toContain("2026-05-18");
    expect(md).not.toContain("2026-05-17");
  });

  it("自動適用された各レコードが「追加項目」に 1 行ずつ列挙される", () => {
    const report = baseReport({
      autoApplicable: [
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "bic-camera", name: "ビックカメラ", category: "家電量販店" },
          sourceId: "ponta-partners",
          confidence: 0.92,
          evidence: { evidenceQuote: "ビックカメラ", explicitness: 0.95, ambiguity: 0.05 },
        },
        {
          type: "addRecord",
          collection: "memberships",
          record: { programId: "prog-ponta-card-0.5pc", storeId: "bic-camera" },
          sourceId: "ponta-partners",
          confidence: 0.9,
          evidence: { evidenceQuote: "ビックカメラ たまる", explicitness: 0.9, ambiguity: 0.1 },
        },
      ],
      summary: {
        autoApplicableCount: 2,
        needsReviewCount: 0,
        sourcesProcessed: 5,
        sourcesFailed: 0,
      },
    });
    const md = buildAutoSummary(report);
    expect(md).toContain("## 追加項目");
    expect(md).toContain("ponta-partners / stores");
    expect(md).toContain("bic-camera — ビックカメラ (家電量販店)");
    expect(md).toContain("ponta-partners / memberships");
    expect(md).toContain("prog-ponta-card-0.5pc → bic-camera");
  });

  it("updateField の場合は変更内容が表示される", () => {
    const report = baseReport({
      autoApplicable: [
        {
          type: "updateField",
          collection: "programs",
          id: "prog-d-pointcard-0.5pc",
          field: "rate",
          from: 0.005,
          to: 0.01,
          sourceId: "d-point-partners",
          confidence: 0.95,
          evidence: {
            evidenceQuote: "テスト引用",
            explicitness: 1.0,
            ambiguity: 0.05,
          },
        },
      ],
      summary: {
        autoApplicableCount: 1,
        needsReviewCount: 0,
        sourcesProcessed: 5,
        sourcesFailed: 0,
      },
    });
    const md = buildAutoSummary(report);
    expect(md).toContain("1 件の変更を自動反映");
    expect(md).toContain("d-point-partners");
  });
});

// ───────────────────────────────────────────────────────────────
// REVIEW_QUEUE.md
// ───────────────────────────────────────────────────────────────

// PR-0a-2c: REVIEW_QUEUE の理由グループの表示順 (REASON_ORDER) の網羅。
// buildReviewQueue は REASON_ORDER の順にしか描画しないため、ReviewReason を足して
// REASON_ORDER に入れ忘れるとその理由の項目が REVIEW_QUEUE から黙って消える。
// 以後の PR (0b-3 / 3a / 4a / 4b / 5c ...) で reason を足すときもこのテストに乗る。
describe("REASON_ORDER (理由グループの表示順) の網羅", () => {
  it("REASON_LABELS / REASON_EXPLANATIONS の全キーを含み、重複が無く、余分なキーも無い", () => {
    const order = [...REASON_ORDER];
    expect(new Set(order).size, "REASON_ORDER に重複がある").toBe(order.length);
    const labelKeys = Object.keys(REASON_LABELS).sort();
    const explanationKeys = Object.keys(REASON_EXPLANATIONS).sort();
    expect(explanationKeys).toEqual(labelKeys);
    expect([...order].sort()).toEqual(labelKeys);
  });

  it("tierMove は periodChange の直前に並ぶ", () => {
    const i = REASON_ORDER.indexOf("tierMove");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(REASON_ORDER[i + 1]).toBe("periodChange");
  });

  it("PR-0b-3: sourceAutoMergeDisabled は autoMergeDisabled の直後、Z3 の 5 種は pseudoStoreTarget と missingStoreBody の間", () => {
    const at = (r: (typeof REASON_ORDER)[number]) => REASON_ORDER.indexOf(r);
    expect(at("sourceAutoMergeDisabled")).toBe(at("autoMergeDisabled") + 1);
    const z3 = [
      "targetMismatch",
      "storeNameMismatch",
      "untargetedProgram",
      "campaignRateCeiling",
      "campaignConditional",
    ] as const;
    expect(REASON_ORDER.slice(at("pseudoStoreTarget") + 1, at("missingStoreBody"))).toEqual([...z3]);
  });

  it("PR-4a: unknownCategory は excludedCategory の直前に並ぶ", () => {
    const i = REASON_ORDER.indexOf("unknownCategory");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(REASON_ORDER[i + 1]).toBe("excludedCategory");
  });
});

// PR-4a: 語彙外カテゴリの新規店は REVIEW_QUEUE に見出し・説明付きで出て、対応案は sync:approve ではなく
// alias / 語彙を足す PR (そのまま承認すると seed 契約で CI が落ちるため)。
describe("buildReviewQueue: PR-4a の unknownCategory", () => {
  const item: Proposal = {
    type: "addRecord",
    collection: "stores",
    record: { id: "lalaport", name: "ららぽーと", category: "ショッピングモール" },
    sourceId: "jcb-jpoint-partners",
    confidence: 0.95,
    evidence: { evidenceQuote: "ららぽーと ポイント 2 倍", explicitness: 0.95, ambiguity: 0 },
    reviewReason: "unknownCategory",
    proposalId: "sto-unknown001",
  };

  it("見出し・説明・対応案が出る", () => {
    const md = buildReviewQueue(
      baseReport({
        needsReview: [item],
        summary: { autoApplicableCount: 0, needsReviewCount: 1, sourcesProcessed: 1, sourcesFailed: 0 },
      }),
    );
    expect(md).toContain(`### ${REASON_LABELS.unknownCategory} (1 件)`);
    expect(md).toContain("unknownCategory=1");
    expect(md).toContain(REASON_EXPLANATIONS.unknownCategory);
    expect(md).toContain("EXTRACTED_CATEGORY_ALIASES");
    expect(md).not.toContain("npm run sync:approve -- sto-unknown001");
  });
});

// PR-0b-3: 新しい 6 種の reason が REVIEW_QUEUE に見出し付きで出る (REASON_ORDER に無い reason は黙って消えるため)。
describe("buildReviewQueue: PR-0b-3 の reason と判定詳細", () => {
  const Z3_REASONS = [
    "untargetedProgram",
    "campaignConditional",
    "campaignRateCeiling",
    "targetMismatch",
    "sourceAutoMergeDisabled",
    "storeNameMismatch",
  ] as const;
  const mk = (
    reason: (typeof Z3_REASONS)[number],
    reviewDetail?: string,
  ): Proposal => ({
    type: "addRecord",
    collection: "programs",
    record: { id: `prog-${reason}`, name: reason, rate: 0.03, currencyId: "d-pt" },
    sourceId: "d-pay-campaigns",
    confidence: 0.95,
    evidence: { evidenceQuote: "引用", explicitness: 0.95, ambiguity: 0 },
    reviewReason: reason,
    ...(reviewDetail !== undefined ? { reviewDetail } : {}),
  });

  it.each(Z3_REASONS)("%s は `### <label> (1 件)` の見出しで描画される", (reason) => {
    const md = buildReviewQueue(
      baseReport({
        needsReview: [mk(reason)],
        summary: { autoApplicableCount: 0, needsReviewCount: 1, sourcesProcessed: 1, sourcesFailed: 0 },
      }),
    );
    expect(md).toContain(`### ${REASON_LABELS[reason]} (1 件)`);
    expect(md).toContain(`${reason}=1`);
  });

  it("危険な 5 種の説明は全額に乗ること・--accept-risk を書き、sourceAutoMergeDisabled は解除条件を書く", () => {
    for (const r of Z3_REASONS) {
      if (r === "sourceAutoMergeDisabled") {
        expect(REASON_EXPLANATIONS[r]).not.toContain("全額に乗る");
        expect(REASON_EXPLANATIONS[r]).toContain("--accept-risk は不要");
        expect(REASON_EXPLANATIONS[r]).toContain("4 週");
      } else {
        expect(REASON_EXPLANATIONS[r], r).toContain("--accept-risk");
        expect(REASON_EXPLANATIONS[r], r).toContain("全額に乗る");
      }
    }
  });

  it("危険な reason の対応案は「原則見送り」+ --accept-risk、sourceAutoMergeDisabled は通常の approve コマンド", () => {
    const risky = { ...mk("campaignRateCeiling"), proposalId: "pro-risky00001" };
    const safe = { ...mk("sourceAutoMergeDisabled"), proposalId: "pro-safe000001" };
    const md = buildReviewQueue(
      baseReport({
        needsReview: [risky, safe],
        summary: { autoApplicableCount: 0, needsReviewCount: 2, sourcesProcessed: 1, sourcesFailed: 0 },
      }),
    );
    expect(md).toContain("`npm run sync:approve -- pro-risky00001 --accept-risk`");
    expect(md).toContain("- 対応案: 原則見送り");
    expect(md).toContain("取り込むなら `npm run sync:approve -- pro-safe000001`、不要なら無視");
  });

  it("reviewDetail がある項目は『判定詳細』行を描画し、無い項目では描画しない", () => {
    const withDetail = mk("campaignConditional", "最大:「最大」@name");
    const without = mk("campaignRateCeiling");
    const md = buildReviewQueue(
      baseReport({
        needsReview: [withDetail, without],
        summary: { autoApplicableCount: 0, needsReviewCount: 2, sourcesProcessed: 1, sourcesFailed: 0 },
      }),
    );
    expect(md).toContain("- 判定詳細: 最大:「最大」@name");
    expect(md.match(/- 判定詳細:/g)).toHaveLength(1);
  });
});

describe("buildReviewQueue", () => {
  it("tierMove の項目はラベルと説明 (旧 tier の tombstone と同時に承認) 付きで periodChange より前に出る", () => {
    const tier: Proposal = {
      type: "addRecord",
      collection: "memberships",
      record: { programId: "prog-jcb-jpoint-gold-2x", storeId: "takashimaya" },
      sourceId: "jcb-jpoint-partners",
      confidence: 0.9025,
      evidence: { evidenceQuote: "高島屋 ポイント 2 倍", explicitness: 0.95, ambiguity: 0.05 },
      reviewReason: "tierMove",
    };
    const period: Proposal = {
      type: "updateField",
      collection: "programs",
      id: "prog-x",
      field: "validTo",
      from: "2026-09-30",
      to: "2026-10-31",
      sourceId: "d-pay-campaigns",
      confidence: 0.95,
      evidence: { evidenceQuote: "10月31日まで", explicitness: 0.95, ambiguity: 0.05 },
      reviewReason: "periodChange",
    };
    const md = buildReviewQueue(
      baseReport({
        needsReview: [period, tier],
        summary: {
          autoApplicableCount: 0,
          needsReviewCount: 2,
          sourcesProcessed: 2,
          sourcesFailed: 0,
        },
      }),
    );
    expect(md).toContain(`### ${REASON_LABELS.tierMove} (1 件)`);
    expect(md).toContain("REMOVED_MEMBERSHIP_IDS");
    expect(md).toContain("tierMove=1");
    expect(md.indexOf(REASON_LABELS.tierMove)).toBeLessThan(
      md.indexOf(REASON_LABELS.periodChange),
    );
  });

  it("needsReview が空でも markdown が生成できる", () => {
    const md = buildReviewQueue(baseReport({}));
    expect(md).toBeTruthy();
    expect(md).toContain("週次マスタ同期");
    expect(md).toContain("要レビュー: 0 件");
    expect(md).toContain("要レビュー項目はありません");
  });

  it("needsReview に項目がある場合、理由別セクションが生成される", () => {
    const report = baseReport({
      needsReview: [
        {
          type: "addRecord",
          collection: "memberships",
          record: {
            programId: "prog-ponta-card-0.5pc",
            storeId: "test-store",
          },
          sourceId: "ponta-partners",
          confidence: 0.49,
          evidence: {
            evidenceQuote: "PickUpたまる・つかえる",
            explicitness: 0.7,
            ambiguity: 0.3,
          },
          reviewReason: "lowConfidence",
        },
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "bank-xyz", name: "XYZ銀行", category: "金融" },
          sourceId: "rakuten-point-partners",
          confidence: 0.92,
          evidence: {
            evidenceQuote: "銀行の引用",
            explicitness: 0.95,
            ambiguity: 0.05,
          },
          reviewReason: "excludedCategory",
        },
      ],
      summary: {
        autoApplicableCount: 0,
        needsReviewCount: 2,
        sourcesProcessed: 5,
        sourcesFailed: 0,
      },
    });
    const md = buildReviewQueue(report);
    expect(md).toContain("要レビュー: 2 件");
    expect(md).toContain("🟡 lowConfidence");
    expect(md).toContain("🟠 excludedCategory");
    expect(md).toContain("ponta-partners");
    expect(md).toContain("rakuten-point-partners");
    expect(md).toContain("## 操作");
    // Sections exist
    expect(md).toContain("<details>");
    expect(md).toContain("</details>");
  });

  it("各項目に proposalId と sync:approve コマンドが表示される (B-4)", () => {
    const stamped: Proposal = {
      type: "addRecord",
      collection: "programs",
      record: { id: "prog-x", name: "X キャンペーン", rate: 0.05, currencyId: "d-pt" },
      sourceId: "d-pay-campaigns",
      confidence: 0.93,
      evidence: { evidenceQuote: "引用", explicitness: 0.95, ambiguity: 0.02 },
      proposalId: "pro-abc1234567",
      reviewReason: "idCollision",
    };
    const md = buildReviewQueue(
      baseReport({
        needsReview: [stamped],
        summary: {
          autoApplicableCount: 0,
          needsReviewCount: 1,
          sourcesProcessed: 1,
          sourcesFailed: 0,
        },
      }),
    );
    // 見出しに ID、対応案に approve コマンド、操作セクションに半自動手順
    expect(md).toContain("#### `pro-abc1234567`");
    expect(md).toContain("npm run sync:approve -- pro-abc1234567");
    expect(md).toContain("npm run sync:approve -- --list");
  });

  it("proposalId 未付与 (旧 run) でも computeProposalId fallback で ID が表示される", () => {
    const legacy: Proposal = {
      type: "addRecord",
      collection: "stores",
      record: { id: "legacy-store", name: "レガシー店" },
      sourceId: "ponta-partners",
      confidence: 0.5,
      evidence: { evidenceQuote: "引用", explicitness: 0.6, ambiguity: 0.2 },
      reviewReason: "lowConfidence",
    };
    const md = buildReviewQueue(
      baseReport({
        needsReview: [legacy],
        summary: {
          autoApplicableCount: 0,
          needsReviewCount: 1,
          sourcesProcessed: 1,
          sourcesFailed: 0,
        },
      }),
    );
    expect(md).toMatch(/#### `sto-[0-9a-f]{10}`/);
  });

  it("混在ケース: autoApplicable + needsReview の両方があっても両ファイル生成が落ちない", () => {
    const report = baseReport({
      autoApplicable: [
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "good-store", name: "グッドストア", category: "コンビニ" },
          sourceId: "d-point-partners",
          confidence: 0.95,
          evidence: {
            evidenceQuote: "グッドストアの引用",
            explicitness: 1.0,
            ambiguity: 0.05,
          },
        },
      ],
      needsReview: [
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "good-store", name: "グッドストア", category: "コンビニ" },
          sourceId: "rakuten-point-partners",
          confidence: 0.95,
          evidence: {
            evidenceQuote: "グッドストアの引用 (楽天)",
            explicitness: 1.0,
            ambiguity: 0.05,
          },
          reviewReason: "idCollision",
        },
      ],
      summary: {
        autoApplicableCount: 1,
        needsReviewCount: 1,
        sourcesProcessed: 5,
        sourcesFailed: 0,
      },
    });
    const autoMd = buildAutoSummary(report);
    const reviewMd = buildReviewQueue(report);

    // Both succeed
    expect(autoMd).toBeTruthy();
    expect(reviewMd).toBeTruthy();

    // AUTO_SUMMARY correctness
    expect(autoMd).toContain("1 件の変更を自動反映");
    expect(autoMd).toContain("d-point-partners");

    // REVIEW_QUEUE correctness
    expect(reviewMd).toContain("要レビュー: 1 件");
    expect(reviewMd).toContain("🟠 idCollision");
  });

  it("idCollision が多数でも (> 20) 省略メッセージが表示される", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      type: "addRecord" as const,
      collection: "stores" as const,
      record: { id: `store-${i}`, name: `ストア${i}`, category: "コンビニ" },
      sourceId: "ponta-partners",
      confidence: 0.92,
      evidence: {
        evidenceQuote: `引用${i}`,
        explicitness: 0.95,
        ambiguity: 0.05,
      },
      reviewReason: "idCollision" as const,
    }));
    const report = baseReport({
      needsReview: items,
      summary: {
        autoApplicableCount: 0,
        needsReviewCount: 25,
        sourcesProcessed: 5,
        sourcesFailed: 0,
      },
    });
    const md = buildReviewQueue(report);
    expect(md).toContain("他 5 件は省略");
  });
});

// ───────────────────────────────────────────────────────────────
// SYNC_HISTORY
// ───────────────────────────────────────────────────────────────

describe("buildSyncHistoryEntry", () => {
  // テスト用の決定的 resolver (production seed/registry 非依存)
  const stubResolver = {
    store: (id: string) => (id === "store-a" ? "ストアA" : id === "store-b" ? "ストアB" : id),
    program: (id: string) => (id === "prog-x" ? "プログラムX" : id),
    currency: (id: string) => id,
    card: (id: string) => id,
    paymentApp: (id: string) => id,
    pointCard: (id: string) => id,
    source: (id: string) =>
      id === "ponta-partners"
        ? "Pontaポイント 提携店"
        : id === "rakuten-point-partners"
          ? "楽天ポイントカード 加盟店"
          : id,
  };

  it("autoApplicable=0 + needsReview=0 のとき null (本当に変化なしの週)", () => {
    expect(buildSyncHistoryEntry(baseReport({}), stubResolver)).toBeNull();
  });

  it("autoApplicable=0 + needsReview>0 のとき review-only entry を返す (PR #61)", () => {
    const ev = { evidenceQuote: "x", explicitness: 0.95, ambiguity: 0.05 };
    const report = baseReport({
      autoApplicable: [],
      needsReview: [
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "store-a", name: "A", category: "コンビニ" },
          sourceId: "src",
          confidence: 0.9,
          evidence: ev,
          reviewReason: "storeAdditionsDisabled",
        },
        {
          type: "addRecord",
          collection: "memberships",
          record: { programId: "prog-x", storeId: "store-orphan" },
          sourceId: "src",
          confidence: 0.9,
          evidence: ev,
          reviewReason: "missingStoreBody",
        },
        {
          type: "addRecord",
          collection: "memberships",
          record: { programId: "prog-x", storeId: "store-b" },
          sourceId: "src",
          confidence: 0.5,
          evidence: ev,
          reviewReason: "lowConfidence",
        },
      ],
      summary: {
        autoApplicableCount: 0,
        needsReviewCount: 3,
        sourcesProcessed: 1,
        sourcesFailed: 0,
      },
    });
    const entry = buildSyncHistoryEntry(report, stubResolver)!;
    expect(entry).not.toBeNull();
    expect(entry.totalCount).toBe(0);
    expect(entry.avgConfidence).toBeNull();
    expect(entry.bySource).toEqual([]);
    expect(entry.items).toEqual([]);
    expect(entry.reviewStats?.total).toBe(3);
    expect(entry.reviewStats?.byReason).toEqual({
      storeAdditionsDisabled: 1,
      missingStoreBody: 1,
      lowConfidence: 1,
    });
  });

  it("autoApplicable + needsReview の両方ある entry は reviewStats も付与される", () => {
    const ev = { evidenceQuote: "x", explicitness: 0.95, ambiguity: 0.05 };
    const report = baseReport({
      autoApplicable: [
        {
          type: "addRecord",
          collection: "memberships",
          record: { programId: "prog-x", storeId: "store-a" },
          sourceId: "ponta-partners",
          confidence: 0.95,
          evidence: ev,
        },
      ],
      needsReview: [
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "store-y", name: "Y", category: "コンビニ" },
          sourceId: "ponta-partners",
          confidence: 0.95,
          evidence: ev,
          reviewReason: "idCollision",
        },
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "store-z", name: "Z", category: "コンビニ" },
          sourceId: "ponta-partners",
          confidence: 0.95,
          evidence: ev,
          reviewReason: "idCollision",
        },
      ],
      summary: {
        autoApplicableCount: 1,
        needsReviewCount: 2,
        sourcesProcessed: 1,
        sourcesFailed: 0,
      },
    });
    const entry = buildSyncHistoryEntry(report, stubResolver)!;
    expect(entry.totalCount).toBe(1);
    expect(entry.reviewStats?.total).toBe(2);
    expect(entry.reviewStats?.byReason).toEqual({ idCollision: 2 });
  });

  it("autoApplicable から日本語化された summary + label を構築する", () => {
    const report = baseReport({
      generatedAt: "2026-05-17T22:02:12.000Z", // JST 翌日 2026-05-18
      autoApplicable: [
        {
          type: "addRecord",
          collection: "memberships",
          record: { programId: "prog-x", storeId: "store-a" },
          sourceId: "ponta-partners",
          confidence: 0.92,
          evidence: { evidenceQuote: "a", explicitness: 0.95, ambiguity: 0.05 },
        },
        {
          type: "addRecord",
          collection: "memberships",
          record: { programId: "prog-x", storeId: "store-b" },
          sourceId: "ponta-partners",
          confidence: 0.88,
          evidence: { evidenceQuote: "b", explicitness: 0.92, ambiguity: 0.08 },
        },
        {
          type: "addRecord",
          collection: "stores",
          record: { id: "store-c", name: "Cマート", category: "コンビニ" },
          sourceId: "rakuten-point-partners",
          confidence: 0.95,
          evidence: { evidenceQuote: "c", explicitness: 1, ambiguity: 0.05 },
        },
      ],
      summary: {
        autoApplicableCount: 3,
        needsReviewCount: 0,
        sourcesProcessed: 7,
        sourcesFailed: 0,
      },
    });
    const entry = buildSyncHistoryEntry(report, stubResolver)!;
    expect(entry.date).toBe("2026-05-18");
    expect(entry.totalCount).toBe(3);
    expect(entry.sourcesProcessed).toBe(7);
    expect(entry.avgConfidence).toBeCloseTo((0.92 + 0.88 + 0.95) / 3, 2);

    // bySource: label が解決されている (memberships → 提携店舗, stores → 店舗)
    expect(entry.bySource).toHaveLength(2);
    expect(entry.bySource).toContainEqual({
      sourceId: "ponta-partners",
      collection: "memberships",
      count: 2,
      sourceLabel: "Pontaポイント 提携店",
      collectionLabel: "提携店舗",
    });
    expect(entry.bySource).toContainEqual({
      sourceId: "rakuten-point-partners",
      collection: "stores",
      count: 1,
      sourceLabel: "楽天ポイントカード 加盟店",
      collectionLabel: "店舗",
    });

    // items: summary が日本語化されている (prog-x → プログラムX, store-a → ストアA)
    expect(entry.items).toHaveLength(3);
    expect(entry.items[0].summary).toBe("プログラムX → ストアA");
    expect(entry.items[1].summary).toBe("プログラムX → ストアB");
    expect(entry.items[2].summary).toBe("Cマート (コンビニ)"); // stores 形式
    expect(entry.items[0].sourceLabel).toBe("Pontaポイント 提携店");
    expect(entry.items[0].collectionLabel).toBe("提携店舗");

    expect(entry.commitSha).toBeUndefined();
    expect(entry.prNumber).toBeUndefined();
  });

  it("resolver が解決できない ID は slug にフォールバック", () => {
    const passthroughResolver = {
      store: (id: string) => id,
      program: (id: string) => id,
      currency: (id: string) => id,
      card: (id: string) => id,
      paymentApp: (id: string) => id,
      pointCard: (id: string) => id,
      source: (id: string) => id,
    };
    const report = baseReport({
      autoApplicable: [
        {
          type: "addRecord",
          collection: "memberships",
          record: { programId: "prog-unknown", storeId: "store-unknown" },
          sourceId: "src-unknown",
          confidence: 0.91,
          evidence: { evidenceQuote: "x", explicitness: 0.95, ambiguity: 0.05 },
        },
      ],
      summary: {
        autoApplicableCount: 1,
        needsReviewCount: 0,
        sourcesProcessed: 1,
        sourcesFailed: 0,
      },
    });
    const entry = buildSyncHistoryEntry(report, passthroughResolver)!;
    expect(entry.items[0].summary).toBe("prog-unknown → store-unknown");
    // collection は label がある (hard-coded map なので)
    expect(entry.bySource[0].collectionLabel).toBe("提携店舗");
    // source は label が無い (resolver が slug 返却なので slug がそのまま label に入る)
    expect(entry.bySource[0].sourceLabel).toBe("src-unknown");
  });
});

describe("appendSyncHistory", () => {
  const baseEntry = {
    date: "2026-05-21",
    generatedAt: "2026-05-20T22:30:17.684Z",
    totalCount: 43,
    avgConfidence: 0.9,
    sourcesProcessed: 13,
    bySource: [],
    items: [],
  };

  it("既存ファイル無し + 新規 entry → entries=[entry]", () => {
    const out = appendSyncHistory(null, baseEntry);
    expect(out.version).toBe(1);
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0]).toBe(baseEntry);
  });

  it("新規 entry が null なら既存ファイルをそのまま返す", () => {
    const existing: SyncHistoryFile = {
      version: 1,
      entries: [{ ...baseEntry, generatedAt: "2026-05-14T22:00:00Z" }],
    };
    const out = appendSyncHistory(existing, null);
    expect(out).toBe(existing);
  });

  // PR-0b-3: 旧仕様 (同じ generatedAt は追加しない = 既存が残る) を反転。downgrade 後の Regenerate が勝つ。
  it("同じ generatedAt が既に居れば後勝ちで置換する (件数は 1 のまま、downgrade 後の値が残る)", () => {
    const existing: SyncHistoryFile = {
      version: 1,
      entries: [baseEntry],
    };
    const dup = { ...baseEntry, totalCount: 999 }; // 同じ generatedAt
    const out = appendSyncHistory(existing, dup);
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0].totalCount).toBe(999); // 後から来た値が残る
  });

  it("3 件の中央の entry を置換しても順序が保たれ、既存の commitSha / prNumber を引き継ぐ", () => {
    const newer = { ...baseEntry, generatedAt: "2026-05-27T22:00:00Z", date: "2026-05-28" };
    const middle = { ...baseEntry, commitSha: "abc1234", prNumber: 77 };
    const older = { ...baseEntry, generatedAt: "2026-05-13T22:00:00Z", date: "2026-05-14" };
    const existing: SyncHistoryFile = { version: 1, entries: [newer, middle, older] };
    const out = appendSyncHistory(existing, { ...baseEntry, totalCount: 0, avgConfidence: null });
    expect(out.entries.map((e) => e.generatedAt)).toEqual([
      newer.generatedAt,
      baseEntry.generatedAt,
      older.generatedAt,
    ]);
    expect(out.entries[1].totalCount).toBe(0);
    expect(out.entries[1].commitSha).toBe("abc1234");
    expect(out.entries[1].prNumber).toBe(77);
    expect(out.entries[0]).toBe(newer);
    expect(out.entries[2]).toBe(older);
  });

  it("downgrade 経路の再現: auto 3 件で append → safetyFailed に降格した report で再 append すると entry は 1 件で auto 0", () => {
    const ev = { evidenceQuote: "x", explicitness: 0.95, ambiguity: 0.05 };
    const auto: Proposal[] = [0, 1, 2].map((i) => ({
      type: "updateField",
      collection: "programs",
      id: `prog-jcb-jpoint-${i}`,
      field: "rate",
      from: 0.105,
      to: 0.2,
      sourceId: "jcb-jpoint-partners",
      confidence: 0.95,
      evidence: ev,
    }));
    const review: Proposal = {
      type: "addRecord",
      collection: "stores",
      record: { id: "s", name: "S" },
      sourceId: "jcb-jpoint-partners",
      confidence: 0.5,
      evidence: ev,
      reviewReason: "lowConfidence",
    };
    const passthrough = {
      store: (id: string) => id,
      program: (id: string) => id,
      currency: (id: string) => id,
      card: (id: string) => id,
      paymentApp: (id: string) => id,
      pointCard: (id: string) => id,
      source: (id: string) => id,
    };
    const generated = baseReport({
      generatedAt: "2026-07-22T22:07:42.738Z",
      autoApplicable: auto,
      needsReview: [review],
      summary: { autoApplicableCount: 3, needsReviewCount: 1, sourcesProcessed: 15, sourcesFailed: 0 },
    });
    const first = appendSyncHistory(null, buildSyncHistoryEntry(generated, passthrough));
    expect(first.entries[0].totalCount).toBe(3);
    // workflow の Downgrade: autoApplicable を safetyFailed として needsReview に移す (generatedAt は同じ)
    const downgraded = baseReport({
      generatedAt: generated.generatedAt,
      autoApplicable: [],
      needsReview: [review, ...auto.map((p) => ({ ...p, reviewReason: "safetyFailed" as const }))],
      summary: { autoApplicableCount: 0, needsReviewCount: 4, sourcesProcessed: 15, sourcesFailed: 0 },
    });
    const second = appendSyncHistory(first, buildSyncHistoryEntry(downgraded, passthrough));
    expect(second.entries).toHaveLength(1);
    expect(second.entries[0].totalCount).toBe(0);
    expect(second.entries[0].items).toEqual([]);
    expect(second.entries[0].reviewStats).toEqual({
      total: 4,
      byReason: { lowConfidence: 1, safetyFailed: 3 },
    });
    // 虚偽 entry の訂正 (reclassifyAutoAsReview) と同じ結果になる
    expect(reclassifyAutoAsReview(first.entries[0], "safetyFailed")).toEqual(second.entries[0]);
  });

  it("新規 entry が先頭に prepend される (newest first)", () => {
    const older = { ...baseEntry, generatedAt: "2026-05-14T22:00:00Z", date: "2026-05-15" };
    const existing: SyncHistoryFile = {
      version: 1,
      entries: [older],
    };
    const out = appendSyncHistory(existing, baseEntry);
    expect(out.entries).toHaveLength(2);
    expect(out.entries[0].date).toBe("2026-05-21"); // 新規が先頭
    expect(out.entries[1].date).toBe("2026-05-15");
  });

  it(`entries が ${SYNC_HISTORY_MAX_ENTRIES} 件で truncate される`, () => {
    const existing: SyncHistoryFile = {
      version: 1,
      entries: Array.from({ length: SYNC_HISTORY_MAX_ENTRIES }, (_, i) => ({
        ...baseEntry,
        generatedAt: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      })),
    };
    const out = appendSyncHistory(existing, baseEntry);
    expect(out.entries).toHaveLength(SYNC_HISTORY_MAX_ENTRIES);
    expect(out.entries[0].date).toBe("2026-05-21"); // 新規が先頭
    // newest first なので末尾 (loop で最後に push された 1 件) が truncate で落ちる
    const droppedDate = `2024-01-${String(SYNC_HISTORY_MAX_ENTRIES).padStart(2, "0")}`;
    expect(
      out.entries.find((e) => e.date === droppedDate),
    ).toBeUndefined();
    // 直前の entry はまだ残っている
    const survivorDate = `2024-01-${String(SYNC_HISTORY_MAX_ENTRIES - 1).padStart(2, "0")}`;
    expect(
      out.entries.find((e) => e.date === survivorDate),
    ).toBeDefined();
  });

  it("既存 entries が上限を超えていても、次の append で上限に切り詰める", () => {
    // 上限を引き下げた直後 (旧上限で溜まったファイル) を想定: 上限 + 10 件の既存に 1 件 append
    const overLimit = SYNC_HISTORY_MAX_ENTRIES + 10;
    const existing: SyncHistoryFile = {
      version: 1,
      entries: Array.from({ length: overLimit }, (_, i) => ({
        ...baseEntry,
        generatedAt: `2024-01-01T00:00:00.${String(i).padStart(3, "0")}Z`,
        date: `old-${i}`,
      })),
    };
    const out = appendSyncHistory(existing, baseEntry);
    expect(out.entries).toHaveLength(SYNC_HISTORY_MAX_ENTRIES);
    expect(out.entries[0]).toBe(baseEntry); // 新規が先頭
    // 既存の先頭 (新しい側) から SYNC_HISTORY_MAX_ENTRIES - 1 件だけ残り、以降は落ちる
    expect(out.entries[out.entries.length - 1].date).toBe(
      `old-${SYNC_HISTORY_MAX_ENTRIES - 2}`,
    );
    expect(
      out.entries.find((e) => e.date === `old-${SYNC_HISTORY_MAX_ENTRIES - 1}`),
    ).toBeUndefined();
  });
});

describe("reclassifyAutoAsReview (PR-0b-3)", () => {
  const entry = {
    date: "2026-07-09",
    generatedAt: "2026-07-08T22:11:52.499Z",
    totalCount: 81,
    avgConfidence: 0.93,
    sourcesProcessed: 15,
    bySource: [{ sourceId: "ponta-partners", collection: "memberships", count: 81 }],
    items: [{ sourceId: "ponta-partners", collection: "memberships", summary: "x" }],
    reviewStats: { total: 115, byReason: { lowConfidence: 100, idCollision: 15 } },
  };

  it("auto 81 / review 115 の entry は auto 0 / review 196 (safetyFailed 81)、items / bySource は空、avgConfidence は null", () => {
    const out = reclassifyAutoAsReview(entry, "safetyFailed");
    expect(out.totalCount).toBe(0);
    expect(out.avgConfidence).toBeNull();
    expect(out.bySource).toEqual([]);
    expect(out.items).toEqual([]);
    expect(out.reviewStats).toEqual({
      total: 196,
      byReason: { lowConfidence: 100, idCollision: 15, safetyFailed: 81 },
    });
    // date / generatedAt / sourcesProcessed は変えない
    expect(out.date).toBe(entry.date);
    expect(out.generatedAt).toBe(entry.generatedAt);
    expect(out.sourcesProcessed).toBe(15);
  });

  it("既に同じ reason があれば加算する / reviewStats が無い entry にも付ける", () => {
    const withSafety = { ...entry, reviewStats: { total: 2, byReason: { safetyFailed: 2 } } };
    expect(reclassifyAutoAsReview(withSafety, "safetyFailed").reviewStats).toEqual({
      total: 83,
      byReason: { safetyFailed: 83 },
    });
    const noStats = { ...entry, reviewStats: undefined };
    expect(reclassifyAutoAsReview(noStats, "safetyFailed").reviewStats).toEqual({
      total: 81,
      byReason: { safetyFailed: 81 },
    });
  });

  it("auto 0 の entry はそのまま返す", () => {
    const zero = { ...entry, totalCount: 0 };
    expect(reclassifyAutoAsReview(zero, "safetyFailed")).toBe(zero);
  });
});

describe("buildSyncHistoryMarkdown", () => {
  it("空の history でも生成できる", () => {
    const md = buildSyncHistoryMarkdown({ version: 1, entries: [] });
    expect(md).toContain("週次マスタ同期 履歴");
    expect(md).toContain("履歴はまだありません");
  });

  it("entry の date / 件数 / bySource / items が出力される", () => {
    const md = buildSyncHistoryMarkdown({
      version: 1,
      entries: [
        {
          date: "2026-05-21",
          generatedAt: "2026-05-20T22:30:17Z",
          totalCount: 2,
          avgConfidence: 0.9,
          sourcesProcessed: 7,
          commitSha: "abc1234",
          bySource: [
            { sourceId: "src-a", collection: "memberships", count: 2 },
          ],
          items: [
            { sourceId: "src-a", collection: "memberships", summary: "prog-x → store-1" },
            { sourceId: "src-a", collection: "memberships", summary: "prog-x → store-2" },
          ],
        },
      ],
    });
    expect(md).toContain("## 2026-05-21 (auto 2 件)"); // PR #61: ヘッダ形式変更
    expect(md).toContain("commit: [`abc1234`]");
    expect(md).toContain("平均 confidence: 0.90");
    // ヘッダは日本語、 label があれば優先表示
    expect(md).toContain("| 取得元 | 種別 | 件数 |");
    expect(md).toContain("| src-a | memberships | 2 |"); // label 無し → slug fallback
    expect(md).toContain("追加項目 2 件");
    expect(md).toContain("prog-x → store-1");
    expect(md).toContain("prog-x → store-2");
  });

  it("sourceLabel / collectionLabel があれば label 優先で表示", () => {
    const md = buildSyncHistoryMarkdown({
      version: 1,
      entries: [
        {
          date: "2026-05-21",
          generatedAt: "2026-05-20T22:30:17Z",
          totalCount: 1,
          avgConfidence: 0.9,
          sourcesProcessed: 5,
          bySource: [
            {
              sourceId: "ponta-partners",
              collection: "memberships",
              count: 1,
              sourceLabel: "Pontaポイント 提携店",
              collectionLabel: "提携店舗",
            },
          ],
          items: [
            {
              sourceId: "ponta-partners",
              collection: "memberships",
              summary: "Pontaカード提示 0.5% → アルビス",
              sourceLabel: "Pontaポイント 提携店",
              collectionLabel: "提携店舗",
            },
          ],
        },
      ],
    });
    expect(md).toContain("| Pontaポイント 提携店 | 提携店舗 | 1 |");
    expect(md).toContain("### Pontaポイント 提携店 / 提携店舗 (1)");
    expect(md).toContain("Pontaカード提示 0.5% → アルビス");
  });
});


// ───────────────────────────────────────────────────────────────
// buildLabelResolver: 同 run aware (PR #55 で追加)
// ───────────────────────────────────────────────────────────────

describe("buildLabelResolver: 同 run aware", () => {
  const ev = { evidenceQuote: "x", explicitness: 1, ambiguity: 0 };

  it("引数無しでも seed の lookup は機能する", () => {
    const r = buildLabelResolver();
    // 未存在 ID は slug を返す
    expect(r.program("prog-totally-new")).toBe("prog-totally-new");
    // seed に居る既知 program は名前を返す (実 seed 依存だが prog-rakuten-pointcard-0.5pc は存在)
    expect(r.program("prog-rakuten-pointcard-0.5pc")).not.toBe("prog-rakuten-pointcard-0.5pc");
  });

  it("同 run の auto programs を name lookup に注入できる", () => {
    const sameRunAuto: Proposal[] = [
      {
        type: "addRecord",
        collection: "programs",
        record: {
          id: "prog-new-touch-conveni",
          name: "対象コンビニ・飲食店でタッチ決済 +7%",
          rate: 0.07,
          currencyId: "v-pt",
        },
        sourceId: "smbc-vpoint-up",
        confidence: 0.95,
        evidence: ev,
      },
    ];
    const r = buildLabelResolver(sameRunAuto);
    expect(r.program("prog-new-touch-conveni")).toBe(
      "対象コンビニ・飲食店でタッチ決済 +7%",
    );
  });

  it("同 run の auto stores も name lookup に注入できる", () => {
    const sameRunAuto: Proposal[] = [
      {
        type: "addRecord",
        collection: "stores",
        record: { id: "store-new-cafe", name: "新カフェ", category: "飲食" },
        sourceId: "rakuten-point-partners",
        confidence: 0.95,
        evidence: ev,
      },
    ];
    const r = buildLabelResolver(sameRunAuto);
    expect(r.store("store-new-cafe")).toBe("新カフェ");
  });

  it("needsReview (reviewReason 付き) は注入されない", () => {
    // proposePrograms で idCollision された program は needsReview 側にあるが、
    // buildLabelResolver は引数で渡したものを全部注入する設計。
    // 注: 実用上は autoApplicable だけを渡すので reviewReason 付きは来ないが、
    // 万一渡しても rec に id/name があれば取り込む (defensive、ただし
    // membership 側は missingProgramBody で降格してるので summary に出ない)
    const sameRunAuto: Proposal[] = [
      {
        type: "addRecord",
        collection: "programs",
        record: { id: "prog-with-review", name: "レビュー必須 prog", rate: 0.05, currencyId: "v-pt" },
        sourceId: "src",
        confidence: 0.95,
        evidence: ev,
        reviewReason: "idCollision",
      },
    ];
    const r = buildLabelResolver(sameRunAuto);
    // 引数経由で渡されたものは取り込む (caller 側で autoApplicable のみ
    // 渡す前提)。これは仕様として明示しておく。
    expect(r.program("prog-with-review")).toBe("レビュー必須 prog");
  });

  it("seed の name が既存なら同 run の同 id では上書きされない (既存優先)", () => {
    // 通常運用では起きないが防御的に。
    const sameRunAuto: Proposal[] = [
      {
        type: "addRecord",
        collection: "programs",
        record: { id: "prog-rakuten-pointcard-0.5pc", name: "上書きされてはいけない", rate: 0.005, currencyId: "rakuten-point" },
        sourceId: "src",
        confidence: 0.95,
        evidence: ev,
      },
    ];
    const r = buildLabelResolver(sameRunAuto);
    expect(r.program("prog-rakuten-pointcard-0.5pc")).not.toBe("上書きされてはいけない");
  });
});

describe("buildSyncHistoryEntry: 同 run aware で新規 program/store summary が日本語化", () => {
  const base: ProposalReport = {
    generatedAt: "2026-05-28T00:00:00Z",
    fromSeedVersion: 39,
    toSeedVersion: 39,
    autoApplicable: [],
    needsReview: [],
    summary: { autoApplicableCount: 0, needsReviewCount: 0, sourcesProcessed: 1, sourcesFailed: 0 },
  };

  it("同 run で program 本体 + membership が両方 auto なら summary も日本語化", () => {
    const ev = { evidenceQuote: "x", explicitness: 1, ambiguity: 0 };
    const report: ProposalReport = {
      ...base,
      autoApplicable: [
        // 注: 実運用では proposePrograms が idCollision を付けるので
        // 同 run で program が auto になることはあまり無いが、API としては
        // 「同時 auto」のケースを保証する
        {
          type: "addRecord",
          collection: "programs",
          record: {
            id: "prog-new-touch",
            name: "新タッチ決済 +7%",
            rate: 0.07,
            currencyId: "v-pt",
          },
          sourceId: "smbc-vpoint-up",
          confidence: 0.95,
          evidence: ev,
        },
        {
          type: "addRecord",
          collection: "memberships",
          record: { programId: "prog-new-touch", storeId: "store-x" },
          sourceId: "smbc-vpoint-up",
          confidence: 0.95,
          evidence: ev,
        },
      ],
      summary: { autoApplicableCount: 2, needsReviewCount: 0, sourcesProcessed: 1, sourcesFailed: 0 },
    };
    const entry = buildSyncHistoryEntry(report)!;
    // membership の summary が「prog-new-touch → ...」ではなく日本語名で resolve
    const membershipItem = entry.items.find((i) => i.collection === "memberships");
    expect(membershipItem?.summary).toContain("新タッチ決済 +7%");
    expect(membershipItem?.summary).not.toMatch(/^prog-new-touch →/);
  });
});
