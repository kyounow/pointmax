import { describe, it, expect } from "vitest";
import {
  legacyBenefitsRedirect,
  LEGACY_BENEFITS_REDIRECT,
} from "./benefitsRoute";

describe("legacyBenefitsRedirect (旧 hash → #benefits マッピング)", () => {
  it("programs → benefits", () => {
    expect(legacyBenefitsRedirect("programs")).toBe("benefits");
  });
  it("campaigns → benefits", () => {
    expect(legacyBenefitsRedirect("campaigns")).toBe("benefits");
  });
  it("旧 id 以外は null (リダイレクトしない)", () => {
    expect(legacyBenefitsRedirect("benefits")).toBeNull();
    expect(legacyBenefitsRedirect("calculator")).toBeNull();
    expect(legacyBenefitsRedirect("wallet")).toBeNull();
    // prototype 汚染系のキーで誤判定しないこと
    expect(legacyBenefitsRedirect("toString")).toBeNull();
    expect(legacyBenefitsRedirect("constructor")).toBeNull();
  });
  it("マッピングは programs / campaigns の 2 件のみ", () => {
    expect(Object.keys(LEGACY_BENEFITS_REDIRECT).sort()).toEqual([
      "campaigns",
      "programs",
    ]);
    expect(new Set(Object.values(LEGACY_BENEFITS_REDIRECT))).toEqual(
      new Set(["benefits"]),
    );
  });
});
