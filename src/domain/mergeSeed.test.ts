import { describe, it, expect } from "vitest";
import { mergeSeed, diffCount } from "./mergeSeed";
import type {
  Card,
  ConversionEdge,
  Currency,
  LoyaltyRule,
  PointCard,
  Store,
  StoreRule,
} from "./types";

const empty = {
  cards: [] as Card[],
  currencies: [] as Currency[],
  stores: [] as Store[],
  rules: [] as StoreRule[],
  edges: [] as ConversionEdge[],
  pointCards: [] as PointCard[],
  loyaltyRules: [] as LoyaltyRule[],
};

const card = (id: string, name: string): Card => ({
  id,
  name,
  defaultRate: 0.01,
  defaultCurrencyId: "x",
});
const cur = (id: string): Currency => ({ id, name: id });

describe("mergeSeed", () => {
  it("空 current ＋ seed → seed の全要素を追加", () => {
    const seed = {
      ...empty,
      cards: [card("a", "A")],
      currencies: [cur("c1"), cur("c2")],
    };
    const result = mergeSeed(empty, seed);
    expect(result.cards).toHaveLength(1);
    expect(result.currencies).toHaveLength(2);
    expect(result.diff.cards).toHaveLength(1);
    expect(result.diff.currencies).toHaveLength(2);
  });

  it("current が seed を完全に含む → 追加なし", () => {
    const items = {
      ...empty,
      cards: [card("a", "A")],
      currencies: [cur("c1")],
    };
    const result = mergeSeed(items, items);
    expect(result.cards).toHaveLength(1);
    expect(result.diff.cards).toHaveLength(0);
    expect(result.diff.currencies).toHaveLength(0);
  });

  it("current にあるアイテムは更新されない（編集を保護）", () => {
    const userCard = card("a", "USER_EDITED_NAME");
    const seedCard = card("a", "SEED_NAME");
    const result = mergeSeed(
      { ...empty, cards: [userCard] },
      { ...empty, cards: [seedCard] },
    );
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe("USER_EDITED_NAME");
    expect(result.diff.cards).toHaveLength(0);
  });

  it("seed にだけある新しいIDは追加される", () => {
    const result = mergeSeed(
      { ...empty, currencies: [cur("c1")] },
      { ...empty, currencies: [cur("c1"), cur("c2"), cur("c3")] },
    );
    expect(result.currencies).toHaveLength(3);
    expect(result.diff.currencies.map((c) => c.id)).toEqual(["c2", "c3"]);
  });

  it("複数カテゴリで同時にマージできる", () => {
    const current = {
      ...empty,
      cards: [card("a", "A")],
      currencies: [cur("c1")],
    };
    const seed = {
      ...empty,
      cards: [card("a", "A"), card("b", "B")],
      currencies: [cur("c1"), cur("c2")],
      stores: [{ id: "s1", name: "Store1" }],
    };
    const result = mergeSeed(current, seed);
    expect(result.cards).toHaveLength(2);
    expect(result.currencies).toHaveLength(2);
    expect(result.stores).toHaveLength(1);
    expect(result.diff.cards.map((c) => c.id)).toEqual(["b"]);
    expect(result.diff.currencies.map((c) => c.id)).toEqual(["c2"]);
    expect(result.diff.stores.map((s) => s.id)).toEqual(["s1"]);
  });
});

describe("diffCount", () => {
  it("各カテゴリの追加件数を合算する", () => {
    const diff = {
      cards: [card("a", "A")],
      currencies: [cur("c1"), cur("c2")],
      stores: [],
      rules: [],
      edges: [],
      pointCards: [],
      loyaltyRules: [],
    };
    expect(diffCount(diff)).toBe(3);
  });

  it("空 diff は 0", () => {
    expect(
      diffCount({
        cards: [],
        currencies: [],
        stores: [],
        rules: [],
        edges: [],
        pointCards: [],
        loyaltyRules: [],
      }),
    ).toBe(0);
  });
});
