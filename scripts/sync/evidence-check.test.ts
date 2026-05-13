import { describe, it, expect } from "vitest";
import { detectSelfReportedExclusion, detectUnsupportedDateClaim } from "./evidence-check";

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
