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
import { recordCalcEvent } from "../state/usageStats";
import { rankCards } from "../domain/rankCards";
import { byId } from "../domain/entityIndex";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { isMasterCard } from "../state/seed";
import { CardComparisonSection } from "./CardComparisonSection";
import { useToday } from "./hooks/useToday";
import { CalcTodayBanner } from "./calculator/CalcTodayBanner";
import { CalcStoreForm } from "./calculator/CalcStoreForm";
import { CalcCurrencyTabs } from "./calculator/CalcCurrencyTabs";
import { CalcLoyaltyBanner } from "./calculator/CalcLoyaltyBanner";
import { CalcUpgradeBanner } from "./calculator/CalcUpgradeBanner";
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
    paymentApps,
    programs,
    memberships,
    preferredCurrencyIds,
    birthMonth,
  } = useStore(
    useShallow((s) => ({
      cards: s.cards,
      stores: s.stores,
      currencies: s.currencies,
      edges: s.edges,
      pointCards: s.pointCards,
      paymentApps: s.paymentApps,
      programs: s.programs,
      memberships: s.memberships,
      preferredCurrencyIds: s.preferredCurrencyIds,
      birthMonth: s.birthMonth,
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

  // preferred が変わったら activeCurrencyId を整合させる (render 中 guard。
  // effect 内 setState を避ける React 公認の「prop 変化時に state 調整」パターン):
  // - preferred 非空 かつ activeCurrencyId が preferred に無い → 先頭にリセット
  // - preferred から現在のタブ通貨が消えた場合も先頭に戻る
  // (preferred 非空時、activeCurrencyId は preferred タブ経由でのみ変わるため
  //  preferred の変化だけを起点にすれば従来 effect と等価)
  const [prevPreferred, setPrevPreferred] = useState(preferredCurrencyIds);
  if (prevPreferred !== preferredCurrencyIds) {
    setPrevPreferred(preferredCurrencyIds);
    if (
      preferredCurrencyIds.length > 0 &&
      !preferredCurrencyIds.includes(activeCurrencyId)
    ) {
      setActiveCurrencyId(preferredCurrencyIds[0]);
    }
  }

  const currencyById = useMemo(() => byId(currencies), [currencies]);
  const programById = useMemo(() => byId(programs), [programs]);
  const currencyName = useCallback(
    (id: string) => currencyById.get(id)?.name ?? id,
    [currencyById],
  );
  const { cardName } = useNameResolvers();

  // 評価時刻。同じ暦日の間は参照固定、日付が変わると自動更新され rankCards が
  // 再計算される (C-2: 日付跨ぎでキャンペーン/「5のつく日」が stale になる問題の解消)
  const today = useToday();

  // includeDisabled: true で全カード試算、後で 2 つに分割。
  // v6.0.0: rankCards は RankResult ({ rankings, upgrade }) を返す。
  const rankResult = useMemo(() => {
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
        paymentApps,
        programs,
        memberships,
        now: today,
        userBirthMonth: birthMonth,
      },
      { includeDisabled: true },
    );
  }, [
    today,
    storeId,
    amount,
    activeCurrencyId,
    cards,
    stores,
    edges,
    pointCards,
    paymentApps,
    programs,
    memberships,
    birthMonth,
  ]);

  const allRanked = rankResult?.rankings ?? null;
  // v6.0.0: 未使用ポイントカード有効化提案 (CalcUpgradeBanner へ)
  const upgrade = rankResult?.upgrade ?? null;

  // 主結果: enabled なカード (既存 result と同等)
  const result = useMemo(
    () => (allRanked ? allRanked.filter((r) => r.card.enabled !== false) : null),
    [allRanked],
  );

  // PR-0b: 有効な計算結果が描画されるたびにローカル利用統計へ記録 (端末内のみ・送信なし)。
  // result が非 null (= storeId/activeCurrency/amount が揃い ranking 算出済) のときだけ記録。
  // 同一 (store, 通貨) ペアの連続記録 (金額変更等の再計算) は usageStats 側の
  // last-pair ガードで抑止されるため、ここでは result 参照の変化を起点にするだけでよい。
  useEffect(() => {
    if (result && storeId && activeCurrencyId) {
      recordCalcEvent(storeId, activeCurrencyId);
    }
  }, [result, storeId, activeCurrencyId]);

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
  // (totalFinalAmount が最上位値と等しい全カード = displayRank 1 の集合)。
  // render 中 guard で実装 (effect 内 setState を避ける React 公認パターン)。
  // result は useMemo 済で入力 (storeId/activeCurrencyId/amount/データ) が変わった時のみ
  // 参照が変わるため、result 参照の変化を起点にすれば従来 effect と等価。
  // 手動 toggle (toggleExpand/expandAll/collapseAll) は次の入力変化まで保持される。
  const [prevResult, setPrevResult] = useState(result);
  if (prevResult !== result) {
    setPrevResult(result);
    if (!result) {
      setExpandedIds(new Set());
    } else {
      const topTotal = result.find((r) => r.reachable)?.totalFinalAmount;
      setExpandedIds(
        topTotal === undefined
          ? new Set()
          : new Set(
              result
                .filter((r) => r.reachable && r.totalFinalAmount === topTotal)
                .map((r) => r.card.id),
            ),
      );
    }
  }

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
        programs={programs}
        now={today}
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

      {result && upgrade && (
        <CalcUpgradeBanner
          upgrade={upgrade}
          activeCurrencyId={activeCurrencyId}
          currencyById={currencyById}
          currencyName={currencyName}
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
