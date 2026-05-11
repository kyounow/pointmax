import type {
  Card,
  ConversionEdge,
  Currency,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreRule,
} from "./types";

export type SeedShape = {
  cards: Card[];
  currencies: Currency[];
  stores: Store[];
  rules: StoreRule[];
  edges: ConversionEdge[];
  pointCards: PointCard[];
  loyaltyRules: LoyaltyRule[];
  paymentApps: PaymentApp[];
};

export type Diff = SeedShape;

export type MergeResult = SeedShape & { diff: Diff };

type Identifiable = { id: string };

function mergeArray<T extends Identifiable>(
  current: T[],
  next: T[],
): { merged: T[]; added: T[] } {
  const existingIds = new Set(current.map((x) => x.id));
  const added = next.filter((x) => !existingIds.has(x.id));
  return { merged: [...current, ...added], added };
}

// add-only マージ: seed にあって current に無いID を追加。既存は変更しない。
export function mergeSeed(current: SeedShape, seed: SeedShape): MergeResult {
  const cards = mergeArray(current.cards, seed.cards);
  const currencies = mergeArray(current.currencies, seed.currencies);
  const stores = mergeArray(current.stores, seed.stores);
  const rules = mergeArray(current.rules, seed.rules);
  const edges = mergeArray(current.edges, seed.edges);
  const pointCards = mergeArray(current.pointCards, seed.pointCards);
  const loyaltyRules = mergeArray(current.loyaltyRules, seed.loyaltyRules);
  const paymentApps = mergeArray(current.paymentApps, seed.paymentApps);

  return {
    cards: cards.merged,
    currencies: currencies.merged,
    stores: stores.merged,
    rules: rules.merged,
    edges: edges.merged,
    pointCards: pointCards.merged,
    loyaltyRules: loyaltyRules.merged,
    paymentApps: paymentApps.merged,
    diff: {
      cards: cards.added,
      currencies: currencies.added,
      stores: stores.added,
      rules: rules.added,
      edges: edges.added,
      pointCards: pointCards.added,
      loyaltyRules: loyaltyRules.added,
      paymentApps: paymentApps.added,
    },
  };
}

export function diffCount(diff: Diff): number {
  return (
    diff.cards.length +
    diff.currencies.length +
    diff.stores.length +
    diff.rules.length +
    diff.edges.length +
    diff.pointCards.length +
    diff.loyaltyRules.length +
    diff.paymentApps.length
  );
}
