// @vitest-environment jsdom
//
// PR-3a (UX-1): 店頭クイック入力 (直近店舗チップ + 金額プリセット) のテスト。
// CalcStoreForm は controlled component なので、state を保持する薄い harness で包んで
// チップ操作が storeId / amount を更新することを検証する。
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CalcStoreForm } from "./CalcStoreForm";
import type { Currency, Store } from "../../domain/types";

const stores: Store[] = [
  { id: "seven", name: "セブンイレブン", category: "コンビニ" },
  { id: "lawson", name: "ローソン", category: "コンビニ" },
  { id: "general", name: "一般店舗", category: "その他" },
];
const currencies: Currency[] = [
  { id: "rakuten-pt", name: "楽天ポイント", kind: "point" },
];

// storeId / amount を実際に保持して active 表示を検証できる harness。
function Harness({ recentStoreIds }: { recentStoreIds: string[] }) {
  const [storeId, setStoreId] = useState("general");
  const [amount, setAmount] = useState("10000");
  const [storeSearch, setStoreSearch] = useState("");
  const [storeCategory, setStoreCategory] = useState("");
  const [activeCurrencyId, setActiveCurrencyId] = useState("rakuten-pt");
  return (
    <CalcStoreForm
      stores={stores}
      currencies={currencies}
      storeId={storeId}
      setStoreId={setStoreId}
      storeSearch={storeSearch}
      setStoreSearch={setStoreSearch}
      storeCategory={storeCategory}
      setStoreCategory={setStoreCategory}
      amount={amount}
      setAmount={setAmount}
      activeCurrencyId={activeCurrencyId}
      setActiveCurrencyId={setActiveCurrencyId}
      showCurrencyFallback={false}
      recentStoreIds={recentStoreIds}
    />
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("CalcStoreForm 直近店舗チップ", () => {
  it("recentStoreIds を新しい順のチップとして描画し、存在しない id は除外する", () => {
    render(<Harness recentStoreIds={["lawson", "ghost", "seven"]} />);
    const group = screen.getByRole("group", { name: "直近の店舗" });
    const chips = group.querySelectorAll(".quick-chip");
    // "ghost" は stores に無いので除外され 2 件
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent("ローソン");
    expect(chips[1]).toHaveTextContent("セブンイレブン");
  });

  it("チップ click で店舗が選択され active 表示になる", () => {
    render(<Harness recentStoreIds={["seven", "lawson"]} />);
    const chip = screen.getByRole("button", { name: "セブンイレブン" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    // storeId が seven になり aria-pressed / is-active が反映される
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip.className).toContain("is-active");
  });

  it("recentStoreIds が空なら直近店舗チップ群を描画しない", () => {
    render(<Harness recentStoreIds={[]} />);
    expect(
      screen.queryByRole("group", { name: "直近の店舗" }),
    ).not.toBeInTheDocument();
  });
});

describe("CalcStoreForm 金額プリセットチップ", () => {
  it("プリセット 500/1,000/3,000/5,000/10,000 を描画する", () => {
    const { container } = render(<Harness recentStoreIds={[]} />);
    for (const v of [500, 1000, 3000, 5000, 10000]) {
      expect(
        container.querySelector(`[data-amount="${v}"]`),
      ).not.toBeNull();
    }
  });

  it("プリセット click で金額 input が即設定される", () => {
    const { container } = render(<Harness recentStoreIds={[]} />);
    const amountInput = container.querySelector(
      'input[inputmode="numeric"]',
    ) as HTMLInputElement;
    expect(amountInput.value).toBe("10000"); // 初期

    fireEvent.click(container.querySelector('[data-amount="500"]')!);
    expect(amountInput.value).toBe("500");

    const preset3000 = container.querySelector(
      '[data-amount="3000"]',
    ) as HTMLButtonElement;
    fireEvent.click(preset3000);
    expect(amountInput.value).toBe("3000");
    // 選択中プリセットは active 表示
    expect(preset3000).toHaveAttribute("aria-pressed", "true");
  });
});
