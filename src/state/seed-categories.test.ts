import { describe, it, expect } from "vitest";
import {
  ALL_CATEGORY_ALIASES,
  CATEGORY_ALIASES,
  EXTRACTABLE_STORE_CATEGORIES,
  EXTRACTED_CATEGORY_ALIASES,
  STORE_CATEGORIES,
  STORE_CATEGORY_SET,
  isExtractableStoreCategory,
  isKnownStoreCategory,
  resolveExtractedCategory,
} from "./seed-categories";
import { ONLINE_ONLY_CATEGORIES } from "../domain/purchaseChannel";

// PR-4a: 店舗カテゴリ語彙 (seed-categories.ts) の自己整合。
// seed() の stores が語彙内であることは seed.test の契約、propose の unknownCategory は
// diff-and-propose.test、EXCLUDED_CATEGORIES との排他は scripts/sync/types.test で検査する。
describe("STORE_CATEGORIES (店舗カテゴリ語彙)", () => {
  it("36 名で重複が無い", () => {
    const names = STORE_CATEGORIES.map((c) => c.name);
    expect(names).toHaveLength(36);
    expect(new Set(names).size).toBe(names.length);
    expect(STORE_CATEGORY_SET.size).toBe(36);
  });

  it("pseudo は「汎用」だけ", () => {
    expect(STORE_CATEGORIES.filter((c) => c.pseudo).map((c) => c.name)).toEqual(["汎用"]);
  });

  it("EXTRACTABLE_STORE_CATEGORIES は pseudo を除く 35 名 (語彙の並び順)", () => {
    expect(EXTRACTABLE_STORE_CATEGORIES).toHaveLength(35);
    expect(EXTRACTABLE_STORE_CATEGORIES).not.toContain("汎用");
    expect(EXTRACTABLE_STORE_CATEGORIES).toEqual(
      STORE_CATEGORIES.filter((c) => !c.pseudo).map((c) => c.name),
    );
  });

  it("isKnownStoreCategory は pseudo を含み、isExtractableStoreCategory は pseudo と未設定を認めない", () => {
    expect(isKnownStoreCategory("飲食")).toBe(true);
    expect(isKnownStoreCategory("汎用")).toBe(true);
    expect(isKnownStoreCategory("ショッピングモール")).toBe(false);
    expect(isKnownStoreCategory(undefined)).toBe(false);
    expect(isExtractableStoreCategory("飲食")).toBe(true);
    expect(isExtractableStoreCategory("汎用")).toBe(false);
    expect(isExtractableStoreCategory("ショッピングモール")).toBe(false);
    expect(isExtractableStoreCategory(undefined)).toBe(false);
    expect(isExtractableStoreCategory("")).toBe(false);
  });

  it("購入チャネルの純 EC カテゴリ (ONLINE_ONLY_CATEGORIES) は語彙内", () => {
    for (const c of ONLINE_ONLY_CATEGORIES) expect(STORE_CATEGORY_SET.has(c), c).toBe(true);
  });
});

describe("カテゴリ alias (seed() の 7 組 + 抽出時の 8 組)", () => {
  it("seed() が使う 7 組と抽出時だけの 8 組のキーは互いに素で、合計 15 組", () => {
    expect(Object.keys(CATEGORY_ALIASES)).toHaveLength(7);
    expect(Object.keys(EXTRACTED_CATEGORY_ALIASES)).toHaveLength(8);
    const overlap = Object.keys(EXTRACTED_CATEGORY_ALIASES).filter((k) => k in CATEGORY_ALIASES);
    expect(overlap).toEqual([]);
    expect(Object.keys(ALL_CATEGORY_ALIASES)).toHaveLength(15);
  });

  it("値は全て語彙内 (pseudo 以外)、キーは全て語彙外、値がキーに現れない (多段 alias 無し)", () => {
    for (const [from, to] of Object.entries(ALL_CATEGORY_ALIASES)) {
      expect(isExtractableStoreCategory(to), `${from} → ${to}: 値が語彙外`).toBe(true);
      expect(STORE_CATEGORY_SET.has(from), `${from}: キーが語彙内`).toBe(false);
      expect(to in ALL_CATEGORY_ALIASES, `${from} → ${to}: 多段 alias`).toBe(false);
    }
  });

  it("resolveExtractedCategory は 15 組を全て正規名にし、alias の無い名前と未設定はそのまま返す", () => {
    for (const [from, to] of Object.entries(ALL_CATEGORY_ALIASES)) {
      expect(resolveExtractedCategory(from), from).toBe(to);
    }
    expect(resolveExtractedCategory("飲食")).toBe("飲食");
    expect(resolveExtractedCategory("ショッピングモール")).toBe("ショッピングモール");
    expect(resolveExtractedCategory(undefined)).toBeUndefined();
  });
});

// seed-categories.ts はアプリから import しない (main chunk 0 B の前提)。
// src の非テストファイルに import があれば落とす (scripts と契約テストからの import は許す)。
describe("seed-categories.ts をアプリが import しない", () => {
  const sources = import.meta.glob<string>("../**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  });

  it("src の非テストファイルに seed-categories の import が無い", () => {
    const files = Object.keys(sources);
    expect(files.length).toBeGreaterThan(50);
    const offenders = files.filter(
      (f) =>
        !/\.test\.tsx?$/.test(f) &&
        !f.endsWith("/seed-categories.ts") &&
        /["'][^"']*\/seed-categories["']/.test(sources[f]),
    );
    expect(offenders).toEqual([]);
  });
});
