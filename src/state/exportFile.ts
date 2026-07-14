// JSON エクスポートの blob ダウンロード util。
//
// App.tsx の handleExport (通常データ) と SchemaUpgradeModal の
// レガシーバックアップの両方が同じ DOM ダウンロード処理を重複実装していたため、
// 唯一の実装としてここに抽出した。呼び出し側は「どの JSON を」「どの接頭辞で」
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
