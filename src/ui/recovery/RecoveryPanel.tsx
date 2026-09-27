// PR-6d (U6): エラー時の復旧パネル。
//
// 2 つのモード:
//   - screen: App の画面単位の ErrorBoundary の既定 fallback (ヘッダ・下部バーは生きている)。
//   - root:   Root の最外境界の fallback、または persist の読み込み (hydrate) 失敗時に App の
//             代わりに描画する。DialogProvider の外なので useDialog は使えない。
// どちらも useStore を購読しない (壊れた state の購読で再 throw しない)。render 中に読むのは
// try/catch 済みの restorableSnapshotMeta() だけ。store に触るのは初期化ボタンの
// useStore.getState().resetToSeed() だけ (購読ではない)。
// lazy 化しない: chunk の取得に失敗したときにも出せる必要がある。

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
  /** どの境界で落ちたか (画面名など)。見出しに小さく添える。 */
  scopeName?: string;
  /** render = 描画中の例外 / hydrate = 保存データの読み込み失敗。 */
  cause?: "render" | "hydrate";
  /** screen モードの「もう一度試す」(境界の reset)。 */
  onRetry?: () => void;
};

const reload = () => window.location.reload();

export function RecoveryPanel({
  mode,
  error,
  scopeName,
  cause = "render",
  onRetry,
}: Props) {
  const [snapshot, setSnapshot] = useState(restorableSnapshotMeta);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState("");

  const exportData = (): boolean => {
    try {
      downloadJsonFile(buildRecoveryExportJson(error, cause), "pointmax-recovery");
      return true;
    } catch {
      setMessage("書き出せませんでした。「コピー」を試してください。");
      return false;
    }
  };

  const copyData = async () => {
    try {
      // clipboard 未対応 (非 https 等) は TypeError になり catch に落ちる
      await navigator.clipboard.writeText(buildRecoveryExportJson(error, cause));
      setMessage("クリップボードにコピーしました。");
    } catch {
      setMessage("コピーできませんでした。「データを書き出す」を使ってください。");
    }
  };

  const restore = () => {
    const res = restoreSnapshotForRecovery();
    if (res.ok) {
      reload();
      return;
    }
    setMessage(`戻せませんでした: ${res.error}`);
    setSnapshot(restorableSnapshotMeta());
  };

  const resetToOfficial = (exportFirst: boolean) => {
    // 書き出しに失敗したら初期化しない (書き出してから、を保証する)
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
      note =
        "再読み込み後は公式データで起動します (カードの「使う」設定はやり直し)。";
    }
    if (exportFirst) {
      // ダウンロード (iOS では保存シート) の途中で reload すると保存が中断されうるため、
      // 書き出し付きのときは自動で再読み込みせず、保存を確かめてから押してもらう。
      setConfirmReset(false);
      setMessage(
        `${note || "公式データで初期化しました。"}書き出したファイルを保存してから「ページを再読み込み」を押してください。`,
      );
      return;
    }
    if (note) setMessage(note);
    reload();
  };

  return (
    <div className={`recovery-panel recovery-${mode}`} role="alert">
      <h3>
        {mode === "root"
          ? "PointMax を表示できませんでした"
          : "画面エラーが発生しました"}
        {scopeName && <span className="recovery-scope"> ({scopeName})</span>}
      </h3>
      {cause === "hydrate" && (
        <p>
          保存データを読み込めませんでした。元のデータは端末内に退避済みです。
        </p>
      )}
      <p className="recovery-error">{error?.message || "詳細不明のエラーです"}</p>
      <div className="recovery-actions">
        <button type="button" className="primary" onClick={reload}>
          ページを再読み込み
        </button>
        {mode === "screen" && onRetry && (
          <button type="button" onClick={onRetry}>
            もう一度試す
          </button>
        )}
      </div>
      <details className="recovery-data">
        <summary>データの復旧</summary>
        <div className="recovery-actions">
          <button type="button" onClick={exportData}>
            データを書き出す
          </button>
          <button type="button" onClick={copyData}>
            コピー
          </button>
          {snapshot && (
            <button type="button" onClick={restore}>
              直前の状態に戻す（{formatTakenAt(snapshot.takenAt)}・
              {SNAPSHOT_TRIGGER_LABEL[snapshot.trigger]}）
            </button>
          )}
          {!confirmReset && (
            <button
              type="button"
              className="danger"
              onClick={() => setConfirmReset(true)}
            >
              公式データで初期化…
            </button>
          )}
        </div>
        {confirmReset && (
          <div className="recovery-confirm">
            <p>
              公式データで初期化します。カードの「使う」設定・優先通貨・誕生月・除外設定はやり直しになります。
            </p>
            <div className="recovery-actions">
              <button
                type="button"
                className="primary"
                onClick={() => resetToOfficial(true)}
              >
                書き出してから初期化
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => resetToOfficial(false)}
              >
                初期化する
              </button>
              <button type="button" onClick={() => setConfirmReset(false)}>
                やめる
              </button>
            </div>
          </div>
        )}
        {message && (
          <p className="hint" role="status">
            {message}
          </p>
        )}
      </details>
    </div>
  );
}
