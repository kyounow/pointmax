// 一回限りの backfill スクリプト: 既存 SYNC_HISTORY.json の slug ベース
// summary を日本語化する。dda20d6 batch は sync:report の再実行で
// 日本語化されるが、8fad1eb 等 raw proposed-migrations.json が
// 失われた古い entries は本スクリプトで slug → 名前を解決する。
//
// 安全性: summary が既に日本語 (`prog-` プレフィックスを含まない) なら skip。
// 失敗時は slug fallback で残す (壊さない)。
//
// Usage: tsx scripts/sync/backfill-history-localize.ts

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLabelResolver } from "./report";
import type { SyncHistoryFile, SyncHistoryItem } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const SYNC_HISTORY_JSON_PATH = resolve(REPO_ROOT, "sources/SYNC_HISTORY.json");

const COLLECTION_LABELS: Record<string, string> = {
  stores: "店舗",
  memberships: "提携店舗",
  programs: "プログラム",
  campaigns: "キャンペーン",
  loyaltyRules: "ポイントカード提示",
  cards: "カード",
  paymentApps: "決済アプリ",
};

function looksLikeSlugSummary(summary: string): boolean {
  // 「prog-...」「pa-...」「pc-...」等の slug prefix を含めば slug-based。
  return /\bprog-[\w-]+|\bpa-[\w-]+|\bpc-[\w-]+/.test(summary);
}

function localizeMembershipSummary(
  summary: string,
  resolver: ReturnType<typeof buildLabelResolver>,
): string {
  // パターン: `<programId> → <storeId>` (任意で ` (率上書き ...)` 付)
  const m = /^([\w\-.]+)\s*→\s*([\w\-.]+)(.*)$/.exec(summary);
  if (!m) return summary;
  const [, programId, storeId, rest] = m;
  const programName = resolver.program(programId);
  const storeName = resolver.store(storeId);
  return `${programName} → ${storeName}${rest}`;
}

function main(): void {
  const text = readFileSync(SYNC_HISTORY_JSON_PATH, "utf-8");
  const file = JSON.parse(text) as SyncHistoryFile;
  const resolver = buildLabelResolver();

  let updated = 0;
  for (const entry of file.entries) {
    for (const b of entry.bySource) {
      if (!b.sourceLabel) {
        b.sourceLabel = resolver.source(b.sourceId);
        updated += 1;
      }
      if (!b.collectionLabel) {
        b.collectionLabel = COLLECTION_LABELS[b.collection] ?? b.collection;
        updated += 1;
      }
    }
    for (const it of entry.items as SyncHistoryItem[]) {
      if (!it.sourceLabel) {
        it.sourceLabel = resolver.source(it.sourceId);
        updated += 1;
      }
      if (!it.collectionLabel) {
        it.collectionLabel = COLLECTION_LABELS[it.collection] ?? it.collection;
        updated += 1;
      }
      if (looksLikeSlugSummary(it.summary) && it.collection === "memberships") {
        it.summary = localizeMembershipSummary(it.summary, resolver);
        updated += 1;
      }
    }
  }

  writeFileSync(
    SYNC_HISTORY_JSON_PATH,
    JSON.stringify(file, null, 2) + "\n",
    "utf-8",
  );
  console.log(`✓ backfilled ${updated} fields across ${file.entries.length} entries`);
}

main();
