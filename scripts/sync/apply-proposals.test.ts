import { describe, it, expect } from "vitest";
import {
  bucketProposals,
  bumpSeedVersion,
  buildSeedAdditionsContent,
  emitObjectLiteral,
  mergeWithExisting,
} from "./apply-proposals";
import type { Proposal } from "./types";

const mkAdd = (collection: Proposal["collection"], record: Record<string, unknown>): Proposal => ({
  type: "addRecord",
  collection,
  record,
  sourceId: "test",
  confidence: 0.95,
  evidence: { evidenceQuote: "x", explicitness: 0.95, ambiguity: 0.05 },
});

describe("bucketProposals", () => {
  it("各 collection ごとに addRecord を仕分け", () => {
    const ps: Proposal[] = [
      mkAdd("stores", { id: "s1", name: "S1" }),
      mkAdd("stores", { id: "s2", name: "S2" }),
      mkAdd("rules", { id: "r1", cardId: "c", storeId: "s", rate: 0.01, currencyId: "p" }),
      mkAdd("loyaltyRules", { id: "l1", pointCardId: "p", storeId: "s", rate: 0.005 }),
    ];
    const { buckets, skipped } = bucketProposals(ps);
    expect(buckets.stores).toHaveLength(2);
    expect(buckets.rules).toHaveLength(1);
    expect(buckets.loyaltyRules).toHaveLength(1);
    expect(buckets.cards).toHaveLength(0);
    expect(skipped).toEqual([]);
  });

  it("addRecord 以外は skipped に集計", () => {
    const ps: Proposal[] = [
      mkAdd("stores", { id: "s1" }),
      {
        type: "updateField",
        collection: "rules",
        id: "r1",
        field: "rate",
        from: 0.01,
        to: 0.02,
        sourceId: "x",
        confidence: 0.95,
        evidence: { evidenceQuote: "x", explicitness: 1, ambiguity: 0 },
      },
      {
        type: "referenceChange",
        collection: "rules",
        id: "r2",
        field: "currencyId",
        from: "a",
        to: "b",
        sourceId: "x",
        confidence: 0.95,
        evidence: { evidenceQuote: "x", explicitness: 1, ambiguity: 0 },
        reviewReason: "referenceChange",
      },
    ];
    const { buckets, skipped } = bucketProposals(ps);
    expect(buckets.stores).toHaveLength(1);
    expect(skipped).toEqual(
      expect.arrayContaining([
        { type: "updateField", collection: "rules", count: 1 },
        { type: "referenceChange", collection: "rules", count: 1 },
      ]),
    );
  });
});

describe("mergeWithExisting", () => {
  it("新規 id を追加、重複は skip", () => {
    const existing = [{ id: "a" }, { id: "b" }];
    const newOnes = [{ id: "b", name: "dup" }, { id: "c", name: "new" }];
    const { merged, added, skipped } = mergeWithExisting(existing, newOnes);
    expect(merged).toEqual([{ id: "a" }, { id: "b" }, { id: "c", name: "new" }]);
    expect(added).toBe(1);
    expect(skipped).toBe(1);
  });

  it("同じ run 内での id 重複も skip", () => {
    const existing: { id: string }[] = [];
    const newOnes = [{ id: "x" }, { id: "x" }, { id: "y" }];
    const { merged, added, skipped } = mergeWithExisting(existing, newOnes);
    expect(merged.map((r) => r.id)).toEqual(["x", "y"]);
    expect(added).toBe(2);
    expect(skipped).toBe(1);
  });

  it("既存が空配列でも動く", () => {
    const { merged, added } = mergeWithExisting([], [{ id: "a" }]);
    expect(merged).toEqual([{ id: "a" }]);
    expect(added).toBe(1);
  });
});

describe("emitObjectLiteral", () => {
  it("文字列値を JSON でエスケープ", () => {
    expect(emitObjectLiteral({ id: "x", name: "hello" })).toBe(
      '{ id: "x", name: "hello" }',
    );
  });

  it("undefined と null は省略", () => {
    expect(emitObjectLiteral({ id: "x", name: "y", category: undefined, foo: null })).toBe(
      '{ id: "x", name: "y" }',
    );
  });

  it("数値・boolean・配列もそのまま", () => {
    expect(emitObjectLiteral({ id: "x", rate: 0.07, active: true, tags: ["a", "b"] })).toBe(
      '{ id: "x", rate: 0.07, active: true, tags: ["a","b"] }',
    );
  });

  it("特殊なキー名は quote される", () => {
    expect(emitObjectLiteral({ "with space": 1, "valid_key": 2 })).toBe(
      '{ "with space": 1, valid_key: 2 }',
    );
  });

  it("空オブジェクトは {}", () => {
    expect(emitObjectLiteral({ a: undefined })).toBe("{}");
  });
});

describe("buildSeedAdditionsContent", () => {
  it("空配列なら ADDED_STORES: Store[] = []; を出力", () => {
    const out = buildSeedAdditionsContent({
      stores: [],
      rules: [],
      loyaltyRules: [],
      cards: [],
      paymentApps: [],
    });
    expect(out).toContain("export const ADDED_STORES: Store[] = [];");
    expect(out).toContain("export const ADDED_PAYMENT_APPS: PaymentApp[] = [];");
    expect(out).toContain("AUTO-GENERATED");
  });

  it("配列の要素は object literal として出力", () => {
    const out = buildSeedAdditionsContent({
      stores: [{ id: "kura-sushi", name: "くら寿司", category: "飲食" }],
      rules: [],
      loyaltyRules: [],
      cards: [],
      paymentApps: [],
    });
    expect(out).toContain(
      'export const ADDED_STORES: Store[] = [\n  { id: "kura-sushi", name: "くら寿司", category: "飲食" },\n];',
    );
  });
});

describe("bumpSeedVersion", () => {
  it("SEED_VERSION を +1", () => {
    const src = `// header\nexport const SEED_VERSION = 1;\nconst other = 5;\n`;
    const { updated, from, to } = bumpSeedVersion(src);
    expect(from).toBe(1);
    expect(to).toBe(2);
    expect(updated).toContain("export const SEED_VERSION = 2;");
    expect(updated).not.toContain("export const SEED_VERSION = 1;");
  });

  it("SEED_VERSION が見つからないと例外", () => {
    expect(() => bumpSeedVersion("no version here")).toThrow(/SEED_VERSION/);
  });

  it("3 桁版数でも正しく bump", () => {
    const { to } = bumpSeedVersion("export const SEED_VERSION = 142;");
    expect(to).toBe(143);
  });
});
