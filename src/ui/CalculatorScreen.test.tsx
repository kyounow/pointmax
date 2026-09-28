// @vitest-environment jsdom
//
// PR-6a-1 (G19): 計算画面マウント時の既定通貨タブと同率 1 位の自動展開の回帰テスト。
//   v6.2.0 (decb694) で useEffect を render 中 guard に置換した際、マウント時の
//   「優先通貨の先頭を既定にする」と「#1 を展開する」が失われていた。
//   - 既定タブ = 同日の下書き ?? 優先通貨の先頭 ?? ¥ 円換算 (resolveInitialCurrencyId、PR-6b)
//   - prevResult の初期値 null → マウント時にも展開ガードが走る
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CalculatorScreen } from "./CalculatorScreen";
import { useStore } from "../state/store";
import { seed, SEED_VERSION } from "../state/seed";
import { saveCalcFormDraft, localDateKey } from "../state/calcFormDraft";
import {
  clearUsageStats,
  getRecentStoreIds,
  getUsageStats,
} from "../state/usageStats";
import { YEN_TARGET_ID } from "../domain/yenValue";

// seed() の state に「保有カード (enabled:true)」と優先通貨を載せる。
// 既定は jcb-w (J-POINT が貯まる) だけ保有。
function setupState({
  preferredCurrencyIds = ["j-point", "epos"],
  enabledCardIds = ["jcb-w"],
}: { preferredCurrencyIds?: string[]; enabledCardIds?: string[] } = {}) {
  const s = seed();
  useStore.setState({
    ...s,
    cards: s.cards.map((c) =>
      enabledCardIds.includes(c.id) ? { ...c, enabled: true } : c,
    ),
    preferredCurrencyIds,
    lastSeedVersion: SEED_VERSION,
    autoApplyNotice: null,
  });
}

const currencyTab = (name: string) =>
  within(screen.getByRole("group", { name: "目標通貨" })).getByRole("button", {
    name,
  });

const expandedCards = (container: HTMLElement) =>
  container.querySelectorAll(".result-card.expanded");

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
});
afterEach(cleanup);

describe("CalculatorScreen 起動時の既定通貨タブ + #1 自動展開 (PR-6a-1 / G19)", () => {
  it("(a) 下書き無しでマウントすると優先通貨の先頭タブが選ばれ、#1 が展開される", () => {
    setupState();
    const { container } = render(<CalculatorScreen />);

    expect(currencyTab("J-POINT")).toHaveAttribute("aria-current", "true");
    expect(currencyTab("エポスポイント")).not.toHaveAttribute("aria-current");
    expect(expandedCards(container)).toHaveLength(1);
    expect(screen.getByText("1件中 1件展開")).toBeInTheDocument();
  });

  it("(b) 同日の下書きがあればその通貨タブで起動し、#1 が展開される", () => {
    // J-POINT → エポスポイントの交換ルートは無いので、エポスカードも保有にして
    // エポスポイントタブに到達可能な #1 を作る (jcb-w は対象外表示)。
    setupState({ enabledCardIds: ["jcb-w", "epos-card"] });
    saveCalcFormDraft({
      date: localDateKey(new Date()),
      amount: "3000",
      activeCurrencyId: "epos",
      storeId: "general",
    });
    const { container } = render(<CalculatorScreen />);

    expect(currencyTab("エポスポイント")).toHaveAttribute("aria-current", "true");
    expect(currencyTab("J-POINT")).not.toHaveAttribute("aria-current");
    const expanded = expandedCards(container);
    expect(expanded).toHaveLength(1);
    expect(expanded[0]).toHaveTextContent("エポスカード");
    expect(expanded[0]).toHaveTextContent("#1");
    expect(screen.getByText("2件中 1件展開")).toBeInTheDocument();
    // 金額も同日の下書きから復元されている
    expect(
      container.querySelector('input[inputmode="numeric"]'),
    ).toHaveValue("3000");
  });

  it("(c) 優先通貨が未設定なら通貨タブは無く、既定は ¥ 円換算ビュー (PR-6b)", () => {
    setupState({ preferredCurrencyIds: [] });
    const { container } = render(<CalculatorScreen />);

    expect(screen.queryByRole("group", { name: "目標通貨" })).toBeNull();
    expect(screen.getByLabelText(/目標通貨/)).toHaveValue(YEN_TARGET_ID);
    expect(container.querySelectorAll(".results-yen .result-card")).toHaveLength(1);
    expect(
      screen.queryByText("店舗・金額・目標通貨を選択すると結果が表示されます。"),
    ).toBeNull();
  });

  it("(d) マウント後に #1 を手で畳んでも、金額チップで入力が変われば再び展開される", () => {
    setupState();
    const { container } = render(<CalculatorScreen />);
    expect(expandedCards(container)).toHaveLength(1);

    fireEvent.click(container.querySelector(".result-card .result-head")!);
    expect(expandedCards(container)).toHaveLength(0);
    expect(screen.getByText("1件中 0件展開")).toBeInTheDocument();

    fireEvent.click(container.querySelector('[data-amount="3000"]')!);
    expect(expandedCards(container)).toHaveLength(1);
    expect(screen.getByText("1件中 1件展開")).toBeInTheDocument();
  });
});

// PR-6b: 優先通貨が未設定の人の既定 = 円換算ビュー。警告チップと直近店舗の記録が通常ビューと揃う。
describe("CalculatorScreen 円換算ビュー (PR-6b)", () => {
  it("同日の下書きの店 (すき家) で起動すると、既定の円換算ビューに JCB W の『⚠ 要エントリー』+『対象外あり』が出る", () => {
    setupState({ preferredCurrencyIds: [] });
    saveCalcFormDraft({
      date: localDateKey(new Date()),
      amount: "1000",
      activeCurrencyId: null,
      storeId: "sukiya",
    });
    const { container } = render(<CalculatorScreen />);

    const yen = container.querySelector(".results-yen") as HTMLElement;
    expect(yen).not.toBeNull();
    expect(within(yen).getByText("⚠ 要エントリー")).toBeInTheDocument();
    expect(within(yen).getByText("対象外あり")).toBeInTheDocument();
  });

  it("円換算ビューでも計算イベント (直近店舗チップの元) を記録し、同じ店 × 通貨の再計算は 1 件にまとまる", () => {
    clearUsageStats();
    setupState({ preferredCurrencyIds: [] });
    const { container } = render(<CalculatorScreen />);

    expect(getUsageStats().calcEvents).toEqual([
      expect.objectContaining({ s: "general", c: YEN_TARGET_ID }),
    ]);
    expect(getRecentStoreIds()).toEqual(["general"]);

    // 金額だけ変えた再計算は last-pair ガードで記録しない
    fireEvent.click(container.querySelector('[data-amount="3000"]')!);
    expect(getUsageStats().calcEvents).toHaveLength(1);
  });

  it("優先通貨タブの ¥ 円換算に切り替えても記録する", () => {
    clearUsageStats();
    setupState();
    render(<CalculatorScreen />);
    fireEvent.click(currencyTab("¥ 円換算"));

    expect(getUsageStats().calcEvents.map((e) => e.c)).toEqual([
      "j-point",
      YEN_TARGET_ID,
    ]);
  });
});
