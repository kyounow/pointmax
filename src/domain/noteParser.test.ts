import { describe, it, expect } from "vitest";
import { extractNoteChips } from "./noteParser";

describe("extractNoteChips", () => {
  it("要エントリー を検出", () => {
    expect(extractNoteChips("要エントリー必要")).toEqual([
      { kind: "entry", label: "要エントリー" },
    ]);
  });
  it("上限 + 額を抽出", () => {
    expect(extractNoteChips("d払い+5% (要エントリー、進呈上限 2000pt)")).toEqual([
      { kind: "entry", label: "要エントリー" },
      { kind: "cap", label: "上限 2000pt" },
    ]);
  });
  it("上限 (額不明) はあり扱い", () => {
    expect(extractNoteChips("上限あり")).toEqual([
      { kind: "cap", label: "上限あり" },
    ]);
  });
  it("対象外 / 限定", () => {
    const r = extractNoteChips("ファミマは対象外、加盟店限定キャンペーン");
    expect(r.some((c) => c.kind === "exclusion")).toBe(true);
    expect(r.some((c) => c.kind === "limited")).toBe(true);
  });
  it("通常 notes (条件無し) は空", () => {
    expect(extractNoteChips("Visaタッチ決済時")).toEqual([]);
  });
  it("undefined → 空", () => {
    expect(extractNoteChips(undefined)).toEqual([]);
  });
});
