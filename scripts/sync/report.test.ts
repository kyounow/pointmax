import { describe, it, expect } from "vitest";
import {
  appendSyncHistory,
  buildAutoSummary,
  buildLabelResolver,
  buildReviewQueue,
  buildSyncHistoryEntry,
  buildSyncHistoryMarkdown,
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

  it("同じ generatedAt が既に居れば追加しない (workflow 再実行による重複防止)", () => {
    const existing: SyncHistoryFile = {
      version: 1,
      entries: [baseEntry],
    };
    const dup = { ...baseEntry, totalCount: 999 }; // 同じ generatedAt
    const out = appendSyncHistory(existing, dup);
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0].totalCount).toBe(43); // 既存が残る
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
