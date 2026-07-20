// @vitest-environment jsdom
//
// UI コンポーネントテストの初弾 (Phase 5)。jsdom は本ファイル先頭の docblock で
// ファイル単位指定 → 既存のドメインテスト (31 ファイル) は従来通り node 環境のまま。
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CalcResultCard } from "./CalcResultCard";
import type { CardRanking } from "../../domain/rankCards";
import type { BenefitProgram, ConversionEdge, Currency } from "../../domain/types";

afterEach(cleanup);

const rakutenPt: Currency = { id: "rakuten-pt", name: "楽天ポイント" };

// CardRanking は必須フィールドが多いので、テスト用の最小妥当オブジェクトを生成する。
function makeRanking(over: Partial<CardRanking> = {}): CardRanking {
  return {
    card: {
      id: "rakuten",
      name: "楽天カード",
      defaultRate: 0.01,
      defaultCurrencyId: "rakuten-pt",
    },
    resolved: {
      rate: 0.05,
      currencyId: "rakuten-pt",
      source: "program",
      programId: "prog-cap",
    },
    earnedAmount: 2000,
    earnedCurrencyId: "rakuten-pt",
    pathSteps: [],
    pathProduct: 1,
    finalAmount: 2000,
    reachable: true,
    unreachableReason: null,
    paymentApp: null,
    appBonusRate: 0,
    appBonusFinalAmount: 0,
    appBonusEarnedAmount: 0,
    appBonusCurrencyId: null,
    appBonusReachable: false,
    appBonusBreakdown: [],
    loyalties: [],
    totalFinalAmount: 2000,
    minUnitAnnotations: [],
    ...over,
  };
}

// expanded は各テストで明示する (aria-expanded / 上限バッジ表示の検証で値が重要)。
// now は stale 判定 (REM-#2) の基準日。既定 fixture の pathSteps は空 or lastVerifiedAt
// 未記入なので、この日付では stale チップは出ない (stale テストは pathSteps を明示的に渡す)。
const baseProps = {
  displayRank: 1,
  onToggle: () => {},
  activeCurrencyId: "rakuten-pt",
  currencyById: new Map<string, Currency>([["rakuten-pt", rakutenPt]]),
  currencyName: (id: string) => (id === "rakuten-pt" ? "楽天ポイント" : id),
  cardName: (id: string) => id,
  now: new Date("2026-07-20T09:00:00+09:00"),
};

describe("CalcResultCard", () => {
  it("展開時、上限付き program の警告バッジを表示する (A1 連動)", () => {
    const capProgram: BenefitProgram = {
      id: "prog-cap",
      name: "上限付き高還元",
      scope: "member-stores",
      rate: 0.05,
      currencyId: "rakuten-pt",
      monthlyCapAmountYen: 40000,
    };
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map([["prog-cap", capProgram]])}
        expanded
        {...baseProps}
      />,
    );
    // 数値整形のロケール差を避け、安定部分だけ検証
    expect(screen.getByText(/上限.*円\/月/)).toBeInTheDocument();
  });

  it("上限なし program では警告バッジを出さない", () => {
    const program: BenefitProgram = {
      id: "prog-cap",
      name: "通常還元",
      scope: "member-stores",
      rate: 0.05,
      currencyId: "rakuten-pt",
    };
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map([["prog-cap", program]])}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.queryByText(/上限.*円\/月/)).not.toBeInTheDocument();
  });

  it("rank #1 とカード名を表示する", () => {
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("楽天カード")).toBeInTheDocument();
  });

  it("到達不能なカードは「対象外」を表示する", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ reachable: false })}
        programById={new Map()}
        expanded={false}
        {...baseProps}
      />,
    );
    expect(screen.getByText("対象外")).toBeInTheDocument();
  });

  it("UX-3: #1 行は 2位が存在する時「2位より +N」を表示する", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ totalFinalAmount: 2000 })}
        programById={new Map()}
        expanded={false}
        {...baseProps}
        displayRank={1}
        topTotal={2000}
        secondBestTotal={1788}
      />,
    );
    // 2000 - 1788 = 212
    expect(screen.getByText(/2位より \+212/)).toBeInTheDocument();
  });

  it("UX-3: 2位が無い (全同率1位) 時は #1 に差額を出さない", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ totalFinalAmount: 2000 })}
        programById={new Map()}
        expanded={false}
        {...baseProps}
        displayRank={1}
        topTotal={2000}
        secondBestTotal={undefined}
      />,
    );
    expect(screen.queryByText(/2位より/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1位比/)).not.toBeInTheDocument();
  });

  it("UX-3: 2位以下の行は「(1位比 −N)」を表示する", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ totalFinalAmount: 1877 })}
        programById={new Map()}
        expanded={false}
        {...baseProps}
        displayRank={2}
        topTotal={2000}
        secondBestTotal={1877}
      />,
    );
    // 2000 - 1877 = 123、全角マイナス (−) を含む
    expect(screen.getByText(/1位比 −123/)).toBeInTheDocument();
  });

  it("UX-3: 同率1位 (displayRank=1) は「2位より」を出す (「1位比」は出さない)", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ totalFinalAmount: 2000 })}
        programById={new Map()}
        expanded={false}
        {...baseProps}
        displayRank={1}
        topTotal={2000}
        secondBestTotal={1500}
      />,
    );
    expect(screen.getByText(/2位より \+500/)).toBeInTheDocument();
    expect(screen.queryByText(/1位比/)).not.toBeInTheDocument();
  });

  it("UX-3: 展開時に積み上げサマリ chip を表示する (基本 + 上乗せ = 合計)", () => {
    const ranking = makeRanking({
      resolved: {
        rate: 0.005,
        currencyId: "rakuten-pt",
        source: "default",
      },
      appBonusBreakdown: [
        {
          programId: "prog-touch",
          programName: "タッチ決済",
          rate: 0.065,
          earnedAmount: 32.5,
          earnedCurrencyId: "rakuten-pt",
          finalAmount: 32.5,
          pathSteps: [],
        },
      ],
    });
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.getByText("基本 0.5%")).toBeInTheDocument();
    expect(screen.getByText("タッチ決済 +6.5%")).toBeInTheDocument();
    // 0.5% + 6.5% = 7%
    expect(screen.getByText("= 7%")).toBeInTheDocument();
  });

  it("DB-8: minUnitAnnotation がある時「貯めてから交換」chip を展開ビューに表示する", () => {
    const ranking = makeRanking({
      minUnitAnnotations: [
        {
          edgeId: "epos-to-jal",
          fromCurrencyId: "epos",
          minFromUnits: 500,
          amountAtEdge: 2.5,
        },
      ],
    });
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map()}
        expanded
        {...baseProps}
        currencyName={(id: string) =>
          id === "epos" ? "エポスポイント" : id
        }
      />,
    );
    expect(
      screen.getByText(/エポスポイント は 500 貯めてから交換 \(最低交換単位\)/),
    ).toBeInTheDocument();
  });

  it("DB-8: 折り畳み (非展開) 時は「貯めてから交換」chip を出さない", () => {
    const ranking = makeRanking({
      minUnitAnnotations: [
        {
          edgeId: "epos-to-jal",
          fromCurrencyId: "epos",
          minFromUnits: 500,
          amountAtEdge: 2.5,
        },
      ],
    });
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map()}
        expanded={false}
        {...baseProps}
      />,
    );
    expect(screen.queryByText(/貯めてから交換/)).not.toBeInTheDocument();
  });

  // REM-#2: 交換ルートの鮮度 (stale) 警告チップ。基準日 now は baseProps = 2026-07-20。
  const edgeStep = (over: Partial<ConversionEdge>): ConversionEdge => ({
    id: "step",
    fromCurrencyId: "epos",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    ...over,
  });

  it("REM-#2: 経由 edge の最終確認が6ヶ月超なら展開ビューに「ルート要確認」を出す", () => {
    const ranking = makeRanking({
      // 2025-12 は基準日 2026-07 から 7ヶ月前 = stale
      pathSteps: [edgeStep({ id: "epos-to-jal", lastVerifiedAt: "2025-12" })],
    });
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(
      screen.getByText(/ルート要確認 \(最終確認 2025-12\)/),
    ).toBeInTheDocument();
  });

  it("REM-#2: 最終確認がちょうど6ヶ月 (境界) なら警告を出さない", () => {
    const ranking = makeRanking({
      // 2026-01 は基準日 2026-07 からちょうど6ヶ月 = stale でない
      pathSteps: [edgeStep({ id: "epos-to-jal", lastVerifiedAt: "2026-01" })],
    });
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.queryByText(/ルート要確認/)).not.toBeInTheDocument();
  });

  it("REM-#2: lastVerifiedAt 未記入の edge のみの経路では警告を出さない (未検証は古い扱いしない)", () => {
    const ranking = makeRanking({
      pathSteps: [edgeStep({ id: "epos-to-jal" })], // lastVerifiedAt なし
    });
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.queryByText(/ルート要確認/)).not.toBeInTheDocument();
  });

  it("REM-#2: 折り畳み (非展開) 時は stale 警告を出さない", () => {
    const ranking = makeRanking({
      pathSteps: [edgeStep({ id: "epos-to-jal", lastVerifiedAt: "2025-12" })],
    });
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map()}
        expanded={false}
        {...baseProps}
      />,
    );
    expect(screen.queryByText(/ルート要確認/)).not.toBeInTheDocument();
  });

  it("UX-7: no-path の対象外カードは折り畳みで「ルート未登録」バッジを出す", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ reachable: false, unreachableReason: "no-path" })}
        programById={new Map()}
        expanded={false}
        {...baseProps}
      />,
    );
    expect(screen.getByText("ルート未登録")).toBeInTheDocument();
  });

  it("UX-7: currency-blocked の対象外カードは「通貨OFF」バッジを出す", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({
          reachable: false,
          unreachableReason: "currency-blocked",
        })}
        programById={new Map()}
        expanded={false}
        {...baseProps}
      />,
    );
    expect(screen.getByText("通貨OFF")).toBeInTheDocument();
  });

  it("UX-7: no-path 展開時は「交換ルートを見る →」CTA を出す", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ reachable: false, unreachableReason: "no-path" })}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(
      screen.getByRole("button", { name: /交換ルートを見る/ }),
    ).toBeInTheDocument();
  });

  it("UX-7: currency-blocked 展開時は「ウォレットで確認 →」CTA を出す", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({
          reachable: false,
          unreachableReason: "currency-blocked",
        })}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(
      screen.getByRole("button", { name: /ウォレットで確認/ }),
    ).toBeInTheDocument();
  });

  it("UX-7: reachable なカードは理由バッジ/CTA を出さない", () => {
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.queryByText("ルート未登録")).not.toBeInTheDocument();
    expect(screen.queryByText("通貨OFF")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /交換ルートを見る/ }),
    ).not.toBeInTheDocument();
  });

  it("PR-2: onExcludePayment + paymentApp があると展開時に除外ボタンを出し、押すと paymentAppId で呼ぶ", () => {
    const onExclude = vi.fn();
    render(
      <CalcResultCard
        ranking={makeRanking({ paymentApp: { id: "pa-dbarai", name: "d払い" } })}
        programById={new Map()}
        expanded
        {...baseProps}
        onExcludePayment={onExclude}
      />,
    );
    const btn = screen.getByRole("button", {
      name: /この決済（d払い）は使えなかった/,
    });
    fireEvent.click(btn);
    expect(onExclude).toHaveBeenCalledWith("pa-dbarai");
  });

  it("PR-2: onExcludePayment 未指定 (店舗未選択) なら除外ボタンを出さない", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ paymentApp: { id: "pa-dbarai", name: "d払い" } })}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.queryByText(/使えなかった/)).not.toBeInTheDocument();
  });

  it("PR-2: paymentApp が無い結果では除外ボタンを出さない", () => {
    render(
      <CalcResultCard
        ranking={makeRanking()} // paymentApp: null
        programById={new Map()}
        expanded
        {...baseProps}
        onExcludePayment={() => {}}
      />,
    );
    expect(screen.queryByText(/使えなかった/)).not.toBeInTheDocument();
  });

  it("PR-2: 折り畳み (非展開) 時は除外ボタンを出さない", () => {
    render(
      <CalcResultCard
        ranking={makeRanking({ paymentApp: { id: "pa-dbarai", name: "d払い" } })}
        programById={new Map()}
        expanded={false}
        {...baseProps}
        onExcludePayment={() => {}}
      />,
    );
    expect(screen.queryByText(/使えなかった/)).not.toBeInTheDocument();
  });

  it("展開状態を header の aria-expanded に反映する (A11y)", () => {
    const { rerender } = render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map()}
        expanded
        {...baseProps}
      />,
    );
    expect(
      screen.getByRole("button", { name: /楽天カード/ }),
    ).toHaveAttribute("aria-expanded", "true");

    rerender(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map()}
        expanded={false}
        {...baseProps}
      />,
    );
    expect(
      screen.getByRole("button", { name: /楽天カード/ }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
