import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { SEED_VERSION } from "../state/seed";
import { syncDigest, buildSyncGroups } from "../domain/syncDigest";
import { isAutoApplySafe } from "../domain/autoApplySafety";
import { readSyncSeen, writeSyncSeen } from "../state/syncNotice";
import { useSeedMerge } from "./hooks/useSeedMerge";
import { useOnline } from "./hooks/useOnline";

// 週次 cron が bundled seed に追加/更新/削除したデータの取り込み経路 (PR-4b で二分化):
//   - 安全な週 (追加・非破壊更新のみ) は起動時に「自動反映」し、事後 Undo バナーに委譲
//     (本コンポーネントはモーダルを出さず、autoApplySeedUpdate を呼ぶだけ)。
//   - 削除 / scope 変更 / SEED_VERSION bump を含む週だけ、従来どおりこのモーダルを出して
//     ユーザーに確認してもらう。
// SEED_VERSION とは独立した差分検知 (cron は版数を bump しない)。既読は共有 digest
// (syncNotice) で管理し、同じバッチでは再表示しない。次回 cron で差分集合が変わると
// digest が変わり再通知される。

type SyncUpdateModalProps = {
  /** 「過去の更新を見る」リンク押下時のハンドラ。タブ遷移などを呼び出す。 */
  onViewHistory?: () => void;
};

export function SyncUpdateModal({ onViewHistory }: SyncUpdateModalProps = {}) {
  // Wave 5 B-1: 個別 subscribe → 単一 useShallow
  const { applySeedUpdate, autoApplySeedUpdate, lastSeedVersion } = useStore(
    useShallow((s) => ({
      applySeedUpdate: s.applySeedUpdate,
      autoApplySeedUpdate: s.autoApplySeedUpdate,
      lastSeedVersion: s.lastSeedVersion,
    })),
  );

  // PR-0c: オフライン時はこの同期通知モーダルを出さない (弱電波の店頭で出しゃばらない)。
  // online/offline イベント購読なので、オンライン復帰時は自動で再評価される。
  const online = useOnline();

  const [dismissed, setDismissed] = useState(false);
  const [seen] = useState(readSyncSeen);

  // Wave 4 B-7: 共有 hook 経由で mergeSeed (UpdateBanner と同じ計算ロジック)
  // Phase 5: 追加だけでなく program の内容更新 / 終了削除も通知対象に含める
  const { merged, totalChangeCount: count } = useSeedMerge();
  const digest = merged
    ? syncDigest(merged.diff, {
        updatedPrograms: merged.updatedPrograms,
        removedPrograms: merged.removedPrograms,
      })
    : "";

  // PR-4b: 自動反映してよい安全な週か (追加・非破壊更新のみ / 削除・scope変更・版bump 無し)。
  const safe = merged
    ? isAutoApplySafe(merged, { seedVersionBumped: lastSeedVersion < SEED_VERSION })
    : false;

  const groups = useMemo(() => {
    if (!merged || count === 0) return [];
    const storeName = new Map(merged.stores.map((s) => [s.id, s.name]));
    // 削除された program の名前は merged.programs に居ないため
    // removedPrograms 自身から解決する
    const programName = new Map([
      ...(merged.programs ?? []).map((p) => [p.id, p.name] as const),
      ...merged.removedPrograms.map((p) => [p.id, p.name] as const),
    ]);
    return buildSyncGroups(
      merged.diff,
      {
        store: (id) => storeName.get(id) ?? id,
        program: (id) => programName.get(id) ?? id,
      },
      {
        updatedPrograms: merged.updatedPrograms,
        removedPrograms: merged.removedPrograms,
      },
    );
  }, [merged, count]);

  // PR-4b: モーダルは unsafe な週だけ出す。safe な週は下のオーケストレータが自動反映する。
  const visible =
    online &&
    !dismissed &&
    count > 0 &&
    digest !== "" &&
    digest !== seen &&
    !safe;

  const close = () => {
    writeSyncSeen(digest);
    setDismissed(true);
  };

  // PR-4b: 安全な週は起動時に自動反映する (モーダルを出さず Undo バナーに委譲)。
  // applySeedUpdate 相当を実行しつつ Undo バナー用の通知 (autoApplyNotice) を立てる。
  // 反映後は merged が空 (count=0) に再計算されるので条件が自然に落ちて再実行しない。
  // digest 単位の ref guard で StrictMode の effect 二重実行 / 中間再レンダーでの重複起動を防ぐ。
  const autoAppliedDigestRef = useRef<string | null>(null);
  useEffect(() => {
    if (!online) return;
    if (!merged || count === 0) return;
    if (digest === "" || digest === seen) return;
    if (!safe) return; // unsafe は上の visible (モーダル) が担当
    if (autoAppliedDigestRef.current === digest) return;
    autoAppliedDigestRef.current = digest;
    autoApplySeedUpdate({ digest, count });
  }, [online, merged, count, digest, seen, safe, autoApplySeedUpdate]);

  // Wave 4 B-5 a11y: modal の focus 管理 + ESC で閉じる + 初期 focus を primary に。
  // 完全な focus trap は外部ライブラリ (focus-trap-react) が必要だが、ここでは最低限の
  // フォーカス制御と ESC ハンドリングだけ提供 (実用上の改善が大きい)。
  //
  // ⚠️ hooks (useRef/useEffect) は早期 return より「前」で必ず呼ぶこと。
  // visible が true→false に変わった再レンダー (「アプリに反映」/「閉じる」押下) で
  // `if (!visible) return null` が hook より先に発火すると hook 数が減り、
  // React が "Rendered fewer hooks than expected" で全画面クラッシュする
  // (Rules of Hooks 違反)。effect 本体は visible で guard 済みなので順序入れ替えで安全。
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

  if (!visible) return null;

  const handleApply = () => {
    applySeedUpdate([]);
    close();
  };

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
          の追加・更新があります。「アプリに反映」で取り込めます。
        </p>
        {/* PR-4b: このモーダルが出るのは unsafe な週 (削除 / scope 変更 / 版更新を含む)
            だけ。安全な週は自動反映されるので、ここに来た＝確認が必要な変更である旨を明示。 */}
        <p className="sync-update-warn">
          削除や大きな変更を含むため確認をお願いします。
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
