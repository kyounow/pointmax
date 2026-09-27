// @vitest-environment jsdom
//
// UI コンポーネントテストの初弾 (Phase 5)。jsdom は本ファイル先頭の docblock で
// ファイル単位指定 → 既存のドメインテスト (31 ファイル) は従来通り node 環境のまま。
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CalcResultCard } from "./CalcResultCard";
import type { CardRanking } from "../../domain/rankCards";
import type {
  BenefitProgram,
  ConversionEdge,
  Currency,
  PurchaseChannel,
} from "../../domain/types";
import { seed } from "../../state/seed";
import { membershipId } from "../../state/defineMemberships";
import { evaluatePrograms } from "../../domain/programEvaluator";

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

  it("REM-#2: 経由 edge の最終確認が12ヶ月超なら展開ビューに「ルート要確認」を出す", () => {
    const ranking = makeRanking({
      // 2025-06 は基準日 2026-07 から 13ヶ月前 = stale (PR-5a で閾値 6→12ヶ月)
      pathSteps: [edgeStep({ id: "epos-to-jal", lastVerifiedAt: "2025-06" })],
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
      screen.getByText(/ルート要確認 \(最終確認 2025-06\)/),
    ).toBeInTheDocument();
  });

  it("REM-#2: 最終確認がちょうど12ヶ月 (境界) なら警告を出さない", () => {
    const ranking = makeRanking({
      // 2025-07 は基準日 2026-07 からちょうど12ヶ月 = stale でない
      pathSteps: [edgeStep({ id: "epos-to-jal", lastVerifiedAt: "2025-07" })],
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
      pathSteps: [edgeStep({ id: "epos-to-jal", lastVerifiedAt: "2025-06" })],
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

  // REM-#5: 要エントリー バッジ (採用 program の requiresEntry を展開ビューに表示 +
  // entryUrl タップ起動)。makeRanking の既定 resolved は source:"program"/programId:"prog-cap"。
  const RAKUTEN_ENTRY_URL = "https://event.rakuten.co.jp/card/pointday/";

  it("REM-#5: 採用 primary が requiresEntry + entryUrl なら、タップで別タブ起動するリンクバッジを出す", () => {
    const prog: BenefitProgram = {
      id: "prog-cap",
      name: "楽天5と0",
      scope: "member-stores",
      rate: 0.01,
      currencyId: "rakuten-pt",
      requiresEntry: true,
      entryUrl: RAKUTEN_ENTRY_URL,
    };
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map([["prog-cap", prog]])}
        expanded
        {...baseProps}
      />,
    );
    const link = screen.getByRole("link", { name: /要エントリー/ });
    expect(link).toHaveAttribute("href", RAKUTEN_ENTRY_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("REM-#5: requiresEntry だが entryUrl が無い program はバッジのみ (リンクにしない)", () => {
    const prog: BenefitProgram = {
      id: "prog-cap",
      name: "要エントリー特典",
      scope: "member-stores",
      rate: 0.01,
      currencyId: "rakuten-pt",
      requiresEntry: true,
    };
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map([["prog-cap", prog]])}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.getByText(/要エントリー/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /要エントリー/ }),
    ).not.toBeInTheDocument();
  });

  it("REM-#5: entryUrl が危険スキーム (javascript:) の時は起動リンクにしない (urlSafety 経由)", () => {
    const prog: BenefitProgram = {
      id: "prog-cap",
      name: "要エントリー特典",
      scope: "member-stores",
      rate: 0.01,
      currencyId: "rakuten-pt",
      requiresEntry: true,
      entryUrl: "javascript:alert(1)",
    };
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map([["prog-cap", prog]])}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.getByText(/要エントリー/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /要エントリー/ }),
    ).not.toBeInTheDocument();
  });

  it("REM-#5: addOn (appBonusBreakdown) の program が requiresEntry でもバッジを出す", () => {
    const ranking = makeRanking({
      resolved: { rate: 0.005, currencyId: "rakuten-pt", source: "default" },
      appBonusBreakdown: [
        {
          programId: "prog-addon",
          programName: "楽天5と0",
          rate: 0.01,
          earnedAmount: 10,
          earnedCurrencyId: "rakuten-pt",
          finalAmount: 10,
          pathSteps: [],
        },
      ],
    });
    const prog: BenefitProgram = {
      id: "prog-addon",
      name: "楽天5と0",
      scope: "member-stores",
      rate: 0.01,
      currencyId: "rakuten-pt",
      requiresEntry: true,
      entryUrl: RAKUTEN_ENTRY_URL,
    };
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map([["prog-addon", prog]])}
        expanded
        {...baseProps}
      />,
    );
    expect(
      screen.getByRole("link", { name: /要エントリー/ }),
    ).toBeInTheDocument();
  });

  it("REM-#5: loyalty (二重取り) の program が requiresEntry でもバッジを出す", () => {
    const ranking = makeRanking({
      resolved: { rate: 0.005, currencyId: "rakuten-pt", source: "default" },
      loyalties: [
        {
          pointCard: { id: "pc", name: "提示カード", currencyId: "rakuten-pt" },
          rule: {
            id: "prog-loyalty",
            storeId: "s",
            pointCardId: "pc",
            rate: 0.01,
          },
          earnedAmount: 10,
          earnedCurrencyId: "rakuten-pt",
          pathSteps: [],
          pathProduct: 1,
          finalAmount: 10,
          reachable: true,
        },
      ],
    });
    const prog: BenefitProgram = {
      id: "prog-loyalty",
      name: "要登録の提示特典",
      scope: "member-stores",
      rate: 0.01,
      currencyId: "rakuten-pt",
      requiresEntry: true,
    };
    render(
      <CalcResultCard
        ranking={ranking}
        programById={new Map([["prog-loyalty", prog]])}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.getByText(/要エントリー/)).toBeInTheDocument();
  });

  it("REM-#5: requiresEntry を持つ採用 program が無ければバッジを出さない", () => {
    const prog: BenefitProgram = {
      id: "prog-cap",
      name: "通常還元",
      scope: "member-stores",
      rate: 0.01,
      currencyId: "rakuten-pt",
    };
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map([["prog-cap", prog]])}
        expanded
        {...baseProps}
      />,
    );
    expect(screen.queryByText(/要エントリー/)).not.toBeInTheDocument();
  });

  it("REM-#5: 折り畳み (非展開) 時はバッジを出さない", () => {
    const prog: BenefitProgram = {
      id: "prog-cap",
      name: "楽天5と0",
      scope: "member-stores",
      rate: 0.01,
      currencyId: "rakuten-pt",
      requiresEntry: true,
      entryUrl: RAKUTEN_ENTRY_URL,
    };
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map([["prog-cap", prog]])}
        expanded={false}
        {...baseProps}
      />,
    );
    expect(screen.queryByText(/要エントリー/)).not.toBeInTheDocument();
  });

  // ─── PR-0a-2b (M3): 条件チップの合流 (notes + conditions + membership.notes) と警告予算 ───

  const plainProg: BenefitProgram = {
    id: "prog-cap",
    name: "提携店特典",
    scope: "member-stores",
    rate: 0.05,
    currencyId: "rakuten-pt",
  };

  it("M3: membershipOf の notes『…限定 (…対象外)』が『限定条件』『対象外あり』チップになり、詳細ボタンは出さない", () => {
    const membershipOf = vi.fn((pid: string) =>
      pid === "prog-cap"
        ? {
            id: "m-prog-cap-s",
            programId: "prog-cap",
            storeId: "s",
            notes: "加盟店限定 (一部店舗は対象外)",
          }
        : undefined,
    );
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={new Map([["prog-cap", plainProg]])}
        membershipOf={membershipOf}
        expanded
        {...baseProps}
      />,
    );
    expect(membershipOf).toHaveBeenCalledWith("prog-cap");
    expect(screen.getByText("限定条件")).toBeInTheDocument();
    expect(screen.getByText("対象外あり")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "詳細" })).not.toBeInTheDocument();
  });

  it("M3: membershipOf 未指定・conditions なしなら従来どおり (notes のチップ / チップが無い notes は詳細ボタン)", () => {
    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={
          new Map([["prog-cap", { ...plainProg, notes: "ファミマは対象外" }]])
        }
        expanded
        {...baseProps}
      />,
    );
    expect(screen.getByText("対象外あり")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "詳細" })).not.toBeInTheDocument();
    cleanup();

    render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={
          new Map([
            ["prog-cap", { ...plainProg, notes: "Visaタッチ決済時、200円ごとに1pt" }],
          ])
        }
        expanded
        {...baseProps}
      />,
    );
    expect(screen.queryByText("対象外あり")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "詳細" })).toBeInTheDocument();
  });

  it("M3: conditions からチップが取れない program は何も足さない (詳細ボタンも出さない)", () => {
    const { container } = render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={
          new Map([
            ["prog-cap", { ...plainProg, conditions: "店ごとのポイントアップ登録 (無料) が必須。" }],
          ])
        }
        membershipOf={() => undefined}
        expanded
        {...baseProps}
      />,
    );
    expect(container.querySelectorAll(".note-chip")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "詳細" })).not.toBeInTheDocument();
  });

  it("警告予算 (rankWarningChips): 要エントリー + 上限 + 条件チップ 2 種 + stale が立っても上位 3 件だけ出す", () => {
    const ranking = makeRanking({
      pathSteps: [edgeStep({ id: "epos-to-jal", lastVerifiedAt: "2025-06" })],
    });
    render(
      <CalcResultCard
        ranking={ranking}
        programById={
          new Map([
            [
              "prog-cap",
              {
                ...plainProg,
                requiresEntry: true,
                monthlyCapAmountYen: 40000,
                conditions: "一部店舗は対象外。加盟店限定。",
              },
            ],
          ])
        }
        expanded
        {...baseProps}
      />,
    );
    // entry (最優先) > cap > 対象外 (限定と同順位で抽出順が先)。限定条件・stale は予算外。
    expect(screen.getByText(/要エントリー/)).toBeInTheDocument();
    expect(screen.getByText(/上限.*円\/月/)).toBeInTheDocument();
    expect(screen.getByText("対象外あり")).toBeInTheDocument();
    expect(screen.queryByText("限定条件")).not.toBeInTheDocument();
    expect(screen.queryByText(/ルート要確認/)).not.toBeInTheDocument();
  });

  it("警告予算: notes の『要エントリー』『上限』は専用バッジと二重に出さない", () => {
    const { container } = render(
      <CalcResultCard
        ranking={makeRanking()}
        programById={
          new Map([
            [
              "prog-cap",
              {
                ...plainProg,
                requiresEntry: true,
                monthlyCapAmountYen: 40000,
                notes: "要エントリー、進呈上限 2000pt",
              },
            ],
          ])
        }
        expanded
        {...baseProps}
      />,
    );
    expect(container.querySelectorAll(".entry-warn")).toHaveLength(1);
    expect(container.querySelectorAll(".cap-warn")).toHaveLength(1);
    expect(container.querySelector(".note-chip-entry")).toBeNull();
    expect(container.querySelector(".note-chip-cap")).toBeNull();
  });
});

// PR-0a-2b (M3): seed 実データの J-POINT 20倍 × 店舗の条件チップ。
// ⚠ cron の Safety check でも走るので「その店の候補に 20倍が入る / 入らない」は包含形・否定形で書き、
// 採用率の厳密値は assert しない (channelRegression.test と同じ規約)。結果カードは
// primary = prog-jcb-jpoint-20x を採用した ranking を組み、seed の program / membership で描画する。
describe("CalcResultCard — seed 実データの J-POINT 20倍 条件チップ (PR-0a-2b)", () => {
  const S = seed();
  const NOW = new Date("2026-09-28T12:00:00+09:00");
  const TWENTY_X = "prog-jcb-jpoint-20x";
  const seedProgramById = new Map(S.programs.map((p) => [p.id, p]));
  const seedMembershipById = new Map(S.memberships.map((m) => [m.id, m]));
  const jcbW = S.cards.find((c) => c.id === "jcb-w");

  const candidateIds = (storeId: string, channel?: PurchaseChannel) => {
    const store = S.stores.find((s) => s.id === storeId);
    if (!jcbW || !store) throw new Error(`jcb-w / ${storeId} が seed に無い`);
    return evaluatePrograms({
      card: jcbW,
      store,
      paymentApp: { id: "__direct__", name: "直接決済" },
      programs: S.programs,
      memberships: S.memberships,
      now: NOW,
      channel,
    }).primaryCandidates.map((c) => c.program.id);
  };

  const renderTwentyX = (storeId: string) => {
    if (!jcbW) throw new Error("jcb-w が seed に無い");
    return render(
      <CalcResultCard
        ranking={makeRanking({
          card: { ...jcbW, enabled: true },
          resolved: {
            rate: 0.105,
            currencyId: "j-point",
            source: "program",
            programId: TWENTY_X,
          },
        })}
        programById={seedProgramById}
        membershipOf={(pid) => seedMembershipById.get(membershipId(pid, storeId))}
        expanded
        {...baseProps}
      />,
    );
  };

  it("jcb-w × すき家 (店頭): 要エントリー + QUICPay の『対象外あり』。『限定条件』は出ない", () => {
    expect(candidateIds("sukiya")).toContain(TWENTY_X);
    const { container } = renderTwentyX("sukiya");
    expect(screen.getByText("⚠ 要エントリー")).toBeInTheDocument();
    expect(screen.getByText("対象外あり")).toBeInTheDocument();
    expect(screen.queryByText("限定条件")).not.toBeInTheDocument();
    expect(container.querySelector(".note-chip-channel")).toBeNull();
    expect(screen.queryByRole("button", { name: "詳細" })).not.toBeInTheDocument();
  });

  it("jcb-w × 吉野家 (店頭): 要エントリー のみ (条件チップなし)", () => {
    expect(candidateIds("yoshinoya")).toContain(TWENTY_X);
    const { container } = renderTwentyX("yoshinoya");
    expect(screen.getByText("⚠ 要エントリー")).toBeInTheDocument();
    expect(container.querySelectorAll(".note-chip")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "詳細" })).not.toBeInTheDocument();
  });

  it("jcb-w × スターバックス: 店頭では 20倍が候補に無く、channel:'online' で評価すると 要エントリー + 『モバイルオーダー限定』+ 『対象外あり』", () => {
    // A16: 店頭モードでは 20倍 自体が不採用 = 店頭の結果カードにはこのチップが出ない
    expect(candidateIds("starbucks")).not.toContain(TWENTY_X);
    expect(candidateIds("starbucks", "online")).toContain(TWENTY_X);
    renderTwentyX("starbucks");
    expect(screen.getByText("⚠ 要エントリー")).toBeInTheDocument();
    expect(screen.getByText("モバイルオーダー限定")).toBeInTheDocument();
    expect(screen.getByText("対象外あり")).toBeInTheDocument();
    expect(screen.queryByText("限定条件")).not.toBeInTheDocument();
  });
});
