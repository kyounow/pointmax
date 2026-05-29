import { describe, it, expect } from "vitest";
import { validateImportData } from "./validators";
import { seed } from "./seed";

const valid = {
  cards: [{ id: "c1", name: "C", defaultRate: 0.01, defaultCurrencyId: "cur1" }],
  currencies: [{ id: "cur1", name: "通貨1" }],
  stores: [{ id: "s1", name: "店1" }],
  edges: [{ id: "e1", fromCurrencyId: "cur1", toCurrencyId: "cur1", rate: 1 }],
};

describe("validateImportData (A6/D2)", () => {
  it("妥当なデータを受理し型付き value を返す", () => {
    const r = validateImportData(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.cards).toHaveLength(1);
  });

  it("任意配列 (programs/memberships) が無くても ok", () => {
    expect(validateImportData(valid).ok).toBe(true);
  });

  it("非オブジェクトを拒否", () => {
    expect(validateImportData(null).ok).toBe(false);
    expect(validateImportData("x").ok).toBe(false);
    expect(validateImportData([]).ok).toBe(false);
  });

  it("必須配列 currencies の欠落を拒否", () => {
    const r = validateImportData({
      cards: valid.cards,
      stores: valid.stores,
      edges: valid.edges,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("currencies");
  });

  it("必須配列が配列でない場合を拒否", () => {
    expect(validateImportData({ ...valid, edges: "nope" }).ok).toBe(false);
  });

  it("card.defaultRate が数値でない要素を位置情報付きで拒否", () => {
    const r = validateImportData({
      ...valid,
      cards: [
        { id: "c1", name: "C", defaultRate: "高い", defaultCurrencyId: "cur1" },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("cards[0].defaultRate");
  });

  it("rate の負値を拒否", () => {
    const r = validateImportData({
      ...valid,
      edges: [{ id: "e1", fromCurrencyId: "cur1", toCurrencyId: "cur1", rate: -1 }],
    });
    expect(r.ok).toBe(false);
  });

  it("任意配列 programs の不正要素 (id 欠落) も検出", () => {
    const r = validateImportData({
      ...valid,
      programs: [{ name: "id 欠落", rate: 0.05, currencyId: "cur1" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("programs[0].id");
  });

  // 重要: 公式 master (= seed() の出力) を誤って弾かないことの回帰ガード。
  // これが落ちると本番の syncFromUrl が validation で失敗する。
  it("seed() 由来の master データ全体が検証を通る", () => {
    const r = validateImportData({ ...seed() });
    if (!r.ok) throw new Error(`seed が検証で弾かれた: ${r.error}`);
    expect(r.ok).toBe(true);
  });
});
