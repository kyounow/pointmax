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
import { recordCalcEvent, getRecentStoreIds } from "../state/usageStats";
import { rankCards, nearlyEqual } from "../domain/rankCards";
import { byId } from "../domain/entityIndex";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { isMasterCard } from "../state/seed";
import { CardComparisonSection } from "./CardComparisonSection";
import { useToday } from "./hooks/useToday";
import { BannerSlot } from "./calculator/BannerSlot";
import { CalcStoreForm } from "./calculator/CalcStoreForm";
import { CalcCurrencyTabs } from "./calculator/CalcCurrencyTabs";
import { CalcLoyaltyBanner } from "./calculator/CalcLoyaltyBanner";
import { CalcUpgradeBanner } from "./calculator/CalcUpgradeBanner";
import { CalcResultCard } from "./calculator/CalcResultCard";
import { OnboardingChecklist } from "./calculator/OnboardingChecklist";
import {
  isOnboardingDismissed,
  dismissOnboarding,
} from "../state/onboardingDismissed";

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

  // 主結果: 保有 (enabled === true) なカード (v7)
  const result = useMemo(
    () => (allRanked ? allRanked.filter((r) => r.card.enabled === true) : null),
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

  // UX-7: 対象外カードの CTA「交換ルートを見る →」で EdgesScreen (lazy, ~190KB の
  // @xyflow chunk) への遷移が増えるため、計算画面マウント後のアイドル時に同 chunk を
  // 先読みしておく。import 指定子は App.tsx の lazy(() => import("./ui/EdgesScreen")) と
  // 同一モジュールへ解決されるので (Vite は解決済み module id で dedupe)、実遷移時には
  // fetch 済みで体感が軽い。requestIdleCallback 非対応 (旧 Safari 等) では何もせず、
  // 遷移時の通常 lazy fetch に委ねる (プリフェッチは純粋な任意最適化)。
  useEffect(() => {
    if (typeof window.requestIdleCallback !== "function") return;
    const id = window.requestIdleCallback(() => {
      void import("./EdgesScreen");
    });
    return () => window.cancelIdleCallback?.(id);
  }, []);

  // PR-3a (UX-1): 直近店舗チップの id 列。保存済み計算履歴 (getRecentStoreIds) を
  // 新しい順で読み、現在選択中の店舗を先頭に畳み込む (履歴未記録でも即チップ表示・
  // active になり「現選択は active 表示」を満たす)。getRecentStoreIds は localStorage の
  // 純粋 snapshot 読み取りなので render 中に呼んでよい。店舗を切り替えるたびに読み直す
  // (同一店舗のまま金額だけ変えても直近"店舗"一覧は不変なので依存は storeId のみでよい。
  //  ある店舗を離れる頃には前店舗の calcEvent は effect で記録済み)。
  const recentStoreIds = useMemo(() => {
    const stored = getRecentStoreIds(8);
    if (!storeId) return stored;
    return [storeId, ...stored.filter((id) => id !== storeId)].slice(0, 8);
  }, [storeId]);

  // 比較対象: 非保有 (enabled !== true) かつ master pool のカード (v7)
  const comparisonItems = useMemo(
    () =>
      allRanked
        ? allRanked.filter(
            (r) => r.card.enabled !== true && isMasterCard(r.card.id),
          )
        : [],
    [allRanked],
  );

  const loyalties = result && result.length > 0 ? result[0].loyalties : [];

  // v7: 保有カード (enabled === true) が 0 枚か。全 OFF 出荷なので初回起動は 0 枚 →
  // 非保有 42 枚の比較リスト (CardComparisonSection) は抑制し、簡素な空メッセージにする。
  const hasHeldCards = useMemo(
    () => cards.some((c) => c.enabled === true),
    [cards],
  );

  // ONB-1 (PR-3c): 2 ステップ・オンボーディングチェックリストの表示制御。
  //   ① 保有カードを選ぶ    = enabled カードが 1 枚以上 (= hasHeldCards)
  //   ② よく貯める通貨を選ぶ = preferredCurrencyIds が非空
  // 表示条件 = (① or ② 未完了) かつ 手動クローズしていない。両方完了 or ✕ で消える。
  // 手動クローズは persist 外の独立 localStorage キー (PR-0b/0c パターン) に保存し、
  // 以後は未完了でも自動再表示しない (キー優先)。初期値はマウント時に 1 回だけ読む。
  const step1Done = hasHeldCards;
  const step2Done = preferredCurrencyIds.length > 0;
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    isOnboardingDismissed,
  );
  const onboardingActive =
    (!step1Done || !step2Done) && !onboardingDismissed;
  const closeOnboarding = useCallback(() => {
    dismissOnboarding();
    setOnboardingDismissed(true);
  }, []);

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

  // UX-3: 差額表示用の基準値。result は totalFinalAmount 降順ソート済 (rankCards)。
  //   topTotal = 1位 (先頭 reachable) の totalFinalAmount。
  //   secondBestTotal = 1位と ε 以上離れた次点の totalFinalAmount (同率 1 位は飛ばす)。
  //     全カードが 1 位と実質同値なら undefined (= #1 に「2位より」を出さない)。
  const { topTotal, secondBestTotal } = useMemo(() => {
    const reachable = result?.filter((r) => r.reachable) ?? [];
    if (reachable.length === 0) {
      return { topTotal: undefined, secondBestTotal: undefined };
    }
    const top = reachable[0].totalFinalAmount;
    const second = reachable.find(
      (r) => !nearlyEqual(r.totalFinalAmount, top) && r.totalFinalAmount < top,
    )?.totalFinalAmount;
    return { topTotal: top, secondBestTotal: second };
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
      {/* N-1: 上部の長文説明は above-the-fold を圧迫するため 1 行に簡素化。 */}
      <p className="hint">
        店舗・金額・貯めたい通貨を選ぶと、保有カード別の最適ルートと取得量を表示します。
      </p>

      {/* PR-3a (N-1) + PR-3c (ONB-1): 通知系バナーは常時 1 枚まで。優先度
          onboarding > update(SEED_VERSION) > today を BannerSlot が判定する。
          onboardingActive 時は通知枠を抑制し、枠に 2 ステップチェックリストを描画する。 */}
      <BannerSlot
        onboardingActive={onboardingActive}
        onboarding={
          <OnboardingChecklist
            step1Done={step1Done}
            step2Done={step2Done}
            onClose={closeOnboarding}
          />
        }
        programs={programs}
        now={today}
        todayOpen={todayBreakdownOpen}
        onToggleToday={() => setTodayBreakdownOpen((v) => !v)}
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
        recentStoreIds={recentStoreIds}
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

      {/* 保有 0 枚時 (ONB-1): 実 CTA は上部のオンボーディングチェックリストが受け持つので、
          結果エリアは簡素な 1 行の空メッセージに一本化する。 */}
      {!hasHeldCards && (
        <p className="empty">カードを登録すると計算できます。</p>
      )}

      {hasHeldCards && !result && (
        <p className="empty">
          {preferredCurrencyIds.length === 0
            ? "店舗・金額・目標通貨を選択すると結果が表示されます。"
            : "店舗・金額を入力すると結果が表示されます。"}
        </p>
      )}

      {hasHeldCards && result && (
        <CalcLoyaltyBanner
          loyalties={loyalties}
          activeCurrencyId={activeCurrencyId}
          currencyById={currencyById}
          currencyName={currencyName}
          cardName={cardName}
        />
      )}

      {hasHeldCards && result && upgrade && (
        <CalcUpgradeBanner
          upgrade={upgrade}
          activeCurrencyId={activeCurrencyId}
          currencyById={currencyById}
          currencyName={currencyName}
        />
      )}

      {hasHeldCards && result && result.length > 0 && (
        <div className="results-toolbar">
          <span className="hint" style={{ margin: 0 }}>
            {result.length}件中 {expandedIds.size}件展開
          </span>
          <button onClick={allExpanded ? collapseAll : expandAll}>
            {allExpanded ? "全て折り畳む" : "全て展開"}
          </button>
        </div>
      )}

      {hasHeldCards && result && (
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
              topTotal={topTotal}
              secondBestTotal={secondBestTotal}
            />
          ))}
          {/* v7: 保有 0 枚時は非保有 42 枚の比較リストを初回画面に出さない (オンボーディング優先)。
              保有 1 枚以上なら従来どおり「使っていないカードだと？」の比較を表示。 */}
          {hasHeldCards && comparisonItems.length > 0 && (
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
