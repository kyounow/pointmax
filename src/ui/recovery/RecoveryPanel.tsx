// PR-6d (U6): エラー時の復旧パネル。
//
// 2 つのモード:
//   - screen: App の画面単位の ErrorBoundary の既定 fallback (ヘッダ・下部バーは生きている)。
//             「もう一度試す」(境界の reset) を出す。
//   - root:   Root の最外境界の fallback、または persist の読み込み (hydrate) 失敗時に App の
//             代わりに描画する。DialogProvider の外なので useDialog は使えない。
// どちらも useStore を購読しない (壊れた state の購読で再 throw しない)。render 中に読むのは
// try/catch 済みの restorableSnapshotMeta() だけ。store に触るのは初期化ボタンの
// useStore.getState().resetToSeed() だけ (購読ではない)。
// lazy 化しない: chunk の取得に失敗したときにも出せる必要がある。
// main chunk の予算 (+4 KB) のため、仕様で決めた文言以外は短くし、ボタンは小さな helper で作る。

import { useState } from "react";
import { useStore } from "../../state/store";
import { downloadJsonFile } from "../../state/exportFile";
import { backupRawPersisted } from "../../state/hydrationGuard";
import { SNAPSHOT_TRIGGER_LABEL } from "../../state/stateSnapshot";
import {
  buildRecoveryExportJson,
  formatTakenAt,
  removePersistedForRecovery,
  restorableSnapshotMeta,
  restoreSnapshotForRecovery,
} from "../../state/recovery";

type Props = {
  mode: "screen" | "root";
  error: Error | null;
  /** どの境界で落ちたか (画面名など)。見出しに添える。 */
  scopeName?: string;
  /** render = 描画中の例外 / hydrate = 保存データの読み込み失敗。 */
  cause?: "render" | "hydrate";
  /** screen モードの「もう一度試す」(境界の reset)。 */
  onRetry?: () => void;
};

const reload = () => window.location.reload();

// ボタン 1 つ (className は primary / danger)。コンポーネントではなく JSX を返す関数。
const button = (label: string, onClick: () => unknown, className?: string) => (
  <button className={className} onClick={onClick}>
    {label}
  </button>
);

export function RecoveryPanel({
  mode,
  error,
  scopeName,
  cause = "render",
  onRetry,
}: Props) {
  const [snapshot] = useState(restorableSnapshotMeta);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState("");

  const exportData = () => {
    try {
      downloadJsonFile(buildRecoveryExportJson(error, cause), "pointmax-recovery");
      return true;
    } catch {
      setMessage("書き出せませんでした");
      return false;
    }
  };

  const copyData = async () => {
    try {
      // clipboard 未対応 (非 https 等) は TypeError になり catch に落ちる
      await navigator.clipboard.writeText(buildRecoveryExportJson(error, cause));
      setMessage("コピーしました");
    } catch {
      setMessage("コピーできませんでした");
    }
  };

  const restore = () => {
    const res = restoreSnapshotForRecovery();
    if (res.ok) reload();
    else setMessage(res.error);
  };

  const resetToOfficial = (exportFirst: boolean) => {
    // 書き出しに失敗したら初期化しない (「書き出してから」を保証する)
    if (exportFirst && !exportData()) return;
    // resetToSeed はスナップショットを取らないので、壊れた生データは先に crash-backup へ退避する
    backupRawPersisted("reset");
    let note = "";
    try {
      useStore.getState().resetToSeed();
    } catch {
      // 書き込み失敗 (quota 超過等)。persist キーだけ消して空プロファイルで起動させる
      // (次回起動で seedIfEmpty が公式データを投入する)。
      removePersistedForRecovery();
      note = "再読み込み後は公式データで起動します (カードの「使う」設定はやり直し)";
    }
    setConfirmReset(false);
    // ダウンロード (iOS では保存シート) の途中で reload すると保存が中断されうるため、
    // 書き出し付きのときは自動で再読み込みせず、保存を確かめてから押してもらう。
    setMessage(note || (exportFirst ? "保存後に再読み込みしてください" : ""));
    if (!exportFirst) reload();
  };

  return (
    <div className="recovery-panel" role="alert">
      <h3>エラーが発生しました{scopeName && ` (${scopeName})`}</h3>
      {cause === "hydrate" && (
        <p>保存データを読み込めませんでした。元のデータは端末内に退避済みです</p>
      )}
      <p className="recovery-error">{error?.message}</p>
      {button("ページを再読み込み", reload, "primary")}
      {mode === "screen" && onRetry && button("もう一度試す", onRetry)}
      <details>
        <summary>データの復旧</summary>
        {button("データを書き出す", exportData)}
        {button("コピー", copyData)}
        {snapshot &&
          button(
            `直前の状態に戻す（${formatTakenAt(snapshot.takenAt)}・${SNAPSHOT_TRIGGER_LABEL[snapshot.trigger]}）`,
            restore,
          )}
        {confirmReset ? (
          <p>
            カードの「使う」設定・優先通貨・誕生月・除外設定はやり直しになります
            <br />
            {button("書き出してから初期化", () => resetToOfficial(true), "primary")}
            {button("初期化する", () => resetToOfficial(false), "danger")}
            {button("やめる", () => setConfirmReset(false))}
          </p>
        ) : (
          button("公式データで初期化…", () => setConfirmReset(true), "danger")
        )}
        {message && <p role="status">{message}</p>}
      </details>
    </div>
  );
}
