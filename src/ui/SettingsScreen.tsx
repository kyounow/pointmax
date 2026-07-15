import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { useDialog } from "./dialog/useDialog";
import { DEFAULT_SYNC_URL } from "../state/seed";
import { byId } from "../domain/entityIndex";
import { getUsageStats, clearUsageStats } from "../state/usageStats";
import { useRoute } from "../navigation";
import { downloadJsonFile } from "../state/exportFile";
import { SyncHistorySection } from "./settings/SyncHistorySection";
import { shouldExpandSyncHistory } from "./settings/settingsRoute";
import {
  getPersistenceStatus,
  requestPersistentStorage,
  type PersistenceStatus,
} from "../state/storagePersistence";
import {
  getSnapshotMeta,
  restoreSnapshot,
  type SnapshotTrigger,
} from "../state/stateSnapshot";
import { PERSIST_SCHEMA_VERSION } from "../state/persist-versions";

// PR-4a (N-4): スナップショット trigger の日本語ラベル (どの破壊的操作の「前」か)。
const SNAPSHOT_TRIGGER_LABEL: Record<SnapshotTrigger, string> = {
  import: "インポート前",
  reset: "初期化前",
  "sync-overwrite": "URL同期前",
  "seed-apply": "マスタ更新前",
};

export function SettingsScreen() {
  // Wave 5 B-1: 個別 subscribe → 単一 useShallow に集約。
  // hasData は数値派生なので別 subscribe で OK (primitive 比較で十分)。
  // IA-6 (PR-2e): エクスポート/インポート/サンプル投入を App から設定「データ管理」へ移設。
  const {
    syncUrl,
    lastSyncAt,
    setSyncUrl,
    syncFromUrl,
    clearAll,
    exportJson,
    importJson,
    mergeFromSeed,
    stores,
    birthMonth,
    setBirthMonth,
  } = useStore(
    useShallow((s) => ({
      syncUrl: s.syncUrl,
      lastSyncAt: s.lastSyncAt,
      setSyncUrl: s.setSyncUrl,
      syncFromUrl: s.syncFromUrl,
      clearAll: s.clearAll,
      exportJson: s.exportJson,
      importJson: s.importJson,
      mergeFromSeed: s.mergeFromSeed,
      stores: s.stores,
      birthMonth: s.birthMonth,
      setBirthMonth: s.setBirthMonth,
    })),
  );
  const hasData = useStore(
    (s) =>
      s.cards.length +
        s.currencies.length +
        s.stores.length +
        s.edges.length >
      0,
  );
  const dialog = useDialog();
  // PR-2d: #settings/history (旧 #sync-history 由来含む) で来たら
  // マスタ更新履歴セクションを自動展開 + スクロールする。
  const route = useRoute();
  const historyExpanded = shouldExpandSyncHistory(route);
  const [draftUrl, setDraftUrl] = useState(syncUrl || DEFAULT_SYNC_URL);
  const [busy, setBusy] = useState(false);

  // 永続化に空URLが残っている場合、自動でデフォルトに補完
  useEffect(() => {
    if (!syncUrl) {
      setSyncUrl(DEFAULT_SYNC_URL);
    }
  }, [syncUrl, setSyncUrl]);

  // ── IA-6: エクスポート / インポート (旧 App appbar から移設) ──
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadJsonFile(exportJson(), "pointmax");
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
      // PR-4a: import が採取したスナップショットを「直前の状態に戻す」ボタンへ即時反映
      // (この画面は破壊的操作を実行した後もマウントされ続けるため、mount 時読みの
      // snapshotMeta を明示的に取り直す)。
      setSnapshotMeta(getSnapshotMeta());
    }
  };

  const handleSave = () => {
    setSyncUrl(draftUrl);
  };

  // 「URL から取得して全上書き」: 別端末で共有マスタ JSON をホストしている場合の
  // クロスデバイス同期用。差分マージはアプリ起動時の UpdateBanner で行うため
  // ここでは destructive な全上書きのみ残す。
  const handleOverwrite = async () => {
    setSyncUrl(draftUrl); // URL 入力中の値も同時保存
    if (!draftUrl.trim()) {
      await dialog.alert({
        title: "URL未入力",
        message: "同期URLを入力してください",
        level: "error",
      });
      return;
    }
    const ok = await dialog.confirm({
      title: "URLから取得して全上書きしますか？",
      message:
        "データ (還元率・交換ルート等) と独自に追加した項目は URL の内容で置き換わります。" +
        "各カード・支払方法・ポイントカードの「使う/使わない」設定は引き継がれます。" +
        "バックアップを取りたい場合は先にエクスポートしてください。",
      okText: "全上書き",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const res = await syncFromUrl();
    setBusy(false);
    // PR-4a: sync-overwrite が採取したスナップショットをボタンへ反映。
    setSnapshotMeta(getSnapshotMeta());
    if (!res.ok) {
      await dialog.alert({
        title: "同期失敗",
        message: res.error,
        level: "error",
      });
    } else {
      await dialog.alert({
        title: "同期完了",
        message: "URLの内容で上書きしました。",
        level: "success",
      });
    }
  };

  // ── サンプル投入: bundle 同梱の公式マスタを add-only マージ ──
  // ユーザー編集は保持し、不足している公式項目だけ取り込む (非破壊)。
  // 初期化直後にサンプルデータを戻したいとき等に使う。
  const handleLoadSample = async () => {
    const ok = await dialog.confirm({
      title: "サンプルデータを投入しますか？",
      message:
        "公式マスタのサンプルデータ (カード・通貨・店舗・交換ルート・特典等) を現在のデータに追加します。\n" +
        "あなたが編集・追加した項目は保持され、不足している公式項目のみ取り込みます。",
      okText: "投入",
    });
    if (!ok) return;
    mergeFromSeed();
    await dialog.alert({
      title: "投入完了",
      message: "サンプルデータを取り込みました。",
      level: "success",
    });
  };

  const formattedSyncTime = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString("ja-JP")
    : "未実施";

  // PR-0c: 永続ストレージ (Storage API persist) の状態表示 / 再要求。
  // マウント時に現在状態を照会し、未許可なら「要求」ボタンを出す。
  const [persistStatus, setPersistStatus] = useState<PersistenceStatus | null>(
    null,
  );
  const [persistBusy, setPersistBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getPersistenceStatus().then((s) => {
      if (alive) setPersistStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleRequestPersist = async () => {
    setPersistBusy(true);
    const result = await requestPersistentStorage();
    setPersistStatus(result);
    setPersistBusy(false);
  };

  const persistLabel =
    persistStatus === null
      ? "確認中…"
      : persistStatus === "granted"
        ? "許可済み ✅"
        : persistStatus === "denied"
          ? "未許可 ⚠"
          : "非対応 -";

  const handleClearLocal = async () => {
    const ok = await dialog.confirm({
      title: "ローカルデータを初期化しますか？",
      message:
        "ブラウザに保存されているこのアプリのデータ（カード／ポイント／店舗／ルール／交換ルート／支払方法）を全て削除します。\n" +
        "公式マスタは「外部URLからのデータ同期」または「サンプル投入」から再取得できます。\n" +
        "エクスポート済み JSON からインポートで復元できます。",
      okText: "初期化",
      danger: true,
    });
    if (ok) {
      clearAll();
      // PR-4a: 初期化 (reset) が採取したスナップショットをボタンへ反映。
      setSnapshotMeta(getSnapshotMeta());
    }
  };

  // PR-4a (N-4): 破壊的操作の直前スナップショットからの「直前の状態に戻す」。
  // 独立キー (pointmax:snapshot:v1) からの読み取りなので state に保持し、
  // マウント時 + 復元失敗時に再取得する (成功時は location.reload で state ごと作り直す)。
  const [snapshotMeta, setSnapshotMeta] = useState(() => getSnapshotMeta());
  // schemaVersion がずれたスナップ (旧世代) は復元不可 → ボタン disabled + 理由表示。
  const snapshotRestorable =
    snapshotMeta !== null &&
    snapshotMeta.schemaVersion === PERSIST_SCHEMA_VERSION;
  const snapshotDateLabel = snapshotMeta
    ? new Date(snapshotMeta.takenAt).toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const snapshotTriggerLabel = snapshotMeta
    ? SNAPSHOT_TRIGGER_LABEL[snapshotMeta.trigger]
    : "";

  const handleRestoreSnapshot = async () => {
    if (!snapshotMeta) return;
    const ok = await dialog.confirm({
      title: "直前の状態に戻しますか？",
      message:
        `${snapshotTriggerLabel}のスナップショット（${snapshotDateLabel}）に巻き戻します。\n` +
        "現在のデータは失われ、ページが再読み込みされます。",
      okText: "元に戻す",
      danger: true,
    });
    if (!ok) return;
    const res = restoreSnapshot();
    if (!res.ok) {
      await dialog.alert({
        title: "復元できません",
        message: res.error,
        level: "error",
      });
      // schemaVersion 不一致などで消費されている可能性があるためメタを取り直す。
      setSnapshotMeta(getSnapshotMeta());
      return;
    }
    // persist キーを書き戻したので reload で新しい state として反映する。
    window.location.reload();
  };

  // PR-0b: ローカル利用統計 (この端末のみ・送信なし)。
  // 独立キーからの読み取りなので state に保持し、クリア時のみ再取得する。
  const [usage, setUsage] = useState(() => getUsageStats());
  const storeById = useMemo(() => byId(stores), [stores]);
  // 端末に記録があるか (無ければ firstRecordedAt は「今」の暫定値なので表示を抑制)
  const hasUsageData =
    Object.keys(usage.tabViews).length > 0 ||
    Object.keys(usage.storeSelections).length > 0 ||
    usage.calcEvents.length > 0;
  const topTabs = useMemo(
    () =>
      Object.entries(usage.tabViews)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [usage.tabViews],
  );
  const topStores = useMemo(
    () =>
      Object.entries(usage.storeSelections)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [usage.storeSelections],
  );

  const handleClearUsage = async () => {
    const ok = await dialog.confirm({
      title: "利用統計をクリアしますか？",
      message:
        "この端末に記録された利用統計（タブ表示・店舗選択・計算実行）を削除します。\nこの操作は元に戻せません。",
      okText: "クリア",
      danger: true,
    });
    if (!ok) return;
    clearUsageStats();
    setUsage(getUsageStats());
  };

  return (
    <section>
      <h2>設定</h2>

      {/* PR-2d: 旧「更新履歴」タブを設定内へ降格。今後の自動反映の事後確認窓口に
          なるため設定上部に配置する。 */}
      <SyncHistorySection expanded={historyExpanded} />

      {/* IA-6 (PR-2e): エクスポート / インポート / URL同期 / サンプル投入 / 初期化 を
          「データ管理」に集約。上から下へリスク昇順 (読取 → 追記/上書き → 全削除)。 */}
      <h3 style={{ marginTop: 8 }}>データ管理</h3>
      <p className="hint">
        バックアップ・復元・同期・初期化をまとめています。
        上から下へリスクの低い順に並んでいます。
      </p>

      {/* 1. エクスポート (読み取りのみ・非破壊) */}
      <h4 style={{ margin: "12px 0 4px" }}>エクスポート</h4>
      <p className="hint" style={{ marginTop: 0 }}>
        現在のデータを JSON ファイルとしてダウンロードします（バックアップ用）。
      </p>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button
          onClick={handleExport}
          disabled={!hasData}
          title="現在のデータをJSONファイルとしてダウンロード"
        >
          エクスポート
        </button>
      </div>

      {/* 2. インポート (現在データを上書き) */}
      <h4 style={{ margin: "12px 0 4px" }}>インポート</h4>
      <p className="hint" style={{ marginTop: 0 }}>
        エクスポートした JSON ファイルから読み込みます（現在データを上書き）。
      </p>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button onClick={handleImportClick} title="JSONファイルから読み込み">
          インポート
        </button>
      </div>
      <input
        type="file"
        accept="application/json,.json"
        ref={fileInputRef}
        onChange={handleImportFile}
        style={{ display: "none" }}
      />

      {/* 3. 外部URLからのデータ同期 (全上書き) */}
      <h4 style={{ margin: "12px 0 4px" }}>外部URLからのデータ同期</h4>
      <p className="hint" style={{ marginTop: 0 }}>
        マスタJSON（エクスポート形式と同じ）を公開URLに置けば、複数端末からまとめて取り込めます。
        <br />
        通常の差分マージはアプリ起動時の更新バナーで行えるため、ここでは
        <strong>「URL から取得して全上書き」</strong>のみを残しています
        （別端末で編集した内容を取り込みたいときに使用）。
      </p>

      <div className="row" style={{ marginBottom: 8 }}>
        <input
          type="url"
          placeholder="https://gist.githubusercontent.com/.../raw/data.json"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          style={{ flex: 1, minWidth: 320 }}
        />
        <button onClick={handleSave} disabled={draftUrl === syncUrl}>
          URL保存
        </button>
        <button
          onClick={() => {
            setDraftUrl(DEFAULT_SYNC_URL);
            setSyncUrl(DEFAULT_SYNC_URL);
          }}
          disabled={draftUrl === DEFAULT_SYNC_URL && syncUrl === DEFAULT_SYNC_URL}
          title={`デフォルト: ${DEFAULT_SYNC_URL}`}
        >
          デフォルトに戻す
        </button>
      </div>
      {draftUrl === DEFAULT_SYNC_URL && (
        <p className="hint" style={{ marginTop: 0 }}>
          ✓ 公式マスタを参照中
        </p>
      )}

      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button className="primary" onClick={handleOverwrite} disabled={busy}>
          {busy ? "同期中..." : "URLから取得して全上書き"}
        </button>
      </div>

      <p className="hint">
        最終同期: <strong>{formattedSyncTime}</strong>
      </p>

      <details style={{ marginTop: 8, marginBottom: 4 }}>
        <summary>GitHub Gist で運用する例</summary>
        <ol style={{ color: "var(--muted)", lineHeight: 1.8 }}>
          <li>PointMax で「エクスポート」してJSONをダウンロード</li>
          <li>
            <a
              href="https://gist.github.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              gist.github.com
            </a>{" "}
            で新規Gist作成 (Public または Secret)
          </li>
          <li>JSON内容をペースト → Save</li>
          <li>「Raw」ボタンを右クリック → URLをコピー (Raw URL)</li>
          <li>このURLを上欄に貼り付けて保存</li>
          <li>別端末で同URLを設定 → 「URLから取得して全上書き」</li>
        </ol>
        <p className="hint">
          ※ Gist URLは更新するとハッシュが変わる場合があるので、最新版を再取得することを推奨。
        </p>
      </details>

      {/* 4. サンプル投入 (add-only マージ・非破壊) */}
      <h4 style={{ margin: "16px 0 4px" }}>サンプル投入</h4>
      <p className="hint" style={{ marginTop: 0 }}>
        bundle 同梱の公式マスタ（サンプルデータ）を現在のデータに追加します。
        あなたが編集・追加した項目は保持され、不足している公式項目だけを取り込みます。
      </p>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button
          onClick={handleLoadSample}
          title="bundle 同梱の公式サンプルデータを追加取り込み"
        >
          サンプル投入
        </button>
      </div>

      {/* 5. ローカルデータ初期化 (全削除) */}
      <h4 style={{ margin: "16px 0 4px" }}>ローカルデータ初期化</h4>
      <p className="hint" style={{ marginTop: 0 }}>
        ブラウザに保存されたこのアプリのデータを全削除します。
        公式マスタはアプリ起動時の更新バナー（または上の URL 同期・サンプル投入）から再取得できます。
      </p>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleClearLocal}
          disabled={!hasData}
          title="ブラウザ内に保存された全データを削除"
        >
          ローカルデータ初期化
        </button>
      </div>

      {/* 6. 直前の状態に戻す (PR-4a / N-4)。破壊的操作 (インポート/初期化/URL同期/
          マスタ更新) の直前に自動保存したスナップショットから 1 手だけ undo する。 */}
      <h4 style={{ margin: "16px 0 4px" }}>直前の状態に戻す</h4>
      <p className="hint" style={{ marginTop: 0 }}>
        インポート・初期化・外部URL同期・マスタ更新の直前に自動保存した状態から、
        1 手だけ元に戻せます（最新の 1 世代のみ・この端末内のみ）。
      </p>
      {snapshotMeta ? (
        <>
          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <button
              onClick={handleRestoreSnapshot}
              disabled={!snapshotRestorable}
              title={
                snapshotRestorable
                  ? "破壊的操作の直前に自動保存した状態へ巻き戻す"
                  : "データ形式が更新されたため、このスナップショットは復元できません"
              }
            >
              直前の状態に戻す（{snapshotDateLabel}・{snapshotTriggerLabel}）
            </button>
          </div>
          {!snapshotRestorable && (
            <p className="hint" style={{ marginTop: 0 }}>
              ⚠ データ形式が更新された（v{snapshotMeta.schemaVersion} →
              v{PERSIST_SCHEMA_VERSION}）ため、このスナップショットは復元できません。
            </p>
          )}
        </>
      ) : (
        <p className="empty">スナップショットはまだありません。</p>
      )}

      <h3 style={{ marginTop: 8 }}>誕生月</h3>
      <p className="hint">
        誕生月限定の特典（誕生月ポイントアップ等）を計算に反映するために使います。
        <strong>この値は端末内にのみ保存され、送信されません。</strong>
        未設定の場合、誕生月限定の特典は常に不発になります。
      </p>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <select
          aria-label="誕生月"
          value={birthMonth ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setBirthMonth(v === "" ? undefined : Number(v));
          }}
        >
          <option value="">未設定</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}月
            </option>
          ))}
        </select>
      </div>

      <h3 style={{ marginTop: 8 }}>データ保持 (PWA)</h3>
      <p className="hint">
        ブラウザ利用 (特に iOS Safari) では長期間アクセスしないとデータが自動削除
        されることがあります。ホーム画面に追加 (PWA インストール) すると保持が
        強化されます。重要なデータは定期的にエクスポートしてください。
      </p>
      <p className="hint" style={{ marginTop: 0 }}>
        永続ストレージ: <strong>{persistLabel}</strong>
      </p>
      {persistStatus === "denied" && (
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button
            onClick={handleRequestPersist}
            disabled={persistBusy}
            title="ブラウザに永続ストレージ (自動削除の対象外) を要求"
          >
            {persistBusy ? "要求中…" : "永続ストレージを要求"}
          </button>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>利用統計 (この端末のみ)</h3>
      <p className="hint">
        画面の使われ方を把握するための軽量カウンタです。
        <strong>この統計は端末内にのみ保存され、送信されません。</strong>
      </p>

      {!hasUsageData ? (
        <p className="empty">まだ利用統計は記録されていません。</p>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <p className="hint" style={{ marginTop: 0 }}>
            記録開始日:{" "}
            <strong>
              {new Date(usage.firstRecordedAt).toLocaleString("ja-JP")}
            </strong>
          </p>

          <p className="hint" style={{ marginBottom: 4 }}>
            <strong>タブ表示回数 (上位5)</strong>
          </p>
          {topTabs.length === 0 ? (
            <p className="hint" style={{ marginTop: 0 }}>
              記録なし
            </p>
          ) : (
            <ul style={{ color: "var(--muted)", lineHeight: 1.8, marginTop: 0 }}>
              {topTabs.map(([tabId, count]) => (
                <li key={tabId}>
                  {tabId}: {count} 回
                </li>
              ))}
            </ul>
          )}

          <p className="hint" style={{ marginBottom: 4 }}>
            <strong>店舗選択回数 (上位5)</strong>
          </p>
          {topStores.length === 0 ? (
            <p className="hint" style={{ marginTop: 0 }}>
              記録なし
            </p>
          ) : (
            <ul style={{ color: "var(--muted)", lineHeight: 1.8, marginTop: 0 }}>
              {topStores.map(([storeId, count]) => (
                <li key={storeId}>
                  {storeById.get(storeId)?.name ?? storeId}: {count} 回
                </li>
              ))}
            </ul>
          )}

          <p className="hint">
            計算実行イベント件数: <strong>{usage.calcEvents.length}</strong> 件
            {usage.calcEvents.length >= 500 && "（上限500件）"}
          </p>
        </div>
      )}

      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button
          onClick={handleClearUsage}
          disabled={!hasUsageData}
          title="この端末に記録された利用統計を削除"
        >
          統計をクリア
        </button>
      </div>
    </section>
  );
}
