// 週次 cron が自動マージした更新の履歴。
// データソースは `sources/SYNC_HISTORY.json` (cron が `scripts/sync/report.ts`
// 経由で先頭追記する)。本ファイルはアプリ側の型 + アクセサ。
//
// 型定義は意図的に `scripts/sync/types.ts` の SyncHistoryEntry / SyncHistoryFile
// と独立して保持している (tsconfig.app は src/ のみ include、scripts/ は tsx で
// 個別に走るため shared import 困難)。両者は JSON 構造で整合性が担保され、
// drift があれば JSON 構造変更時に必ず両方更新する運用。

import syncHistoryJson from "../../sources/SYNC_HISTORY.json";

export type SyncHistorySourceCount = {
  sourceId: string;
  collection: string;
  count: number;
  /** registry.yaml の label (例: 「楽天ポイントカード 加盟店 (公式)」)。cron 生成時に解決、無ければ sourceId にフォールバック。 */
  sourceLabel?: string;
  /** collection の日本語表示 (例: 「提携店舗」)。無ければ collection slug にフォールバック。 */
  collectionLabel?: string;
};

export type SyncHistoryItem = {
  sourceId: string;
  collection: string;
  /** 日本語化された 1 行要約 (例: 「楽天ポイントカード提示 0.5% → 幸楽苑」)。 */
  summary: string;
  /** registry.yaml の label (app 表示用)。 */
  sourceLabel?: string;
  /** collection の日本語表示 (app 表示用)。 */
  collectionLabel?: string;
};

export type SyncHistoryEntry = {
  /** JST 暦日 YYYY-MM-DD */
  date: string;
  /** ProposalReport.generatedAt (ISO8601) */
  generatedAt: string;
  totalCount: number;
  avgConfidence: number | null;
  sourcesProcessed: number;
  bySource: SyncHistorySourceCount[];
  items: SyncHistoryItem[];
  /** backfill 済みエントリーのみ (cron からは付かない、PR 経由で squash merge SHA が事後判明のため) */
  commitSha?: string;
  /** PR 経由化後の将来エントリーに付与予定 */
  prNumber?: number;
};

export type SyncHistoryFile = {
  version: 1;
  entries: SyncHistoryEntry[]; // newest first
};

/** GitHub repo slug。commit/PR への絶対 URL 生成に使う。 */
export const SYNC_HISTORY_REPO = "kyounow/pointmax";

/**
 * Bundle 同梱の SYNC_HISTORY を返す。JSON が壊れていた場合は空 history を返す
 * (型 cast で落ちないように defensive)。
 */
export function loadSyncHistory(): SyncHistoryFile {
  const file = syncHistoryJson as SyncHistoryFile;
  if (
    !file ||
    file.version !== 1 ||
    !Array.isArray(file.entries)
  ) {
    return { version: 1, entries: [] };
  }
  return file;
}

/** GitHub の commit URL を生成。commitSha が空なら null。 */
export function commitUrl(entry: SyncHistoryEntry): string | null {
  if (!entry.commitSha) return null;
  return `https://github.com/${SYNC_HISTORY_REPO}/commit/${entry.commitSha}`;
}

/** GitHub の PR URL を生成。prNumber が空なら null。 */
export function prUrl(entry: SyncHistoryEntry): string | null {
  if (!entry.prNumber) return null;
  return `https://github.com/${SYNC_HISTORY_REPO}/pull/${entry.prNumber}`;
}

/** auto-sync ラベルで絞った PR タブの URL (履歴全体への動線用) */
export const AUTO_SYNC_PR_LIST_URL = `https://github.com/${SYNC_HISTORY_REPO}/pulls?q=is%3Apr+label%3Aauto-sync`;

/** sourceLabel / collectionLabel が無い古い entry のフォールバック表示。 */
export function displaySource(
  e: { sourceId: string; sourceLabel?: string },
): string {
  return e.sourceLabel ?? e.sourceId;
}
export function displayCollection(
  e: { collection: string; collectionLabel?: string },
): string {
  return e.collectionLabel ?? e.collection;
}
