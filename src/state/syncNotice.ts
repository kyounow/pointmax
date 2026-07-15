// PR-4b: 週次 cron 同期通知の「既読 digest」を共有する独立 localStorage キー。
//
// 元々 SyncUpdateModal.tsx に inline で持っていた SEEN_KEY を、自動反映 (PR-4b) の
// バナーと共有するためモジュールへ切り出した。SyncUpdateModal / 自動反映バナー /
// 自動反映オーケストレータが同じキーを読み書きすることで、
//   - 「同一 digest では再通知しない」(モーダルもバナーも)
//   - 「元に戻す (restore) 後に同じ差分が再度自動反映されるループを防ぐ」
// を一貫して満たす。
//
// SEED_VERSION とは独立した差分検知 (cron は版数を bump しない)。次回 cron で
// 差分集合が変わると digest が変わり、再び未読扱いになる。

const SYNC_SEEN_KEY = "pointmax-sync-seen-digest";

/** 既読 digest を読む。未保存 / 例外時は空文字 (= 未読扱い)。 */
export function readSyncSeen(): string {
  try {
    return localStorage.getItem(SYNC_SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

/** digest を既読として記録する (以後この digest では再通知しない)。 */
export function writeSyncSeen(digest: string): void {
  try {
    localStorage.setItem(SYNC_SEEN_KEY, digest);
  } catch {
    // private モード等で localStorage 不可。セッション内 state で抑制継続。
  }
}

/** 既読 digest を消す (テスト / 明示リセット用)。 */
export function clearSyncSeen(): void {
  try {
    localStorage.removeItem(SYNC_SEEN_KEY);
  } catch {
    // 失敗は握りつぶす
  }
}

/**
 * PR-4b: 直近に「自動反映」したバッチのバナー表示情報。
 * store の永続 state に保持し (reload 越しでバナーを再表示)、✕ dismiss で消す。
 *   - digest: 反映した差分集合の指紋 (syncDigest)。SEEN との突合 / restore ループ防止に使う。
 *   - count:  反映した変更件数 (追加 + 内容更新。安全週は削除 0 なので totalChangeCount と一致)。
 */
export type AutoApplyNotice = {
  digest: string;
  count: number;
};
