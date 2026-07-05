// PointMax: sync パイプライン integration test (Wave 3 D-1 audit-fix)
//
// 個別 propose* / dedup / cap / orphan-guard / chain-promote は単体テスト済だが、
// 「実 cron で発生するシナリオを通しで投げて、最終 autoApplicable / needsReview
// の振り分けが期待通りか」を end-to-end で確認するテストは存在しなかった。
//
// 本ファイルでは:
//   - mock ExtractedSource を 1〜2 件用意 (campaign 系 / point-partner 系)
//   - propose* を順に呼んで proposals を集計
//   - dedupeAcrossProposals → applyCategoryCap → promoteChainStoreAutoMerge
//     → downgradeOrphanMemberships の Phase を再現
//   - 最終分類 (auto vs review) を期待値と比較
//
// 限界: Gemini 呼出 / git 操作は対象外 (fetch-source.ts / apply-proposals.ts は別)。

import { describe, it, expect } from "vitest";
import {
  applyCategoryCap,
  dedupeAcrossProposals,
  downgradeOrphanMemberships,
  promoteChainStoreAutoMerge,
  proposeMemberships,
  proposePrograms,
  proposeStores,
} from "./diff-and-propose";
import type { SeedShape } from "../../src/domain/mergeSeed";
import type {
  AddRecordProposal,
  ExtractedSource,
  Proposal,
} from "./types";

// 最小の seed fixture (テスト独立化のため src/state/seed には依存しない)
const emptyCurrent: SeedShape = {
  cards: [],
  currencies: [],
  stores: [
    // 既存 chain-heavy category (飲食) を 3 店揃える → chain-heavy 判定の閾値クリア
    { id: "s-exist-1", name: "既存飲食1", category: "飲食" } as never,
    { id: "s-exist-2", name: "既存飲食2", category: "飲食" } as never,
    { id: "s-exist-3", name: "既存飲食3", category: "飲食" } as never,
  ],
  edges: [],
  pointCards: [],
  loyaltyRules: [],
  paymentApps: [],
  programs: [],
  memberships: [],
};

const ev = { evidenceQuote: "store name 5%還元 (期間 2030/1/1〜2030/12/31)", explicitness: 1, ambiguity: 0 };

const campaignSource: ExtractedSource = {
  sourceId: "test-paypay-campaigns",
  sourceUrl: "https://example.test/event/",
  fetchedAt: "2026-05-28T00:00:00Z",
  promptVersion: "campaign-v3.1",
  extractor: "campaign",
  geminiModel: "gemini-2.5-flash",
  stores: [
    {
      storeId: "store-mcd",
      name: "マクドナルド",
      category: "飲食",
      evidenceQuote: ev.evidenceQuote,
      explicitness: 1,
      ambiguity: 0,
    },
    {
      storeId: "store-localcafe",
      name: "近所のカフェ",
      category: "飲食",
      evidenceQuote: ev.evidenceQuote,
      explicitness: 1,
      ambiguity: 0,
    },
  ],
  programs: [
    {
      programId: "prog-paypay-mcd-2030-01",
      name: "PayPay×マクドナルド 5%",
      paymentAppId: "pa-paypay",
      rate: 0.05,
      currencyId: "paypay",
      bonusType: "addOn",
      validFrom: "2030-01-01",
      validTo: "2030-12-31",
      evidenceQuote: ev.evidenceQuote,
      explicitness: 1,
      ambiguity: 0,
    },
  ],
  memberships: [
    {
      programId: "prog-paypay-mcd-2030-01",
      storeId: "store-mcd",
      evidenceQuote: ev.evidenceQuote,
      explicitness: 1,
      ambiguity: 0,
    },
    {
      programId: "prog-paypay-mcd-2030-01",
      storeId: "store-localcafe",
      evidenceQuote: ev.evidenceQuote,
      explicitness: 1,
      ambiguity: 0,
    },
  ],
};

function runPipeline(extracted: ExtractedSource[], current: SeedShape) {
  // Phase 1: propose
  const allProposals: Proposal[] = [];
  for (const data of extracted) {
    allProposals.push(...proposeStores(data, current));
    allProposals.push(...proposePrograms(data, current));
    allProposals.push(...proposeMemberships(data, current));
  }

  // Phase A: dedup
  const dedup = dedupeAcrossProposals(allProposals);

  // Phase B: category cap (5/cat)
  const cap = applyCategoryCap(dedup.proposals, 5);

  // Phase B': chain promote
  const chainPromote = promoteChainStoreAutoMerge(cap.kept, current);

  // Phase C: orphan guard
  const existingStoreIds = new Set(current.stores.map((s) => s.id));
  const existingProgramIds = new Set(current.programs.map((p) => p.id));
  const orphan = downgradeOrphanMemberships(
    chainPromote.proposals,
    existingStoreIds,
    existingProgramIds,
  );

  // Phase D: 分類
  const auto: Proposal[] = [];
  const review: Proposal[] = [];
  for (const p of orphan.proposals) {
    if (p.reviewReason) review.push(p);
    else auto.push(p);
  }
  return {
    auto,
    review,
    metrics: {
      dedupCollisions: dedup.collisions,
      capDeferred: cap.deferred.length,
      chainPromoted: chainPromote.promoted,
      orphanDowngradedStore: orphan.downgradedStore,
      orphanDowngradedProgram: orphan.downgradedProgram,
    },
  };
}

// ───────────────────────────────────────────────────────────────

describe("sync pipeline integration", () => {
  // 注意: emptyCurrent には category="飲食" の既存 store が 3 件あるため、
  // chain-heavy category 判定 (3+ で発火) が両 store に対して true になる。
  // そのため localcafe も chain-promote の対象になる。これは現行仕様。

  it("campaign 1 source: chain store (マクドナルド) は B' で auto-promote", () => {
    const result = runPipeline([campaignSource], emptyCurrent);

    // マクドナルド: チェーン名パターン + campaign 参照 → auto
    const autoStores = result.auto.filter(
      (p) => p.type === "addRecord" && p.collection === "stores",
    );
    const autoStoreIds = autoStores.map(
      (p) => (p as AddRecordProposal).record.id,
    );
    expect(autoStoreIds).toContain("store-mcd");

    // 既存 chain-heavy category (飲食 3+) のため localcafe も promote される (現行仕様)
    expect(result.metrics.chainPromoted).toBeGreaterThanOrEqual(1);
  });

  it("campaign 1 source: 新規 program は必ず idCollision で review", () => {
    const result = runPipeline([campaignSource], emptyCurrent);
    const programs = [...result.auto, ...result.review].filter(
      (p) => p.type === "addRecord" && p.collection === "programs",
    );
    expect(programs.length).toBeGreaterThan(0);
    for (const p of programs) {
      expect(p.reviewReason).toBe("idCollision");
    }
  });

  it("campaign 1 source: program が idCollision のため、対応 membership は missingProgramBody で降格", () => {
    const result = runPipeline([campaignSource], emptyCurrent);

    // 全 membership 提案
    const allMemberships = [...result.auto, ...result.review].filter(
      (p) => p.type === "addRecord" && p.collection === "memberships",
    );
    expect(allMemberships).toHaveLength(2);

    // store は chain-promote で auto に上がるが、program は idCollision のまま
    // → 全 membership は missingProgramBody で降格される
    for (const m of allMemberships) {
      expect(m.reviewReason).toBe("missingProgramBody");
    }
  });

  it("非 chain-heavy category 環境では非チェーン店は promote されず storeAdditionsDisabled で review", () => {
    // 既存に 飲食 が 1 件しかない → chain-heavy threshold (3+) 未達
    const minimalCurrent: SeedShape = {
      ...emptyCurrent,
      stores: [{ id: "s-exist-1", name: "既存飲食1", category: "飲食" } as never],
    };
    const result = runPipeline([campaignSource], minimalCurrent);
    const reviewStoreIds = result.review
      .filter((p) => p.type === "addRecord" && p.collection === "stores")
      .map((p) => (p as AddRecordProposal).record.id);
    // localcafe はチェーン名パターンにマッチせず、chain-heavy 未達 → review に残る
    expect(reviewStoreIds).toContain("store-localcafe");
    // マクドナルドはチェーン名パターンマッチ → promote
    expect(reviewStoreIds).not.toContain("store-mcd");
  });

  it("0 source 投入なら proposals 全部空", () => {
    const result = runPipeline([], emptyCurrent);
    expect(result.auto).toEqual([]);
    expect(result.review).toEqual([]);
  });

  it("同 source 内で同 storeId 重複があっても dedup が機能する", () => {
    const dupSource: ExtractedSource = {
      ...campaignSource,
      sourceId: "test-dup",
      stores: [
        ...campaignSource.stores!,
        // 同じ storeId, 同じ name で 2 件目
        {
          storeId: "store-mcd",
          name: "マクドナルド",
          category: "飲食",
          evidenceQuote: "duplicate",
          explicitness: 1,
          ambiguity: 0,
        },
      ],
    };
    const result = runPipeline([dupSource], emptyCurrent);
    // dedup で 2 件目は idCollision に降格 (同一 source 内でも適用)
    // propose 側で id 重複は 1 件しか出さない実装なので dedupCollisions=0 でもよい
    // (実装依存)。少なくとも store-mcd の auto は 1 件以下。
    const autoMcdCount = result.auto.filter(
      (p) =>
        p.type === "addRecord" &&
        p.collection === "stores" &&
        (p as AddRecordProposal).record.id === "store-mcd",
    ).length;
    expect(autoMcdCount).toBeLessThanOrEqual(1);
  });
});
