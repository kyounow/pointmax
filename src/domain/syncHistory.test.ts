import { describe, it, expect } from "vitest";
import {
  AUTO_SYNC_PR_LIST_URL,
  commitUrl,
  loadSyncHistory,
  prUrl,
  SYNC_HISTORY_REPO,
  type SyncHistoryEntry,
} from "./syncHistory";

describe("loadSyncHistory", () => {
  it("bundle 同梱の JSON から SyncHistoryFile を返す", () => {
    const h = loadSyncHistory();
    expect(h.version).toBe(1);
    expect(Array.isArray(h.entries)).toBe(true);
  });

  it("backfill 済みの過去 entry を含む (newest first)", () => {
    const h = loadSyncHistory();
    // PR A で 8fad1eb / dda20d6 の 2 件を backfill 済み
    expect(h.entries.length).toBeGreaterThanOrEqual(2);
    // newest first 順
    for (let i = 1; i < h.entries.length; i++) {
      const prev = new Date(h.entries[i - 1].generatedAt).getTime();
      const curr = new Date(h.entries[i].generatedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("各 entry に必須フィールドが揃っている", () => {
    const h = loadSyncHistory();
    for (const e of h.entries) {
      expect(typeof e.date).toBe("string");
      expect(typeof e.generatedAt).toBe("string");
      expect(typeof e.totalCount).toBe("number");
      expect(typeof e.sourcesProcessed).toBe("number");
      expect(Array.isArray(e.bySource)).toBe(true);
      expect(Array.isArray(e.items)).toBe(true);
      expect(e.items.length).toBe(e.totalCount);
    }
  });
});

describe("commitUrl / prUrl", () => {
  const baseEntry: SyncHistoryEntry = {
    date: "2026-05-21",
    generatedAt: "2026-05-20T22:30:17.684Z",
    totalCount: 0,
    avgConfidence: null,
    sourcesProcessed: 0,
    bySource: [],
    items: [],
  };

  it("commitSha があれば commit URL を返す", () => {
    expect(commitUrl({ ...baseEntry, commitSha: "abc1234" })).toBe(
      `https://github.com/${SYNC_HISTORY_REPO}/commit/abc1234`,
    );
  });

  it("commitSha が無ければ null", () => {
    expect(commitUrl(baseEntry)).toBeNull();
  });

  it("prNumber があれば PR URL を返す", () => {
    expect(prUrl({ ...baseEntry, prNumber: 49 })).toBe(
      `https://github.com/${SYNC_HISTORY_REPO}/pull/49`,
    );
  });

  it("prNumber が無ければ null", () => {
    expect(prUrl(baseEntry)).toBeNull();
  });
});

describe("AUTO_SYNC_PR_LIST_URL", () => {
  it("auto-sync ラベルで絞った PR タブの URL", () => {
    expect(AUTO_SYNC_PR_LIST_URL).toBe(
      `https://github.com/${SYNC_HISTORY_REPO}/pulls?q=is%3Apr+label%3Aauto-sync`,
    );
  });
});
