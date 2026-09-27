import { describe, it, expect } from "vitest";
import {
  rankWarningChips,
  WARNING_CHIP_BUDGET,
  WARNING_CHIP_PRIORITY,
  type WarningChipKind,
} from "./warningChips";

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
