import { describe, it, expect } from "vitest";
import {
  buildWarningPlan,
  rankWarningChips,
  WARNING_CHIP_BUDGET,
  WARNING_CHIP_PRIORITY,
  type WarningChipKind,
} from "./warningChips";
import { collectAdoptedProgramIds, type CardRanking } from "./rankCards";
import type { BenefitProgram } from "./types";
import { LOCAL_FRESHNESS } from "./edgeFreshness";

const kinds = (xs: { kind: WarningChipKind }[]) => xs.map((x) => x.kind);
const c = (kind: WarningChipKind, tag = "") => ({ kind, tag });

describe("rankWarningChips (PR-0a-2b)", () => {
  it("優先順: 要エントリー=要経由 > channel > 上限 > 限定/対象外 > stale > 端数", () => {
    const P = WARNING_CHIP_PRIORITY;
    expect(P.entry).toBe(P.via);
    expect(P.entry).toBeLessThan(P.channel);
    expect(P.channel).toBeLessThan(P.cap);
    expect(P.cap).toBeLessThan(P.limited);
    expect(P.limited).toBe(P.exclusion);
    expect(P.exclusion).toBeLessThan(P.stale);
    expect(P.stale).toBeLessThan(P.minUnit);
  });

  it("予算は 3 件。逆順に渡しても優先順に並べ替えて上位 3 件を返す", () => {
    expect(WARNING_CHIP_BUDGET).toBe(3);
    const out = rankWarningChips([
      c("minUnit"),
      c("stale"),
      c("exclusion"),
      c("cap"),
      c("channel"),
      c("entry"),
    ]);
    expect(kinds(out)).toEqual(["entry", "channel", "cap"]);
  });

  it("J-POINT 20倍 (要エントリー + 経由型 + 対象外) に stale が重なっても予算 3 に収まり、stale が落ちる", () => {
    const out = rankWarningChips([
      c("entry"),
      c("channel"),
      c("exclusion"),
      c("stale"),
    ]);
    expect(out).toHaveLength(3);
    expect(kinds(out)).toEqual(["entry", "channel", "exclusion"]);
  });

  it("同じ kind は最初の候補だけ残す (専用バッジを先に渡せば notes 由来の同種チップより優先)", () => {
    const out = rankWarningChips([
      c("entry", "badge"),
      c("cap", "badge"),
      c("entry", "note"),
      c("cap", "note"),
    ]);
    expect(out).toEqual([c("entry", "badge"), c("cap", "badge")]);
  });

  it("同順位 (限定 / 対象外) は渡した順を保つ (安定)", () => {
    expect(kinds(rankWarningChips([c("exclusion"), c("limited")]))).toEqual([
      "exclusion",
      "limited",
    ]);
    expect(kinds(rankWarningChips([c("limited"), c("exclusion")]))).toEqual([
      "limited",
      "exclusion",
    ]);
  });

  it("予算未満ならそのまま全件 (空なら空)。budget 引数で上書きできる", () => {
    expect(kinds(rankWarningChips([c("stale"), c("minUnit")]))).toEqual([
      "stale",
      "minUnit",
    ]);
    expect(rankWarningChips([])).toEqual([]);
    expect(kinds(rankWarningChips([c("cap"), c("entry")], 1))).toEqual(["entry"]);
    expect(rankWarningChips([c("entry")], 0)).toEqual([]);
  });

  it("payload (kind 以外のフィールド) を保ったまま返す", () => {
    const out = rankWarningChips([{ kind: "stale" as const, month: "2025-12" }]);
    expect(out[0].month).toBe("2025-12");
  });
});

// PR-6b: 通常ビュー / 円換算ビュー共通の警告プラン (CalcResultCard から切り出した純関数)。
describe("buildWarningPlan (PR-6b)", () => {
  const NOW = new Date("2026-07-20T09:00:00+09:00");
  const program: BenefitProgram = {
    id: "prog-x",
    name: "提携店特典",
    scope: "member-stores",
    rate: 0.05,
    currencyId: "rakuten-pt",
  };
  const ranking = (over: Partial<CardRanking> = {}): CardRanking => {
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
      pathProduct: 1,
      finalAmount: 50,
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
      totalFinalAmount: 50,
      minUnitAnnotations: [],
      ...over,
    };
    return { ...base, adoptedProgramIds: collectAdoptedProgramIds(base) };
  };
  const plan = (p: BenefitProgram, over: Partial<CardRanking> = {}, reachable?: boolean) =>
    buildWarningPlan({
      ranking: ranking(over),
      programById: new Map([[p.id, p]]),
      membershipOf: (pid) =>
        pid === p.id
          ? { id: "m", programId: pid, storeId: "s", notes: "QUICPay は対象外" }
          : undefined,
      freshness: LOCAL_FRESHNESS,
      now: NOW,
      currencyName: (id) => id,
      reachable,
    });

  it("要エントリー (安全な entryUrl のみ) + membership.notes の条件チップ + stale を予算順に出す", () => {
    const out = plan({
      ...program,
      requiresEntry: true,
      entryUrl: "javascript:alert(1)",
      lastVerifiedAt: "2025-01",
    });
    expect(out.program?.id).toBe("prog-x");
    expect(out.entry?.entryUrl).toBeUndefined();
    expect(out.chipNotes).toBe("QUICPay は対象外");
    expect(out.stale?.oldest).toBe("2025-01");
    expect([...out.shown]).toEqual(["entryBadge", "note", "stale"]);
    expect([...out.noteKinds]).toEqual(["exclusion"]);
  });

  it("stale は reachable (既定 ranking.reachable) のときだけ。円換算ビューは円評価の到達可否で上書きする", () => {
    const old = { ...program, lastVerifiedAt: "2025-01" };
    expect(plan(old, { reachable: false }).stale).toBeNull();
    expect(plan(old, { reachable: false }, true).stale?.oldest).toBe("2025-01");
    expect(plan(old, {}, false).stale).toBeNull();
  });

  it("source default の結果は primary の program を持たず、カードの基本還元の確認月を見る", () => {
    const out = plan(program, {
      card: {
        id: "rakuten",
        name: "楽天カード",
        defaultRate: 0.01,
        defaultCurrencyId: "rakuten-pt",
        lastVerifiedAt: "2025-02",
      },
      resolved: { rate: 0.01, currencyId: "rakuten-pt", source: "default" },
    });
    expect(out.program).toBeUndefined();
    expect(out.chipNotes).toBeUndefined();
    expect(out.stale?.title).toContain("・還元率 楽天カード の基本還元 (2025-02)");
  });
});
