import { describe, it, expect } from "vitest";
import { isSafeHttpUrl } from "./urlSafety";

describe("isSafeHttpUrl", () => {
  it("https:// は true", () => {
    expect(isSafeHttpUrl("https://example.com/campaign")).toBe(true);
  });
  it("http:// は true", () => {
    expect(isSafeHttpUrl("http://example.com/campaign")).toBe(true);
  });
  it("前後空白は trim して判定 (true)", () => {
    expect(isSafeHttpUrl("  https://example.com  ")).toBe(true);
  });
  it("大文字スキーム (HTTPS://) も true", () => {
    expect(isSafeHttpUrl("HTTPS://example.com")).toBe(true);
  });
  it("javascript: は false", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
  });
  it("data: は false", () => {
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
  it("vbscript: は false", () => {
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
  });
  it("相対パスは false", () => {
    expect(isSafeHttpUrl("/campaign/detail")).toBe(false);
  });
  it("空文字は false", () => {
    expect(isSafeHttpUrl("")).toBe(false);
  });
});
