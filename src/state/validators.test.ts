import { describe, it, expect } from "vitest";
import { validateImportData } from "./validators";
import { PERSIST_SCHEMA_VERSION } from "./persist-versions";
import { seed } from "./seed";
import { membershipId } from "./defineMemberships";

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

  // seed() には schemaVersion が無いが、requireSchemaVersion を付けない
  // (= master 経路) なので通ることを明示的にガード。
  it("seed() は requireSchemaVersion 未指定なら schemaVersion 欠落でも通る", () => {
    const r = validateImportData({ ...seed() });
    expect(r.ok).toBe(true);
  });
});

describe("validateImportData: v6 scope 検証", () => {
  const program = (over: Record<string, unknown> = {}) => ({
    id: "prog-1",
    name: "P",
    scope: "member-stores",
    rate: 0.05,
    currencyId: "cur1",
    ...over,
  });

  it("scope 欠落の program を拒否", () => {
    const r = validateImportData({
      ...valid,
      programs: [{ id: "prog-1", name: "P", rate: 0.05, currencyId: "cur1" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("programs[0].scope");
  });

  it("scope が enum 外の program を拒否", () => {
    const r = validateImportData({
      ...valid,
      programs: [program({ scope: "everywhere" })],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("programs[0].scope");
  });

  it("all-stores + membership の矛盾を拒否", () => {
    const r = validateImportData({
      ...valid,
      programs: [program({ id: "prog-global", scope: "all-stores" })],
      memberships: [
        { id: membershipId("prog-global", "s1"), programId: "prog-global", storeId: "s1" },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("prog-global");
  });

  it("member-stores + membership 0 件は許容 (import の過渡状態)", () => {
    const r = validateImportData({
      ...valid,
      programs: [program({ id: "prog-lonely", scope: "member-stores" })],
      memberships: [],
    });
    expect(r.ok).toBe(true);
  });

  it("all-stores かつ membership 無しは受理", () => {
    const r = validateImportData({
      ...valid,
      programs: [program({ id: "prog-global", scope: "all-stores" })],
      memberships: [],
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateImportData: v6 membership id 検証", () => {
  const mkProgram = {
    id: "prog-1",
    name: "P",
    scope: "member-stores",
    rate: 0.05,
    currencyId: "cur1",
  };

  it("規約 id (m-{programId}-{storeId}) 一致の membership を受理", () => {
    const r = validateImportData({
      ...valid,
      programs: [mkProgram],
      memberships: [
        { id: membershipId("prog-1", "s1"), programId: "prog-1", storeId: "s1" },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("id 欠落の membership を拒否", () => {
    const r = validateImportData({
      ...valid,
      programs: [mkProgram],
      memberships: [{ programId: "prog-1", storeId: "s1" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("memberships[0].id");
  });

  it("規約と一致しない id を拒否", () => {
    const r = validateImportData({
      ...valid,
      programs: [mkProgram],
      memberships: [{ id: "m-wrong", programId: "prog-1", storeId: "s1" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("規約");
  });

  it("id 重複の membership を拒否", () => {
    const r = validateImportData({
      ...valid,
      programs: [mkProgram],
      memberships: [
        { id: membershipId("prog-1", "s1"), programId: "prog-1", storeId: "s1" },
        { id: membershipId("prog-1", "s1"), programId: "prog-1", storeId: "s1" },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("重複");
  });
});

describe("validateImportData: schemaVersion ガード (import 経路のみ)", () => {
  const good = {
    ...valid,
    schemaVersion: PERSIST_SCHEMA_VERSION,
  };

  it("requireSchemaVersion 未指定なら schemaVersion 欠落でも通る (master 経路)", () => {
    expect(validateImportData(valid).ok).toBe(true);
  });

  it("requireSchemaVersion=true + schemaVersion 欠落を拒否", () => {
    const r = validateImportData(valid, { requireSchemaVersion: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("旧バージョン");
  });

  it("requireSchemaVersion=true + 旧 schemaVersion を拒否", () => {
    const r = validateImportData(
      { ...valid, schemaVersion: PERSIST_SCHEMA_VERSION - 1 },
      { requireSchemaVersion: true },
    );
    expect(r.ok).toBe(false);
  });

  it("requireSchemaVersion=true + 現行 schemaVersion を受理", () => {
    const r = validateImportData(good, { requireSchemaVersion: true });
    expect(r.ok).toBe(true);
  });
});
