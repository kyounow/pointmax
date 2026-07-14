import { lazy, Suspense, useEffect } from "react";
import "./App.css";
import { CurrenciesScreen } from "./ui/CurrenciesScreen";
import { StoresScreen } from "./ui/StoresScreen";
import { BenefitsScreen } from "./ui/BenefitsScreen";
// Wave 6 B-4: EdgesScreen は @xyflow/react (174 KB JS + 15 KB CSS) を引き込む最重量画面。
// 静的 import だと index.html の modulepreload に乗り、デフォルトの計算タブを開くだけで
// 全ユーザーが React Flow を初期ロードする。lazy 化して「交換ルート」タブを開いた時だけ
// xyflow chunk を fetch するよう遅延 (初期ロードから ~190 KB を除外)。
const EdgesScreen = lazy(() =>
  import("./ui/EdgesScreen").then((m) => ({ default: m.EdgesScreen })),
);
import { CalculatorScreen } from "./ui/CalculatorScreen";
import { WalletScreen } from "./ui/WalletScreen";
import { SettingsScreen } from "./ui/SettingsScreen";
import { DataHubScreen } from "./ui/DataHubScreen";
import { UpdateBanner } from "./ui/UpdateBanner";
import { SchemaUpgradeModal } from "./ui/SchemaUpgradeModal";
import { SyncUpdateModal } from "./ui/SyncUpdateModal";
import { useStore } from "./state/store";
import { recordTabView } from "./state/usageStats";
import { requestPersistentStorage } from "./state/storagePersistence";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { useRoute, navigate, replaceRoute, parseHash } from "./navigation";
import { legacyWalletRedirect } from "./ui/wallet/walletRoute";
import { legacyBenefitsRedirect } from "./ui/benefits/benefitsRoute";
import { legacySettingsRedirect } from "./ui/settings/settingsRoute";
import {
  TABS,
  DAILY_TABS,
  DATA_MENU_TABS,
  BOTTOM_BAR,
  tabGroup,
  bottomBarActiveSlot,
  shouldHideBottomBar,
  type Tab,
} from "./ui/nav/navConfig";
import { DataMenu } from "./ui/nav/DataMenu";

function App() {
  // 画面状態は location.hash から導出する (PR-0d: hash ルーティング基盤)。
  // route.tab が TABS の有効な id ならそれを採用、未知/空なら "calculator" に fallback。
  // route.sub / route.params は各画面 (設定サブセクション・ウォレットハイライト等) が
  // useRoute の戻り値として利用する。
  const route = useRoute();
  // 廃止した旧タブからの流入を統合先タブとして描画する (URL は下の正規化 effect で
  // 新 hash へ replaceRoute)。
  //   PR-2b1: #cards / #pointcards / #paymentapps → "wallet"
  //   PR-2c:  #programs / #campaigns             → "benefits"
  //   PR-2d:  #sync-history                      → "settings" (sub=history は SettingsScreen が解決)
  const effectiveTabId = legacyWalletRedirect(route.tab)
    ? "wallet"
    : legacyBenefitsRedirect(route.tab)
      ? "benefits"
      : legacySettingsRedirect(route.tab)
        ? "settings"
        : route.tab;
  const tab: Tab = TABS.find((t) => t.id === effectiveTabId)?.id ?? "calculator";
  const activeTabLabel = TABS.find((t) => t.id === tab)?.label ?? "PointMax";

  // PR-0c: マウント時に永続ストレージ (Storage API persist) を 1 回要求する。
  // iOS Safari 等での 7 日非アクセス自動削除 / 容量逼迫 eviction による
  // localStorage 全損リスクを下げる。結果は投げっぱなしで良い (失敗しても
  // 本体アプリに一切影響させない — 内部で try/catch 済み)。
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  const pendingMigration = useStore((s) => s._pendingSchemaMigration);

  // 初回マウント時のみ: hash が空 or 未知 tab のとき履歴を汚さず calculator に正規化。
  // replaceRoute は hashchange を発火しないが、parseHash("") も calculator を返すため
  // useRoute の snapshot と導出 tab は一致したまま (履歴エントリを増やさない)。
  useEffect(() => {
    const initial = parseHash(location.hash);
    // 旧タブ id は統合先の新 hash へ寄せる (replaceRoute は履歴を汚さない)。
    //   PR-2b1: #cards / #pointcards / #paymentapps → #wallet 系
    //   PR-2c:  #programs / #campaigns             → #benefits
    //   PR-2d:  #sync-history                      → #settings/history
    const legacy =
      legacyWalletRedirect(initial.tab) ??
      legacyBenefitsRedirect(initial.tab) ??
      legacySettingsRedirect(initial.tab);
    if (legacy) {
      replaceRoute(legacy);
      return;
    }
    const known = TABS.some((t) => t.id === initial.tab);
    if (!location.hash || !known) replaceRoute("calculator");
  }, []);

  // tab 変化時に document.title を更新 (画面名 | PointMax)。
  useEffect(() => {
    document.title = `${activeTabLabel} | PointMax`;
  }, [activeTabLabel]);

  // tab 変化時にローカル利用統計へタブ表示を記録 (PR-0b: 端末内のみ・送信なし)。
  useEffect(() => {
    recordTabView(tab);
  }, [tab]);

  // tab 変化時のみ最上部へスクロールリセット。
  // 規則: 同一 tab 内の sub / params 変化ではリセットしない (依存は tab のみ)。
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  // PR-2e: 下部バー分の余白を確保するクラス (交換ルートは下部バー非表示なので付けない)。
  const hideBottomBar = shouldHideBottomBar(tab);

  return (
    <div className="app">
      {pendingMigration && <SchemaUpgradeModal strategy={pendingMigration} />}
      {!pendingMigration && (
        <SyncUpdateModal onViewHistory={() => navigate("settings/history")} />
      )}
      <header className="appbar">
        <button
          type="button"
          className="brand"
          onClick={() => navigate("calculator")}
          aria-label="計算画面に戻る"
          title="計算画面に戻る"
        >
          PointMax
        </button>
        {/* PR-2e: デスクトップナビ。daily 4 タブ + データ▾ ドロップダウン + 設定タブ。
            UX-8(1): tablist/tab/tabpanel の ARIA は廃止し、現在タブに aria-current="page"
            のみを付ける (main 側も role=tabpanel を除去して orphan ARIA を防ぐ)。 */}
        <nav className="tabs desktop-only" aria-label="メインナビゲーション">
          {DAILY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? "page" : undefined}
              className={tab === t.id ? "active" : ""}
              onClick={() => navigate(t.id)}
            >
              {t.label}
            </button>
          ))}
          <DataMenu items={DATA_MENU_TABS} active={tabGroup(tab) === "data"} />
          <button
            type="button"
            aria-current={tab === "settings" ? "page" : undefined}
            className={tab === "settings" ? "active" : ""}
            onClick={() => navigate("settings")}
          >
            設定
          </button>
        </nav>
      </header>

      <main
        className={`content${hideBottomBar ? "" : " has-bottom-bar"}`}
        aria-label={activeTabLabel}
      >
        {/* PR-3a (N-1): 計算画面では UpdateBanner を BannerSlot 経由の通知枠に一本化
            (onboarding/today との優先度調停のため)。計算画面以外では従来どおり
            main 上部に出す (挙動維持)。 */}
        {tab !== "calculator" && <UpdateBanner />}
        {/* Wave 4 B-6 audit-fix: 各 Screen を ErrorBoundary で wrap。
            画面単位で隔離して、1 画面のエラーがアプリ全体を停止させないようにする。
            scopeName で console.error に画面名が残るので運用調査の起点になる。 */}
        <ErrorBoundary scopeName={activeTabLabel}>
          {/* Wave 6 B-4: EdgesScreen は lazy なので Suspense で囲む。
              他画面は静的 import なので fallback は交換ルート読込時のみ出る。 */}
          <Suspense fallback={<p className="empty">読み込み中…</p>}>
            {tab === "calculator" && <CalculatorScreen />}
            {tab === "wallet" && <WalletScreen />}
            {tab === "currencies" && <CurrenciesScreen />}
            {tab === "stores" && <StoresScreen />}
            {tab === "data" && <DataHubScreen />}
            {tab === "benefits" && <BenefitsScreen />}
            {tab === "edges" && <EdgesScreen />}
            {tab === "settings" && <SettingsScreen />}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* PR-2e: モバイル下部固定タブバー (計算 / 特典 / データ / 設定)。
          交換ルート表示中はグラフ操作域を最大化するため非表示。
          既知の確認残 (実機依存で未検証): モバイルでソフトキーボード表示時に
          position:fixed の本バーが金額 input に被る可能性がある。実機で遮蔽が
          起きる場合は visualViewport.resize でバーを退避させる対応を検討する。 */}
      {!hideBottomBar && (
        <nav className="bottom-bar mobile-only" aria-label="メインナビゲーション">
          {BOTTOM_BAR.map((b) => {
            const isActive = bottomBarActiveSlot(tab) === b.slot;
            return (
              <button
                key={b.slot}
                type="button"
                className={isActive ? "bottom-bar-item active" : "bottom-bar-item"}
                aria-current={isActive ? "page" : undefined}
                onClick={() => navigate(b.target)}
              >
                <span className="bottom-bar-icon" aria-hidden="true">
                  {b.icon}
                </span>
                <span className="bottom-bar-label">{b.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export default App;
