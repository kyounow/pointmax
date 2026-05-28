import type {
  BenefitProgram,
  Card,
  ConversionEdge,
  Currency,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreProgramMembership,
} from "./types";

export type SeedShape = {
  cards: Card[];
  currencies: Currency[];
  stores: Store[];
  edges: ConversionEdge[];
  pointCards: PointCard[];
  loyaltyRules: LoyaltyRule[];
  paymentApps: PaymentApp[];
  programs?: BenefitProgram[];
  memberships?: StoreProgramMembership[];
};

export type Diff = SeedShape;

export type MergeResult = SeedShape & { diff: Diff };

type Identifiable = { id: string };

function mergeArray<T extends Identifiable>(
  current: T[],
  next: T[],
): { merged: T[]; added: T[] } {
  if (next.length === 0) return { merged: current, added: [] };
  const existingIds = new Set(current.map((x) => x.id));
  const added = next.filter((x) => !existingIds.has(x.id));
  // 追加 0 件なら current の参照をそのまま返して下流の memo / 参照等価判定を維持
  if (added.length === 0) return { merged: current, added };
  return { merged: [...current, ...added], added };
}

// StoreProgramMembership は id を持たないため (programId, storeId) の複合キーで重複排除
function mergeMemberships(
  current: StoreProgramMembership[],
  next: StoreProgramMembership[],
): { merged: StoreProgramMembership[]; added: StoreProgramMembership[] } {
  if (next.length === 0) return { merged: current, added: [] };
  const existingKeys = new Set(
    current.map((m) => `${m.programId}:${m.storeId}`),
  );
  const added = next.filter(
    (m) => !existingKeys.has(`${m.programId}:${m.storeId}`),
  );
  if (added.length === 0) return { merged: current, added };
  return { merged: [...current, ...added], added };
}

// add-only マージ: seed にあって current に無いID を追加。既存は変更しない。
export function mergeSeed(current: SeedShape, seed: SeedShape): MergeResult {
  const cards = mergeArray(current.cards, seed.cards);
  const currencies = mergeArray(current.currencies, seed.currencies);
  const stores = mergeArray(current.stores, seed.stores);
  const edges = mergeArray(current.edges, seed.edges);
  const pointCards = mergeArray(current.pointCards, seed.pointCards);
  const loyaltyRules = mergeArray(current.loyaltyRules, seed.loyaltyRules);
  const paymentApps = mergeArray(current.paymentApps, seed.paymentApps);
  const programs = mergeArray(current.programs ?? [], seed.programs ?? []);
  const memberships = mergeMemberships(
    current.memberships ?? [],
    seed.memberships ?? [],
  );

  return {
    cards: cards.merged,
    currencies: currencies.merged,
    stores: stores.merged,
    edges: edges.merged,
    pointCards: pointCards.merged,
    loyaltyRules: loyaltyRules.merged,
    paymentApps: paymentApps.merged,
    programs: programs.merged,
    memberships: memberships.merged,
    diff: {
      cards: cards.added,
      currencies: currencies.added,
      stores: stores.added,
      edges: edges.added,
      pointCards: pointCards.added,
      loyaltyRules: loyaltyRules.added,
      paymentApps: paymentApps.added,
      programs: programs.added,
      memberships: memberships.added,
    },
  };
}

export function diffCount(diff: Diff): number {
  return (
    diff.cards.length +
    diff.currencies.length +
    diff.stores.length +
    diff.edges.length +
    diff.pointCards.length +
    diff.loyaltyRules.length +
    diff.paymentApps.length +
    (diff.programs?.length ?? 0) +
    (diff.memberships?.length ?? 0)
  );
}
