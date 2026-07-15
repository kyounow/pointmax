// @vitest-environment jsdom
//
// PR-5a: CurrenciesScreen の円換算目安 (yenValue) override 編集の UI テスト。
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CurrenciesScreen } from "./CurrenciesScreen";
import { useStore } from "../state/store";
import type { Currency } from "../domain/types";

const CURRENCIES: Currency[] = [
  { id: "rakuten-pt", name: "楽天ポイント", kind: "point", yenValue: 1 },
  { id: "jal-mile", name: "JALマイル", kind: "mile", yenValue: 1.5 },
  { id: "amex-mr", name: "AMEX MR", kind: "point" }, // yenValue 無し
];

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  useStore.setState({ currencies: CURRENCIES, yenValueOverrides: {} });
});
afterEach(cleanup);

function rowFor(currencyId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    `[data-row-id="${currencyId}"]`,
  );
  if (!el) throw new Error(`row ${currencyId} not found`);
  return el;
}

describe("CurrenciesScreen 円換算目安列", () => {
  it("seed の yenValue を「≈ N 円」で表示する", () => {
    render(<CurrenciesScreen />);
    const row = rowFor("rakuten-pt");
    expect(within(row).getByText(/≈\s*1\s*円/)).toBeInTheDocument();
  });

  it("yenValue 未設定の通貨は — 表示", () => {
    render(<CurrenciesScreen />);
    const row = rowFor("amex-mr");
    // セル内に "—" が出る (円表記は出ない)
    expect(within(row).getByText("—")).toBeInTheDocument();
  });

  it("編集で override を設定すると store に反映され「(自分の値)」が出る", () => {
    render(<CurrenciesScreen />);
    // 楽天ポイント行の編集ボタンを押す
    fireEvent.click(within(rowFor("rakuten-pt")).getByText("編集"));
    const input = within(rowFor("rakuten-pt")).getByLabelText(
      "円換算の目安値 (自分の値)",
    );
    fireEvent.change(input, { target: { value: "2.5" } });

    expect(useStore.getState().yenValueOverrides["rakuten-pt"]).toBe(2.5);

    // 保存して view に戻ると override 値 + 「(自分の値)」が表示される
    fireEvent.click(within(rowFor("rakuten-pt")).getByText("保存"));
    const row = rowFor("rakuten-pt");
    expect(within(row).getByText(/≈\s*2\.5\s*円/)).toBeInTheDocument();
    expect(within(row).getByText("(自分の値)")).toBeInTheDocument();
  });

  it("override を空欄にすると解除され seed 値に戻る", () => {
    // 事前に override をセット
    useStore.getState().setYenValueOverride("rakuten-pt", 3);
    render(<CurrenciesScreen />);
    fireEvent.click(within(rowFor("rakuten-pt")).getByText("編集"));
    const input = within(rowFor("rakuten-pt")).getByLabelText(
      "円換算の目安値 (自分の値)",
    );
    // 空欄にする → 上書き解除
    fireEvent.change(input, { target: { value: "" } });
    expect(useStore.getState().yenValueOverrides["rakuten-pt"]).toBeUndefined();
  });

  it("yenValue 未設定の通貨にも override を付けられる", () => {
    render(<CurrenciesScreen />);
    fireEvent.click(within(rowFor("amex-mr")).getByText("編集"));
    const input = within(rowFor("amex-mr")).getByLabelText(
      "円換算の目安値 (自分の値)",
    );
    fireEvent.change(input, { target: { value: "0.8" } });
    expect(useStore.getState().yenValueOverrides["amex-mr"]).toBe(0.8);
  });
});
