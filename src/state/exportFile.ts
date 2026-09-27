// JSON エクスポートの blob ダウンロード util。
//
// SettingsScreen の handleExport (通常データ・退避データ) / RecoveryPanel (復旧用の書き出し) /
// SchemaUpgradeModal のレガシーバックアップが共用する DOM ダウンロード処理
// (重複実装を避けるため唯一の実装としてここに置く)。呼び出し側は「どの JSON を」「どの接頭辞で」
// だけ渡す。ファイル名は `${prefix}-YYYY-MM-DD.json`。
export function downloadJsonFile(json: string, filenamePrefix: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `${filenamePrefix}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
