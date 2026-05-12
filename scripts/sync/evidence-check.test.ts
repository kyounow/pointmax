import { describe, it, expect } from "vitest";
import { detectSelfReportedExclusion } from "./evidence-check";

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
