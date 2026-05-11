import { useEffect, useRef, useState } from "react";
import "./App.css";
import { CardsScreen } from "./ui/CardsScreen";
import { CurrenciesScreen } from "./ui/CurrenciesScreen";
import { StoresScreen } from "./ui/StoresScreen";
import { RulesScreen } from "./ui/RulesScreen";
import { EdgesScreen } from "./ui/EdgesScreen";
import { CalculatorScreen } from "./ui/CalculatorScreen";
import { PointCardsScreen } from "./ui/PointCardsScreen";
import { SettingsScreen } from "./ui/SettingsScreen";
import { UpdateBanner } from "./ui/UpdateBanner";
import { useStore } from "./state/store";
import { useDialog } from "./ui/dialog/DialogProvider";

type Tab =
  | "calculator"
  | "cards"
  | "pointcards"
  | "currencies"
  | "stores"
  | "rules"
  | "edges"
  | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "calculator", label: "計算" },
  { id: "cards", label: "カード" },
  { id: "pointcards", label: "ポイントカード" },
  { id: "currencies", label: "通貨" },
  { id: "stores", label: "店舗" },
  { id: "rules", label: "ルール" },
  { id: "edges", label: "交換ルート" },
  { id: "settings", label: "設定" },
];

function App() {
  const [tab, setTab] = useState<Tab>("calculator");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loadSeed = useStore((s) => s.loadSeed);
  const clearAll = useStore((s) => s.clearAll);
  const exportJson = useStore((s) => s.exportJson);
  const importJson = useStore((s) => s.importJson);
  const hasData = useStore(
    (s) =>
      s.cards.length +
        s.currencies.length +
        s.stores.length +
        s.rules.length +
        s.edges.length >
      0,
  );
  const dialog = useDialog();
  const activeTabLabel =
    TABS.find((t) => t.id === tab)?.label ?? "PointMax";

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLoadSeed = async () => {
    if (hasData) {
      const ok = await dialog.confirm({
        title: "サンプル投入で上書きしますか？",
        message:
          "現在のデータを最新サンプルで上書きします。\n編集中の内容は失われます。",
        okText: "上書き",
        danger: true,
      });
      if (!ok) return;
    }
    loadSeed();
  };

  const handleClearAll = async () => {
    const ok = await dialog.confirm({
      title: "全削除しますか？",
      message: "登録データを全て削除します。元に戻せません。",
      okText: "削除",
      danger: true,
    });
    if (ok) clearAll();
  };

  const selectTab = (id: Tab) => {
    setTab(id);
    setDrawerOpen(false);
  };

  return (
    <div className="app">
      <header className="appbar">
        <button
          className="hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="メニューを開く"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="brand">PointMax</div>
        <nav className="tabs desktop-only">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="active-tab-label mobile-only">{activeTabLabel}</div>
        <div className="appbar-actions desktop-only">
          <button
            onClick={handleLoadSeed}
            title="同梱されているサンプル設定を投入"
          >
            サンプル投入
          </button>
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
          {hasData && (
            <button className="danger" onClick={handleClearAll}>
              全削除
            </button>
          )}
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
            <nav className="drawer-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
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
                  void handleLoadSeed();
                }}
              >
                サンプル投入
              </button>
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
              {hasData && (
                <button
                  className="danger"
                  onClick={() => {
                    setDrawerOpen(false);
                    void handleClearAll();
                  }}
                >
                  全削除
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <main className="content">
        <UpdateBanner />
        {tab === "calculator" && <CalculatorScreen />}
        {tab === "cards" && <CardsScreen />}
        {tab === "pointcards" && <PointCardsScreen />}
        {tab === "currencies" && <CurrenciesScreen />}
        {tab === "stores" && <StoresScreen />}
        {tab === "rules" && <RulesScreen />}
        {tab === "edges" && <EdgesScreen />}
        {tab === "settings" && <SettingsScreen />}
      </main>
    </div>
  );
}

export default App;
