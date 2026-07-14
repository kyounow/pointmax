import { describe, it, expect } from "vitest";
import { parseHash, buildHash } from "./navigation";

describe("parseHash", () => {
  it("空文字は calculator にフォールバック", () => {
    const r = parseHash("");
    expect(r.tab).toBe("calculator");
    expect(r.sub).toBeUndefined();
    expect([...r.params.entries()]).toEqual([]);
  });

  it('"#" のみも calculator', () => {
    expect(parseHash("#").tab).toBe("calculator");
  });

  it("先頭 # 付きの単純 tab", () => {
    const r = parseHash("#edges");
    expect(r.tab).toBe("edges");
    expect(r.sub).toBeUndefined();
  });

  it("先頭 # なし入力も許容する", () => {
    expect(parseHash("edges").tab).toBe("edges");
  });

  it("sub を分解する (#settings/history)", () => {
    const r = parseHash("#settings/history");
    expect(r.tab).toBe("settings");
    expect(r.sub).toBe("history");
  });

  it("query を URLSearchParams に (#cards?highlight=epos-gold)", () => {
    const r = parseHash("#cards?highlight=epos-gold");
    expect(r.tab).toBe("cards");
    expect(r.sub).toBeUndefined();
    expect(r.params.get("highlight")).toBe("epos-gold");
  });

  it("sub と query の併用 (#settings/history?x=1)", () => {
    const r = parseHash("#settings/history?x=1");
    expect(r.tab).toBe("settings");
    expect(r.sub).toBe("history");
    expect(r.params.get("x")).toBe("1");
  });

  it("percent-encoded セグメントをデコードする (#%E3%81%82 → あ)", () => {
    expect(parseHash("#%E3%81%82").tab).toBe("あ");
  });

  it("malformed な percent-encoding は素の文字列に fallback", () => {
    // "%E3%81" は不完全なシーケンス → decode 失敗 → 生値を返す (例外を投げない)
    expect(parseHash("#%E3%81").tab).toBe("%E3%81");
  });

  it("空セグメント (先頭/末尾/連続スラッシュ) は無視する", () => {
    // 先頭スラッシュは無視 → 最初の非空セグメントが tab
    expect(parseHash("#/foo").tab).toBe("foo");
    expect(parseHash("#/foo").sub).toBeUndefined();
    // 末尾スラッシュは sub を生まない
    expect(parseHash("#cards/").tab).toBe("cards");
    expect(parseHash("#cards/").sub).toBeUndefined();
  });
});

describe("buildHash", () => {
  it("tab のみ", () => {
    expect(buildHash({ tab: "calculator" })).toBe("calculator");
  });

  it("tab + sub", () => {
    expect(buildHash({ tab: "settings", sub: "history" })).toBe(
      "settings/history",
    );
  });

  it("tab + params", () => {
    expect(buildHash({ tab: "cards", params: { highlight: "epos-gold" } })).toBe(
      "cards?highlight=epos-gold",
    );
  });

  it("params は挿入順を保持する", () => {
    expect(buildHash({ tab: "cards", params: { a: "1", b: "2" } })).toBe(
      "cards?a=1&b=2",
    );
  });

  it("空 params は ? を付けない", () => {
    expect(buildHash({ tab: "cards", params: {} })).toBe("cards");
  });
});

describe("round-trip (parse ∘ build)", () => {
  it("tab / sub / params が復元される", () => {
    const built = buildHash({
      tab: "cards",
      sub: "detail",
      params: { highlight: "epos-gold" },
    });
    const r = parseHash(built);
    expect(r.tab).toBe("cards");
    expect(r.sub).toBe("detail");
    expect(r.params.get("highlight")).toBe("epos-gold");
  });

  it("非 ASCII tab も round-trip する", () => {
    const built = buildHash({ tab: "あ" });
    expect(parseHash(built).tab).toBe("あ");
  });
});
