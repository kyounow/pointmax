import type {
  BenefitProgram,
  Card,
  ConversionEdge,
  Currency,
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
   * 誤 merge された StoreProgramMembership の tombstone (seed-blocklist の
   * REMOVED_MEMBERSHIP_IDS)。v6 で membership に id (`m-{programId}-{storeId}`)
   * が付いたため、他エンティティ (cards / programs 等) と同じ id 完全一致で
   * 除去する (#103 の general 混入対応)。対象は公式 id (m-prog-* 等) の
   * membership のみを想定しており、ユーザー作成分は UUID programId 由来で
   * id が衝突せず安全。userModifiedAt チェックは行わない (単体事故対応のため)。
   */
  removedMembershipIds?: ReadonlyArray<string>;
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
   * PR-0a-2b: 公式値で内容更新された既存 membership (updatedPrograms の membership 版)。
   * 「seed に同 id が存在 + ローカルが未編集 (userModifiedAt なし) + 内容が異なる」場合に
   * seed 側の値へ置換した分 (notes / channel / overrideRate 等の公式修正が既存端末に届く経路)。
   * 同じ merge で tombstone 除去された行は含めない。
   */
  updatedMemberships: StoreProgramMembership[];
  /**
   * PR-0a-2b: removedMembershipIds (単体 id tombstone) により除去された membership の行。
   * digest (memD:) と削除グループの表示に id・programId・storeId が要るため件数ではなく行で持つ。
   * removedMembershipCount (program tombstone の cascade 分) とは別集計。
   */
  removedMemberships: StoreProgramMembership[];
  /**
   * removedMemberships.length と同値 (PR-0a-2b 以前の件数フィールド。互換のため残す)。
   */
  removedMembershipIdCount: number;
  /**
   * updatedPrograms のうち scope (all-stores ⇄ member-stores) が変わった program の id
   * (PR-4b)。scope 変更は「適用範囲そのものの再定義」= 大きな変更なので、自動反映の
   * 安全判定 (isAutoApplySafe) で unsafe 扱い (従来モーダルで確認) にするために別集計する。
   * rate 改定・期間延長など scope を変えない更新は空配列のまま (= 自動反映の対象)。
   */
  scopeChangedUpdateIds: string[];
  /**
   * PR-0a-2b: 内容更新のうち自フィールド `channel` (購入チャネル) が変わった program /
   * membership の id。店頭計算に載る・載らないが変わる (還元の見え方が大きく変わる) ので、
   * scope 変更と同じく自動反映の安全判定で unsafe 扱い (従来モーダルで確認) にする。
   */
  channelChangedUpdateIds: string[];
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

// R1 (PR-1d): program の per-user preference キー。seed/master には出荷されず
// (generate-master で strip)、ローカル (ユーザーの opt-in ON/OFF) が所有する。
// 公式更新の差分比較・伝播からは除外し、置換時は carry-over する。
const PROGRAM_PREFERENCE_KEYS = ["enabled"] as const satisfies ReadonlyArray<
  keyof BenefitProgram
>;

// PR-5a: META キー = 公式が出荷するが「内容 (還元の条件・率) ではない」管理用の値。
// 確認月 (lastVerifiedAt) や情報源 URL (officialUrl) だけが変わった seed 更新を「内容更新」と
// 数えると、四半期チェックで確認月を一斉に更新しただけで全端末に『内容更新 N 件』の通知が出る。
// そのため公式差分の比較 (propagate) と既読指紋 (syncDigest の progU) の正規形から除外する。
// 表示側は同梱 seed を直接参照して解決する (edgeFreshness.resolveVerifiedMonth / 特典画面の URL)。
// 内容に実際の差分がある週は従来どおり official を丸ごと採るので、その時に meta も一緒に届く。
// ⚠ この除外は seed に meta を書き込むコミットより必ず先に入れる (後だと書き込みが通知になる)。
export const PROGRAM_META_KEYS = [
  "lastVerifiedAt",
  "officialUrl",
] as const satisfies ReadonlyArray<keyof BenefitProgram>;

// PR-5a: edge の META キー。edge は現状 add-only (公式修正は MIGRATIONS の updateField で配信し、
// 内容比較をしない) なので、この定数を参照する比較はまだ無い。将来 propagateEdgeUpdates を足すとき、
// および PR-5b の MIGRATIONS 設計 (確認月だけの更新を updateField にしない) がこの定数に従う。
export const EDGE_META_KEYS = [
  "lastVerifiedAt",
] as const satisfies ReadonlyArray<keyof ConversionEdge>;

// PR-5a (B11): card の META キー (Card.lastVerifiedAt = 基本還元率の確認月)。cards も add-only で
// 比較しないため参照先はまだ無い。将来の propagateCardUpdates と 5b の MIGRATIONS 設計が参照する。
export const CARD_META_KEYS = [
  "lastVerifiedAt",
] as const satisfies ReadonlyArray<keyof Card>;

// preference キー (enabled) と META キー (lastVerifiedAt / officialUrl) を除いた正規形で
// stableStringify する。enabled はローカル所有キーなので「公式差分あり」の判定に含めない
// (ユーザーが opt-in を ON にしただけで公式更新と誤検知しないため)。META キーは上記の理由。
// userModifiedAt は propagate 前段で早期 return 済のためここでは考慮不要だが、
// 念のため正規形からも外す (公式は出荷しないキー)。
// PR-0a-2b: syncDigest の progU 指紋 (内容ハッシュ) も同じ正規形を使うため export する
// (rate / 期間だけでなく channel / conditions / notes だけの公式更新も別 digest になる。
// 逆に META キーだけの差は同じ digest = 通知も自動反映も起きない)。
export function stableStringifyProgramContent(p: BenefitProgram): string {
  const rec = { ...p } as Record<string, unknown>;
  for (const k of PROGRAM_PREFERENCE_KEYS) delete rec[k];
  for (const k of PROGRAM_META_KEYS) delete rec[k];
  delete rec.userModifiedAt;
  return stableStringify(rec);
}

// 公式更新 (incoming) を採用する際、local の preference キー (enabled) を carry-over
// した正規形を返す。incoming が当該キーを **持たない** (= seed/master の R1 出荷) 場合のみ
// local の値を引き継ぐ。incoming が明示する場合 (ユーザー export 等) はそちらを尊重。
// preferenceMerge.preservePreferences (cards 用) の program 版で、意味は同一。
function withProgramPreferencesPreserved(
  local: BenefitProgram,
  incoming: BenefitProgram,
): BenefitProgram {
  const localRec = local as Record<string, unknown>;
  const incomingRec = incoming as Record<string, unknown>;
  let changed = false;
  const merged: Record<string, unknown> = { ...incomingRec };
  for (const k of PROGRAM_PREFERENCE_KEYS) {
    if (!(k in incomingRec) && localRec[k] !== undefined) {
      merged[k] = localRec[k];
      changed = true;
    }
  }
  return (changed ? merged : incoming) as BenefitProgram;
}

// 公式 program の内容更新をローカルコピーに伝播する。
// 対象: seed に同 id が存在 + ローカルが未編集 (userModifiedAt なし) + 内容差分あり。
// ユーザー編集済み (userModifiedAt あり) は保護 (「公式に戻す」で復元可能な既存規約)。
// 変更が無ければ入力配列の参照をそのまま返す (no-op 時の memo 維持)。
//
// R1 (PR-1d): 内容差分は preference キー (enabled) を除いた正規形で比較し、公式更新を
// 採用する時は local の enabled を carry-over する。これにより「ユーザーが ON にした
// opt-in program に公式が rate 改定を出す」→ 更新は届くが enabled は維持される。
// 逆に「enabled だけが違う」ケースは公式差分ゼロと判定され誤って updated 扱いしない。
function propagateProgramUpdates(
  merged: BenefitProgram[],
  seedPrograms: BenefitProgram[],
): {
  programs: BenefitProgram[];
  updated: BenefitProgram[];
  scopeChangedIds: string[];
  channelChangedIds: string[];
} {
  if (seedPrograms.length === 0)
    return {
      programs: merged,
      updated: [],
      scopeChangedIds: [],
      channelChangedIds: [],
    };
  const seedById = new Map(seedPrograms.map((p) => [p.id, p]));
  const updated: BenefitProgram[] = [];
  // PR-4b: 更新のうち scope が変わったものの id を集める (自動反映の安全判定用)。
  const scopeChangedIds: string[] = [];
  // PR-0a-2b: 同じく channel (購入チャネル) が変わったものの id。
  const channelChangedIds: string[] = [];
  const next = merged.map((p) => {
    if (p.userModifiedAt !== undefined) return p;
    const official = seedById.get(p.id);
    if (official === undefined) return p;
    if (stableStringifyProgramContent(p) === stableStringifyProgramContent(official))
      return p;
    // 公式差分あり: 通知リストには公式値を積み、実体は local の enabled を carry-over。
    if (p.scope !== official.scope) scopeChangedIds.push(official.id);
    if (p.channel !== official.channel) channelChangedIds.push(official.id);
    updated.push(official);
    return withProgramPreferencesPreserved(p, official);
  });
  if (updated.length === 0)
    return { programs: merged, updated, scopeChangedIds, channelChangedIds };
  return { programs: next, updated, scopeChangedIds, channelChangedIds };
}

// membership の内容比較用の正規形。userModifiedAt はローカル所有 (公式は出荷しない) なので
// 除外する。membership には per-user preference キーが無いので program 版より単純。
function stableStringifyMembershipContent(m: StoreProgramMembership): string {
  const rec = { ...m } as Record<string, unknown>;
  delete rec.userModifiedAt;
  return stableStringify(rec);
}

// PR-0a-2b: 公式 membership の内容更新 (notes / channel / overrideRate / overrideCurrencyId) を
// ローカルコピーに伝播する。propagateProgramUpdates と同じ規約:
//   対象 = seed に同 id が存在 + ローカルが未編集 (userModifiedAt なし) + 内容差分あり。
//   ユーザー編集済み (userModifiedAt あり) は保護。ユーザー作成 program (UUID) の membership は
//   id が seed と衝突しないので構造的に対象外。
// 変更が無ければ入力配列の参照をそのまま返す (no-op 時の memo 維持)。
function propagateMembershipUpdates(
  merged: StoreProgramMembership[],
  seedMemberships: StoreProgramMembership[],
): {
  memberships: StoreProgramMembership[];
  updated: StoreProgramMembership[];
  channelChangedIds: string[];
} {
  if (seedMemberships.length === 0)
    return { memberships: merged, updated: [], channelChangedIds: [] };
  const seedById = new Map(seedMemberships.map((m) => [m.id, m]));
  const updated: StoreProgramMembership[] = [];
  const channelChangedIds: string[] = [];
  const next = merged.map((m) => {
    if (m.userModifiedAt !== undefined) return m;
    const official = seedById.get(m.id);
    if (official === undefined) return m;
    if (
      stableStringifyMembershipContent(m) ===
      stableStringifyMembershipContent(official)
    )
      return m;
    if (m.channel !== official.channel) channelChangedIds.push(official.id);
    updated.push(official);
    return official;
  });
  if (updated.length === 0)
    return { memberships: merged, updated, channelChangedIds };
  return { memberships: next, updated, channelChangedIds };
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

// removedMembershipIds (単体 membership tombstone) の適用。
// membership.id 完全一致のものを filter で除去する。
// removedProgramIds の cascade 除去 (program 経由) とは別経路
// (誤 merge された特定 membership 単体を狙い撃ちする用途)。
// 除去が無ければ入力配列の参照をそのまま返す。
// PR-0a-2b: 除去した行も返す (digest の memD: と「提携店舗の削除」表示に使う)。
function applyMembershipIdRemovals(
  memberships: StoreProgramMembership[],
  removedIds: ReadonlyArray<string>,
): {
  memberships: StoreProgramMembership[];
  removed: StoreProgramMembership[];
} {
  if (removedIds.length === 0) {
    return { memberships, removed: [] };
  }
  const tombstones = new Set(removedIds);
  const removed = memberships.filter((m) => tombstones.has(m.id));
  if (removed.length === 0) {
    return { memberships, removed };
  }
  return {
    memberships: memberships.filter((m) => !tombstones.has(m.id)),
    removed,
  };
}

// 公式 seed とローカル state のマージ:
//   1. add-only: seed にあって current に無い ID を追加 (従来挙動)
//   2. 更新伝播: 公式由来 + 未編集の program は seed の最新内容に置換 (Phase 5)
//   3. 更新伝播: 公式由来 + 未編集の membership も同様に置換 (PR-0a-2b)
//   4. tombstone: removedProgramIds の program + memberships を除去 (Phase 5)
//   5. membership tombstone: removedMembershipIds の membership 単体を除去 (#103 対応)
// ユーザー編集済みレコード (userModifiedAt あり) は 2/3/4 の対象外として保護。
// cards / edges 等の他エンティティは add-only のまま (公式修正は MIGRATIONS で配信)。
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
  const paymentApps = mergeArray(current.paymentApps, seed.paymentApps);
  const programsMerge = mergeArray(current.programs ?? [], seed.programs ?? []);
  // v6: membership も id を持つため他エンティティと同じ id ベースで追加分を merge。
  // 既存 id の内容更新は下の propagateMembershipUpdates (PR-0a-2b) が担う。
  const membershipsMerge = mergeArray(
    current.memberships ?? [],
    seed.memberships ?? [],
  );

  const {
    programs: updatedPropagated,
    updated: updatedPrograms,
    scopeChangedIds: scopeChangedUpdateIds,
    channelChangedIds: programChannelChangedIds,
  } = propagateProgramUpdates(programsMerge.merged, seed.programs ?? []);

  const membershipPropagation = propagateMembershipUpdates(
    membershipsMerge.merged,
    seed.memberships ?? [],
  );

  const removal = applyProgramRemovals(
    updatedPropagated,
    membershipPropagation.memberships,
    opts?.removedProgramIds ?? [],
  );

  const membershipIdRemoval = applyMembershipIdRemovals(
    removal.memberships,
    opts?.removedMembershipIds ?? [],
  );

  // 伝播した後で tombstone 除去された membership は「更新」として数えない
  // (除去のほうが勝つ。件数・digest の二重計上を避ける)。除去が無い通常時は素通し。
  const finalMemberships = membershipIdRemoval.memberships;
  let updatedMemberships = membershipPropagation.updated;
  let membershipChannelChangedIds = membershipPropagation.channelChangedIds;
  if (
    updatedMemberships.length > 0 &&
    finalMemberships.length < membershipPropagation.memberships.length
  ) {
    const survivingIds = new Set(finalMemberships.map((m) => m.id));
    updatedMemberships = updatedMemberships.filter((m) => survivingIds.has(m.id));
    membershipChannelChangedIds = membershipChannelChangedIds.filter((id) =>
      survivingIds.has(id),
    );
  }

  return {
    cards: cards.merged,
    currencies: currencies.merged,
    stores: stores.merged,
    edges: edges.merged,
    pointCards: pointCards.merged,
    paymentApps: paymentApps.merged,
    programs: removal.programs,
    memberships: finalMemberships,
    diff: {
      cards: cards.added,
      currencies: currencies.added,
      stores: stores.added,
      edges: edges.added,
      pointCards: pointCards.added,
      paymentApps: paymentApps.added,
      programs: programsMerge.added,
      memberships: membershipsMerge.added,
    },
    updatedPrograms,
    removedPrograms: removal.removed,
    removedMembershipCount: removal.removedMembershipCount,
    updatedMemberships,
    removedMemberships: membershipIdRemoval.removed,
    removedMembershipIdCount: membershipIdRemoval.removed.length,
    scopeChangedUpdateIds,
    channelChangedUpdateIds: [
      ...programChannelChangedIds,
      ...membershipChannelChangedIds,
    ],
  };
}

export function diffCount(diff: Diff): number {
  return (
    diff.cards.length +
    diff.currencies.length +
    diff.stores.length +
    diff.edges.length +
    diff.pointCards.length +
    diff.paymentApps.length +
    (diff.programs?.length ?? 0) +
    (diff.memberships?.length ?? 0)
  );
}

/**
 * 追加 + 内容更新 + 削除を合算した「ユーザーに通知すべき変更」の総数。
 * PR-0a-2b: membership の内容更新 (updatedMemberships) と単体 tombstone 削除
 * (removedMemberships) も数える (以前は 0 件扱いで、membership 削除だけの週は
 * モーダルが出ず反映もされなかった)。program tombstone の cascade 分は program 側で数える。
 */
export function changeCount(result: MergeResult): number {
  return (
    diffCount(result.diff) +
    result.updatedPrograms.length +
    result.removedPrograms.length +
    result.updatedMemberships.length +
    result.removedMemberships.length
  );
}
