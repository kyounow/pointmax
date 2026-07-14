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
    <div className="schema-upgrade-modal-overlay">
      <div className="schema-upgrade-modal">
        <h2 className="schema-upgrade-title">PointMax v3 アップデートのお知らせ</h2>

        {reason && (
          <p className="schema-upgrade-reason">{reason}</p>
        )}

        <div className="schema-upgrade-recommendation">
          <p><strong>推奨手順:</strong></p>
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
          <button onClick={handleExportThenApply}>
            エクスポートしてから続行
          </button>
          <button className="primary schema-upgrade-primary" onClick={handleApply}>
            アップデート適用
          </button>
        </div>
      </div>
    </div>
  );
}
