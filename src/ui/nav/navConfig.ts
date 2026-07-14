// 改善プラン PR-2e: ナビゲーション最終再編の構成定義 (純データ + 純関数)。
//
// タブを 3 グループに分類する:
//   - daily: 日常的に開く画面 (計算 / 特典 / 交換ルート / ウォレット)
//   - data : 参照系データ (通貨 / 店舗 / データハブ)
//   - meta : 設定
//
// デスクトップは daily を横並びタブ + 「データ ▾」ドロップダウン (通貨/店舗) + 設定。
// モバイルは下部固定バー 4 枠 (計算 / 特典 / データ / 設定)。data 系タブは
// 下部バーの「データ」枠へ集約し、ハブ画面 (#data) 経由で個別画面へ遷移する。
//
// UI から独立した純データ/純関数に切り出しているのは、group 構造と下部バーの
// active 規則をレンダリング無しでユニットテストするため (navConfig.test.ts)。

export type Tab =
  | "calculator"
  | "benefits"
  | "edges"
  | "wallet"
  | "currencies"
  | "stores"
  | "data"
  | "settings";

export type TabGroup = "daily" | "data" | "meta";

export type TabDef = { id: Tab; label: string; group: TabGroup };

// 表示順 = デスクトップ daily タブの並び順。data/meta はドロップダウン・設定で個別に扱う。
export const TABS: TabDef[] = [
  { id: "calculator", label: "計算", group: "daily" },
  // PR-2c: プログラム / キャンペーン を統合した「特典・キャンペーン」。
  { id: "benefits", label: "特典・キャンペーン", group: "daily" },
  { id: "edges", label: "交換ルート", group: "daily" },
  // PR-2b1: カード / ポイントカード / 支払方法 を統合した「ウォレット」。
  { id: "wallet", label: "ウォレット", group: "daily" },
  { id: "currencies", label: "通貨", group: "data" },
  { id: "stores", label: "店舗", group: "data" },
  // PR-2e: モバイル下部バー「データ」枠が開くハブ画面。デスクトップナビには出さない
  // (ドロップダウンで通貨/店舗へ直接遷移できるため)。
  { id: "data", label: "データ", group: "data" },
  // PR-2d: 「更新履歴」タブは廃止し、設定内「マスタ更新履歴」セクションへ降格。
  { id: "settings", label: "設定", group: "meta" },
];

// tab → group。未知 id は "daily" 扱い (呼び出し側で TABS fallback 済みの想定)。
export function tabGroup(tab: Tab): TabGroup {
  return TABS.find((t) => t.id === tab)?.group ?? "daily";
}

// デスクトップ daily タブ (横並び)。
export const DAILY_TABS: TabDef[] = TABS.filter((t) => t.group === "daily");

// デスクトップ「データ ▾」ドロップダウンに並べる項目 (通貨 / 店舗)。
// ハブ (#data) 自体はデスクトップでは冗長なので除外する。
export const DATA_MENU_TABS: TabDef[] = TABS.filter(
  (t) => t.group === "data" && t.id !== "data",
);

// モバイル下部バーの 4 枠。
export type BottomSlot = "calculator" | "benefits" | "data" | "settings";

export const BOTTOM_BAR: {
  slot: BottomSlot;
  label: string;
  icon: string;
  target: Tab;
}[] = [
  { slot: "calculator", label: "計算", icon: "🧮", target: "calculator" },
  { slot: "benefits", label: "特典", icon: "🎁", target: "benefits" },
  // 「データ」枠はハブ画面へ遷移する。
  { slot: "data", label: "データ", icon: "📚", target: "data" },
  { slot: "settings", label: "設定", icon: "⚙", target: "settings" },
];

// 現在タブ → 下部バーで active 表示する枠。
//   calculator          → 計算
//   benefits            → 特典
//   settings            → 設定
//   wallet/edges/       → データ (通貨・店舗・ハブ含め data 系はすべて「データ」枠)
//   currencies/stores/data
export function bottomBarActiveSlot(tab: Tab): BottomSlot {
  if (tab === "calculator") return "calculator";
  if (tab === "benefits") return "benefits";
  if (tab === "settings") return "settings";
  return "data";
}

// EdgesScreen (交換ルート) はグラフ操作域を最大化するため下部バーを隠す。
export function shouldHideBottomBar(tab: Tab): boolean {
  return tab === "edges";
}
