// @vitest-environment jsdom
//
// REM-#4: ベスト購入日ヒントチップの UI テスト (jsdom)。判定ロジックは
// domain/bestPurchaseDay.test.ts が担保するので、ここは「渡された BestPurchaseDay を
// 1 行チップとして正しく整形表示するか」と「月跨ぎラベル」に絞る。
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CalcBestDayHint } from "./CalcBestDayHint";
import type { BestPurchaseDay } from "../../domain/bestPurchaseDay";

afterEach(cleanup);

const currencyName = (id: string) =>
  id === "rakuten-pt" ? "楽天ポイント" : id;

function makeBestDay(over: Partial<BestPurchaseDay> = {}): BestPurchaseDay {
  return {
    date: new Date(2026, 6, 25, 12, 0, 0),
    gainAmount: 214,
    topCard: {
      id: "rakuten-card",
      name: "楽天カード",
      defaultRate: 0.01,
      defaultCurrencyId: "rakuten-pt",
    },
    drivingProgramName: "楽天市場「5と0のつく日」+1%",
    ...over,
  };
}

describe("CalcBestDayHint", () => {
  it("日・ゲイン量・通貨名・program 名を 1 行チップに表示する", () => {
    render(
      <CalcBestDayHint
        bestDay={makeBestDay()}
        today={new Date(2026, 6, 21, 12, 0, 0)}
        currencyName={currencyName}
        activeCurrencyId="rakuten-pt"
      />,
    );
    const chip = screen.getByText(/25日に買えば/);
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("+214");
    expect(chip).toHaveTextContent("楽天ポイント");
    expect(chip).toHaveTextContent("5と0のつく日");
  });

  it("変更可能性の注記を title 属性で持つ (小 muted ではなく tooltip)", () => {
    render(
      <CalcBestDayHint
        bestDay={makeBestDay()}
        today={new Date(2026, 6, 21, 12, 0, 0)}
        currencyName={currencyName}
        activeCurrencyId="rakuten-pt"
      />,
    );
    const chip = screen.getByText(/25日に買えば/);
    expect(chip).toHaveAttribute("title", expect.stringContaining("変更される可能性"));
  });
});
