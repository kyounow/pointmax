// PR-4a (N-4): 破壊的操作の直前スナップショット + 「元に戻す」。
//
// 【設計意図 / なぜ独立 localStorage キーなのか】
//   usageStats / calcFormDraft / onboardingDismissed と同じく、Zustand persist の
//   永続化スキーマ (pointmax-v08-store) とは *完全に独立した* localStorage キー
//   "pointmax:snapshot:v1" に **1 世代だけ** 保存する。破壊的操作 (インポート /
//   初期化 / URL 同期の全上書き / マスタ更新の反映) の直前に現在の app state を退避し、
//   ユーザーが「直前の状態に戻す」で 1 手だけ巻き戻せるようにする。
//
//   - snapshot 対象は persist の app state のみ。独立キー群 (usageStats /
//     calc-form / onboarding-dismissed) は含めない = 巻き戻しで消さない (設計確定事項)。
//   - restore は schemaVersion が現行 (PERSIST_SCHEMA_VERSION) と一致するときのみ許可。
//     不一致 (v6 直前スナップを v7 に復元 等) は拒否し、不整合 state を作る事故を防ぐ。
//   - 全 API は try/catch で quota / parse エラーを握りつぶし、戻り値で失敗を返す。
//     **本体の破壊的操作は snapshot 保存の成否に関わらず続行する** (保存失敗で操作を止めない)。
//   - store を import しない (循環回避)。退避対象の state は呼び出し側が引数で渡す。

import { PERSIST_SCHEMA_VERSION, PERSIST_STORE_KEY } from "./persist-versions";

// persist スキーマとは混ぜない独立キー。1 世代のみ (毎回上書き保存)。
const SNAPSHOT_KEY = "pointmax:snapshot:v1";

/** どの破壊的操作の直前に採取したか。 */
export type SnapshotTrigger =
  | "import"
  | "reset"
  | "sync-overwrite"
  | "seed-apply";

/** localStorage に保存するスナップショット 1 件の形。 */
export type Snapshot = {
  /** 採取時刻 (ISO)。 */
  takenAt: string;
  /** 採取時点の persist schema バージョン。復元時に現行と一致検査する。 */
  schemaVersion: number;
  /** どの破壊的操作の直前か。 */
  trigger: SnapshotTrigger;
  /** persist される app state 一式 (プレーンオブジェクト)。 */
  state: unknown;
};

/** UI 表示用の軽量メタ (state 本体は含めない)。 */
export type SnapshotMeta = {
  takenAt: string;
  trigger: SnapshotTrigger;
  schemaVersion: number;
};

export type SnapshotResult = { ok: true } | { ok: false; error: string };

/** trigger が既知の値か (壊れた JSON からの回復用の緩い型ガード)。 */
function isTrigger(v: unknown): v is SnapshotTrigger {
  return (
    v === "import" ||
    v === "reset" ||
    v === "sync-overwrite" ||
    v === "seed-apply"
  );
}

/** localStorage から現在のスナップショットを読む。未保存 / 壊れた形は null。 */
function readSnapshot(): Snapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const s = parsed as Record<string, unknown>;
    if (
      typeof s.takenAt !== "string" ||
      typeof s.schemaVersion !== "number" ||
      !isTrigger(s.trigger) ||
      !("state" in s)
    ) {
      return null;
    }
    return {
      takenAt: s.takenAt,
      schemaVersion: s.schemaVersion,
      trigger: s.trigger,
      state: s.state,
    };
  } catch {
    return null;
  }
}

/**
 * 破壊的操作の直前に現在の persist app state を退避する (1 世代・上書き)。
 * state は呼び出し側 (store action) が渡すプレーンオブジェクト
 * (store を import しない = 循環回避)。state が空 (null/undefined) なら退避対象が
 * 無いので何もしない (未永続の新規状態など)。quota 等の保存失敗は戻り値で返し、
 * 例外は投げない (呼び出し側は戻り値を無視して本体操作を続行してよい)。
 */
export function takeSnapshot(
  trigger: SnapshotTrigger,
  state: unknown,
): SnapshotResult {
  if (typeof localStorage === "undefined") {
    return { ok: false, error: "localStorage が利用できません" };
  }
  if (state == null) {
    return { ok: false, error: "スナップショット対象がありません" };
  }
  const snapshot: Snapshot = {
    takenAt: new Date().toISOString(),
    schemaVersion: PERSIST_SCHEMA_VERSION,
    trigger,
    state,
  };
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    return { ok: true };
  } catch (e) {
    // quota 超過など: 保存失敗を返すが例外は漏らさない。本体操作は止めない。
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** UI 表示用メタを返す (無ければ null)。state 本体は展開しない。 */
export function getSnapshotMeta(): SnapshotMeta | null {
  const snap = readSnapshot();
  if (!snap) return null;
  return {
    takenAt: snap.takenAt,
    trigger: snap.trigger,
    schemaVersion: snap.schemaVersion,
  };
}

/**
 * スナップショットを persist キーに書き戻す (= 巻き戻し)。
 *   - スナップショット不在 → 拒否 (理由文字列)。
 *   - schemaVersion !== PERSIST_SCHEMA_VERSION → 拒否。旧世代スナップを現行スキーマに
 *     復元すると state が壊れるため (理由文字列)。
 * 実際の反映 (再読込) は呼び出し側で location.reload() する。書き戻し成功時は
 * スナップショットを消費 (clear) し、二重復元を防ぐ (1 手だけの undo)。
 */
export function restoreSnapshot(): SnapshotResult {
  if (typeof localStorage === "undefined") {
    return { ok: false, error: "localStorage が利用できません" };
  }
  const snap = readSnapshot();
  if (!snap) {
    return { ok: false, error: "復元できるスナップショットがありません" };
  }
  if (snap.schemaVersion !== PERSIST_SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        `スナップショットのデータ形式 (v${snap.schemaVersion}) が現在のバージョン ` +
        `(v${PERSIST_SCHEMA_VERSION}) と異なるため復元できません。`,
    };
  }
  try {
    // zustand persist の格納形式 { state, version } に合わせて書き戻す。
    // 再読込時に persist が version 一致で as-is 復元する (migrate は走らない)。
    localStorage.setItem(
      PERSIST_STORE_KEY,
      JSON.stringify({ state: snap.state, version: snap.schemaVersion }),
    );
    // 巻き戻しは 1 手のみ。復元後はスナップショットを消費して残さない。
    clearSnapshot();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** スナップショットを消去する (テスト / 明示リセット用)。 */
export function clearSnapshot(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // 失敗は握りつぶす
  }
}
