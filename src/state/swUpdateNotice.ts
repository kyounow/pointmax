// PR-4b (UX-8(3)): Service Worker が新バージョンを適用した直後の起動で
// 「アプリを新しいバージョンに更新しました」を 1 回だけ知らせるための判定。
//
// 【方式 — なぜ workbox の controllerchange ではなくビルド識別子比較なのか】
//   vite-plugin-pwa は registerType:"autoUpdate" 構成 (vite.config.ts) で、SW が
//   skipWaiting + clientsClaim により裏で自動更新される。onNeedRefresh 等の hook は
//   「更新を促す」プロンプト用で、autoUpdate では自前プロンプトを出さない前提のため
//   使わない。controllerchange の監視は「更新が今まさに起きた瞬間」は取れるが、
//   更新完了 → 次回起動という本 PR の要件 (「更新した後の初回起動で 1 回表示」) には
//   タイミングがずれる。
//
//   そこで素朴で確実な方式を採る: **ビルドごとに変わる識別子 (__BUILD_ID__、vite の
//   define で注入) を独立 localStorage キーに記録し、前回起動時と異なれば「更新後の
//   初回起動」と判定する**。SW が新 asset を precache して bundle が入れ替われば
//   __BUILD_ID__ も変わるので、SW 更新の検知として十分機能する。
//
// 【表示ライフサイクル】
//   - 初回インストール (記録なし): 更新ではないので表示しない。initBuildIdBaseline で
//     現ビルドをベースライン記録する (次回以降の差分検知の基準)。
//   - 記録あり かつ 現ビルドと異なる: 更新後の初回起動 = 表示 (reload しても dismiss
//     まで出続ける)。
//   - dismiss: 現ビルドを記録して以後同一ビルドでは再表示しない。
//
// 独立キーなので schema reset / persist migrate の影響を受けない (usageStats 等と同型)。

// vite.config.ts の define で注入されるビルド識別子。デプロイ (vite build) ごとに変わる。
// define 未適用の環境 (万一のフォールバック) では ReferenceError を握って "dev" とする。
declare const __BUILD_ID__: string;

const BUILD_KEY = "pointmax:build-id:v1";

/** 現ビルドの識別子。テストからも参照できるよう export する。 */
export function currentBuildId(): string {
  try {
    return __BUILD_ID__;
  } catch {
    return "dev";
  }
}

function readStoredBuildId(): string | null {
  try {
    return localStorage.getItem(BUILD_KEY);
  } catch {
    return null;
  }
}

function writeStoredBuildId(id: string): void {
  try {
    localStorage.setItem(BUILD_KEY, id);
  } catch {
    // quota / 不可環境でも本体に波及させない
  }
}

/**
 * 更新後の初回起動か (= 記録済みビルドと現ビルドが異なる)。純粋な read。
 * 記録なし (初回インストール) は false。dismiss するまで true を返し続ける。
 */
export function isSwUpdated(): boolean {
  const stored = readStoredBuildId();
  if (stored === null) return false;
  return stored !== currentBuildId();
}

/**
 * 初回インストール時にビルド識別子のベースラインを記録する。
 * 既に記録がある場合は何もしない (更新表示の判定を上書きしない = 更新中も
 * dismiss まで出し続けられる)。App 起動時に 1 回呼ぶ。
 */
export function initBuildIdBaseline(): void {
  if (readStoredBuildId() === null) writeStoredBuildId(currentBuildId());
}

/** SW 更新バナーを閉じる: 現ビルドを記録して同一ビルドでは再表示しない。 */
export function dismissSwUpdate(): void {
  writeStoredBuildId(currentBuildId());
}

/** 記録をクリアする (テスト用)。 */
export function clearBuildId(): void {
  try {
    localStorage.removeItem(BUILD_KEY);
  } catch {
    // 失敗は握りつぶす
  }
}
