import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { SEED_CHANGELOG, SEED_VERSION, seed } from "../state/seed";
import { mergeSeed, diffCount } from "../domain/mergeSeed";
import { useDialog } from "./dialog/DialogProvider";

export function UpdateBanner() {
  const lastSeedVersion = useStore((s) => s.lastSeedVersion);
  const cards = useStore((s) => s.cards);
  const currencies = useStore((s) => s.currencies);
  const stores = useStore((s) => s.stores);
  const rules = useStore((s) => s.rules);
  const edges = useStore((s) => s.edges);
  const pointCards = useStore((s) => s.pointCards);
  const loyaltyRules = useStore((s) => s.loyaltyRules);
  const mergeFromSeed = useStore((s) => s.mergeFromSeed);
  const dismissSeedUpdate = useStore((s) => s.dismissSeedUpdate);
  const loadSeed = useStore((s) => s.loadSeed);
  const dialog = useDialog();
  const [showDetail, setShowDetail] = useState(false);

  const hasData =
    cards.length +
      currencies.length +
      stores.length +
      rules.length +
      edges.length +
      pointCards.length +
      loyaltyRules.length >
    0;

  const merged = useMemo(() => {
    if (!hasData) return null;
    return mergeSeed(
      { cards, currencies, stores, rules, edges, pointCards, loyaltyRules },
      seed(),
    );
  }, [
    hasData,
    cards,
    currencies,
    stores,
    rules,
    edges,
    pointCards,
    loyaltyRules,
  ]);
  const totalDiff = merged ? diffCount(merged.diff) : 0;

  // 表示条件: ユーザーがデータを持っていて、現在の保存版数より新しいものがある
  if (!hasData) return null;
  if (lastSeedVersion >= SEED_VERSION) return null;

  // この版で新規追加された内容を抽出
  const relevantChangelog = SEED_CHANGELOG.filter(
    (c) => c.version > lastSeedVersion && c.version <= SEED_VERSION,
  );

  const handleMerge = async () => {
    if (totalDiff === 0) {
      // 内容差分は無いがバージョンだけ古い → そのまま確定
      dismissSeedUpdate();
      return;
    }
    const ok = await dialog.confirm({
      title: `${totalDiff} 件の追加データを反映しますか？`,
      message:
        "既存のカード/ルール/エッジは変更されません。" +
        " 新しい項目だけが追加されます。",
      okText: "反映する",
    });
    if (ok) mergeFromSeed();
  };

  const handleOverwrite = async () => {
    const ok = await dialog.confirm({
      title: "サンプルで全上書きしますか？",
      message:
        "現在のカスタム編集も含めて全データが最新サンプルで置き換えられます。",
      okText: "全上書き",
      danger: true,
    });
    if (ok) loadSeed();
  };

  return (
    <>
      <div className="update-banner">
        <div className="update-banner-text">
          <strong>サンプルデータの新バージョン v{SEED_VERSION}</strong>
          {totalDiff > 0 ? (
            <> 利用可（{totalDiff} 件の追加項目）</>
          ) : (
            <> 利用可</>
          )}
        </div>
        <div className="update-banner-actions">
          <button onClick={() => setShowDetail((v) => !v)}>
            {showDetail ? "詳細を閉じる" : "詳細"}
          </button>
          <button onClick={handleMerge} className="primary">
            差分のみ反映
          </button>
          <button onClick={handleOverwrite}>全上書き</button>
          <button onClick={dismissSeedUpdate} className="dismiss">
            あとで
          </button>
        </div>
      </div>
      {showDetail && (
        <div className="update-banner-detail">
          <div className="update-detail-section">
            <h4>変更履歴</h4>
            <ul className="changelog-list">
              {relevantChangelog.map((c) => (
                <li key={c.version}>
                  <span className="changelog-version">v{c.version}</span>
                  <span className="changelog-date">{c.date}</span>
                  <span className="changelog-summary">{c.summary}</span>
                </li>
              ))}
            </ul>
          </div>
          {merged && totalDiff > 0 && (
            <div className="update-detail-section">
              <h4>追加される項目（{totalDiff} 件）</h4>
              <ul className="diff-counts">
                {merged.diff.cards.length > 0 && (
                  <li>カード: {merged.diff.cards.length}件</li>
                )}
                {merged.diff.currencies.length > 0 && (
                  <li>通貨: {merged.diff.currencies.length}件</li>
                )}
                {merged.diff.stores.length > 0 && (
                  <li>店舗: {merged.diff.stores.length}件</li>
                )}
                {merged.diff.rules.length > 0 && (
                  <li>ルール: {merged.diff.rules.length}件</li>
                )}
                {merged.diff.edges.length > 0 && (
                  <li>交換ルート: {merged.diff.edges.length}件</li>
                )}
                {merged.diff.pointCards.length > 0 && (
                  <li>ポイントカード: {merged.diff.pointCards.length}件</li>
                )}
                {merged.diff.loyaltyRules.length > 0 && (
                  <li>提示還元ルール: {merged.diff.loyaltyRules.length}件</li>
                )}
              </ul>
            </div>
          )}
          {totalDiff === 0 && (
            <p className="hint">
              既に最新サンプルの全項目を保有しています。「差分のみ反映」で版数だけ更新できます。
            </p>
          )}
        </div>
      )}
    </>
  );
}
