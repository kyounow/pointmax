import { describe, it, expect } from "vitest";
import {
  legacySettingsRedirect,
  shouldExpandSyncHistory,
  LEGACY_SETTINGS_REDIRECT,
} from "./settingsRoute";

describe("legacySettingsRedirect (旧 #sync-history → #settings/history マッピング)", () => {
  it("sync-history → settings/history", () => {
    expect(legacySettingsRedirect("sync-history")).toBe("settings/history");
  });
  it("旧 id 以外は null (リダイレクトしない)", () => {
    expect(legacySettingsRedirect("settings")).toBeNull();
    expect(legacySettingsRedirect("calculator")).toBeNull();
    expect(legacySettingsRedirect("wallet")).toBeNull();
    // prototype 汚染系のキーで誤判定しないこと
    expect(legacySettingsRedirect("toString")).toBeNull();
    expect(legacySettingsRedirect("constructor")).toBeNull();
  });
  it("マッピングは sync-history の 1 件のみ", () => {
    expect(Object.keys(LEGACY_SETTINGS_REDIRECT)).toEqual(["sync-history"]);
    expect(LEGACY_SETTINGS_REDIRECT["sync-history"]).toBe("settings/history");
  });
});

describe("shouldExpandSyncHistory (マスタ更新履歴セクションの自動展開判定)", () => {
  it("#settings/history (新 hash) は展開", () => {
    expect(shouldExpandSyncHistory({ tab: "settings", sub: "history" })).toBe(
      true,
    );
  });
  it("旧 #sync-history からの流入も展開 (replaceRoute 前の描画用)", () => {
    expect(shouldExpandSyncHistory({ tab: "sync-history" })).toBe(true);
  });
  it("#settings (sub なし) は展開しない", () => {
    expect(shouldExpandSyncHistory({ tab: "settings" })).toBe(false);
  });
  it("他 sub は展開しない", () => {
    expect(shouldExpandSyncHistory({ tab: "settings", sub: "nope" })).toBe(
      false,
    );
  });
});
