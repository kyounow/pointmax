import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import "./App.css";
import { CardsScreen } from "./ui/CardsScreen";
import { CurrenciesScreen } from "./ui/CurrenciesScreen";
import { StoresScreen } from "./ui/StoresScreen";
import { ProgramsScreen } from "./ui/ProgramsScreen";
import { CampaignsScreen } from "./ui/CampaignsScreen";
// Wave 6 B-4: EdgesScreen は @xyflow/react (174 KB JS + 15 KB CSS) を引き込む最重量画面。
// 静的 import だと index.html の modulepreload に乗り、デフォルトの計算タブを開くだけで
// 全ユーザーが React Flow を初期ロードする。lazy 化して「交換ルート」タブを開いた時だけ
// xyflow chunk を fetch するよう遅延 (初期ロードから ~190 KB を除外)。
const EdgesScreen = lazy(() =>
  import("./ui/EdgesScreen").then((m) => ({ default: m.EdgesScreen })),
);
import { CalculatorScreen } from "./ui/CalculatorScreen";
import { PointCardsScreen } from "./ui/PointCardsScreen";
import { PaymentAppsScreen } from "./ui/PaymentAppsScreen";
import { SettingsScreen } from "./ui/SettingsScreen";
import { SyncHistoryScreen } from "./ui/SyncHistoryScreen";
import { UpdateBanner } from "./ui/UpdateBanner";
import { SchemaUpgradeModal } from "./ui/SchemaUpgradeModal";
import { SyncUpdateModal } from "./ui/SyncUpdateModal";
import { useStore } from "./state/store";
import { recordTabView } from "./state/usageStats";
import { requestPersistentStorage } from "./state/storagePersistence";
import { useDialog } from "./ui/dialog/useDialog";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { useRoute, navigate, replaceRoute, parseHash } from "./navigation";

type Tab =
  | "calculator"
  | "cards"
  | "pointcards"
  | "paymentapps"
  | "currencies"
  | "stores"
  | "programs"
  | "campaigns"
  | "edges"
  | "sync-history"
  | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "calculator", label: "計算" },
  { id: "cards", label: "カード" },
  { id: "pointcards", label: "ポイントカード" },
  { id: "paymentapps", label: "支払方法" },
  { id: "currencies", label: "通貨" },
  { id: "stores", label: "店舗" },
  { id: "programs", label: "プログラム" },
  { id: "campaigns", label: "キャンペーン" },
  { id: "edges", label: "交換ルート" },
  { id: "sync-history", label: "更新履歴" },
  { id: "settings", label: "設定" },
];

function App() {
  // 画面状態は location.hash から導出する (PR-0d: hash ルーティング基盤)。
  // route.tab が TABS の有効な id ならそれを採用、未知/空なら "calculator" に fallback。
  // route.sub / route.params は今回未消費だが、後続 PR (設定サブセクション・
  // ウォレットハイライト等) が useRoute の戻り値として利用できる状態にしてある。
  const route = useRoute();
  const tab: Tab = TABS.find((t) => t.id === route.tab)?.id ?? "calculator";
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Wave 5 B-1: useShallow に集約 (関数 + pendingMigration はまとめて取れる)
  const { exportJson, importJson, pendingMigration } = useStore(
    useShallow((s) => ({
      exportJson: s.exportJson,
      importJson: s.importJson,
      pendingMigration: s._pendingSchemaMigration,
    })),
  );
  const hasData = useStore(
    (s) =>
      s.cards.length +
        s.currencies.length +
        s.stores.length +
        s.edges.length >
      0,
  );
  const dialog = useDialog();
  const activeTabLabel =
    TABS.find((t) => t.id === tab)?.label ?? "PointMax";

  const fileInputRef = useRef<HTMLInputElement>(null);

  // PR-0c: マウント時に永続ストレージ (Storage API persist) を 1 回要求する。
  // iOS Safari 等での 7 日非アクセス自動削除 / 容量逼迫 eviction による
  // localStorage 全損リスクを下げる。結果は投げっぱなしで良い (失敗しても
  // 本体アプリに一切影響させない — 内部で try/catch 済み)。
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  // 初回マウント時のみ: hash が空 or 未知 tab のとき履歴を汚さず calculator に正規化。
  // replaceRoute は hashchange を発火しないが、parseHash("") も calculator を返すため
  // useRoute の snapshot と導出 tab は一致したまま (履歴エントリを増やさない)。
  useEffect(() => {
    const initial = parseHash(location.hash);
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

  // ドロワーが開いている時はESCで閉じる、bodyスクロール抑制
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const handleExport = () => {
    const json = exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `pointmax-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (hasData) {
        const ok = await dialog.confirm({
          title: "インポートで上書きしますか？",
          message:
            "現在のデータをインポートしたJSONで上書きします。\n編集中の内容は失われます。",
          okText: "上書き",
          danger: true,
        });
        if (!ok) {
          e.target.value = "";
          return;
        }
      }
      const result = importJson(text);
      if (!result.ok) {
        await dialog.alert({
          title: "インポート失敗",
          message: result.error,
          level: "error",
        });
      } else {
        await dialog.alert({
          title: "インポート完了",
          message: "データを取り込みました。",
          level: "success",
        });
      }
    } catch (err) {
      await dialog.alert({
        title: "読み込みエラー",
        message: err instanceof Error ? err.message : String(err),
        level: "error",
      });
    } finally {
      e.target.value = "";
    }
  };

  const selectTab = (id: Tab) => {
    navigate(id);
    setDrawerOpen(false);
  };

  return (
    <div className="app">
      {pendingMigration && <SchemaUpgradeModal strategy={pendingMigration} />}
      {!pendingMigration && (
        <SyncUpdateModal onViewHistory={() => navigate("sync-history")} />
      )}
      <header className="appbar">
        <button
          className="hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="メニューを開く"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <button
          type="button"
          className="brand"
          onClick={() => navigate("calculator")}
          aria-label="計算画面に戻る"
          title="計算画面に戻る"
        >
          PointMax
        </button>
        <nav
          className="tabs desktop-only"
          role="tablist"
          aria-label="メインナビゲーション"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls="main-tabpanel"
              className={tab === t.id ? "active" : ""}
              onClick={() => navigate(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="active-tab-label mobile-only">{activeTabLabel}</div>
        <div className="appbar-actions desktop-only">
          <button
            onClick={handleExport}
            disabled={!hasData}
            title="現在のデータをJSONファイルとしてダウンロード"
          >
            エクスポート
          </button>
          <button
            onClick={handleImportClick}
            title="JSONファイルから読み込み"
          >
            インポート
          </button>
        </div>
        <input
          type="file"
          accept="application/json,.json"
          ref={fileInputRef}
          onChange={handleImportFile}
          style={{ display: "none" }}
        />
      </header>

      {drawerOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          role="presentation"
        >
          <aside
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            role="navigation"
            aria-label="メニュー"
          >
            <div className="drawer-header">
              <strong>PointMax</strong>
              <button
                className="drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <nav
              className="drawer-tabs"
              role="tablist"
              aria-label="メインナビゲーション"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls="main-tabpanel"
                  className={`drawer-tab ${tab === t.id ? "active" : ""}`}
                  onClick={() => selectTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <hr className="drawer-divider" />
            <div className="drawer-actions">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  handleExport();
                }}
                disabled={!hasData}
              >
                エクスポート
              </button>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  handleImportClick();
                }}
              >
                インポート
              </button>
              <small
                className="hint"
                style={{ padding: "8px 14px", fontSize: 11 }}
              >
                データ初期化・URL同期は「設定」タブから
              </small>
            </div>
          </aside>
        </div>
      )}

      <main
        className="content"
        id="main-tabpanel"
        role="tabpanel"
        aria-label={activeTabLabel}
      >
        <UpdateBanner />
        {/* Wave 4 B-6 audit-fix: 各 Screen を ErrorBoundary で wrap。
            画面単位で隔離して、1 画面のエラーがアプリ全体を停止させないようにする。
            scopeName で console.error に画面名が残るので運用調査の起点になる。 */}
        <ErrorBoundary scopeName={activeTabLabel}>
          {/* Wave 6 B-4: EdgesScreen は lazy なので Suspense で囲む。
              他画面は静的 import なので fallback は交換ルート読込時のみ出る。 */}
          <Suspense fallback={<p className="empty">読み込み中…</p>}>
            {tab === "calculator" && <CalculatorScreen />}
            {tab === "cards" && <CardsScreen />}
            {tab === "pointcards" && <PointCardsScreen />}
            {tab === "paymentapps" && <PaymentAppsScreen />}
            {tab === "currencies" && <CurrenciesScreen />}
            {tab === "stores" && <StoresScreen />}
            {tab === "programs" && <ProgramsScreen />}
            {tab === "campaigns" && <CampaignsScreen />}
            {tab === "edges" && <EdgesScreen />}
            {tab === "sync-history" && <SyncHistoryScreen />}
            {tab === "settings" && <SettingsScreen />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
