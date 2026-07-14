// PR-3c (ONB-1): オンボーディングチェックリストの「手動クローズ」永続フラグ。
//
// 【設計意図 / なぜ独立 localStorage キーなのか】
//   usageStats (PR-0b) と同様、Zustand persist の永続化スキーマ (pointmax:store 系)
//   とは *完全に独立した* localStorage キーにだけ読み書きする。schema version bump の
//   reset / migrate に巻き込まれないための分離:
//     - schema reset で本体データ (カード/通貨) が消えても、閉じた履歴は独立に扱える。
//     - フラグの read/write 失敗が本体 store のライフサイクルに一切波及しない。
//
//   仕様: ユーザーがチェックリストを「✕」で閉じたら二度と自動再表示しない (キー優先)。
//   両ステップ完了で自動的に消えるのとは別軸で、未完了でも手動クローズを尊重する。
//   **送信は一切しない (この端末の localStorage 内のみ)**。

const STORAGE_KEY = "pointmax:onboarding-dismissed:v1";

/** チェックリストが手動クローズ済みか。未保存 / 例外時は false (= 表示継続)。 */
export function isOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // localStorage 不可 (プライベートモード等) は「未クローズ」扱いで安全側へ
    return false;
  }
}

/** チェックリストを手動クローズ済みにする (以後の自動再表示を止める)。 */
export function dismissOnboarding(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // quota / 不可環境でも本体に波及させない
  }
}

/** クローズ状態を解除する (テスト / 明示的な再オンボーディング用)。 */
export function clearOnboardingDismissed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 失敗は握りつぶす
  }
}
