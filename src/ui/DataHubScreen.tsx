// PR-2e: モバイル下部バー「データ」枠が開くハブ画面 (#data)。
// ウォレット / 交換ルート / 通貨 / 店舗 をカード型グリッドで一覧し、
// 各カードの件数バッジ + タップで個別画面へ遷移する。
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { navigate } from "../navigation";
import type { Tab } from "./nav/navConfig";

type HubCard = {
  tab: Tab;
  icon: string;
  name: string;
  desc: string;
  count: number;
};

export function DataHubScreen() {
  // 件数バッジ用の集計のみを購読 (プリミティブ数値なので再レンダは最小)。
  const { walletCount, edgesCount, currenciesCount, storesCount } = useStore(
    useShallow((s) => ({
      // ウォレットはカード + ポイントカード + 支払方法の合計。
      walletCount: s.cards.length + s.pointCards.length + s.paymentApps.length,
      edgesCount: s.edges.length,
      currenciesCount: s.currencies.length,
      storesCount: s.stores.length,
    })),
  );

  const cards: HubCard[] = [
    {
      tab: "wallet",
      icon: "👛",
      name: "ウォレット",
      desc: "カード・ポイントカード・支払方法",
      count: walletCount,
    },
    {
      tab: "edges",
      icon: "🔀",
      name: "交換ルート",
      desc: "ポイント/マイルの交換レート",
      count: edgesCount,
    },
    {
      tab: "currencies",
      icon: "🪙",
      name: "通貨",
      desc: "ポイント・マイルの種類",
      count: currenciesCount,
    },
    {
      tab: "stores",
      icon: "🏬",
      name: "店舗",
      desc: "店舗・カテゴリ",
      count: storesCount,
    },
  ];

  return (
    <section>
      <h2>データ</h2>
      <p className="hint">各データの一覧・編集画面へ移動します。</p>
      <div className="data-hub-grid">
        {cards.map((c) => (
          <button
            key={c.tab}
            type="button"
            className="data-hub-card"
            onClick={() => navigate(c.tab)}
          >
            <span className="data-hub-icon" aria-hidden="true">
              {c.icon}
            </span>
            <span className="data-hub-body">
              <span className="data-hub-name">{c.name}</span>
              <span className="data-hub-desc">{c.desc}</span>
            </span>
            <span className="data-hub-count">
              {c.count}
              <span className="data-hub-count-unit"> 件</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
