// PR-6d (U6): persist の読み込み (hydrate) 失敗の検知と、生データの退避。
//
// 【なぜ必要か】
//   zustand persist は hydrate に失敗 (壊れた JSON / migrate の例外 / localStorage の例外) しても
//   state を初期値 (empty) のまま残し、onRehydrateStorage の callback を呼ぶだけで続行する。
//   その後の最初の set() が persist キーを empty で上書きするため、何もしないと壊れた (けれど
//   中身の大半は読める) 生データが無音で消える。
//   - 本モジュールは「検知」(markHydrationFailure) と「退避」(backupRawPersisted) だけを担う。
//   - 上書きそのものを止めるのは Root.tsx が失敗時に App を描画しないこと (set() が起きない)。
//
// 【依存の制約】
//   import するのは persist-versions の PERSIST_STORE_KEY だけにする。store.ts から import される
//   ため、stateSnapshot / syncNotice 等に依存すると store.test の vi.mock("./stateSnapshot") と
//   干渉する。scripts の import グラフにも入れない (DOM の localStorage を使うため)。
//   書き出し・復元系のヘルパは UI 専用の recovery.ts に置く。
//
// 退避先は persist とは独立したキー pointmax:crash-backup:v1 に 1 世代だけ。全 API は例外を
// 投げない (quota 超過等は握りつぶして戻り値で返す)。

import { PERSIST_STORE_KEY } from "./persist-versions";

export const CRASH_BACKUP_KEY = "pointmax:crash-backup:v1";

export type CrashBackup = {
  /** 退避した時刻 (ISO)。 */
  takenAt: string;
  /** hydrate = 読み込み失敗の検知時 / reset = 復旧パネルの初期化の直前。 */
  cause: "hydrate" | "reset";
  /** persist キー (pointmax-v08-store) の生文字列 (壊れた JSON のこともある)。 */
  raw: string;
};

/** 退避データを読む。無い / 形が壊れている / localStorage 不可なら null。 */
export function readCrashBackup(): CrashBackup | null {
  try {
    const text = localStorage.getItem(CRASH_BACKUP_KEY);
    if (!text) return null;
    const b = JSON.parse(text) as Partial<CrashBackup> | null;
    if (
      !b ||
      typeof b.takenAt !== "string" ||
      typeof b.raw !== "string" ||
      (b.cause !== "hydrate" && b.cause !== "reset")
    ) {
      return null;
    }
    return { takenAt: b.takenAt, cause: b.cause, raw: b.raw };
  } catch {
    return null;
  }
}

/**
 * persist キーの生文字列を crash-backup に退避する (1 世代・上書き)。
 *   - persist の raw が無い (空) → 退避対象が無いので false (キーも作らない)。
 *   - 既存の退避と raw が同じ → 二重に書かず true (最初の cause / takenAt を残す)。
 *   - 書き込み失敗 (quota 超過等) → 例外を漏らさず false。
 */
export function backupRawPersisted(cause: CrashBackup["cause"]): boolean {
  try {
    const raw = localStorage.getItem(PERSIST_STORE_KEY);
    if (!raw) return false;
    if (readCrashBackup()?.raw === raw) return true;
    const backup: CrashBackup = {
      takenAt: new Date().toISOString(),
      cause,
      raw,
    };
    localStorage.setItem(CRASH_BACKUP_KEY, JSON.stringify(backup));
    return true;
  } catch {
    return false;
  }
}

/** 退避データを消す (設定画面の [削除] / テスト用)。 */
export function clearCrashBackup(): void {
  try {
    localStorage.removeItem(CRASH_BACKUP_KEY);
  } catch {
    // 失敗は握りつぶす
  }
}

// hydrate 失敗の記録 (モジュール状態)。store の生成時 (= import 時) に同期的に立ち、
// Root が最初の render で読む。テストは afterEach で clearHydrationFailure() を呼ぶこと。
let hydrationFailure: Error | null = null;

/** hydrate 失敗を記録する (Error 以外が投げられた場合も Error に包む)。 */
export function markHydrationFailure(e: unknown): void {
  hydrationFailure = e instanceof Error ? e : new Error(String(e));
}

export function getHydrationFailure(): Error | null {
  return hydrationFailure;
}

/** 記録を消す (テストと明示リセット用)。 */
export function clearHydrationFailure(): void {
  hydrationFailure = null;
}
