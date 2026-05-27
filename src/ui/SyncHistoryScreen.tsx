import { useMemo, useState } from "react";
import {
  AUTO_SYNC_PR_LIST_URL,
  commitUrl,
  loadSyncHistory,
  prUrl,
  type SyncHistoryEntry,
} from "../domain/syncHistory";

// アプリ内「更新履歴」タブ。
// 週次 cron が自動マージした更新を時系列で閲覧できる (newest first)。
// データソースは bundle 同梱の sources/SYNC_HISTORY.json。
// 古いバンドルで開くと履歴が古いので、PWA 更新後に最新が見える点に注意。

export function SyncHistoryScreen() {
  const history = useMemo(() => loadSyncHistory(), []);

  return (
    <section>
      <h2>更新履歴</h2>
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

      {history.entries.length === 0 ? (
        <p className="hint">履歴はまだありません。次回 cron 実行後に追加されます。</p>
      ) : (
        <ul className="sync-history-list">
          {history.entries.map((entry) => (
            <SyncHistoryEntryCard key={entry.generatedAt} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SyncHistoryEntryCard({ entry }: { entry: SyncHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const commit = commitUrl(entry);
  const pr = prUrl(entry);

  return (
    <li className="sync-history-entry">
      <div className="sync-history-header">
        <h3 className="sync-history-date">{entry.date}</h3>
        <span className="sync-history-count">{entry.totalCount} 件</span>
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

      <table className="sync-history-breakdown">
        <thead>
          <tr>
            <th>Source</th>
            <th>Collection</th>
            <th className="num">件数</th>
          </tr>
        </thead>
        <tbody>
          {entry.bySource.map((b, i) => (
            <tr key={i}>
              <td>{b.sourceId}</td>
              <td>{b.collection}</td>
              <td className="num">{b.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        className="sync-history-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? "▼ 追加項目を閉じる" : `▶ 追加項目 ${entry.items.length} 件を表示`}
      </button>

      {expanded && (
        <ul className="sync-history-items">
          {entry.items.map((item, i) => (
            <li key={i}>
              <span className="sync-history-item-tag">
                {item.sourceId} / {item.collection}
              </span>
              <span>{item.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
