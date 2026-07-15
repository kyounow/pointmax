import { useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { downloadJsonFile } from "../state/exportFile";
import type { SchemaMigrationStrategy } from "../state/persist-versions";

type Props = {
  strategy: SchemaMigrationStrategy;
};

export function SchemaUpgradeModal({ strategy }: Props) {
  // Wave 5 B-1: 2 個別 subscribe → 単一 useShallow
  const { applySchemaMigration, exportLegacyState } = useStore(
    useShallow((s) => ({
      applySchemaMigration: s.applySchemaMigration,
      exportLegacyState: s.exportLegacyState,
    })),
  );

  // ネイティブ <dialog> を modal として開く。reset 必須のため「閉じられない」
  // 仕様 (Esc / 背景クリックで dismiss させない) を維持する。
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (typeof dlg.showModal === "function") {
      if (!dlg.open) dlg.showModal();
    } else {
      // jsdom 等 showModal 未実装環境は open 属性フォールバックで可視化。
      dlg.setAttribute("open", "");
    }
    return () => {
      if (typeof dlg.close === "function") {
        if (dlg.open) dlg.close();
      } else {
        dlg.removeAttribute("open");
      }
    };
  }, []);

  const handleExport = () => {
    // reset 直前の localStorage 全データ (empty 化前の _legacyPersistedState) を
    // バックアップ出力する。App.tsx の通常エクスポートと同じ blob ダウンロード util を共用。
    downloadJsonFile(exportLegacyState(), "pointmax-legacy-backup");
  };

  const handleApply = () => {
    applySchemaMigration();
  };

  // 「エクスポート → 続けて反映」を 1 操作で。バックアップを取り損ねたまま
  // reset される事故を減らす (reset 後は旧データを取り戻せないため)。
  const handleExportThenApply = () => {
    handleExport();
    applySchemaMigration();
  };

  const reason =
    strategy.type === "reset"
      ? strategy.reason
      : strategy.type === "transform"
        ? "データの構造変換が必要です。変換後に続行してください。"
        : "";

  return (
    // <dialog> 要素自身をパネルにする (width の % がビューポート基準で解決される)。
    <dialog
      ref={dialogRef}
      className="schema-upgrade-modal"
      aria-modal="true"
      // reset 必須のため Esc で閉じさせない (ネイティブ既定の close を無効化)。
      onCancel={(e) => e.preventDefault()}
    >
      <h2 className="schema-upgrade-title">PointMax v3 アップデートのお知らせ</h2>

      {reason && <p className="schema-upgrade-reason">{reason}</p>}

      <div className="schema-upgrade-recommendation">
        <p>
          <strong>推奨手順:</strong>
        </p>
        <ol>
          <li>下の「JSON エクスポート」で念のためバックアップを保存</li>
          <li>「アップデート適用」を押す</li>
        </ol>
        <p className="hint schema-upgrade-hint">
          ※ 公式マスタは最新版が自動配信されます。手書き設定がなければ、影響はほぼゼロです。
        </p>
      </div>

      <div className="schema-upgrade-actions">
        <button onClick={handleExport}>JSON エクスポート (推奨)</button>
        <button onClick={handleExportThenApply}>エクスポートしてから続行</button>
        <button className="primary schema-upgrade-primary" onClick={handleApply}>
          アップデート適用
        </button>
      </div>
    </dialog>
  );
}
