// PR-0a-2b: 更新バナー (UpdateBanner、SEED_VERSION のリリース通知) の「あとで」。
//
// 【背景】
//   以前の「あとで」(store.dismissSeedUpdate) は lastSeedVersion を SEED_VERSION に進めるだけで、
//   その版の MIGRATIONS (edge の rate 修正・削除など) を永久にスキップしていた
//   (planMigrations は lastSeedVersion より新しい版しか見ないため)。v47 の edge 修正も
//   「あとで」で失われる穴があった。
//
// 【方式】
//   「あとで」は lastSeedVersion を進めず、**このセッションの当日中だけ**バナーを隠す。
//   sessionStorage に `${SEED_VERSION}:${YYYY-MM-DD (ローカル暦日)}` を書き、一致する間だけ非表示。
//   タブ / PWA を閉じる・日付が変わる・版が上がると再表示される (反映するまで MIGRATIONS は保留のまま)。
//   UpdateBanner と BannerSlot (通知枠の優先度) の両方が同じ判定を購読するため、変更通知を持つ
//   小さな外部ストアにしている (useSyncExternalStore 用の subscribe / snapshot)。
//   read / write 失敗 (sessionStorage 不可環境) は握りつぶし、その場合は「隠さない」安全側。

import { localDateKey } from "./calcFormDraft";

const DISMISS_KEY = "pointmax:seed-update-dismissed:v1";

const listeners = new Set<() => void>();

function dismissValue(seedVersion: number, now: Date): string {
  return `${seedVersion}:${localDateKey(now)}`;
}

/** 当日のこのセッションで、この版の更新バナーが「あとで」済みか。 */
export function isSeedUpdateDismissed(
  seedVersion: number,
  now: Date = new Date(),
): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === dismissValue(seedVersion, now);
  } catch {
    return false;
  }
}

/** 「あとで」: 当日のこのセッションだけ更新バナーを隠す (lastSeedVersion は進めない)。 */
export function dismissSeedUpdate(
  seedVersion: number,
  now: Date = new Date(),
): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, dismissValue(seedVersion, now));
  } catch {
    // 不可環境: 隠せない (安全側)。
  }
  for (const l of listeners) l();
}

/** 購読 (useSyncExternalStore 用)。dismissSeedUpdate で通知する。 */
export function subscribeSeedUpdateDismiss(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** テスト用: 「あとで」の記録を消す。 */
export function clearSeedUpdateDismiss(): void {
  try {
    sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    // 失敗は握りつぶす
  }
  for (const l of listeners) l();
}
