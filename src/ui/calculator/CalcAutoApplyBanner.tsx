// PR-4b (UX-5): 安全な週の seed 更新を自動反映した後に出す事後 Undo バナー。
//
// 起動時、SyncUpdateModal のオーケストレータが「安全な週」と判定して autoApplySeedUpdate を
// 呼ぶと、store に autoApplyNotice が立つ。BannerSlot はそれを autoApply 枠
// (update の下・today の上) に本バナーとして描画する。
//   [詳細]     → 更新履歴 (settings/history) へ遷移。
//   [元に戻す] → PR-4a の restoreSnapshot() + reload で反映前の状態に巻き戻す。
//                直前スナップショットが seed-apply かつ現行スキーマの時だけ表示する。
//   ✕          → dismiss (同一 digest を既読にして再表示しない)。
//
// 「元に戻す」は reload 前に digest を既読化する。これをしないと、reload 後に反映前の
// state から同じ差分が再検出され、オーケストレータが即座に再自動反映してしまう
// (= 巻き戻しが取り消される) ため。

import { useState } from "react";
import { useStore } from "../../state/store";
import { navigate } from "../../navigation";
import { writeSyncSeen, type AutoApplyNotice } from "../../state/syncNotice";
import {
  getSnapshotMeta,
  restoreSnapshot,
} from "../../state/stateSnapshot";
import { PERSIST_SCHEMA_VERSION } from "../../state/persist-versions";

type Props = {
  notice: AutoApplyNotice;
};

export function CalcAutoApplyBanner({ notice }: Props) {
  const dismissAutoApplyNotice = useStore((s) => s.dismissAutoApplyNotice);

  // 直前スナップショットが「この自動反映の直前 (seed-apply)」で、かつ現行スキーマなら
  // 巻き戻し可能。import 等でスナップショットが上書きされていれば「元に戻す」は出さない。
  // マウント時に 1 回読む (独立キー pointmax:snapshot:v1)。
  const [snapshotMeta] = useState(() => getSnapshotMeta());
  const canRestore =
    snapshotMeta !== null &&
    snapshotMeta.trigger === "seed-apply" &&
    snapshotMeta.schemaVersion === PERSIST_SCHEMA_VERSION;

  const handleRestore = () => {
    // reload 後の再自動反映ループを防ぐため、先に digest を既読化する。
    writeSyncSeen(notice.digest);
    const res = restoreSnapshot();
    if (!res.ok) {
      // 復元不可 (スナップショット消費済み等)。バナーだけ閉じて再表示を止める。
      dismissAutoApplyNotice();
      return;
    }
    // persist キーを書き戻したので reload で反映前の state として復元する。
    window.location.reload();
  };

  return (
    <div className="update-banner auto-apply-banner">
      <div className="update-banner-text">
        <strong>マスタを自動更新しました</strong>
        <br />
        <small>追加・更新 {notice.count} 件を反映しました。</small>
      </div>
      <div className="update-banner-actions">
        <button onClick={() => navigate("settings/history")}>詳細</button>
        {canRestore && (
          <button onClick={handleRestore}>元に戻す</button>
        )}
        <button
          onClick={dismissAutoApplyNotice}
          className="dismiss"
          aria-label="自動更新の通知を閉じる"
          title="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
