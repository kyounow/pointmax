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
import {
  backupRawPersisted,
  readCrashBackup,
  PERSIST_COLLECTION_KEYS,
} from "./hydrationGuard";
import { currentBuildId } from "./swUpdateNotice";

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

type Persisted = { state: Record<string, unknown>; version: unknown };

/** persist の { state, version } を取り出す。壊れている / state が object でなければ null。 */
function parsePersisted(raw: string | null): Persisted | null {
  try {
    const p = JSON.parse(raw ?? "null") as Persisted | null;
    return p?.state && typeof p.state === "object" ? p : null;
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
 *     persist の version をそのまま載せる)。配列でない collection は載せない (インポートの検証で
 *     弾かれるので、その場合は JSON を手で直す)。加えて preferences (インポートでは戻らない
 *     per-user 設定) と recovery メタ (cause / message / buildId / crashBackupTakenAt) を付ける。
 *   - parse できなければ {kind:"pointmax-recovery-raw", raw} で生文字列をそのまま出す。
 */
export function buildRecoveryExportJson(
  err?: Error | null,
  cause?: "render" | "hydrate",
): string {
  const backup = readCrashBackup();
  const raw = readPersistRaw() ?? backup?.raw ?? null;
  const exportedAt = new Date().toISOString();
  // undefined の項目は JSON.stringify が落とす
  const recovery = {
    cause,
    message: err?.message,
    buildId: currentBuildId(),
    crashBackupTakenAt: backup?.takenAt,
  };
  const parsed = parsePersisted(raw);
  if (!parsed) {
    return JSON.stringify(
      { kind: "pointmax-recovery-raw", exportedAt, raw, recovery },
      null,
      2,
    );
  }
  const { state } = parsed;
  const pick = (keys: readonly string[], keep: (v: unknown) => boolean) =>
    Object.fromEntries(
      keys.filter((k) => keep(state[k])).map((k) => [k, state[k]]),
    );
  return JSON.stringify(
    {
      version: 1,
      schemaVersion: parsed.version,
      exportedAt,
      // エクスポート JSON (store.exportJson) と同じ 8 collection
      ...pick(PERSIST_COLLECTION_KEYS, Array.isArray),
      preferences: pick(PREFERENCE_KEYS, (v) => v !== undefined),
      recovery,
    },
    null,
    2,
  );
}

/**
 * 現行 schema で復元できるスナップショットのメタ (無い / 旧 schema / 読めないなら null)。
 * 例外は投げない。getSnapshotMeta の parse 失敗は内部で握りつぶされるが、その手前の
 * `typeof localStorage` はサイトデータを拒否したブラウザでは getter が SecurityError を投げ、
 * try の外にある。RecoveryPanel は render 中にこれを呼ぶので、ここで包む。
 */
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
    const digest = (
      parsePersisted(readPersistRaw())?.state.autoApplyNotice as
        | { digest?: string }
        | null
        | undefined
    )?.digest;
    if (digest) writeSyncSeen(digest);
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
export function removePersistedForRecovery(): void {
  backupRawPersisted("reset");
  try {
    localStorage.removeItem(PERSIST_STORE_KEY);
  } catch {
    // localStorage 不可なら何もできない (reload で再試行してもらう)
  }
}
