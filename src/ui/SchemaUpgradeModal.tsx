import { useStore } from "../state/store";
import type { SchemaMigrationStrategy } from "../state/persist-versions";

type Props = {
  strategy: SchemaMigrationStrategy;
};

export function SchemaUpgradeModal({ strategy }: Props) {
  const applySchemaMigration = useStore((s) => s.applySchemaMigration);
  const exportLegacyState = useStore((s) => s.exportLegacyState);

  const handleExport = () => {
    const json = exportLegacyState();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `pointmax-legacy-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
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
          <button className="primary schema-upgrade-primary" onClick={handleApply}>
            アップデート適用
          </button>
        </div>
      </div>
    </div>
  );
}
