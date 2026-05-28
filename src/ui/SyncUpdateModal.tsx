import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { syncDigest, buildSyncGroups } from "../domain/syncDigest";
import { useSeedMerge } from "./hooks/useSeedMerge";

// 週次 cron が bundled seed に追加したデータをユーザーに知らせるモーダル。
// SEED_VERSION とは独立した差分検知 (cron は版数を bump しない)。
// 既読は localStorage の digest で管理し、同じバッチでは再表示しない。
// 次回 cron で差分集合が変わると digest が変わり再通知される。
const SEEN_KEY = "pointmax-sync-seen-digest";

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeSeen(digest: string): void {
  try {
    localStorage.setItem(SEEN_KEY, digest);
  } catch {
    // private モード等で localStorage 不可。セッション内 state で抑制継続。
  }
}

type SyncUpdateModalProps = {
  /** 「過去の更新を見る」リンク押下時のハンドラ。タブ遷移などを呼び出す。 */
  onViewHistory?: () => void;
};

export function SyncUpdateModal({ onViewHistory }: SyncUpdateModalProps = {}) {
  const applySeedUpdate = useStore((s) => s.applySeedUpdate);

  const [dismissed, setDismissed] = useState(false);
  const [seen] = useState(readSeen);

  // Wave 4 B-7: 共有 hook 経由で mergeSeed (UpdateBanner と同じ計算ロジック)
  const { merged, additionCount: count } = useSeedMerge();
  const digest = merged ? syncDigest(merged.diff) : "";

  const groups = useMemo(() => {
    if (!merged || count === 0) return [];
    const storeName = new Map(merged.stores.map((s) => [s.id, s.name]));
    const programName = new Map(
      (merged.programs ?? []).map((p) => [p.id, p.name]),
    );
    return buildSyncGroups(merged.diff, {
      store: (id) => storeName.get(id) ?? id,
      program: (id) => programName.get(id) ?? id,
    });
  }, [merged, count]);

  const visible =
    !dismissed && count > 0 && digest !== "" && digest !== seen;

  if (!visible) return null;

  const close = () => {
    writeSeen(digest);
    setDismissed(true);
  };

  const handleApply = () => {
    applySeedUpdate([]);
    close();
  };

  // Wave 4 B-5 a11y: modal の focus 管理 + ESC で閉じる + 初期 focus を primary に。
  // 完全な focus trap は外部ライブラリ (focus-trap-react) が必要だが、ここでは最低限の
  // フォーカス制御と ESC ハンドリングだけ提供 (実用上の改善が大きい)。
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!visible) return;
    primaryButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close 参照は state 変更で再生成されるが、effect 内で最新を見るので OK
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <div
      className="sync-update-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-update-title"
    >
      <div className="sync-update-modal">
        <h2 id="sync-update-title" className="sync-update-title">最新データが届いています</h2>
        <p className="sync-update-lead">
          公式マスタの自動同期で <strong>{count} 件</strong>{" "}
          の項目が追加されました。「アプリに反映」で取り込めます。
        </p>

        <div className="sync-update-body">
          {groups.map((g) => (
            <div key={g.label} className="sync-update-group">
              <h4 className="sync-update-group-title">
                {g.label}
                <span className="sync-update-count">{g.items.length}</span>
              </h4>
              <ul className="sync-update-list">
                {g.items.slice(0, 50).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
                {g.items.length > 50 && (
                  <li className="hint">他 {g.items.length - 50} 件</li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {onViewHistory && (
          <div className="sync-update-history-link-row">
            <button
              type="button"
              className="sync-update-history-link"
              onClick={() => {
                onViewHistory();
                close();
              }}
            >
              過去の更新を見る ↗
            </button>
          </div>
        )}

        <div className="sync-update-actions">
          <button onClick={close}>閉じる</button>
          <button
            ref={primaryButtonRef}
            className="primary sync-update-primary"
            onClick={handleApply}
          >
            アプリに反映
          </button>
        </div>
      </div>
    </div>
  );
}
