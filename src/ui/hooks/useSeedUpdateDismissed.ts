// PR-0a-2b: 更新バナーの「あとで」(当日のこのセッションだけ非表示) を購読する hook。
// UpdateBanner (表示ゲート) と BannerSlot (通知枠の優先度) が同じ判定を共有する。
import { useSyncExternalStore } from "react";
import { SEED_VERSION } from "../../state/seed";
import {
  isSeedUpdateDismissed,
  subscribeSeedUpdateDismiss,
} from "../../state/seedUpdateDismiss";

const getSnapshot = () => isSeedUpdateDismissed(SEED_VERSION);
const getServerSnapshot = () => false;

export function useSeedUpdateDismissed(): boolean {
  return useSyncExternalStore(
    subscribeSeedUpdateDismiss,
    getSnapshot,
    getServerSnapshot,
  );
}
