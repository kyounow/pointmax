// @vitest-environment jsdom
// PR-0b: ローカル利用統計カウンタのテスト。
// localStorage が必要なので jsdom 環境で実行する。
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordTabView,
  recordStoreSelection,
  recordCalcEvent,
  getUsageStats,
  getRecentStoreIds,
  clearUsageStats,
} from "./usageStats";

const STORAGE_KEY = "pointmax:usage-stats:v1";

describe("usageStats (PR-0b ローカル利用統計)", () => {
  beforeEach(() => {
    // localStorage と last-pair ガードの両方をリセット
    localStorage.clear();
    clearUsageStats();
  });

  it("タブ表示を回数として記録・取得できる", () => {
    recordTabView("calculator");
    recordTabView("calculator");
    recordTabView("settings");
    const stats = getUsageStats();
    expect(stats.tabViews).toEqual({ calculator: 2, settings: 1 });
  });

  it("店舗選択を回数として記録し、空 id は無視する", () => {
    recordStoreSelection("store-a");
    recordStoreSelection("store-a");
    recordStoreSelection("store-b");
    recordStoreSelection(""); // 空選択は無視
    const stats = getUsageStats();
    expect(stats.storeSelections).toEqual({ "store-a": 2, "store-b": 1 });
  });

  it("計算実行イベントを store×通貨×時刻で記録し、firstRecordedAt を持つ", () => {
    recordCalcEvent("store-a", "cur-x");
    const stats = getUsageStats();
    expect(stats.calcEvents).toHaveLength(1);
    expect(stats.calcEvents[0].s).toBe("store-a");
    expect(stats.calcEvents[0].c).toBe("cur-x");
    // ISO 時刻としてパースできる
    expect(Number.isNaN(Date.parse(stats.calcEvents[0].t))).toBe(false);
    expect(Number.isNaN(Date.parse(stats.firstRecordedAt))).toBe(false);
  });

  it("未指定の store / 通貨では計算イベントを記録しない", () => {
    recordCalcEvent("", "cur-x");
    recordCalcEvent("store-a", "");
    expect(getUsageStats().calcEvents).toHaveLength(0);
  });

  it("直前と同一 (store, 通貨) ペアは skip し、別ペアなら記録する", () => {
    recordCalcEvent("store-a", "cur-x");
    recordCalcEvent("store-a", "cur-x"); // 同一 → skip
    expect(getUsageStats().calcEvents).toHaveLength(1);

    recordCalcEvent("store-b", "cur-x"); // 別 store → 記録
    recordCalcEvent("store-b", "cur-y"); // 別 通貨 → 記録
    recordCalcEvent("store-a", "cur-x"); // 直前と異なる → 再度記録
    expect(getUsageStats().calcEvents).toHaveLength(4);
  });

  it("calcEvents は上限 500 件 FIFO で、501 件目の記録で先頭が落ちる", () => {
    // 直前ペアと必ず異なるよう通貨 id を毎回変える (last-pair skip を回避)
    for (let i = 0; i < 501; i++) {
      recordCalcEvent("store-a", `cur-${i}`);
    }
    const events = getUsageStats().calcEvents;
    expect(events).toHaveLength(500);
    // 最古 (cur-0) が落ち、先頭は cur-1 / 末尾は cur-500
    expect(events[0].c).toBe("cur-1");
    expect(events[events.length - 1].c).toBe("cur-500");
  });

  it("clearUsageStats で全消去され、last-pair ガードもリセットされる", () => {
    recordTabView("calculator");
    recordStoreSelection("store-a");
    recordCalcEvent("store-a", "cur-x");
    clearUsageStats();

    const stats = getUsageStats();
    expect(stats.tabViews).toEqual({});
    expect(stats.storeSelections).toEqual({});
    expect(stats.calcEvents).toHaveLength(0);

    // clear 後は同一ペアでも記録される (last-pair がリセットされている)
    recordCalcEvent("store-a", "cur-x");
    expect(getUsageStats().calcEvents).toHaveLength(1);
  });

  it("壊れた JSON からは空の統計として回復し、以後の記録も継続できる", () => {
    localStorage.setItem(STORAGE_KEY, "{ this is not valid json");
    // 取得は空統計を返す (throw しない)
    const stats = getUsageStats();
    expect(stats.tabViews).toEqual({});
    expect(stats.calcEvents).toHaveLength(0);

    // 壊れた値を上書きして記録が継続できる
    recordTabView("cards");
    expect(getUsageStats().tabViews).toEqual({ cards: 1 });
  });

  it("独立 localStorage キー pointmax:usage-stats:v1 に書き込む", () => {
    recordTabView("calculator");
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});

describe("getRecentStoreIds (PR-3a 直近店舗チップ)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearUsageStats();
  });

  it("履歴も選択も無いときは空配列を返す", () => {
    expect(getRecentStoreIds(8)).toEqual([]);
  });

  it("calcEvents から新しい順に unique な storeId を返す", () => {
    // 通貨を毎回変えて last-pair skip を回避しつつ記録 (古い順に push される)
    recordCalcEvent("store-a", "cur-1");
    recordCalcEvent("store-b", "cur-2");
    recordCalcEvent("store-c", "cur-3");
    // 新しい順 → c, b, a
    expect(getRecentStoreIds(8)).toEqual(["store-c", "store-b", "store-a"]);
  });

  it("同一 store の再計算は最新の1件だけ残し、直近順で unique 化する", () => {
    recordCalcEvent("store-a", "cur-1");
    recordCalcEvent("store-b", "cur-2");
    recordCalcEvent("store-a", "cur-3"); // a を再計算 → a が最新へ
    // 直近順 unique → a, b (a は 1 回だけ、最新位置)
    expect(getRecentStoreIds(8)).toEqual(["store-a", "store-b"]);
  });

  it("limit で件数を制限する", () => {
    recordCalcEvent("store-a", "cur-1");
    recordCalcEvent("store-b", "cur-2");
    recordCalcEvent("store-c", "cur-3");
    expect(getRecentStoreIds(2)).toEqual(["store-c", "store-b"]);
  });

  it("limit<=0 は空配列", () => {
    recordCalcEvent("store-a", "cur-1");
    expect(getRecentStoreIds(0)).toEqual([]);
  });

  it("calcEvents が空なら storeSelections の回数上位で fallback する", () => {
    // 計算履歴は無いが、選択記録はある状態
    recordStoreSelection("store-x");
    recordStoreSelection("store-y");
    recordStoreSelection("store-y");
    recordStoreSelection("store-z");
    recordStoreSelection("store-z");
    recordStoreSelection("store-z");
    // 回数降順 → z(3), y(2), x(1)
    expect(getRecentStoreIds(8)).toEqual(["store-z", "store-y", "store-x"]);
  });

  it("calcEvents があれば storeSelections より優先する (fallback しない)", () => {
    recordStoreSelection("store-x"); // 選択のみの店舗
    recordCalcEvent("store-a", "cur-1"); // 実計算した店舗
    expect(getRecentStoreIds(8)).toEqual(["store-a"]);
  });
});
