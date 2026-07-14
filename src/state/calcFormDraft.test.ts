// @vitest-environment jsdom
// PR-3d (UX-6): 計算フォーム状態の同日内復元のテスト。
// localStorage が必要なので jsdom 環境で実行する。
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveCalcFormDraft,
  readCalcFormDraft,
  clearCalcFormDraft,
  resolveCalcFormRestore,
  localDateKey,
  type CalcFormDraft,
} from "./calcFormDraft";

const STORAGE_KEY = "pointmax:calc-form:v1";

/** ある日から days 日ずらしたローカル暦日キーを作るヘルパ。 */
function dateKeyOffset(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

describe("calcFormDraft 保存 / 読み出し", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存した下書きを読み出せる (round-trip)", () => {
    const draft: CalcFormDraft = {
      date: "2026-07-15",
      amount: "3000",
      activeCurrencyId: "rakuten-pt",
      storeId: "seven",
    };
    saveCalcFormDraft(draft);
    expect(readCalcFormDraft()).toEqual(draft);
  });

  it("独立キー pointmax:calc-form:v1 に書き込む", () => {
    saveCalcFormDraft({ date: "2026-07-15", amount: "1000", activeCurrencyId: null });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("未保存なら null を返す", () => {
    expect(readCalcFormDraft()).toBeNull();
  });

  it("storeId 省略時も storeId 無しで読み出せる", () => {
    saveCalcFormDraft({ date: "2026-07-15", amount: "500", activeCurrencyId: "x" });
    const got = readCalcFormDraft();
    expect(got).toEqual({ date: "2026-07-15", amount: "500", activeCurrencyId: "x" });
    expect(got && "storeId" in got).toBe(false);
  });

  it("壊れた JSON からは null で回復し、throw しない", () => {
    localStorage.setItem(STORAGE_KEY, "{ this is not valid json");
    expect(readCalcFormDraft()).toBeNull();
    // 上書き保存で以後の読み出しが継続できる
    saveCalcFormDraft({ date: "2026-07-15", amount: "100", activeCurrencyId: null });
    expect(readCalcFormDraft()?.amount).toBe("100");
  });

  it("必須フィールド (date/amount) が壊れた形は null にする", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ amount: 3000 })); // amount が数値
    expect(readCalcFormDraft()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: "2026-07-15" })); // amount 欠落
    expect(readCalcFormDraft()).toBeNull();
  });

  it("clearCalcFormDraft で消去できる", () => {
    saveCalcFormDraft({ date: "2026-07-15", amount: "1000", activeCurrencyId: null });
    clearCalcFormDraft();
    expect(readCalcFormDraft()).toBeNull();
  });
});

describe("localDateKey (ローカル暦日)", () => {
  it("YYYY-MM-DD (ゼロ埋め) で返す", () => {
    // ローカルタイムの 1 月 5 日
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });
});

describe("resolveCalcFormRestore (同日ガード + 通貨/店舗ガード)", () => {
  const now = new Date(2026, 6, 15, 12, 0); // 2026-07-15 ローカル
  const today = localDateKey(now);
  const ctx = {
    now,
    preferredCurrencyIds: ["rakuten-pt", "ana-mile"],
    storeExists: (id: string) => id === "seven" || id === "general",
  };

  it("同日の下書きは金額・通貨・店舗をそのまま採用する", () => {
    const draft: CalcFormDraft = {
      date: today,
      amount: "3000",
      activeCurrencyId: "rakuten-pt",
      storeId: "seven",
    };
    expect(resolveCalcFormRestore(draft, ctx)).toEqual({
      amount: "3000",
      activeCurrencyId: "rakuten-pt",
      storeId: "seven",
    });
  });

  it("翌日 (保存日が昨日) の下書きは全項目無視する", () => {
    const draft: CalcFormDraft = {
      date: dateKeyOffset(now, -1), // 昨日
      amount: "3000",
      activeCurrencyId: "rakuten-pt",
      storeId: "seven",
    };
    expect(resolveCalcFormRestore(draft, ctx)).toEqual({
      amount: null,
      activeCurrencyId: null,
      storeId: null,
    });
  });

  it("通貨が優先リストから外れていたら activeCurrencyId のみフォールバック (金額は復元)", () => {
    const draft: CalcFormDraft = {
      date: today,
      amount: "3000",
      activeCurrencyId: "removed-cur", // preferred に無い
      storeId: "seven",
    };
    expect(resolveCalcFormRestore(draft, ctx)).toEqual({
      amount: "3000",
      activeCurrencyId: null,
      storeId: "seven",
    });
  });

  it("店舗が実在しなければ storeId のみフォールバック", () => {
    const draft: CalcFormDraft = {
      date: today,
      amount: "3000",
      activeCurrencyId: "rakuten-pt",
      storeId: "ghost-store", // storeExists=false
    };
    expect(resolveCalcFormRestore(draft, ctx)).toEqual({
      amount: "3000",
      activeCurrencyId: "rakuten-pt",
      storeId: null,
    });
  });

  it("空文字の金額も同日なら忠実に復元する (クリア状態の保持)", () => {
    const draft: CalcFormDraft = {
      date: today,
      amount: "",
      activeCurrencyId: null,
    };
    expect(resolveCalcFormRestore(draft, ctx).amount).toBe("");
  });

  it("下書きが null なら全項目 null", () => {
    expect(resolveCalcFormRestore(null, ctx)).toEqual({
      amount: null,
      activeCurrencyId: null,
      storeId: null,
    });
  });
});
