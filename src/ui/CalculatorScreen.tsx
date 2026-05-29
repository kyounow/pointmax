// CalculatorScreen — 試算画面のオーケストレーター (Wave 6 B-2 で子コンポーネントに分割)。
// 入力 state / rankCards 試算 / 展開状態を保持し、表示は calculator/ 配下の子に委譲する:
//   - CalcTodayBanner   : 今日のアクティブ割増サマリ
//   - CalcStoreForm     : 店舗ピッカー + 金額 + 目標通貨フォールバック
//   - CalcCurrencyTabs  : 優先通貨タブ
//   - CalcLoyaltyBanner : ポイントカード併用バナー
//   - CalcResultCard    : 1 カードぶんの結果カード
//   - CardComparisonSection : 非保有カード比較 (既存)
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { rankCards } from "../domain/rankCards";
import { byId } from "../domain/entityIndex";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { isMasterCard } from "../state/seed";
import { CardComparisonSection } from "./CardComparisonSection";
import { CalcTodayBanner } from "./calculator/CalcTodayBanner";
import { CalcStoreForm } from "./calculator/CalcStoreForm";
import { CalcCurrencyTabs } from "./calculator/CalcCurrencyTabs";
import { CalcLoyaltyBanner } from "./calculator/CalcLoyaltyBanner";
import { CalcResultCard } from "./calculator/CalcResultCard";

export function CalculatorScreen() {
  // Wave 5 B-1: 10 個別 subscribe → 単一 useShallow に集約。
  // calculator はカード変更や通貨変更で再 render する設計なので、関連 collection 一括購読でよい。
  const {
    cards,
    stores,
    currencies,
    edges,
    pointCards,
    loyaltyRules,
    paymentApps,
    programs,
    memberships,
    preferredCurrencyIds,
  } = useStore(
    useShallow((s) => ({
      cards: s.cards,
      stores: s.stores,
      currencies: s.currencies,
      edges: s.edges,
      pointCards: s.pointCards,
      loyaltyRules: s.loyaltyRules,
      paymentApps: s.paymentApps,
      programs: s.programs,
      memberships: s.memberships,
      preferredCurrencyIds: s.preferredCurrencyIds,
    })),
  );

  // デフォルトは「一般店舗 (規定還元)」。基本還元率の確認用。
  // store-id "general" が存在しない場合 (極端なリセット直後) は空文字フォールバック
  const [storeId, setStoreId] = useState("general");
  const [storeSearch, setStoreSearch] = useState("");
  const [storeCategory, setStoreCategory] = useState(""); // "" = 全カテゴリ
  const [amount, setAmount] = useState("10000");
  // activeCurrencyId = 現在表示中の対象通貨 (= 通貨タブの選択中タブ)。
  // preferred があれば既定で先頭、無ければ fallback select で都度選択。
  const [activeCurrencyId, setActiveCurrencyId] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // today-banner: 内訳の展開状態 (初期は折り畳み)
  const [todayBreakdownOpen, setTodayBreakdownOpen] = useState(false);

  // preferred が変わったら activeCurrencyId を整合させる:
  // - preferred 非空 かつ activeCurrencyId が preferred に無い → 先頭にリセット
  // - preferred から現在のタブ通貨が消えた場合も先頭に戻る
  useEffect(() => {
    if (preferredCurrencyIds.length === 0) return;
    if (!preferredCurrencyIds.includes(activeCurrencyId)) {
      setActiveCurrencyId(preferredCurrencyIds[0]);
    }
  }, [preferredCurrencyIds, activeCurrencyId]);

  const currencyById = useMemo(() => byId(currencies), [currencies]);
  const programById = useMemo(() => byId(programs), [programs]);
  const currencyName = useCallback(
    (id: string) => currencyById.get(id)?.name ?? id,
    [currencyById],
  );
  const { cardName } = useNameResolvers();

  // includeDisabled: true で全カード試算、後で 2 つに分割
  const allRanked = useMemo(() => {
    if (!storeId || !activeCurrencyId || !amount) return null;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    return rankCards(
      {
        payment: { storeId, amount: amt },
        targetCurrencyId: activeCurrencyId,
        cards,
        stores,
        edges,
        pointCards,
        loyaltyRules,
        paymentApps,
        programs,
        memberships,
      },
      { includeDisabled: true },
    );
  }, [
    storeId,
    amount,
    activeCurrencyId,
    cards,
    stores,
    edges,
    pointCards,
    loyaltyRules,
    paymentApps,
    programs,
    memberships,
  ]);

  // 主結果: enabled なカード (既存 result と同等)
  const result = useMemo(
    () => (allRanked ? allRanked.filter((r) => r.card.enabled !== false) : null),
    [allRanked],
  );

  // 比較対象: enabled=false かつ master pool のカード
  const comparisonItems = useMemo(
    () =>
      allRanked
        ? allRanked.filter(
            (r) => r.card.enabled === false && isMasterCard(r.card.id),
          )
        : [],
    [allRanked],
  );

  const loyalties = result && result.length > 0 ? result[0].loyalties : [];

  // 同率 rank 表示: totalFinalAmount 同値カードに同じ rank を割り当てる (#1, #1, #3 ...)
  const displayRankMap = useMemo(() => {
    if (!result) return new Map<string, number>();
    const map = new Map<string, number>();
    let prevTotal = Number.POSITIVE_INFINITY;
    let prevRank = 0;
    result.forEach((r, i) => {
      if (r.reachable && r.totalFinalAmount !== prevTotal) {
        prevRank = i + 1;
        prevTotal = r.totalFinalAmount;
      }
      map.set(r.card.id, r.reachable ? prevRank : -1);
    });
    return map;
  }, [result]);

  // 入力が変わるたびに、同率 1 位の reachable カード全部を展開状態にリセット
  // (totalFinalAmount が最上位値と等しい全カード = displayRank 1 の集合)
  useEffect(() => {
    if (!result) {
      setExpandedIds(new Set());
      return;
    }
    const topTotal = result.find((r) => r.reachable)?.totalFinalAmount;
    if (topTotal === undefined) {
      setExpandedIds(new Set());
      return;
    }
    const tiedTop = result.filter(
      (r) => r.reachable && r.totalFinalAmount === topTotal,
    );
    setExpandedIds(new Set(tiedTop.map((r) => r.card.id)));
  }, [storeId, activeCurrencyId, amount, result]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const expandAll = () => {
    if (!result) return;
    setExpandedIds(new Set(result.map((r) => r.card.id)));
  };
  const collapseAll = () => setExpandedIds(new Set());
  const allExpanded = !!result && expandedIds.size === result.length;

  return (
    <section>
      <h2>計算</h2>
      <p className="hint">
        支払い情報と「最終的に貯めたい通貨」を選ぶと、保有カード別に最適な交換ルートと最終取得量を表示します。ポイントカード併用ボーナスがある店舗ではクレカ還元と合算されます。
      </p>

      <CalcTodayBanner
        loyaltyRules={loyaltyRules}
        programs={programs}
        open={todayBreakdownOpen}
        onToggle={() => setTodayBreakdownOpen((v) => !v)}
      />

      <CalcStoreForm
        stores={stores}
        currencies={currencies}
        storeId={storeId}
        setStoreId={setStoreId}
        storeSearch={storeSearch}
        setStoreSearch={setStoreSearch}
        storeCategory={storeCategory}
        setStoreCategory={setStoreCategory}
        amount={amount}
        setAmount={setAmount}
        activeCurrencyId={activeCurrencyId}
        setActiveCurrencyId={setActiveCurrencyId}
        showCurrencyFallback={preferredCurrencyIds.length === 0}
      />

      {preferredCurrencyIds.length === 0 ? (
        <p className="hint" style={{ fontSize: 13 }}>
          💡 「通貨」画面で<strong>優先通貨</strong>を設定すると、ここがタブ切替に
          なって毎回選ばずに済みます。
        </p>
      ) : (
        // v4.0.0 ② 案C: 優先通貨をタブで切替 (選択タブの通貨で結果表示)
        <CalcCurrencyTabs
          preferredCurrencyIds={preferredCurrencyIds}
          activeCurrencyId={activeCurrencyId}
          onSelect={setActiveCurrencyId}
          currencyById={currencyById}
        />
      )}

      {!result && (
        <p className="empty">
          {preferredCurrencyIds.length === 0
            ? "店舗・金額・目標通貨を選択すると結果が表示されます。"
            : "店舗・金額を入力すると結果が表示されます。"}
        </p>
      )}

      {result && (
        <CalcLoyaltyBanner
          loyalties={loyalties}
          activeCurrencyId={activeCurrencyId}
          currencyById={currencyById}
          currencyName={currencyName}
          cardName={cardName}
        />
      )}

      {result && result.length > 0 && (
        <div className="results-toolbar">
          <span className="hint" style={{ margin: 0 }}>
            {result.length}件中 {expandedIds.size}件展開
          </span>
          <button onClick={allExpanded ? collapseAll : expandAll}>
            {allExpanded ? "全て折り畳む" : "全て展開"}
          </button>
        </div>
      )}

      {result && (
        <div className="results">
          {result.length === 0 && (
            <p className="empty">保有カードが登録されていません。</p>
          )}
          {result.map((r) => (
            <CalcResultCard
              key={r.card.id}
              ranking={r}
              displayRank={displayRankMap.get(r.card.id) ?? -1}
              expanded={expandedIds.has(r.card.id)}
              onToggle={() => toggleExpand(r.card.id)}
              activeCurrencyId={activeCurrencyId}
              currencyById={currencyById}
              currencyName={currencyName}
              cardName={cardName}
              programById={programById}
            />
          ))}
          {comparisonItems.length > 0 && (
            <CardComparisonSection
              comparisonItems={comparisonItems}
              topReachableTotal={result.find((r) => r.reachable)?.totalFinalAmount ?? 0}
              targetCurrencyName={currencyName(activeCurrencyId)}
            />
          )}
        </div>
      )}
    </section>
  );
}
