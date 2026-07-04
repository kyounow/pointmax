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

export type MergeOptions = {
  /**
   * 公式 seed から削除済みの program id (tombstone、seed-additions の
   * REMOVED_PROGRAM_IDS)。公式由来かつ未編集 (userModifiedAt なし) の
   * ローカルコピーを除去し、その program を参照する memberships も
   * cascade 除去する (改善計画 Phase 5 / C-3)。
   * ユーザーが編集した program (userModifiedAt あり) は保護され除去しない。
   */
  removedProgramIds?: ReadonlyArray<string>;
  /**
   * 誤 merge された StoreProgramMembership の tombstone (seed-additions の
   * REMOVED_MEMBERSHIP_KEYS)。StoreProgramMembership は id を持たない複合キー
   * (programId+storeId) レコードのため、removedProgramIds の id ベース delete
   * とは別に「programId|storeId」キー完全一致で除去する (#103 の general
   * 混入対応)。対象は公式 id (prog-* 等) の membership のみを想定しており、
   * ユーザー作成分は UUID programId のためキーが衝突せず安全。
   * userModifiedAt チェックは行わない (membership 自体に編集概念が無いため)。
   */
  removedMembershipKeys?: ReadonlyArray<string>;
};

export type MergeResult = SeedShape & {
  diff: Diff;
  /**
   * 公式値で内容更新された既存 program (Phase 5 / B-1 の伝播)。
   * 「seed に同 id が存在 + ローカルが未編集 (userModifiedAt なし) +
   * 内容が異なる」場合に seed 側の値へ置換した分。キャンペーンの
   * rate 改定・期間延長 (PROGRAM_OVERRIDES) が既存ユーザーに届く経路。
   */
  updatedPrograms: BenefitProgram[];
  /** tombstone (removedProgramIds) により除去された program */
  removedPrograms: BenefitProgram[];
  /** cascade 除去された membership 数 */
  removedMembershipCount: number;
  /**
   * removedMembershipKeys (単体キー tombstone) により除去された membership 数。
   * removedMembershipCount (program tombstone の cascade 分) とは別集計。
   */
  removedMembershipKeyCount: number;
};

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

// 内容比較用の安定 stringify。persist/restore でキー順序が変わっても
// 同内容なら同文字列になるよう、キーを再帰的にソートする。
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const entries = Object.entries(v as Record<string, unknown>)
    .filter(([, val]) => val !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, val]) => `${JSON.stringify(k)}:${stableStringify(val)}`)
    .join(",")}}`;
}

// 公式 program の内容更新をローカルコピーに伝播する。
// 対象: seed に同 id が存在 + ローカルが未編集 (userModifiedAt なし) + 内容差分あり。
// ユーザー編集済み (userModifiedAt あり) は保護 (「公式に戻す」で復元可能な既存規約)。
// 変更が無ければ入力配列の参照をそのまま返す (no-op 時の memo 維持)。
function propagateProgramUpdates(
  merged: BenefitProgram[],
  seedPrograms: BenefitProgram[],
): { programs: BenefitProgram[]; updated: BenefitProgram[] } {
  if (seedPrograms.length === 0) return { programs: merged, updated: [] };
  const seedById = new Map(seedPrograms.map((p) => [p.id, p]));
  const updated: BenefitProgram[] = [];
  const next = merged.map((p) => {
    if (p.userModifiedAt !== undefined) return p;
    const official = seedById.get(p.id);
    if (official === undefined) return p;
    if (stableStringify(p) === stableStringify(official)) return p;
    updated.push(official);
    return official;
  });
  if (updated.length === 0) return { programs: merged, updated };
  return { programs: next, updated };
}

// tombstone (removedProgramIds) の適用。公式由来かつ未編集の program を除去し、
// その program を参照する memberships を cascade 除去する。
// 除去が無ければ入力配列の参照をそのまま返す。
function applyProgramRemovals(
  programs: BenefitProgram[],
  memberships: StoreProgramMembership[],
  removedProgramIds: ReadonlyArray<string>,
): {
  programs: BenefitProgram[];
  memberships: StoreProgramMembership[];
  removed: BenefitProgram[];
  removedMembershipCount: number;
} {
  if (removedProgramIds.length === 0) {
    return { programs, memberships, removed: [], removedMembershipCount: 0 };
  }
  const tombstones = new Set(removedProgramIds);
  const removed = programs.filter(
    (p) => tombstones.has(p.id) && p.userModifiedAt === undefined,
  );
  if (removed.length === 0) {
    return { programs, memberships, removed, removedMembershipCount: 0 };
  }
  const removedIds = new Set(removed.map((p) => p.id));
  const nextPrograms = programs.filter((p) => !removedIds.has(p.id));
  const nextMemberships = memberships.filter(
    (m) => !removedIds.has(m.programId),
  );
  return {
    programs: nextPrograms,
    memberships: nextMemberships,
    removed,
    removedMembershipCount: memberships.length - nextMemberships.length,
  };
}

// removedMembershipKeys (単体 membership tombstone) の適用。
// "programId|storeId" キー完全一致のものを filter で除去する。
// StoreProgramMembership は id を持たないため removedProgramIds の cascade
// 除去 (program 経由) とは別経路 (誤 merge された特定 membership 単体を狙い撃ちする用途)。
// 除去が無ければ入力配列の参照をそのまま返す。
function applyMembershipKeyRemovals(
  memberships: StoreProgramMembership[],
  removedKeys: ReadonlyArray<string>,
): { memberships: StoreProgramMembership[]; removedCount: number } {
  if (removedKeys.length === 0) {
    return { memberships, removedCount: 0 };
  }
  const tombstones = new Set(removedKeys);
  const next = memberships.filter(
    (m) => !tombstones.has(`${m.programId}|${m.storeId}`),
  );
  if (next.length === memberships.length) {
    return { memberships, removedCount: 0 };
  }
  return { memberships: next, removedCount: memberships.length - next.length };
}

// 公式 seed とローカル state のマージ:
//   1. add-only: seed にあって current に無い ID を追加 (従来挙動)
//   2. 更新伝播: 公式由来 + 未編集の program は seed の最新内容に置換 (Phase 5)
//   3. tombstone: removedProgramIds の program + memberships を除去 (Phase 5)
//   4. membership tombstone: removedMembershipKeys の membership 単体を除去 (#103 対応)
// ユーザー編集済みレコード (userModifiedAt あり) は 2/3 の対象外として保護。
// (4 は membership 自体に編集概念が無いため userModifiedAt 保護の対象外)
export function mergeSeed(
  current: SeedShape,
  seed: SeedShape,
  opts?: MergeOptions,
): MergeResult {
  const cards = mergeArray(current.cards, seed.cards);
  const currencies = mergeArray(current.currencies, seed.currencies);
  const stores = mergeArray(current.stores, seed.stores);
  const edges = mergeArray(current.edges, seed.edges);
  const pointCards = mergeArray(current.pointCards, seed.pointCards);
  const loyaltyRules = mergeArray(current.loyaltyRules, seed.loyaltyRules);
  const paymentApps = mergeArray(current.paymentApps, seed.paymentApps);
  const programsMerge = mergeArray(current.programs ?? [], seed.programs ?? []);
  const membershipsMerge = mergeMemberships(
    current.memberships ?? [],
    seed.memberships ?? [],
  );

  const { programs: updatedPropagated, updated: updatedPrograms } =
    propagateProgramUpdates(programsMerge.merged, seed.programs ?? []);

  const removal = applyProgramRemovals(
    updatedPropagated,
    membershipsMerge.merged,
    opts?.removedProgramIds ?? [],
  );

  const membershipKeyRemoval = applyMembershipKeyRemovals(
    removal.memberships,
    opts?.removedMembershipKeys ?? [],
  );

  return {
    cards: cards.merged,
    currencies: currencies.merged,
    stores: stores.merged,
    edges: edges.merged,
    pointCards: pointCards.merged,
    loyaltyRules: loyaltyRules.merged,
    paymentApps: paymentApps.merged,
    programs: removal.programs,
    memberships: membershipKeyRemoval.memberships,
    diff: {
      cards: cards.added,
      currencies: currencies.added,
      stores: stores.added,
      edges: edges.added,
      pointCards: pointCards.added,
      loyaltyRules: loyaltyRules.added,
      paymentApps: paymentApps.added,
      programs: programsMerge.added,
      memberships: membershipsMerge.added,
    },
    updatedPrograms,
    removedPrograms: removal.removed,
    removedMembershipCount: removal.removedMembershipCount,
    removedMembershipKeyCount: membershipKeyRemoval.removedCount,
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

/** 追加 + 内容更新 + 削除を合算した「ユーザーに通知すべき変更」の総数。 */
export function changeCount(result: MergeResult): number {
  return (
    diffCount(result.diff) +
    result.updatedPrograms.length +
    result.removedPrograms.length
  );
}
