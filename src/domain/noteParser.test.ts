import { describe, it, expect } from "vitest";
import {
  extractNoteChips,
  joinNoteTexts,
  sanitizeNoteForDisplay,
} from "./noteParser";

// PR-0a-2b (M3): 経由型・チャネル限定の channel チップ。
describe("extractNoteChips — channel (PR-0a-2b)", () => {
  it.each([
    ["モバイルオーダー・マックデリバリー限定", "モバイルオーダー限定"],
    ["スターバックス カードへのオンライン入金で 20 倍", "オンライン入金限定"],
    ["オートチャージ分も対象", "オートチャージ限定"],
    ["Starbucks eGift の購入", "eGift限定"],
    ["ネット限定のキャンペーン", "ネット限定"],
    ["オンライン限定クーポン", "オンライン限定"],
    ["たまるマーケットを経由して購入", "経由限定"],
  ])("『%s』→ channel チップ『%s』", (notes, label) => {
    const chips = extractNoteChips(notes);
    expect(chips.find((c) => c.kind === "channel")?.label).toBe(label);
  });

  it("最初に現れた語をラベルにする (オンライン入金 は オンライン(限定) より優先)", () => {
    const chips = extractNoteChips(
      "オンライン入金・オートチャージ・モバイルオーダー限定",
    );
    expect(chips.find((c) => c.kind === "channel")?.label).toBe(
      "オンライン入金限定",
    );
  });

  it("channel チップが出たら同じ notes の汎用『限定条件』は出さない (対象外は別種で残る)", () => {
    const chips = extractNoteChips(
      "モバイルオーダー・Starbucks eGift 限定。レジでのカード直接払いは対象外",
    );
    expect(chips.map((c) => c.kind)).toEqual(["channel", "exclusion"]);
    expect(chips.some((c) => c.kind === "limited")).toBe(false);
  });

  it("『オンラインストアは対象外』『ネット』単独は channel にしない", () => {
    expect(
      extractNoteChips("テナント店・オンラインストアは対象外").map((c) => c.kind),
    ).toEqual(["exclusion"]);
    expect(extractNoteChips("ネットでも店頭でも可")).toEqual([]);
  });

  it("J-POINT 20倍の共通 conditions (店別条件なし) からはチップが出ない", () => {
    expect(
      extractNoteChips(
        "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料) が必須。" +
          "対象店舗ごとに支払方法の条件が異なる (各店の注記を参照)。" +
          "すき家・吉野家・ガスト・バーミヤン・サンマルクカフェ・ジョナサンは店頭決済も対象。",
      ),
    ).toEqual([]);
  });
});

describe("joinNoteTexts (PR-0a-2b)", () => {
  it("undefined / 空文字 / 空白だけを除いて ' / ' で連結する", () => {
    expect(joinNoteTexts("A", undefined, "", "  ", "B")).toBe("A / B");
  });
  it("重複 (前後空白を除いて同一) は 1 回だけ", () => {
    expect(joinNoteTexts("A", " A ", "B", "A")).toBe("A / B");
  });
  it("全て空なら undefined", () => {
    expect(joinNoteTexts()).toBeUndefined();
    expect(joinNoteTexts(undefined, "", " ")).toBeUndefined();
  });
  it("1 件だけならそのまま (trim のみ)", () => {
    expect(joinNoteTexts(" 注記 ")).toBe("注記");
  });
});

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
