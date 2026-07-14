// PR-3d (UX-6): 計算フォーム状態の「同日内」復元。
//
// 【設計意図 / なぜ独立 localStorage キーなのか】
//   usageStats (PR-0b) / onboardingDismissed (PR-3c) と同じく、Zustand persist の
//   永続化スキーマ (pointmax:store 系) とは *完全に独立した* localStorage キー
//   "pointmax:calc-form:v1" にだけ読み書きする。schema version bump の reset / migrate に
//   巻き込まれないための分離:
//     - 本体データ (カード/通貨/店舗) が reset されても下書きは独立に扱える (逆も同様)。
//     - 下書きの read/write 失敗が本体 store のライフサイクルに一切波及しない。
//
//   目的: 店頭で金額・優先通貨タブを入力した直後に PWA が (Android の kill 等で) 落ちても、
//   同じ暦日のうちは再入力せず続きから使えるようにする。**送信は一切しない (端末内のみ)**。
//   sessionStorage は Android PWA の kill で消えるため不採用 (設計確定事項)。
//   全 API は try/catch で quota / parse エラーを握りつぶし、下書きのために本体を壊さない。

// persist スキーマとは混ぜない独立キー (冒頭コメント参照)。
const STORAGE_KEY = "pointmax:calc-form:v1";

/** 計算フォームの下書き 1 件。date は保存時点のローカル暦日 ("YYYY-MM-DD")。 */
export type CalcFormDraft = {
  /** 保存日 (ローカルタイムの暦日キー)。翌日以降は復元時に無視される。 */
  date: string;
  /** 金額入力の生文字列 (数字のみ / 空文字許容)。 */
  amount: string;
  /** 優先通貨タブの選択 id。未選択は null。 */
  activeCurrencyId: string | null;
  /** 選択店舗 id (任意)。直近店舗チップ (PR-3a) があるため優先度低。 */
  storeId?: string;
};

/**
 * ローカルタイムの暦日キー "YYYY-MM-DD" を返す。
 * useToday の isSameCalendarDay と同じ getFullYear/getMonth/getDate ベース
 * (= ローカル暦日) なので、「同じ暦日なら文字列一致」が成り立つ。
 */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 保存済み JSON が下書きとして妥当か (壊れた JSON からの回復用の緩い型ガード)。 */
function isDraft(v: unknown): v is CalcFormDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  if (typeof d.date !== "string" || typeof d.amount !== "string") return false;
  // activeCurrencyId は null / 未定義 / string のみ許容 (それ以外の型は破棄)
  if (d.activeCurrencyId != null && typeof d.activeCurrencyId !== "string") {
    return false;
  }
  // storeId は任意フィールド。あるなら string
  if (d.storeId != null && typeof d.storeId !== "string") return false;
  return true;
}

/**
 * localStorage から下書きを読み出す。未保存 / 壊れた JSON / 想定外の形は null。
 * 日付判定 (同日か) は行わない — 復元側 (resolveCalcFormRestore) の責務。
 */
export function readCalcFormDraft(): CalcFormDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDraft(parsed)) return null;
    // 正規化: 想定外キーを落とし、activeCurrencyId の未定義は null に揃える。
    const draft: CalcFormDraft = {
      date: parsed.date,
      amount: parsed.amount,
      activeCurrencyId: parsed.activeCurrencyId ?? null,
    };
    if (typeof parsed.storeId === "string") draft.storeId = parsed.storeId;
    return draft;
  } catch {
    // parse 失敗など: 復元しない (空 = 既定値で起動)
    return null;
  }
}

/** 下書きを保存する (quota 超過等は握りつぶす)。 */
export function saveCalcFormDraft(draft: CalcFormDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // 保存失敗は本体に波及させない
  }
}

/** 下書きを消去する (テスト / 明示リセット用)。 */
export function clearCalcFormDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 失敗は握りつぶす
  }
}

/** resolveCalcFormRestore が採用した復元値 (null = 既定値を使う)。 */
export type RestoredCalcForm = {
  amount: string | null;
  activeCurrencyId: string | null;
  storeId: string | null;
};

/**
 * 下書きから初期フォーム値を解決する (ガード込みの純粋関数)。
 *   - 保存日が今日 (ローカル暦日) と一致しなければ全項目 null (= 既定値)。翌日以降は無視。
 *   - activeCurrencyId は現在も優先通貨リストに存在する場合のみ採用 (外れていたら既定挙動)。
 *   - storeId は実在する場合のみ採用 (削除済みなら既定)。
 *   - amount は同日なら常に採用 (空文字含む。ユーザーがクリアした状態も忠実に復元)。
 */
export function resolveCalcFormRestore(
  draft: CalcFormDraft | null,
  ctx: {
    now: Date;
    preferredCurrencyIds: string[];
    storeExists: (id: string) => boolean;
  },
): RestoredCalcForm {
  const none: RestoredCalcForm = {
    amount: null,
    activeCurrencyId: null,
    storeId: null,
  };
  if (!draft) return none;
  // 同日判定: useToday と同じローカル暦日基準 (localDateKey)。翌日以降は無視。
  if (draft.date !== localDateKey(ctx.now)) return none;
  const activeCurrencyId =
    draft.activeCurrencyId &&
    ctx.preferredCurrencyIds.includes(draft.activeCurrencyId)
      ? draft.activeCurrencyId
      : null;
  const storeId =
    draft.storeId && ctx.storeExists(draft.storeId) ? draft.storeId : null;
  return { amount: draft.amount, activeCurrencyId, storeId };
}
