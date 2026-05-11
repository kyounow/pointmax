import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { SEED_CHANGELOG, SEED_VERSION, seed } from "../state/seed";
import { mergeSeed, diffCount } from "../domain/mergeSeed";
import {
  MIGRATIONS,
  planMigrations,
  conflictItems,
  type PlanItem,
} from "../domain/migrations";
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
  const applySeedUpdate = useStore((s) => s.applySeedUpdate);
  const dismissSeedUpdate = useStore((s) => s.dismissSeedUpdate);
  const loadSeed = useStore((s) => s.loadSeed);
  const dialog = useDialog();
  const [showDetail, setShowDetail] = useState(false);
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());

  const currentShape = useMemo(
    () => ({
      cards,
      currencies,
      stores,
      rules,
      edges,
      pointCards,
      loyaltyRules,
    }),
    [cards, currencies, stores, rules, edges, pointCards, loyaltyRules],
  );

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
    return mergeSeed(currentShape, seed());
  }, [hasData, currentShape]);
  const additionCount = merged ? diffCount(merged.diff) : 0;

  const plan: PlanItem[] = useMemo(() => {
    if (!hasData) return [];
    // 追加後の state でプランを計算する (追加されたばかりの値はマイグレーション対象にならない設計)
    if (!merged) return [];
    const afterMerge = {
      cards: merged.cards,
      currencies: merged.currencies,
      stores: merged.stores,
      rules: merged.rules,
      edges: merged.edges,
      pointCards: merged.pointCards,
      loyaltyRules: merged.loyaltyRules,
    };
    return planMigrations(
      afterMerge,
      lastSeedVersion,
      SEED_VERSION,
      MIGRATIONS,
    );
  }, [hasData, merged, lastSeedVersion]);

  const autoApplyCount = plan.filter(
    (p) => p.status === "applicable",
  ).length;
  const conflicts = conflictItems(plan);
  const totalChanges = additionCount + autoApplyCount;

  if (!hasData) return null;
  if (lastSeedVersion >= SEED_VERSION) return null;

  const relevantChangelog = SEED_CHANGELOG.filter(
    (c) => c.version > lastSeedVersion && c.version <= SEED_VERSION,
  );

  const handleApply = async () => {
    applySeedUpdate(Array.from(overrideKeys));
    setOverrideKeys(new Set());
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

  const toggleOverride = (key: string) => {
    setOverrideKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const collectionLabel = (c: string) => {
    switch (c) {
      case "cards":
        return "カード";
      case "currencies":
        return "通貨";
      case "stores":
        return "店舗";
      case "rules":
        return "店舗ルール";
      case "edges":
        return "交換ルート";
      case "pointCards":
        return "ポイントカード";
      case "loyaltyRules":
        return "提示還元ルール";
      default:
        return c;
    }
  };

  return (
    <>
      <div className="update-banner">
        <div className="update-banner-text">
          <strong>サンプルデータの新バージョン v{SEED_VERSION}</strong>
          <br />
          <small>
            自動適用: {totalChanges}件 (追加{additionCount} / 更新{autoApplyCount})
            {conflicts.length > 0 && (
              <>
                {" / "}
                <span className="warn-text">
                  ⚠ 編集と衝突: {conflicts.length}件 (個別確認)
                </span>
              </>
            )}
          </small>
        </div>
        <div className="update-banner-actions">
          <button onClick={() => setShowDetail((v) => !v)}>
            {showDetail ? "詳細を閉じる" : "詳細"}
          </button>
          <button onClick={handleApply} className="primary">
            {overrideKeys.size > 0
              ? `${totalChanges + overrideKeys.size}件適用`
              : `${totalChanges}件適用`}
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
          {merged && additionCount > 0 && (
            <div className="update-detail-section">
              <h4>追加される項目（{additionCount} 件）</h4>
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
          {autoApplyCount > 0 && (
            <div className="update-detail-section">
              <h4>自動適用される変更（{autoApplyCount} 件）</h4>
              <ul className="migration-list">
                {plan
                  .filter((p) => p.status === "applicable")
                  .map((p) => (
                    <li key={p.key} className="migration-item">
                      <span className="badge">
                        {collectionLabel(p.migration.collection)}
                      </span>
                      <code>{p.migration.id}</code>
                      {p.migration.type === "updateField" && (
                        <>
                          <span>{p.migration.field}:</span>
                          <span className="from-value">
                            {String(p.migration.from)}
                          </span>
                          <span>→</span>
                          <span className="to-value">
                            {String(p.migration.to)}
                          </span>
                        </>
                      )}
                      {p.migration.type === "delete" && (
                        <span className="delete-tag">削除</span>
                      )}
                      {p.migration.notes && (
                        <small className="hint">{p.migration.notes}</small>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {conflicts.length > 0 && (
            <div className="update-detail-section">
              <h4>
                ユーザー編集と衝突した変更（{conflicts.length} 件）
                <small className="hint" style={{ marginLeft: 8 }}>
                  デフォルトは保護されます。チェックを入れた項目だけ上書きされます。
                </small>
              </h4>
              <ul className="migration-list">
                {conflicts.map((p) => (
                  <li key={p.key} className="migration-item">
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={overrideKeys.has(p.key)}
                        onChange={() => toggleOverride(p.key)}
                      />
                      <span className="badge">
                        {collectionLabel(p.migration.collection)}
                      </span>
                      <code>{p.migration.id}</code>
                      <span>{p.migration.field}:</span>
                      <span className="user-value">
                        あなた: {String(p.currentValue)}
                      </span>
                      <span>/</span>
                      <span className="to-value">
                        公式: {String(p.migration.to)}
                      </span>
                    </label>
                    {p.migration.notes && (
                      <small className="hint">{p.migration.notes}</small>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {totalChanges === 0 && conflicts.length === 0 && (
            <p className="hint">
              既に最新サンプルと同期しています。「適用」で版数だけ更新できます。
            </p>
          )}
        </div>
      )}
    </>
  );
}
