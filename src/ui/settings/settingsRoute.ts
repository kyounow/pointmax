// 設定画面のルーティング補助 (改善プラン PR-2d、純関数のみ)。
//
// 「更新履歴」トップレベルタブを廃止し、設定内「マスタ更新履歴」セクションへ降格する。
// サブセクションは hash の sub で表現する:
//   #settings            → 設定トップ
//   #settings/history    → マスタ更新履歴セクションを自動展開 + scrollIntoView
//
// 併せて、廃止した旧タブ (#sync-history) からの流入を新 hash へ寄せるリダイレクト表も
// ここに置く (App.tsx の正規化ロジックが参照)。walletRoute.ts / benefitsRoute.ts と同型。
//
// heavy import を持たない (純粋な文字列判定のみ) ので node 環境で軽くユニットテストできる。

// 廃止した旧タブ id → 新 hash (先頭 # なし)。App.tsx の未知 tab 正規化で replaceRoute する。
export const LEGACY_SETTINGS_REDIRECT: Record<string, string> = {
  "sync-history": "settings/history",
};

// 旧タブ id なら対応する新 hash を、そうでなければ null を返す。
export function legacySettingsRedirect(tab: string): string | null {
  return Object.prototype.hasOwnProperty.call(LEGACY_SETTINGS_REDIRECT, tab)
    ? LEGACY_SETTINGS_REDIRECT[tab]
    : null;
}

// Route (tab / sub) から「マスタ更新履歴」セクションを展開すべきか判定する。
// 新 hash (#settings/history) と、旧 hash からの流入 (#sync-history) の両方を解決する
// — App.tsx の replaceRoute は hashchange を発火しないため、URL 置換前の初期 render でも
//   正しく展開できるようにしておく (resolveWalletSection と同じ思想)。
export function shouldExpandSyncHistory(route: {
  tab: string;
  sub?: string;
}): boolean {
  return route.tab === "sync-history" || route.sub === "history";
}
