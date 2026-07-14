// ウォレット統合 (改善プラン PR-2b1) のルーティング補助 (純関数のみ)。
//
// ウォレット画面はクレカ / ポイントカード / 支払方法 の 3 セクションを 1 タブに束ね、
// セクションを hash の sub で表現する:
//   #wallet                 → cards        (既定)
//   #wallet/point-cards     → point-cards
//   #wallet/payment-apps    → payment-apps
//
// 併せて、統合で廃止した旧タブ (#cards / #pointcards / #paymentapps) からの
// 流入を新 hash へ寄せるリダイレクト表もここに置く (App の正規化ロジックが参照)。
//
// heavy import を持たない (型のみ) ので、vitest の node 環境で軽くユニットテストできる。

export type WalletSection = "cards" | "point-cards" | "payment-apps";

// 統合で廃止した旧タブ id → 新 hash。App.tsx の未知 tab 正規化で replaceRoute する。
// 注: 旧タブ id は "pointcards" / "paymentapps" (ハイフンなし)。新 sub はハイフン区切り。
export const LEGACY_WALLET_REDIRECT: Record<string, string> = {
  cards: "wallet",
  pointcards: "wallet/point-cards",
  paymentapps: "wallet/payment-apps",
};

// 旧タブ id なら対応する新 hash を、そうでなければ null を返す。
export function legacyWalletRedirect(tab: string): string | null {
  return Object.prototype.hasOwnProperty.call(LEGACY_WALLET_REDIRECT, tab)
    ? LEGACY_WALLET_REDIRECT[tab]
    : null;
}

// セクション → hash (先頭 # なし)。cards は sub なしの素の #wallet。
export function walletSectionHash(section: WalletSection): string {
  return section === "cards" ? "wallet" : `wallet/${section}`;
}

// Route (tab / sub) からアクティブなセクションを解決する。
// 新 hash (#wallet[/sub]) と、旧 hash からの流入 (#pointcards / #paymentapps) の
// 両方を解決する — App の replaceRoute は hashchange を発火しないため、URL 置換後の
// 再 render を待たずに旧 tab からも正しいセクションを描画できるようにしておく。
export function resolveWalletSection(route: {
  tab: string;
  sub?: string;
}): WalletSection {
  if (route.tab === "pointcards" || route.sub === "point-cards") {
    return "point-cards";
  }
  if (route.tab === "paymentapps" || route.sub === "payment-apps") {
    return "payment-apps";
  }
  return "cards";
}
