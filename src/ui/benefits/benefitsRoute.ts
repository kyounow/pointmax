// 特典・キャンペーン統合 (改善プラン PR-2c) のルーティング補助 (純関数のみ)。
//
// ProgramsScreen (#programs) と CampaignsScreen (#campaigns) は同一エンティティ
// BenefitProgram の一覧であり、フィルタが重複していた。両画面を「特典・キャンペーン」
// 1 タブ (#benefits) に統合する。統合で廃止した旧タブからの流入を #benefits へ寄せる
// リダイレクト表をここに置く (App の正規化ロジックが参照)。
//
// walletRoute.ts と同型。ウォレットと違い #benefits は sub を持たない (フィルタは
// 画面内 state で持つ) ため、旧 hash → 新 hash は 1 対 1 の単純マッピングのみ。
//
// heavy import を持たない (純粋な文字列マッピング) ので node 環境で軽くユニットテストできる。

// 統合で廃止した旧タブ id → 新 hash (先頭 # なし)。App.tsx の未知 tab 正規化で replaceRoute する。
export const LEGACY_BENEFITS_REDIRECT: Record<string, string> = {
  programs: "benefits",
  campaigns: "benefits",
};

// 旧タブ id なら対応する新 hash を、そうでなければ null を返す。
export function legacyBenefitsRedirect(tab: string): string | null {
  return Object.prototype.hasOwnProperty.call(LEGACY_BENEFITS_REDIRECT, tab)
    ? LEGACY_BENEFITS_REDIRECT[tab]
    : null;
}
