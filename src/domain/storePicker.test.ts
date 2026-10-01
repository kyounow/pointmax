// PR-6c (B6 = (a)): 店舗 picker の実行時フィルタ (visibleStoreIds) のテスト。
import { describe, it, expect } from "vitest";
import {
  GENERAL_STORE_ID,
  PICKER_EXCLUDED_CATEGORIES,
  PICKER_REDUCED_RATE_CATEGORIES,
  visibleStoreIds,
} from "./storePicker";
import type { Store } from "./types";
import { seed } from "../state/seed";
// 同期パイプラインの語彙との一致を見るため、scripts は import せずソース文字列で読む。
import syncTypesSource from "../../scripts/sync/types.ts?raw";

const stores: Store[] = [
  { id: "general", name: "一般店舗 (規定還元)", category: "汎用" },
  { id: "seven", name: "セブンイレブン", category: "コンビニ" },
  { id: "lawson", name: "ローソン", category: "コンビニ" }, // membership なし
  { id: "denki", name: "○○でんき", category: "電気・ガス" }, // membership あり
  { id: "hoken", name: "○○保険", category: "保険" }, // membership あり
  { id: "misc", name: "○○サービス", category: "その他" }, // membership あり
  { id: "nocat", name: "カテゴリ未設定の店" }, // membership あり
];
const memberships = [
  { storeId: "seven" },
  { storeId: "seven" },
  { storeId: "denki" },
  { storeId: "hoken" },
  { storeId: "misc" },
  { storeId: "nocat" },
];
const sorted = (s: Set<string>) => [...s].sort();

describe("visibleStoreIds (PR-6c)", () => {
  it("membership ゼロ・除外カテゴリ・電気・ガスの店を隠し、general は常に残す", () => {
    expect(sorted(visibleStoreIds(stores, memberships))).toEqual([
      "general",
      "nocat",
      "seven",
    ]);
  });

  it("general は membership が無くても、カテゴリが除外語彙でも残す", () => {
    const g: Store[] = [{ id: GENERAL_STORE_ID, name: "一般店舗", category: "その他" }];
    expect(sorted(visibleStoreIds(g, []))).toEqual(["general"]);
  });

  it("選択中の店と直近店舗チップの店は隠れる条件でも残す", () => {
    const out = visibleStoreIds(stores, memberships, {
      selectedId: "lawson",
      recentIds: ["denki", "hoken"],
    });
    expect(sorted(out)).toEqual(["denki", "general", "hoken", "lawson", "nocat", "seven"]);
  });

  it("memberships 省略時はカテゴリ条件だけで絞る", () => {
    expect(sorted(visibleStoreIds(stores, undefined))).toEqual([
      "general",
      "lawson",
      "nocat",
      "seven",
    ]);
  });

  it("category 未設定の店はカテゴリ条件では隠さない (membership 条件だけ)", () => {
    const s: Store[] = [{ id: "x", name: "x" }];
    expect(sorted(visibleStoreIds(s, [{ storeId: "x" }]))).toEqual(["x"]);
    expect(sorted(visibleStoreIds(s, []))).toEqual([]);
  });

  it("除外カテゴリの語彙は同期パイプライン (scripts/sync/types.ts の EXCLUDED_CATEGORIES) と一致する", () => {
    const block = syncTypesSource.match(
      /export const EXCLUDED_CATEGORIES = new Set<string>\(\[([\s\S]*?)\]\)/,
    );
    expect(block).not.toBeNull();
    const words = [...block![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(words.length).toBeGreaterThan(0);
    expect([...PICKER_EXCLUDED_CATEGORIES].sort()).toEqual([...words].sort());
    expect(PICKER_REDUCED_RATE_CATEGORIES.has("電気・ガス")).toBe(true);
  });
});

// seed 実データ。⚠ cron の Safety check でも走るので件数の厳密値は assert しない
// (店舗・membership は週次で増える)。構造 (隠れる店の条件) だけを固定する。
describe("visibleStoreIds — seed 実データ", () => {
  const S = seed();
  const visible = visibleStoreIds(S.stores, S.memberships);
  const withMembership = new Set(S.memberships.map((m) => m.storeId));

  it("一般店舗は表示、電気・ガスの店は membership の有無によらず全て隠れる", () => {
    expect(visible.has(GENERAL_STORE_ID)).toBe(true);
    const denki = S.stores.filter((s) => s.category === "電気・ガス");
    expect(denki.length).toBeGreaterThan(0);
    for (const s of denki) expect(visible.has(s.id)).toBe(false);
  });

  it("表示される店 (general 以外) は全て membership を持ち、除外カテゴリではない", () => {
    for (const s of S.stores) {
      if (!visible.has(s.id) || s.id === GENERAL_STORE_ID) continue;
      expect(withMembership.has(s.id)).toBe(true);
      expect(PICKER_EXCLUDED_CATEGORIES.has(s.category ?? "")).toBe(false);
    }
  });

  it("membership を持つ通常カテゴリの店は隠さない", () => {
    for (const s of S.stores) {
      if (!withMembership.has(s.id)) continue;
      const cat = s.category ?? "";
      if (PICKER_EXCLUDED_CATEGORIES.has(cat) || PICKER_REDUCED_RATE_CATEGORIES.has(cat)) {
        continue;
      }
      expect(visible.has(s.id)).toBe(true);
    }
  });
});
