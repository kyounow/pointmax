// @vitest-environment jsdom
//
// PR-2e: データハブ画面 (#data) の件数バッジ表示テスト。
//   - ウォレット = カード + ポイントカード + 支払方法 の合計
//   - 交換ルート / 通貨 / 店舗 はそれぞれの配列長
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DataHubScreen } from "./DataHubScreen";
import { useStore } from "../state/store";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  window.location.hash = "";
});
afterEach(cleanup);

// カード名からハブカード (button) を取得するヘルパ。
function hubCard(name: string): HTMLElement {
  return screen.getByRole("button", { name: new RegExp(name) });
}

describe("DataHubScreen 件数バッジ", () => {
  it("データ 0 件のときは全カードが 0 件", () => {
    render(<DataHubScreen />);
    for (const label of ["ウォレット", "交換ルート", "通貨", "店舗"]) {
      expect(within(hubCard(label)).getByText("0")).toBeInTheDocument();
    }
  });

  it("ウォレット件数はカード + ポイントカード + 支払方法の合計", () => {
    useStore.setState({
      cards: [
        { id: "c1", name: "A", defaultRate: 0.01, defaultCurrencyId: "pt" },
        { id: "c2", name: "B", defaultRate: 0.01, defaultCurrencyId: "pt" },
      ],
      pointCards: [{ id: "p1", name: "PC", currencyId: "pt" }],
      paymentApps: [{ id: "a1", name: "App" }],
      edges: [
        {
          id: "e1",
          fromCurrencyId: "pt",
          toCurrencyId: "mile",
          rate: 0.5,
        },
      ],
      currencies: [
        { id: "pt", name: "ポイント" },
        { id: "mile", name: "マイル" },
        { id: "x", name: "X" },
      ],
      stores: [{ id: "s1", name: "店" }],
    });
    render(<DataHubScreen />);

    // 2 cards + 1 pointCard + 1 paymentApp = 4
    expect(within(hubCard("ウォレット")).getByText("4")).toBeInTheDocument();
    expect(within(hubCard("交換ルート")).getByText("1")).toBeInTheDocument();
    expect(within(hubCard("通貨")).getByText("3")).toBeInTheDocument();
    expect(within(hubCard("店舗")).getByText("1")).toBeInTheDocument();
  });
});
