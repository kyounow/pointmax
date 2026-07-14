import { describe, it, expect } from "vitest";
import {
  resolveWalletSection,
  walletSectionHash,
  legacyWalletRedirect,
  LEGACY_WALLET_REDIRECT,
} from "./walletRoute";

describe("resolveWalletSection", () => {
  it("#wallet (sub なし) は cards セクション", () => {
    expect(resolveWalletSection({ tab: "wallet" })).toBe("cards");
  });

  it("#wallet/point-cards は point-cards", () => {
    expect(resolveWalletSection({ tab: "wallet", sub: "point-cards" })).toBe(
      "point-cards",
    );
  });

  it("#wallet/payment-apps は payment-apps", () => {
    expect(resolveWalletSection({ tab: "wallet", sub: "payment-apps" })).toBe(
      "payment-apps",
    );
  });

  it("未知 sub は cards にフォールバック", () => {
    expect(resolveWalletSection({ tab: "wallet", sub: "nope" })).toBe("cards");
  });

  it("旧 #pointcards からの流入も point-cards に解決 (replaceRoute 前の描画用)", () => {
    expect(resolveWalletSection({ tab: "pointcards" })).toBe("point-cards");
  });

  it("旧 #paymentapps からの流入も payment-apps に解決", () => {
    expect(resolveWalletSection({ tab: "paymentapps" })).toBe("payment-apps");
  });

  it("旧 #cards からの流入は cards", () => {
    expect(resolveWalletSection({ tab: "cards" })).toBe("cards");
  });
});

describe("legacyWalletRedirect (旧 hash → 新 hash マッピング)", () => {
  it("cards → wallet", () => {
    expect(legacyWalletRedirect("cards")).toBe("wallet");
  });
  it("pointcards → wallet/point-cards", () => {
    expect(legacyWalletRedirect("pointcards")).toBe("wallet/point-cards");
  });
  it("paymentapps → wallet/payment-apps", () => {
    expect(legacyWalletRedirect("paymentapps")).toBe("wallet/payment-apps");
  });
  it("旧 id 以外は null (リダイレクトしない)", () => {
    expect(legacyWalletRedirect("wallet")).toBeNull();
    expect(legacyWalletRedirect("calculator")).toBeNull();
    expect(legacyWalletRedirect("settings")).toBeNull();
    // prototype 汚染系のキーで誤判定しないこと
    expect(legacyWalletRedirect("toString")).toBeNull();
  });
});

describe("walletSectionHash (セクション → hash) は resolveWalletSection と round-trip する", () => {
  it("cards は素の wallet (sub なし)", () => {
    expect(walletSectionHash("cards")).toBe("wallet");
  });
  it("point-cards / payment-apps は sub 付き", () => {
    expect(walletSectionHash("point-cards")).toBe("wallet/point-cards");
    expect(walletSectionHash("payment-apps")).toBe("wallet/payment-apps");
  });
  it("全セクションで hash → section が復元される", () => {
    for (const section of ["cards", "point-cards", "payment-apps"] as const) {
      const hash = walletSectionHash(section);
      const [tab, sub] = hash.split("/");
      expect(resolveWalletSection({ tab, sub })).toBe(section);
    }
  });

  it("LEGACY_WALLET_REDIRECT の value は walletSectionHash 群と一致する", () => {
    expect(new Set(Object.values(LEGACY_WALLET_REDIRECT))).toEqual(
      new Set(["wallet", "wallet/point-cards", "wallet/payment-apps"]),
    );
  });
});
