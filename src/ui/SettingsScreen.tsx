import { useState } from "react";
import { useStore } from "../state/store";
import { useDialog } from "./dialog/DialogProvider";

export function SettingsScreen() {
  const syncUrl = useStore((s) => s.syncUrl);
  const lastSyncAt = useStore((s) => s.lastSyncAt);
  const setSyncUrl = useStore((s) => s.setSyncUrl);
  const syncFromUrl = useStore((s) => s.syncFromUrl);
  const dialog = useDialog();
  const [draftUrl, setDraftUrl] = useState(syncUrl);
  const [busy, setBusy] = useState(false);

  const handleSave = () => {
    setSyncUrl(draftUrl);
  };

  const handleSync = async (mode: "merge" | "overwrite") => {
    setSyncUrl(draftUrl); // URL入力中の値も同時保存
    if (!draftUrl.trim()) {
      await dialog.alert({
        title: "URL未入力",
        message: "同期URLを入力してください",
        level: "error",
      });
      return;
    }
    if (mode === "overwrite") {
      const ok = await dialog.confirm({
        title: "URLから取得して全上書きしますか？",
        message:
          "現在の編集内容は失われ、URLの内容が反映されます。バックアップを取りたい場合は先にエクスポートしてください。",
        okText: "全上書き",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    const res = await syncFromUrl(mode);
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
        message:
          mode === "overwrite"
            ? "URLの内容で上書きしました。"
            : `${res.added ?? 0} 件の追加項目をマージしました。`,
        level: "success",
      });
    }
  };

  const formattedSyncTime = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString("ja-JP")
    : "未実施";

  return (
    <section>
      <h2>設定</h2>

      <h3 style={{ marginTop: 8 }}>外部URLからのデータ同期</h3>
      <p className="hint">
        マスタJSON（エクスポート形式と同じ）を公開URLに置けば、複数端末から取り込めます。
        <br />
        例: GitHub Gist の Raw URL、自前のWebサーバ等。
        <strong>HTTPS</strong>かつ <strong>CORS許可</strong> されている必要があります。
      </p>

      <div className="row" style={{ marginBottom: 12 }}>
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
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button
          className="primary"
          onClick={() => handleSync("merge")}
          disabled={busy}
        >
          {busy ? "同期中..." : "差分のみマージ"}
        </button>
        <button onClick={() => handleSync("overwrite")} disabled={busy}>
          全上書き
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
          <li>別端末で同URLを設定 → 「差分のみマージ」または「全上書き」</li>
        </ol>
        <p className="hint">
          ※ Gist URLは更新するとハッシュが変わる場合があるので、最新版を再取得することを推奨。
        </p>
      </details>
    </section>
  );
}
