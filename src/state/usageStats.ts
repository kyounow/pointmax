// PR-0b: ローカル利用統計カウンタ
//
// 【設計意図 / なぜ独立 localStorage キーなのか】
//   本モジュールは Zustand persist の永続化スキーマ (pointmax:store 系) とは
//   *完全に独立した* localStorage キー "pointmax:usage-stats:v1" にだけ読み書きする。
//   persist の schema version bump による reset / migrate に巻き込まれないための設計:
//     - schema reset で本体データが消えても利用統計は残す (逆も同様)。
//     - 統計の read/write 失敗が本体 store のライフサイクルに一切波及しないよう分離する。
//
//   目的は IA 再編・店舗チップ設計・復元機能の妥当性を実データで判断するための
//   軽量カウンタ。**送信は一切しない (この端末の localStorage 内のみ)**。
//   全 API は try/catch で quota / parse エラーを握りつぶし、統計のために本体を壊さない。

/** 計算実行イベント 1 件: store × 通貨 × ISO時刻 */
export type CalcEvent = { s: string; c: string; t: string };

export type UsageStats = {
  /** タブ id → 表示回数 */
  tabViews: Record<string, number>;
  /** store id → 選択回数 */
  storeSelections: Record<string, number>;
  /** 計算実行イベント (上限 500 件 FIFO) */
  calcEvents: CalcEvent[];
  /** 最初に統計を記録した時刻 (ISO) */
  firstRecordedAt: string;
};

// persist スキーマとは混ぜない独立キー (冒頭コメント参照)。
const STORAGE_KEY = "pointmax:usage-stats:v1";
// calcEvents の上限。超過時は古い方 (先頭) から捨てる FIFO。
const CALC_EVENTS_MAX = 500;

// 直前に記録した (storeId, currencyId) ペア。再レンダー起因の重複記録を防ぐ
// モジュール内 last-pair ガード。clearUsageStats でリセットする。
let lastPair: { s: string; c: string } = { s: "", c: "" };

function emptyStats(): UsageStats {
  return {
    tabViews: {},
    storeSelections: {},
    calcEvents: [],
    firstRecordedAt: new Date().toISOString(),
  };
}

/** id→数値の Record として妥当か (壊れた JSON からの回復用の緩い型ガード)。 */
function isCountRecord(v: unknown): v is Record<string, number> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every(
    (n) => typeof n === "number" && Number.isFinite(n),
  );
}

function isCalcEvent(v: unknown): v is CalcEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.s === "string" &&
    typeof e.c === "string" &&
    typeof e.t === "string"
  );
}

/** 保存済み JSON を UsageStats に正規化。想定外の形は各フィールドごとに安全側へ補完。 */
function normalize(parsed: unknown): UsageStats {
  const base = emptyStats();
  if (!parsed || typeof parsed !== "object") return base;
  const p = parsed as Record<string, unknown>;
  return {
    tabViews: isCountRecord(p.tabViews) ? p.tabViews : {},
    storeSelections: isCountRecord(p.storeSelections) ? p.storeSelections : {},
    calcEvents: Array.isArray(p.calcEvents)
      ? p.calcEvents.filter(isCalcEvent)
      : [],
    firstRecordedAt:
      typeof p.firstRecordedAt === "string"
        ? p.firstRecordedAt
        : base.firstRecordedAt,
  };
}

// localStorage から読み出す。未保存 / 壊れた JSON のときは空の統計を返す。
function read(): UsageStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStats();
    return normalize(JSON.parse(raw));
  } catch {
    // parse 失敗など: 空の統計から回復
    return emptyStats();
  }
}

function write(stats: UsageStats): void {
  // quota 超過等は呼び出し側 API の try/catch で握りつぶす
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

/** タブ表示を 1 回記録する。 */
export function recordTabView(tabId: string): void {
  if (!tabId) return;
  try {
    const stats = read();
    stats.tabViews[tabId] = (stats.tabViews[tabId] ?? 0) + 1;
    write(stats);
  } catch {
    // 統計失敗は本体に波及させない
  }
}

/** 店舗選択を 1 回記録する (空選択は無視)。 */
export function recordStoreSelection(storeId: string): void {
  if (!storeId) return;
  try {
    const stats = read();
    stats.storeSelections[storeId] = (stats.storeSelections[storeId] ?? 0) + 1;
    write(stats);
  } catch {
    // 統計失敗は本体に波及させない
  }
}

/**
 * 計算実行イベントを記録する。
 * 直前に記録した (storeId, currencyId) ペアと同一なら skip (再レンダー起因の重複防止)。
 * storeId / currencyId が未指定なら記録しない。
 */
export function recordCalcEvent(storeId: string, currencyId: string): void {
  if (!storeId || !currencyId) return;
  if (lastPair.s === storeId && lastPair.c === currencyId) return;
  lastPair = { s: storeId, c: currencyId };
  try {
    const stats = read();
    stats.calcEvents.push({
      s: storeId,
      c: currencyId,
      t: new Date().toISOString(),
    });
    // 上限 500 件 FIFO: 超過分を古い方 (先頭) から捨てる
    if (stats.calcEvents.length > CALC_EVENTS_MAX) {
      stats.calcEvents.splice(0, stats.calcEvents.length - CALC_EVENTS_MAX);
    }
    write(stats);
  } catch {
    // 統計失敗は本体に波及させない
  }
}

/** 現在の利用統計を取得する (未保存時は空の統計)。 */
export function getUsageStats(): UsageStats {
  return read();
}

/** 利用統計を全消去する (last-pair ガードもリセット)。 */
export function clearUsageStats(): void {
  lastPair = { s: "", c: "" };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 統計失敗は本体に波及させない
  }
}
