import { describe, it, expect } from "vitest";
import {
  LIFESTYLE_KEYWORDS,
  detectConditionalWording,
  detectLifestyleWording,
  detectSelfReportedExclusion,
  detectUnsupportedDateClaim,
  detectUnsupportedRateClaim,
  normalizeForMatch,
} from "./evidence-check";

describe("detectSelfReportedExclusion", () => {
  it("「記載がない」を含むと true", () => {
    expect(detectSelfReportedExclusion("対象店舗一覧には記載がないが追加候補")).toBe(true);
  });
  it("「対象外」を含むと true", () => {
    expect(detectSelfReportedExclusion("これは対象外の店舗です")).toBe(true);
  });
  it("「見送り」を含むと true", () => {
    expect(detectSelfReportedExclusion("今回は見送りとします")).toBe(true);
  });
  it("普通の引用は false", () => {
    expect(detectSelfReportedExclusion("セブン-イレブンで7%還元")).toBe(false);
  });
  it("undefined / 空文字は false", () => {
    expect(detectSelfReportedExclusion(undefined)).toBe(false);
    expect(detectSelfReportedExclusion("")).toBe(false);
  });
});

describe("detectUnsupportedDateClaim", () => {
  it("validFrom/validTo 両方 undefined → false", () => {
    expect(detectUnsupportedDateClaim({}, "anything")).toBe(false);
  });
  it("validFrom あるが evidence なし → true", () => {
    expect(detectUnsupportedDateClaim({ validFrom: "2023-04-03" }, undefined)).toBe(true);
    expect(detectUnsupportedDateClaim({ validFrom: "2023-04-03" }, "")).toBe(true);
  });
  it("validFrom あり、evidence に「期間」 → false (= supported)", () => {
    expect(detectUnsupportedDateClaim(
      { validFrom: "2023-04-03" },
      "ご利用期間: 2023年4月3日(月)以降のお支払い分",
    )).toBe(false);
  });
  it("validFrom あり、evidence に日付なし → true (= unsupported)", () => {
    expect(detectUnsupportedDateClaim(
      { validFrom: "2023-04-03" },
      "セブン-イレブンで 7% 還元",
    )).toBe(true);
  });
  it("validTo のみ、evidence に「まで」 → false", () => {
    expect(detectUnsupportedDateClaim(
      { validTo: "2026-05-31" },
      "2026年5月31日まで対象",
    )).toBe(false);
  });
});

describe("detectUnsupportedRateClaim", () => {
  it("rate undefined → false (zeroOrInvalidRate の担当)", () => {
    expect(detectUnsupportedRateClaim(undefined, "何か引用")).toBe(false);
  });
  it("rate=0 → false (zeroOrInvalidRate の担当)", () => {
    expect(detectUnsupportedRateClaim(0, "何か引用")).toBe(false);
  });
  it("evidence に「3%」根拠あり → false", () => {
    expect(detectUnsupportedRateClaim(0.03, "対象店舗で3%還元")).toBe(false);
  });
  it("evidence に「20 倍」根拠あり → false", () => {
    expect(detectUnsupportedRateClaim(0.2, "対象店舗でポイント20 倍")).toBe(false);
  });
  it("evidence に「200円につき1ポイント」根拠あり → false", () => {
    expect(
      detectUnsupportedRateClaim(0.005, "200円につき1ポイント進呈"),
    ).toBe(false);
  });
  it("evidence に「最大10,000ポイントプレゼント」のみ (数値根拠なし) → true", () => {
    expect(
      detectUnsupportedRateClaim(0.01, "ノジマで最大10,000ポイントプレゼント"),
    ).toBe(true);
  });
  it("evidenceQuote 無し → true", () => {
    expect(detectUnsupportedRateClaim(0.03, undefined)).toBe(true);
    expect(detectUnsupportedRateClaim(0.03, "")).toBe(true);
  });
});

// ─── PR-0b-3 (Z3): 条件文言・ライフスタイル語 ───

describe("normalizeForMatch", () => {
  it("NFKC で全角英数・記号を半角にする", () => {
    expect(normalizeForMatch("最大＋２０％ ＭＡＸ")).toBe("最大+20% MAX");
  });
});

describe("detectConditionalWording (陽性ベクタ: 実事故の name / evidence / notes)", () => {
  it.each([
    ["【吉野家】最大＋20％還元！", "最大"],
    ["かっぱ寿司の店舗で最大10倍！", "最大"],
    ["【ビックカメラ池袋店舗】もれなく＋5％還元", "店舗限定"],
    ["【モスバーガー】対象商品はdポイント3倍！", "対象限定"],
    ["dポイントカード モスバーガー 対象商品はdポイント5倍", "対象限定"],
    ["PayPayポイントを利用して対象商品を買うと最大30％", "最大"],
    ["＜12〜18歳の方＞PayPayで最大2%", "最大"],
    ["＜12〜18歳の方＞PayPayで2%", "ユーザー状態"],
    ["セブンイレブン 対象おにぎり・寿司 +20%", "対象限定"],
    ["新規入会でポイント2倍", "ユーザー状態"],
    ["学生限定 3%還元", "ユーザー状態"],
    ["抽選で10名様に", "抽選"],
    ["モバイルオーダーで3%", "EC経由"],
    ["一部店舗を除く", "店舗限定"],
    ["一部の商品を除く", "一部商品"],
    ["クーポン利用で5%OFF", "割引"],
    ["PayPayポイントで支払うと", "ポイント利用"],
  ])("「%s」は %s で一致する", (text, label) => {
    const hit = detectConditionalWording({ evidenceQuote: text }, true);
    expect(hit).not.toBeNull();
    expect(hit!.startsWith(`${label}:`)).toBe(true);
    expect(hit!.endsWith("@evidenceQuote")).toBe(true);
  });

  it("notes だけにある「対象商品限定です」も拾う (@notes)", () => {
    expect(
      detectConditionalWording({ name: "モスバーガー 3%", notes: "対象商品限定です" }, true),
    ).toBe("対象限定:「対象商品限定です」@notes");
  });

  it("フィールドは name → description → conditions → notes → evidenceQuote の順に走査する", () => {
    expect(
      detectConditionalWording(
        { name: "最大3%", evidenceQuote: "対象商品で3%" },
        true,
      ),
    ).toBe("最大:「最大」@name");
  });
});

describe("detectConditionalWording (陰性ベクタ: 過剰ブロックしない)", () => {
  it.each([
    "対象店舗で3%還元",
    "JRE POINT NewDays 3%還元キャンペーン",
    "キャンペーン期間：2026年6月1日〜2099年12月31日、NewDaysでJRE POINT提示で3%",
    "【タワーレコード】全員！dポイント10倍！",
    "d払いで5%、期間 2099/12/31 まで",
    "d払いアプリでのお支払い",
    "税抜換算",
    "SECOM でのお支払い",
    "対象期間中、対象カードで3%",
  ])("「%s」は null", (text) => {
    expect(detectConditionalWording({ name: text, evidenceQuote: text }, false)).toBeNull();
  });

  it("「進呈上限1,000pt」は hasCap=true なら null、false (上限が record に無い) なら一致", () => {
    expect(detectConditionalWording({ evidenceQuote: "進呈上限1,000pt" }, true)).toBeNull();
    expect(detectConditionalWording({ evidenceQuote: "進呈上限1,000pt" }, false)).toBe(
      "上限:「進呈上限」@evidenceQuote",
    );
  });
});

describe("detectLifestyleWording", () => {
  it("conditions の「家族ポイント 6人以上」を検出する", () => {
    expect(detectLifestyleWording({ conditions: "家族ポイント 6人以上" })).toBe("lifestyle:「家族ポイント」");
  });
  it("evidence の「給与振込で3%」を検出する (5 フィールドを連結して走査)", () => {
    expect(detectLifestyleWording({ name: "3%還元", evidenceQuote: "給与振込で3%" })).toBe("lifestyle:「給与」");
  });
  it("「人以上」を検出する", () => {
    expect(detectLifestyleWording({ notes: "3人以上で登録" })).toBe("lifestyle:「人以上」");
  });
  it("通常のキャンペーン文言は null", () => {
    expect(detectLifestyleWording({ name: "d払い 3%還元", evidenceQuote: "d払いで3%" })).toBeNull();
  });
  it("LIFESTYLE_KEYWORDS は旧 propose-helpers の語 + 家族ポイント / 人以上", () => {
    expect(LIFESTYLE_KEYWORDS).toContain("給与");
    expect(LIFESTYLE_KEYWORDS).toContain("家族ポイント");
    expect(LIFESTYLE_KEYWORDS).toContain("人以上");
  });
});
