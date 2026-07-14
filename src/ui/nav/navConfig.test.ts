import { describe, it, expect } from "vitest";
import {
  TABS,
  DAILY_TABS,
  DATA_MENU_TABS,
  BOTTOM_BAR,
  tabGroup,
  bottomBarActiveSlot,
  shouldHideBottomBar,
  type Tab,
} from "./navConfig";

describe("navConfig: タブの group 構造", () => {
  it("各タブが期待どおりの group に属する", () => {
    const group = (id: Tab) => TABS.find((t) => t.id === id)?.group;
    expect(group("calculator")).toBe("daily");
    expect(group("benefits")).toBe("daily");
    expect(group("edges")).toBe("daily");
    expect(group("wallet")).toBe("daily");
    expect(group("currencies")).toBe("data");
    expect(group("stores")).toBe("data");
    expect(group("data")).toBe("data");
    expect(group("settings")).toBe("meta");
  });

  it("daily グループは calculator/benefits/edges/wallet の 4 つ", () => {
    expect(DAILY_TABS.map((t) => t.id)).toEqual([
      "calculator",
      "benefits",
      "edges",
      "wallet",
    ]);
  });

  it("デスクトップのデータドロップダウンは通貨/店舗のみ (ハブ #data は除外)", () => {
    expect(DATA_MENU_TABS.map((t) => t.id)).toEqual(["currencies", "stores"]);
  });

  it("tabGroup は TABS 定義と一致し、未知 id は daily に fallback", () => {
    expect(tabGroup("stores")).toBe("data");
    expect(tabGroup("settings")).toBe("meta");
    // 型外の値でも安全に daily を返す
    expect(tabGroup("unknown" as Tab)).toBe("daily");
  });
});

describe("navConfig: bottomBarActiveSlot (下部バー active 規則)", () => {
  it("calculator → 計算枠", () => {
    expect(bottomBarActiveSlot("calculator")).toBe("calculator");
  });
  it("benefits → 特典枠", () => {
    expect(bottomBarActiveSlot("benefits")).toBe("benefits");
  });
  it("settings → 設定枠", () => {
    expect(bottomBarActiveSlot("settings")).toBe("settings");
  });
  it("wallet/edges/currencies/stores/data はすべて データ枠", () => {
    for (const tab of [
      "wallet",
      "edges",
      "currencies",
      "stores",
      "data",
    ] as Tab[]) {
      expect(bottomBarActiveSlot(tab)).toBe("data");
    }
  });
});

describe("navConfig: 下部バー構成", () => {
  it("4 枠 (計算/特典/データ/設定) で、データ枠はハブへ遷移する", () => {
    expect(BOTTOM_BAR.map((b) => b.slot)).toEqual([
      "calculator",
      "benefits",
      "data",
      "settings",
    ]);
    const dataSlot = BOTTOM_BAR.find((b) => b.slot === "data");
    expect(dataSlot?.target).toBe("data");
  });
});

describe("navConfig: shouldHideBottomBar", () => {
  it("交換ルート (edges) だけ下部バーを隠す", () => {
    expect(shouldHideBottomBar("edges")).toBe(true);
    expect(shouldHideBottomBar("calculator")).toBe(false);
    expect(shouldHideBottomBar("data")).toBe(false);
  });
});
