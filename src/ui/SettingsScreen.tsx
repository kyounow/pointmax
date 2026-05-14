import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { useDialog } from "./dialog/DialogProvider";
import { DEFAULT_SYNC_URL } from "../state/seed";

export function SettingsScreen() {
  const syncUrl = useStore((s) => s.syncUrl);
  const lastSyncAt = useStore((s) => s.lastSyncAt);
  const setSyncUrl = useStore((s) => s.setSyncUrl);
  const syncFromUrl = useStore((s) => s.syncFromUrl);
  const clearAll = useStore((s) => s.clearAll);
  const hasData = useStore(
    (s) =>
      s.cards.length +
        s.currencies.length +
        s.stores.length +
        s.rules.length +
        s.edges.length >
      0,
  );
  const dialog = useDialog();
  const [draftUrl, setDraftUrl] = useState(syncUrl || DEFAULT_SYNC_URL);
  const [busy, setBusy] = useState(false);

  // 永続化に空URLが残っている場合、自動でデフォルトに補完
  useEffect(() => {
    if (!syncUrl) {
      setSyncUrl(DEFAULT_SYNC_URL);
    }
  }, [syncUrl, setSyncUrl]);

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
        "現在の編集内容は失われ、URLの内容が反映されます。バックアップを取りたい場合は先にエクスポートしてください。",
      okText: "全上書き",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const res = await syncFromUrl("overwrite");
    setBusy(false);
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

  const formattedSyncTime = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString("ja-JP")
    : "未実施";

  const handleClearLocal = async () => {
    const ok = await dialog.confirm({
      title: "ローカルデータを初期化しますか？",
      message:
        "ブラウザに保存されているこのアプリのデータ（カード／ポイント／店舗／ルール／交換ルート／支払方法）を全て削除します。\n公式マスタは「外部URLからのデータ同期」セクションから再取得できます。",
      okText: "初期化",
      danger: true,
    });
    if (ok) clearAll();
  };

  return (
    <section>
      <h2>設定</h2>

      <h3 style={{ marginTop: 8 }}>データ管理</h3>
      <p className="hint">
        ブラウザに保存されたこのアプリのデータを全削除します。
        公式マスタはアプリ起動時の更新バナー（または下の URL 同期）から再取得できます。
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

      <h3 style={{ marginTop: 8 }}>外部URLからのデータ同期</h3>
      <p className="hint">
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

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button
          className="primary"
          onClick={handleOverwrite}
          disabled={busy}
        >
          {busy ? "同期中..." : "URLから取得して全上書き"}
        </button>
      </div>

      <p className="hint">
        最終同期: <strong>{formattedSyncTime}</strong>
      </p>

      <details style={{ marginTop: 18 }}>
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
    </section>
  );
}
