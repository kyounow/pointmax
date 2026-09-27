// PR-6d (U6): 復旧パネル (RecoveryPanel) と設定画面が使う復旧ヘルパ。
//
// UI 専用: store は import しない (root モードの復旧パネルは壊れた state の上で動くため、
// persist の生文字列と独立キーだけを読み書きする)。検知と退避の本体は hydrationGuard.ts
// (store.ts から import される側) にあり、本ファイルは書き出し・復元・persist の削除を担う。
// 全 API は例外を投げない (render 中・エラー処理中に呼ばれるため)。

import { PERSIST_SCHEMA_VERSION, PERSIST_STORE_KEY } from "./persist-versions";
import {
  getSnapshotMeta,
  restoreSnapshot,
  type SnapshotMeta,
  type SnapshotResult,
} from "./stateSnapshot";
import { writeSyncSeen } from "./syncNotice";
import { backupRawPersisted, readCrashBackup } from "./hydrationGuard";
import { currentBuildId } from "./swUpdateNotice";

// エクスポート JSON (store.exportJson) と同じ 8 collection。
const COLLECTION_KEYS = [
  "cards",
  "currencies",
  "stores",
  "edges",
  "pointCards",
  "paymentApps",
  "programs",
  "memberships",
] as const;
// per-user 設定。importJson は戻さない (README に手動で戻す旨を記載) が、書き出しには含める。
const PREFERENCE_KEYS = [
  "preferredCurrencyIds",
  "birthMonth",
  "yenValueOverrides",
  "excludedStorePayments",
] as const;

function readPersistRaw(): string | null {
  try {
    return localStorage.getItem(PERSIST_STORE_KEY);
  } catch {
    return null;
  }
}

/** persist の { state } を object として取り出す。壊れていれば null。 */
function parsePersisted(
  raw: string | null,
): { state: Record<string, unknown>; version: unknown } | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { state?: unknown; version?: unknown } | null;
    const s = p?.state;
    if (!s || typeof s !== "object" || Array.isArray(s)) return null;
    return { state: s as Record<string, unknown>, version: p?.version };
  } catch {
    return null;
  }
}

/** 退避時刻・スナップショット時刻の表示 (M/D HH:mm)。 */
export function formatTakenAt(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 復旧パネルの「データを書き出す / コピー」用 JSON。
 *   - 生データの出どころは persist キー、無ければ crash-backup の raw。
 *   - parse できて state が object なら、エクスポート JSON と同じ形
 *     ({version:1, schemaVersion, exportedAt, 8 collection}) で出す = 設定のインポートで戻せる
 *     (validateImportData(…, {requireSchemaVersion:true}) の round-trip 契約。schemaVersion は
 *     persist の version をそのまま載せる)。配列でない collection は載せず recovery.invalidKeys に並べる。
 *     加えて preferences (インポートでは戻らない per-user 設定) と recovery メタを付ける。
 *   - parse できなければ {kind:"pointmax-recovery-raw", raw} で生文字列をそのまま出す。
 */
export function buildRecoveryExportJson(
  err?: Error | null,
  cause?: "render" | "hydrate",
): string {
  const persisted = readPersistRaw();
  const backup = readCrashBackup();
  const raw = persisted ?? backup?.raw ?? null;
  const exportedAt = new Date().toISOString();
  const recovery: Record<string, unknown> = {
    cause: cause ?? null,
    message: err?.message ?? null,
    buildId: currentBuildId(),
    source: persisted !== null ? "persist" : raw !== null ? "crash-backup" : null,
  };
  if (backup) recovery.crashBackupTakenAt = backup.takenAt;

  const parsed = parsePersisted(raw);
  if (!parsed) {
    return JSON.stringify(
      { kind: "pointmax-recovery-raw", exportedAt, raw, recovery },
      null,
      2,
    );
  }
  const out: Record<string, unknown> = {
    version: 1,
    schemaVersion: parsed.version,
    exportedAt,
  };
  const invalidKeys: string[] = [];
  for (const k of COLLECTION_KEYS) {
    const v = parsed.state[k];
    if (Array.isArray(v)) out[k] = v;
    else invalidKeys.push(k);
  }
  const preferences: Record<string, unknown> = {};
  for (const k of PREFERENCE_KEYS) {
    if (parsed.state[k] !== undefined) preferences[k] = parsed.state[k];
  }
  out.preferences = preferences;
  if (invalidKeys.length > 0) recovery.invalidKeys = invalidKeys;
  out.recovery = recovery;
  return JSON.stringify(out, null, 2);
}

/** 現行 schema で復元できるスナップショットのメタ (無い / 旧 schema / 読めないなら null)。 */
export function restorableSnapshotMeta(): SnapshotMeta | null {
  try {
    const meta = getSnapshotMeta();
    return meta?.schemaVersion === PERSIST_SCHEMA_VERSION ? meta : null;
  } catch {
    return null;
  }
}

/**
 * スナップショットへ巻き戻す (復旧パネルと設定の「直前の状態に戻す」)。
 * seed-apply (マスタ更新前) のスナップショットなら、先に現在の persist にある自動反映の
 * digest (autoApplyNotice.digest) を既読にしてから戻す。既読にしないと reload 直後に
 * 同じ差分がまた自動反映され、巻き戻しが打ち消される (CalcAutoApplyBanner の「元に戻す」と同じ)。
 * 手動の「アプリに反映」は反映時に既読化済み。実際の反映は呼び出し側が reload する。
 */
export function restoreSnapshotForRecovery(): SnapshotResult {
  if (restorableSnapshotMeta()?.trigger === "seed-apply") {
    const notice = parsePersisted(readPersistRaw())?.state.autoApplyNotice as
      | { digest?: unknown }
      | null
      | undefined;
    if (typeof notice?.digest === "string" && notice.digest) {
      writeSyncSeen(notice.digest);
    }
  }
  return restoreSnapshot();
}

/**
 * 公式データでの初期化 (resetToSeed) が失敗したときの予備経路: 生データを crash-backup に
 * 退避してから persist キーだけを消す。reload 後は空プロファイルとして起動し、
 * store.seedIfEmpty が公式データを投入する。独立キー (snapshot / usage-stats / calc-form /
 * onboarding-dismissed / sync-seen / build-id / crash-backup / sessionStorage の
 * seed-update-dismissed) は消さない。
 */
export function removePersistedForRecovery(): { backedUp: boolean } {
  const backedUp = backupRawPersisted("reset");
  try {
    localStorage.removeItem(PERSIST_STORE_KEY);
  } catch {
    // localStorage 不可なら何もできない (reload で再試行してもらう)
  }
  return { backedUp };
}
