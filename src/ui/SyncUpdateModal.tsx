import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { seed } from "../state/seed";
import { mergeSeed, diffCount } from "../domain/mergeSeed";
import { syncDigest, buildSyncGroups } from "../domain/syncDigest";

// 週次 cron が bundled seed に追加したデータをユーザーに知らせるモーダル。
// SEED_VERSION とは独立した差分検知 (cron は版数を bump しない)。
// 既読は localStorage の digest で管理し、同じバッチでは再表示しない。
// 次回 cron で差分集合が変わると digest が変わり再通知される。
const SEEN_KEY = "pointmax-sync-seen-digest";

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeSeen(digest: string): void {
  try {
    localStorage.setItem(SEEN_KEY, digest);
  } catch {
    // private モード等で localStorage 不可。セッション内 state で抑制継続。
  }
}

export function SyncUpdateModal() {
  const cards = useStore((s) => s.cards);
  const currencies = useStore((s) => s.currencies);
  const stores = useStore((s) => s.stores);
  const edges = useStore((s) => s.edges);
  const pointCards = useStore((s) => s.pointCards);
  const loyaltyRules = useStore((s) => s.loyaltyRules);
  const paymentApps = useStore((s) => s.paymentApps);
  const programs = useStore((s) => s.programs);
  const memberships = useStore((s) => s.memberships);
  const applySeedUpdate = useStore((s) => s.applySeedUpdate);

  const [dismissed, setDismissed] = useState(false);
  const [seen] = useState(readSeen);

  const merged = useMemo(() => {
    const currentShape = {
      cards,
      currencies,
      stores,
      edges,
      pointCards,
      loyaltyRules,
      paymentApps,
      programs,
      memberships,
    };
    const hasData =
      cards.length +
        currencies.length +
        stores.length +
        edges.length +
        pointCards.length +
        loyaltyRules.length +
        paymentApps.length >
      0;
    if (!hasData) return null;
    return mergeSeed(currentShape, seed());
  }, [
    cards,
    currencies,
    stores,
    edges,
    pointCards,
    loyaltyRules,
    paymentApps,
    programs,
    memberships,
  ]);

  const count = merged ? diffCount(merged.diff) : 0;
  const digest = merged ? syncDigest(merged.diff) : "";

  const groups = useMemo(() => {
    if (!merged || count === 0) return [];
    const storeName = new Map(merged.stores.map((s) => [s.id, s.name]));
    const programName = new Map(
      (merged.programs ?? []).map((p) => [p.id, p.name]),
    );
    return buildSyncGroups(merged.diff, {
      store: (id) => storeName.get(id) ?? id,
      program: (id) => programName.get(id) ?? id,
    });
  }, [merged, count]);

  const visible =
    !dismissed && count > 0 && digest !== "" && digest !== seen;

  if (!visible) return null;

  const close = () => {
    writeSeen(digest);
    setDismissed(true);
  };

  const handleApply = () => {
    applySeedUpdate([]);
    close();
  };

  return (
    <div className="sync-update-modal-overlay">
      <div className="sync-update-modal">
        <h2 className="sync-update-title">最新データが届いています</h2>
        <p className="sync-update-lead">
          公式マスタの自動同期で <strong>{count} 件</strong>{" "}
          の項目が追加されました。「アプリに反映」で取り込めます。
        </p>

        <div className="sync-update-body">
          {groups.map((g) => (
            <div key={g.label} className="sync-update-group">
              <h4 className="sync-update-group-title">
                {g.label}
                <span className="sync-update-count">{g.items.length}</span>
              </h4>
              <ul className="sync-update-list">
                {g.items.slice(0, 50).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
                {g.items.length > 50 && (
                  <li className="hint">他 {g.items.length - 50} 件</li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="sync-update-actions">
          <button onClick={close}>閉じる</button>
          <button
            className="primary sync-update-primary"
            onClick={handleApply}
          >
            アプリに反映
          </button>
        </div>
      </div>
    </div>
  );
}
