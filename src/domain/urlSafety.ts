// entryUrl / officialUrl 等、Gemini 抽出 URL の安全性検証。
//
// Gemini 抽出パイプラインが `javascript:` / `data:` / `vbscript:` 等の
// 危険スキームや相対パスを URL として抽出してしまった場合の stored XSS を
// 防ぐガード。propose 層 (scripts/sync/propose-helpers.ts) で不正 URL を
// レコードから drop するのに使うほか、UI 側 (CampaignsScreen /
// ProgramsScreen) でも defense-in-depth として同じ関数でリンク描画前に
// 再検証する (手動 CampaignForm 入力にも効く)。
export function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
