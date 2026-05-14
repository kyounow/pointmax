import { describe, it, expect } from "vitest";
import { extractNoteChips, sanitizeNoteForDisplay } from "./noteParser";

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

describe("sanitizeNoteForDisplay", () => {
  it("[v3 PR 2] BenefitProgram で評価: ... を除去", () => {
    const input =
      "ベース 1% (楽天Pay 利用、誰でも)。楽天カード経由チャージで +0.5% 上乗せ = 1.5%。" +
      "[v3 PR 2] BenefitProgram で評価: prog-rakuten-pay-base + prog-rakuten-pay-rakuten-card-addon";
    const out = sanitizeNoteForDisplay(input);
    expect(out).toBe(
      "ベース 1% (楽天Pay 利用、誰でも)。楽天カード経由チャージで +0.5% 上乗せ = 1.5%。",
    );
    expect(out).not.toMatch(/v3 PR 2/);
    expect(out).not.toMatch(/BenefitProgram/);
  });

  it("「旧 rule-... から移行 (v3 PR 2)」を除去", () => {
    const input = "旧 rule-rakuten-ichiba から移行 (v3 PR 2)";
    expect(sanitizeNoteForDisplay(input)).toBeUndefined();
  });

  it("「旧 rule-... 22 件から移行 (v3 PR 2)」も除去", () => {
    const input = "旧 rule-smbc-* 22 件から移行 (v3 PR 2)";
    expect(sanitizeNoteForDisplay(input)).toBeUndefined();
  });

  it("「v3 で ... 化 (旧 rule-...)」を除去", () => {
    const input =
      "v3 で JAL特約店 category を program 化 (旧 rule-jal-suica-tokuyaku / rule-jal-card-tokuyaku)";
    expect(sanitizeNoteForDisplay(input)).toBeUndefined();
  });

  it("ユーザー向け文言だけ残す (混在ケース)", () => {
    const input =
      "200円ごとに1pt (要エントリー、上限 2000pt)。旧 rule-foo から移行 (v3 PR 2)";
    const out = sanitizeNoteForDisplay(input);
    expect(out).toContain("要エントリー");
    expect(out).toContain("上限 2000pt");
    expect(out).not.toContain("rule-foo");
    expect(out).not.toContain("PR 2");
  });

  it("undefined / 空文字 → undefined", () => {
    expect(sanitizeNoteForDisplay(undefined)).toBeUndefined();
    expect(sanitizeNoteForDisplay("")).toBeUndefined();
    expect(sanitizeNoteForDisplay("   ")).toBeUndefined();
  });

  it("マイグレーション metadata がない通常 notes はそのまま", () => {
    const input = "Visaタッチ決済時、200円1pt";
    expect(sanitizeNoteForDisplay(input)).toBe("Visaタッチ決済時、200円1pt");
  });
});
