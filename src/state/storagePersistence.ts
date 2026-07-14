// PR-0c: 永続ストレージ (Storage API persist) の要求 / 照会ユーティリティ。
//
// 【背景 / なぜ必要か】
//   本アプリはサーバレスで localStorage 単独持ち。ブラウザ (特に iOS Safari を
//   非インストールで利用) では、7 日間アクセスが無いと script-writable storage が
//   自動削除されたり、容量逼迫時に eviction されることがあり、データ全損に直結する。
//   `navigator.storage.persist()` で「永続化 (best-effort) を要求」すると、これらの
//   自動削除の対象から外れやすくなる (保証ではないがリスクを大きく下げられる)。
//
// 【設計方針】
//   - API 不在 (非対応ブラウザ / 非セキュアコンテキスト) は "unsupported" を返す。
//   - 例外は全て try/catch で握りつぶし、本体アプリのライフサイクルに一切波及させない
//     (この機能の失敗で計算・閲覧が壊れてはならない)。
//   - persist() は「未許可のときだけ」要求する (既に granted なら再要求しない)。

export type PersistenceStatus = "granted" | "denied" | "unsupported";

/** navigator.storage が persist/persisted を備えているか (非対応ブラウザ判定)。 */
function hasStorageManager(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.storage &&
    typeof navigator.storage.persisted === "function" &&
    typeof navigator.storage.persist === "function"
  );
}

/**
 * 現在の永続ストレージ状態を照会するだけ (要求はしない)。
 * - "granted": 既に永続化されている
 * - "denied": 永続化されていない (要求可能)
 * - "unsupported": Storage API 非対応
 */
export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  if (!hasStorageManager()) return "unsupported";
  try {
    const persisted = await navigator.storage.persisted();
    return persisted ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

/**
 * 永続ストレージを要求する。
 * 既に granted なら再要求せず "granted" を返す。未許可 (denied) の場合のみ
 * navigator.storage.persist() を呼び、結果に応じて "granted" / "denied" を返す。
 * API 不在時や例外時は "unsupported"。
 */
export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  if (!hasStorageManager()) return "unsupported";
  try {
    // 既に許可済みなら余計なプロンプト/計算を避けて即返す。
    if (await navigator.storage.persisted()) return "granted";
    const granted = await navigator.storage.persist();
    return granted ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}
