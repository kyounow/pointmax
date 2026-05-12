import { describe, it, expect } from "vitest";
import { buildAutoSummary, buildReviewQueue } from "./report";
import type { ProposalReport } from "./types";

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
          collection: "loyaltyRules",
          record: {
            id: "loy-test",
            storeId: "test-store",
            pointCardId: "rakuten-pointcard",
            rate: 0.01,
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
    expect(md).toContain("loyaltyRules +1");
    expect(md).toContain("平均 confidence:");
    expect(md).toContain("🤖 GitHub Actions weekly sync");
  });

  it("updateField の場合は変更内容が表示される", () => {
    const report = baseReport({
      autoApplicable: [
        {
          type: "updateField",
          collection: "loyaltyRules",
          id: "loy-test",
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

describe("buildReviewQueue", () => {
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
          collection: "loyaltyRules",
          record: {
            id: "loy-ponta-test",
            storeId: "test-store",
            pointCardId: "ponta-card",
            rate: 0.005,
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
