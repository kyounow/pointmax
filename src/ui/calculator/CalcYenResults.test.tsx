// @vitest-environment jsdom
//
// PR-6b: 円換算 (目安) ビューの警告チップ。優先通貨が未設定の人の既定ビューになったため、
// 通常ビューの展開ビューと同じ警告 (buildWarningPlan = rankWarningChips の出力、最大 3 件) を
// 各行の result-meta に出す。seed 実データ (JCB W × J-POINT 20倍店) と fixture の両方で固定する。
// ⚠ cron の Safety check でも走るので、seed 実データ側は「20倍が採用されている」ことを前提に
// チップの有無だけを見る (率の厳密値は assert しない。CalcResultCard.test の seed 節と同じ規約)。
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CalcYenResults } from "./CalcYenResults";
import {
  collectAdoptedProgramIds,
  rankCards,
  type CardRanking,
} from "../../domain/rankCards";
import type { BenefitProgram } from "../../domain/types";
import { seed } from "../../state/seed";
import { byId } from "../../domain/entityIndex";
import { membershipId } from "../../state/defineMemberships";
import { YEN_TARGET_ID, makeYenValueResolver } from "../../domain/yenValue";
import { LOCAL_FRESHNESS } from "../../domain/edgeFreshness";

afterEach(cleanup);

const S = seed();
const NOW = new Date("2026-09-28T12:00:00+09:00");
const TWENTY_X = "prog-jcb-jpoint-20x";
const currencyById = byId(S.currencies);
const currencyName = (id: string) => currencyById.get(id)?.name ?? id;
const seedProgramById = byId(S.programs);
const seedMembershipById = byId(S.memberships);

// 円換算モード (仮想ターゲット) で rankCards を回し、保有カードの結果だけを返す (CalculatorScreen と同じ)。
function yenRankings(storeId: string, enabledCardIds: string[] = ["jcb-w"]) {
  const cards = S.cards.map((c) =>
    enabledCardIds.includes(c.id) ? { ...c, enabled: true } : c,
  );
  return rankCards(
    {
      payment: { storeId, amount: 1000 },
      targetCurrencyId: YEN_TARGET_ID,
      cards,
      stores: S.stores,
      edges: S.edges,
      pointCards: S.pointCards,
      paymentApps: S.paymentApps,
      programs: S.programs,
      memberships: S.memberships,
      now: NOW,
    },
    { includeDisabled: true },
  ).rankings.filter((r) => r.card.enabled === true);
}

function renderSeedYen(storeId: string, enabledCardIds?: string[]) {
  const rankings = yenRankings(storeId, enabledCardIds);
  const utils = render(
    <CalcYenResults
      rankings={rankings}
      currencyName={currencyName}
      yenValueOf={makeYenValueResolver(currencyById)}
      programById={seedProgramById}
      membershipOf={(pid) => seedMembershipById.get(membershipId(pid, storeId))}
      now={NOW}
    />,
  );
  return { ...utils, rankings };
}

const rowOf = (container: HTMLElement, cardName: string) => {
  const row = Array.from(container.querySelectorAll(".result-card")).find((el) =>
    el.querySelector("strong")?.textContent?.includes(cardName),
  );
  if (!row) throw new Error(`${cardName} の行が無い`);
  return row as HTMLElement;
};

describe("CalcYenResults — seed 実データの J-POINT 20倍 (PR-6b)", () => {
  it("jcb-w × すき家: 円換算ビューでも『⚠ 要エントリー』(リンク) +『対象外あり』が出る", () => {
    const { container, rankings } = renderSeedYen("sukiya");
    expect(rankings[0].adoptedProgramIds).toContain(TWENTY_X);
    const row = within(rowOf(container, "JCB CARD W"));
    const entry = row.getByRole("link", { name: "⚠ 要エントリー" });
    expect(entry).toHaveAttribute("target", "_blank");
    expect(row.getByText("対象外あり")).toBeInTheDocument();
    expect(row.queryByText("限定条件")).not.toBeInTheDocument();
    // conditions / membership.notes 由来のチップには詳細ボタンを付けない (M3)
    expect(row.queryByRole("button", { name: "詳細" })).not.toBeInTheDocument();
  });

  it("jcb-w × 吉野家: 『⚠ 要エントリー』のみ (条件チップなし)", () => {
    const { container, rankings } = renderSeedYen("yoshinoya");
    expect(rankings[0].adoptedProgramIds).toContain(TWENTY_X);
    const row = rowOf(container, "JCB CARD W");
    expect(within(row).getByText("⚠ 要エントリー")).toBeInTheDocument();
    expect(row.querySelectorAll(".note-chip")).toHaveLength(0);
  });

  it("jcb-w × 一般店舗: 採用 program が無ければ警告は出ない", () => {
    const { container } = renderSeedYen("general");
    const row = rowOf(container, "JCB CARD W");
    expect(row.querySelector(".entry-warn")).toBeNull();
    expect(row.querySelectorAll(".note-chip")).toHaveLength(0);
  });

  it("説明の hint は 1 行 (1 段落) だけ", () => {
    const { container } = renderSeedYen("general");
    const hints = container.querySelectorAll(".results-yen > p.hint");
    expect(hints).toHaveLength(1);
    expect(hints[0]).toHaveTextContent("交換ルートを使わず");
  });
});

// ─── fixture: 警告予算・期間バッジ・stale の到達可否 ───

function makeRanking(over: Partial<CardRanking> = {}): CardRanking {
  const base: Omit<CardRanking, "adoptedProgramIds"> = {
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
      programId: "prog-x",
    },
    earnedAmount: 50,
    earnedCurrencyId: "rakuten-pt",
    pathSteps: [],
    pathProduct: 0,
    finalAmount: 0,
    // 円換算モードでは rankCards 上は全カードが path 到達不能 (仮想ターゲット)
    reachable: false,
    unreachableReason: "no-path",
    paymentApp: null,
    appBonusRate: 0,
    appBonusFinalAmount: 0,
    appBonusEarnedAmount: 0,
    appBonusCurrencyId: null,
    appBonusReachable: false,
    appBonusBreakdown: [],
    loyalties: [],
    totalFinalAmount: 0,
    minUnitAnnotations: [],
    ...over,
  };
  return {
    ...base,
    adoptedProgramIds: over.adoptedProgramIds ?? collectAdoptedProgramIds(base),
  };
}

const prog = (over: Partial<BenefitProgram> = {}): BenefitProgram => ({
  id: "prog-x",
  name: "提携店特典",
  scope: "member-stores",
  rate: 0.05,
  currencyId: "rakuten-pt",
  ...over,
});

function renderFixture(
  program: BenefitProgram,
  yenValueOf: (id: string) => number | undefined = () => 1,
) {
  return render(
    <CalcYenResults
      rankings={[makeRanking()]}
      currencyName={(id) => (id === "rakuten-pt" ? "楽天ポイント" : id)}
      yenValueOf={yenValueOf}
      programById={new Map([[program.id, program]])}
      now={NOW}
      freshness={LOCAL_FRESHNESS}
    />,
  );
}

describe("CalcYenResults — 警告予算 (rankWarningChips、最大 3 件)", () => {
  it("要エントリー + 上限 + 条件チップ 2 種 + stale が立っても上位 3 件だけ出す", () => {
    const { container } = renderFixture(
      prog({
        requiresEntry: true,
        monthlyCapAmountYen: 40000,
        conditions: "一部店舗は対象外。加盟店限定。",
        lastVerifiedAt: "2025-01",
      }),
    );
    // entry (最優先) > cap > 対象外 (限定と同順位で抽出順が先)。限定条件・stale は予算外。
    expect(screen.getByText("⚠ 要エントリー")).toBeInTheDocument();
    expect(screen.getByText(/上限.*円\/月/)).toBeInTheDocument();
    expect(screen.getByText("対象外あり")).toBeInTheDocument();
    expect(screen.queryByText("限定条件")).not.toBeInTheDocument();
    expect(screen.queryByText(/古い情報かも/)).not.toBeInTheDocument();
    const warnings = container.querySelectorAll(
      ".result-meta .entry-warn, .result-meta .cap-warn, .result-meta .note-chip, .result-meta .route-stale-chip, .result-meta .minunit-chip",
    );
    expect(warnings).toHaveLength(3);
  });

  it("stale は円評価で比較できる行に出す (rankCards の reachable=false でも)", () => {
    renderFixture(prog({ lastVerifiedAt: "2025-01" }));
    const chip = screen.getByText("⚠ 古い情報かも (最終確認 2025-01)");
    expect(chip.getAttribute("title")).toContain("・還元率 提携店特典 (2025-01)");
  });

  it("目安値未設定 (円で比較できない) の行には stale を出さない", () => {
    renderFixture(prog({ lastVerifiedAt: "2025-01" }), () => undefined);
    expect(screen.getByText("目安値未設定")).toBeInTheDocument();
    expect(screen.queryByText(/古い情報かも/)).not.toBeInTheDocument();
  });

  it("採用 program の期間バッジ (RuleStatusBadge) を出す", () => {
    renderFixture(prog({ validFrom: "2026-01-01", validTo: "2026-12-31" }));
    expect(screen.getByText(/キャンペーン中 \(〜2026-12-31\)/)).toBeInTheDocument();
  });

  it("entryUrl が無い要エントリーはリンクにしない", () => {
    renderFixture(prog({ requiresEntry: true }));
    expect(screen.getByText("⚠ 要エントリー")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
