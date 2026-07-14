import { useEffect, useMemo, useRef, useState } from "react";
import {
  AUTO_SYNC_PR_LIST_URL,
  commitUrl,
  displayCollection,
  displaySource,
  loadSyncHistory,
  prUrl,
  type SyncHistoryEntry,
} from "../../domain/syncHistory";

// 設定画面内「マスタ更新履歴」セクション (改善プラン PR-2d)。
// 旧「更新履歴」トップレベルタブ (SyncHistoryScreen) を設定内へ降格したもの。
// 週次 cron が自動マージした更新を時系列で閲覧できる (newest first)。
// データソースは bundle 同梱の sources/SYNC_HISTORY.json。
// 古いバンドルで開くと履歴が古いので、PWA 更新後に最新が見える点に注意。
//
// 表示方針:
//   - 最新 1 件のプレビュー (日付 + 件数) は常時表示する (今後の自動反映の事後確認窓口)。
//   - 全履歴 (最大 104 件) は details「過去の更新をすべて表示」で展開する
//     (常時全表示は重いので折りたたむ)。
//   - expanded=true (#settings/history 直リンク) のとき details を自動展開し
//     セクション先頭へ scrollIntoView する。

export function SyncHistorySection({ expanded }: { expanded?: boolean }) {
  const history = useMemo(() => loadSyncHistory(), []);
  const latest = history.entries[0];
  const latestReviewTotal = latest?.reviewStats?.total ?? 0;

  const sectionRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // #settings/history で来たら details を開いてセクション先頭へスクロールする。
  // details は uncontrolled のまま、ここでは DOM を直接更新する (外部システム=DOM への
  // 反映は effect の想定用途。React state を効果内で setState しない → cascading render 回避)。
  // WalletCardsSection の highlight effect と同じ imperative パターン。
  useEffect(() => {
    if (!expanded) return;
    if (detailsRef.current) detailsRef.current.open = true;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expanded]);

  return (
    <div ref={sectionRef} data-section="sync-history">
      <h3 style={{ marginTop: 8 }}>マスタ更新履歴</h3>
      <p className="hint">
        週次自動同期で公式マスタに反映された変更の履歴です (最新が上、最大 104 件)。
        各エントリーは GitHub の auto-sync PR からも確認できます。
      </p>

      <div className="row">
        <a
          href={AUTO_SYNC_PR_LIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="sync-history-pr-link"
        >
          GitHub で auto-sync PR 一覧を開く ↗
        </a>
      </div>

      {history.entries.length === 0 || !latest ? (
        <p className="hint">履歴はまだありません。次回 cron 実行後に追加されます。</p>
      ) : (
        <>
          {/* 最新 1 件のプレビュー (日付 + 件数) — 常時表示 */}
          <div className="sync-history-preview">
            <span className="sync-history-preview-label">最新の更新</span>
            <span className="sync-history-preview-date">{latest.date}</span>
            <span className="sync-history-count">
              auto {latest.totalCount} 件
            </span>
            {latestReviewTotal > 0 && (
              <span className="sync-history-review-count">
                review {latestReviewTotal} 件
              </span>
            )}
          </div>

          {/* 全履歴 (最大 104 件) は折りたたみ。#settings/history では effect が自動展開。 */}
          <details ref={detailsRef} className="sync-history-more">
            <summary>過去の更新をすべて表示 ({history.entries.length} 件)</summary>
            <ul className="sync-history-list">
              {history.entries.map((entry) => (
                <SyncHistoryEntryCard key={entry.generatedAt} entry={entry} />
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

function SyncHistoryEntryCard({ entry }: { entry: SyncHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const commit = commitUrl(entry);
  const pr = prUrl(entry);
  const reviewTotal = entry.reviewStats?.total ?? 0;

  return (
    <li className="sync-history-entry">
      <div className="sync-history-header">
        <h4 className="sync-history-date">{entry.date}</h4>
        <span className="sync-history-count">auto {entry.totalCount} 件</span>
        {reviewTotal > 0 && (
          <span className="sync-history-review-count">
            review {reviewTotal} 件
          </span>
        )}
      </div>

      <div className="sync-history-meta">
        {pr && (
          <a
            href={pr}
            target="_blank"
            rel="noopener noreferrer"
            className="sync-history-meta-link"
          >
            PR #{entry.prNumber} ↗
          </a>
        )}
        {commit && (
          <a
            href={commit}
            target="_blank"
            rel="noopener noreferrer"
            className="sync-history-meta-link"
          >
            commit {entry.commitSha} ↗
          </a>
        )}
        {entry.avgConfidence != null && (
          <span className="sync-history-meta-item">
            平均 confidence {entry.avgConfidence.toFixed(2)}
          </span>
        )}
        <span className="sync-history-meta-item">
          source {entry.sourcesProcessed}
        </span>
      </div>

      {entry.bySource.length > 0 && (
        <table className="sync-history-breakdown">
          <thead>
            <tr>
              <th>取得元</th>
              <th>種別</th>
              <th className="num">件数</th>
            </tr>
          </thead>
          <tbody>
            {entry.bySource.map((b, i) => (
              <tr key={i}>
                <td>{displaySource(b)}</td>
                <td>{displayCollection(b)}</td>
                <td className="num">{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {entry.items.length > 0 && (
        <>
          <button
            type="button"
            className="sync-history-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded
              ? "▼ 追加項目を閉じる"
              : `▶ 追加項目 ${entry.items.length} 件を表示`}
          </button>

          {expanded && (
            <ul className="sync-history-items">
              {entry.items.map((item, i) => (
                <li key={i}>
                  <span className="sync-history-item-tag">
                    {displaySource(item)} / {displayCollection(item)}
                  </span>
                  <span>{item.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {entry.reviewStats && entry.reviewStats.total > 0 && (
        <>
          <button
            type="button"
            className="sync-history-toggle sync-history-toggle-review"
            onClick={() => setReviewExpanded((v) => !v)}
            aria-expanded={reviewExpanded}
          >
            {reviewExpanded
              ? "▼ Review queue 内訳を閉じる"
              : `▶ Review queue 内訳 ${entry.reviewStats.total} 件を表示`}
          </button>
          {reviewExpanded && (
            <table className="sync-history-review-breakdown">
              <thead>
                <tr>
                  <th>理由</th>
                  <th className="num">件数</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(entry.reviewStats.byReason)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <tr key={reason}>
                      <td>{reason}</td>
                      <td className="num">{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </li>
  );
}
