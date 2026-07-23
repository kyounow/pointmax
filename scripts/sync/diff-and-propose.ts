// 全 sources/extracted/*.json を読み、現在の seed と突合して
// sources/proposed-migrations.json を生成する CLI エントリポイント。
//
// 流れ:
//   seed() + extracted/*.json
//     ↓ propose<Entity>: addRecord / updateField / referenceChange を提案
//        (個別ロジックは scripts/sync/propose-helpers.ts に分割)
//     ↓ dedupeAcrossProposals: 同 run 内の同 name/id を idCollision に格下げ
//     ↓ applyCategoryCap: stores の新規追加をカテゴリあたり N 件に制限 (Q2-C)
//     ↓ classify: reviewReason が無いものを autoApplicable へ
//     ↓ ProposalReport を proposed-migrations.json に書き出し
//
// 使い方:
//   npm run sync:propose                  # デフォルト: cap = 5/category
//   CAP_PER_CATEGORY=10 npm run sync:propose
//   CAP_PER_CATEGORY=0  npm run sync:propose # cap 無効

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import { seed, SEED_VERSION } from "../../src/state/seed";
import type {
  AddRecordProposal,
  ExtractedSource,
  Proposal,
  ProposalReport,
  RegistryFile,
} from "./types";
import { computeProposalId, isApplicableProposal } from "./types";
import {
  proposeCards,
  proposeExpiredCampaignDeletions,
  proposeJalTokuyakuMemberships,
  proposeMemberships,
  proposePaymentApps,
  proposePrograms,
  proposeStores,
} from "./propose-helpers";
import { resolveCardId, resolveStoreId } from "./aliases";
import { isChainLikeStore } from "./chain-store-detection";
import type { SeedShape } from "../../src/domain/mergeSeed";

// 再エクスポート (テスト互換性のため diff-and-propose 経由で参照される旧APIを温存)
export {
  proposeCards,
  proposeExpiredCampaignDeletions,
  proposeJalTokuyakuMemberships,
  proposeMemberships,
  proposePaymentApps,
  proposePrograms,
  proposeStores,
};

// ───────────────────────────────────────────────────────────────
// Paths / config
// ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const EXTRACTED_DIR = resolve(REPO_ROOT, "sources/extracted");
const OUTPUT_PATH = resolve(REPO_ROOT, "sources/proposed-migrations.json");
const REGISTRY_PATH = resolve(REPO_ROOT, "sources/registry.yaml");

const DEFAULT_CAP_PER_CATEGORY = 5;

function readCapPerCategory(): number | null {
  const raw = process.env.CAP_PER_CATEGORY;
  if (raw == null) return DEFAULT_CAP_PER_CATEGORY;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return DEFAULT_CAP_PER_CATEGORY;
  return n === 0 ? null : n; // 0 で cap 無効
}

// ───────────────────────────────────────────────────────────────
// Extracted loader + failure detection
// ───────────────────────────────────────────────────────────────

function readExtractedSources(): ExtractedSource[] {
  let files: string[];
  try {
    files = readdirSync(EXTRACTED_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const result: ExtractedSource[] = [];
  for (const f of files) {
    const text = readFileSync(resolve(EXTRACTED_DIR, f), "utf-8");
    try {
      result.push(JSON.parse(text) as ExtractedSource);
    } catch (e) {
      console.warn(`  ⚠️ ${f}: JSON 解析失敗 - スキップ (${(e as Error).message})`);
    }
  }
  return result;
}

// notes / 配列空 から fetch 失敗を判定。雑だが運用には十分。
export function isFailedExtraction(d: ExtractedSource): boolean {
  if (!d.notes) return false;
  const failurePatterns: RegExp[] = [
    /could not be fetched/i,
    /unable to.*(extract|read)/i,
    /URL.*(could not|unable).*load/i,
    /取得できま(せん|せんで)/,
    /アクセスできま(せん|せんで)/,
  ];
  return failurePatterns.some((p) => p.test(d.notes ?? ""));
}

// ───────────────────────────────────────────────────────────────
// ID 正規化 (aliases.json に基づく cardId / storeId 揺れ補正)
// ───────────────────────────────────────────────────────────────

export function normalizeIds(ex: ExtractedSource): ExtractedSource {
  return {
    ...ex,
    cards: ex.cards?.map((c) => ({ ...c, cardId: resolveCardId(c.cardId) })),
    categoryRules: ex.categoryRules?.map((r) => ({ ...r, cardId: resolveCardId(r.cardId) })),
    stores: ex.stores?.map((s) => ({ ...s, storeId: resolveStoreId(s.storeId) })),
    loyaltyRules: ex.loyaltyRules?.map((r) => ({
      ...r,
      storeId: r.storeId ? resolveStoreId(r.storeId) : r.storeId,
    })),
    programs: ex.programs?.map((p) => ({
      ...p,
      cardIds: p.cardIds?.map((id) => resolveCardId(id)),
    })),
    memberships: ex.memberships?.map((m) => ({
      ...m,
      storeId: m.storeId ? resolveStoreId(m.storeId) : m.storeId,
    })),
  };
}

// ───────────────────────────────────────────────────────────────
// Within-run dedup (Phase C MUST-fix)
// ───────────────────────────────────────────────────────────────
// 同一 propose 実行内で複数 source から「同じ name の store」が提案される
// ケースを名寄せする。例: rakuten が "ローソンストア100" を storeId="lawson-store100"
// で出してきた直後に、ponta が同じ店を "lawson-store-100" で出してくる。
// 既存 seed と比較する existingNames だけだとどちらも未存在で通過してしまうので、
// 「先に通過した proposal の name/id」を後続の比較対象に積み増す。
//
// 同 name / 同 id がぶつかった 2 つ目以降は reviewReason=idCollision に格下げ。

export function dedupeAcrossProposals(proposals: Proposal[]): {
  proposals: Proposal[];
  collisions: number;
} {
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  let collisions = 0;
  const out: Proposal[] = [];

  for (const p of proposals) {
    if (p.type !== "addRecord" || p.collection !== "stores") {
      out.push(p);
      continue;
    }
    const r = (p as AddRecordProposal).record as {
      id?: string;
      name?: string;
    };
    const id = typeof r.id === "string" ? r.id : undefined;
    const name = typeof r.name === "string" ? r.name : undefined;
    const dup = (id && seenIds.has(id)) || (name && seenNames.has(name));
    if (dup) {
      // 2 件目以降は idCollision に格下げ (元の reviewReason より優先)
      out.push({ ...p, reviewReason: "idCollision" } as Proposal);
      collisions += 1;
    } else {
      out.push(p);
    }
    if (id) seenIds.add(id);
    if (name) seenNames.add(name);
  }
  return { proposals: out, collisions };
}

// ───────────────────────────────────────────────────────────────
// Category cap (Q2-C: 大量の stores 新規追加を categoryあたり N 件に絞る)
// ───────────────────────────────────────────────────────────────

export function applyCategoryCap(
  proposals: Proposal[],
  cap: number,
): { kept: Proposal[]; deferred: Proposal[] } {
  // 対象: addRecord × stores のみ
  const counts = new Map<string, number>();
  const kept: Proposal[] = [];
  const deferred: Proposal[] = [];

  // 安定性のため、stores の addRecord を storeId でソートしてから cap 適用
  const sortable: Proposal[] = [];
  const others: Proposal[] = [];
  for (const p of proposals) {
    if (p.type === "addRecord" && p.collection === "stores") {
      sortable.push(p);
    } else {
      others.push(p);
    }
  }
  sortable.sort((a, b) =>
    String((a as AddRecordProposal).record.id).localeCompare(
      String((b as AddRecordProposal).record.id),
    ),
  );

  for (const p of sortable) {
    const cat =
      ((p as AddRecordProposal).record.category as string | undefined) ??
      "(未分類)";
    const n = (counts.get(cat) ?? 0) + 1;
    counts.set(cat, n);
    if (n <= cap) {
      kept.push(p);
    } else {
      deferred.push(p);
    }
  }
  return { kept: [...others, ...kept], deferred };
}

// ───────────────────────────────────────────────────────────────
// Orphan membership guard
// ───────────────────────────────────────────────────────────────
// category cap や idCollision 等で store / program 本体が auto 通過しなかった
// 場合、同 run の membership 提案が「本体なし」のまま auto-merge されると
// seed に孤児 membership が残る (UI で名前解決できない・履歴で slug fallback)。
// 特に proposePrograms は新規 program に必ず idCollision を付けるため、
// その program を参照する membership は本ガードが無いと自動で seed に流れてしまう。
//
// 防止策: membership の storeId / programId が「既存 seed」or「同 run の auto
// 候補 store/program」どちらにも含まれなければ降格させる:
//   - storeId 不在 → reviewReason="missingStoreBody"
//   - programId 不在 → reviewReason="missingProgramBody"
//   - 両方不在の場合は store 側を優先 (storeId 不明の方が UX 影響大)

// ───────────────────────────────────────────────────────────────
// Chain-store auto-merge promote (C-9、PR #56 部分解除)
// ───────────────────────────────────────────────────────────────
// PR #56 で「新規 store の auto-merge 全停止 (storeAdditionsDisabled)」を確定したが、
// ユーザー指示 (2026-05-28) で「キャンペーンが実施されるような層 (チェーン店等) は
// auto-merge OK」に方針を緩める。
//
// 復帰条件 (AND):
//   (a) 同 run の auto 候補 program (campaign 系 = validTo を持つ) に membership 参照
//   (b) チェーン名パターン or chain-heavy category (isChainLikeStore で判定)
//
// (a) は store 単独抽出を排除 (= 注目度の高い store だけ通す)、(b) は明確な
// チェーン業態のみ通す。両方満たすときのみ storeAdditionsDisabled を解除。

export function promoteChainStoreAutoMerge(
  proposals: Proposal[],
  current: SeedShape,
): { proposals: Proposal[]; promoted: number } {
  // 同 run の campaign 系 (validTo 持ち) program の id を集計。
  // 注意: proposePrograms は新規 program に必ず idCollision を付けるため、
  // ここで reviewReason フィルタはしない (= reviewReason の有無に関わらず campaign
  // 候補として扱う)。「campaign program が同 run に含まれる」だけが条件。
  const sameRunCampaignProgramIds = new Set<string>();
  // storeId → 同 run の membership が参照する programId 集合 (同 run 限定の正反映確認)
  const membershipsByStore = new Map<string, Set<string>>();

  for (const p of proposals) {
    if (p.type !== "addRecord") continue;
    const rec = (p as AddRecordProposal).record;

    if (p.collection === "programs") {
      const id = typeof rec.id === "string" ? rec.id : null;
      const validTo = typeof rec.validTo === "string" ? rec.validTo : null;
      // campaign 系 program = 終了日を持つ
      if (id && validTo) sameRunCampaignProgramIds.add(id);
    } else if (p.collection === "memberships") {
      // membership 側も reviewReason 不問 (auto/review に関わらず参照関係を見る)
      const storeId = typeof rec.storeId === "string" ? rec.storeId : null;
      const programId = typeof rec.programId === "string" ? rec.programId : null;
      if (storeId && programId) {
        let set = membershipsByStore.get(storeId);
        if (!set) {
          set = new Set();
          membershipsByStore.set(storeId, set);
        }
        set.add(programId);
      }
    }
  }

  let promoted = 0;
  const out: Proposal[] = proposals.map((p) => {
    if (p.type !== "addRecord") return p;
    if (p.collection !== "stores") return p;
    if (p.reviewReason !== "storeAdditionsDisabled") return p;

    const rec = (p as AddRecordProposal).record;
    const storeId = typeof rec.id === "string" ? rec.id : null;
    const name = typeof rec.name === "string" ? rec.name : "";
    const category = typeof rec.category === "string" ? rec.category : undefined;
    if (!storeId) return p;

    // 条件 (a): 同 run の campaign program に membership 参照されている
    const referencingPrograms = membershipsByStore.get(storeId);
    if (!referencingPrograms) return p;
    let hasCampaignReference = false;
    for (const pid of referencingPrograms) {
      if (sameRunCampaignProgramIds.has(pid)) {
        hasCampaignReference = true;
        break;
      }
    }
    if (!hasCampaignReference) return p;

    // 条件 (b OR c): チェーン名パターン or chain-heavy category
    // (notes は store の evidence 由来だがここでは取り出さない簡素化、name + category のみで判定)
    if (
      !isChainLikeStore({ name, category, existingStores: current.stores })
    ) {
      return p;
    }

    // 全条件 OK → storeAdditionsDisabled 解除して auto に復帰
    promoted += 1;
    return { ...p, reviewReason: undefined } as Proposal;
  });

  return { proposals: out, promoted };
}

export function downgradeOrphanMemberships(
  proposals: Proposal[],
  existingStoreIds: ReadonlySet<string>,
  existingProgramIds: ReadonlySet<string>,
): {
  proposals: Proposal[];
  downgradedStore: number;
  downgradedProgram: number;
} {
  // 同 run で auto 通過予定の store / program id 集合
  const sameRunAutoStoreIds = new Set<string>();
  const sameRunAutoProgramIds = new Set<string>();
  for (const p of proposals) {
    if (p.type !== "addRecord" || p.reviewReason) continue;
    const id = (p as AddRecordProposal).record.id;
    if (typeof id !== "string") continue;
    if (p.collection === "stores") sameRunAutoStoreIds.add(id);
    else if (p.collection === "programs") sameRunAutoProgramIds.add(id);
  }

  let downgradedStore = 0;
  let downgradedProgram = 0;
  const out: Proposal[] = proposals.map((p) => {
    if (
      p.type !== "addRecord" ||
      p.collection !== "memberships" ||
      p.reviewReason
    ) {
      return p;
    }
    const rec = (p as AddRecordProposal).record;
    const storeId = typeof rec.storeId === "string" ? rec.storeId : null;
    const programId = typeof rec.programId === "string" ? rec.programId : null;

    // store 側の整合性チェック (UX 影響大なので優先)
    if (
      storeId !== null &&
      !existingStoreIds.has(storeId) &&
      !sameRunAutoStoreIds.has(storeId)
    ) {
      downgradedStore += 1;
      return { ...p, reviewReason: "missingStoreBody" } as Proposal;
    }
    // program 側の整合性チェック (新規 program は proposePrograms で
    // 必ず idCollision されるため、ここで membership 側も同時降格する)
    if (
      programId !== null &&
      !existingProgramIds.has(programId) &&
      !sameRunAutoProgramIds.has(programId)
    ) {
      downgradedProgram += 1;
      return { ...p, reviewReason: "missingProgramBody" } as Proposal;
    }
    return p;
  });
  return { proposals: out, downgradedStore, downgradedProgram };
}

// ───────────────────────────────────────────────────────────────
// Program/membership atomicity guard (原子性ガード)
// ───────────────────────────────────────────────────────────────
// downgradeOrphanMemberships の**後段**に走らせる後処理。
//
// 【穴 (2026-07-16 木曜 cron run 29453709908 で実証)】
// campaign extractor 由来の新規 program (scope: "member-stores") が
// isCampaignAutoMergeable を通って autoApplicable になった一方、その program を
// 参照する membership は orphan guard (missingStoreBody: store が
// storeAdditionsDisabled で降格) で全件 review 降格された。結果、
// 「program 単独で auto に残る」= member-stores × membership 0 の死にデータが
// apply され、seed 契約テスト (member-stores は membership ≥1) が apply 後の
// safety gate (npm test) で fail → auto batch 全体 (無関係の epos 4 件含む) が
// 巻き添えで review 降格した。safety gate は正しく機能したが、propose 層で
// 原子性を保証すれば巻き添えを防げる。
//
// 【防止策】autoApplicable の新規 program (addRecord/programs) のうち
// scope === "member-stores" のものについて、
//   - 同 run の autoApplicable membership に当該 programId 参照が 1 件も無く、
//   - かつ既存 seed にも当該 programId の membership が無い
// 場合、program 単独では発火しない死にデータになるため needsReview
// (orphanedProgram) に降格する。membership 側の承認と同時に approve する運用。
//
// 対象外:
//   - all-stores program: membership 0 でも自身で発火するため対象外
//   - updateField/override (既存 program): 新規 addRecord のみが対象
//     (既存 program は seed に membership がある前提。addRecord は本来 seed 未存在)
//
// 【逆方向 (membership が auto で program が review) のカバー】
// この逆パターン (membership だけ auto、program 本体が needsReview) は本ガードでは
// なく既存の downgradeOrphanMemberships の program-side チェックが担う:
// membership が参照する programId が既存 seed にも同 run auto program にも無ければ
// missingProgramBody に降格される (proposePrograms が新規 program に付ける
// idCollision 等で program が auto に上がらないケースを検出済み)。よって
// program←→membership の両方向で「片側だけ auto」は propose 層で塞がれている。
export function demoteChildlessMemberStorePrograms(
  proposals: Proposal[],
  existingMembershipProgramIds: ReadonlySet<string>,
): { proposals: Proposal[]; demoted: number } {
  // 同 run で auto 通過予定 (reviewReason 無し) の membership が参照する programId 集合。
  // orphan guard の後段で走るため、missingStoreBody 等で降格済の membership は
  // reviewReason を持ち、ここでは除外される (= 死んだ membership は加算されない)。
  const sameRunAutoMembershipProgramIds = new Set<string>();
  for (const p of proposals) {
    if (
      p.type !== "addRecord" ||
      p.collection !== "memberships" ||
      p.reviewReason
    ) {
      continue;
    }
    const programId = (p as AddRecordProposal).record.programId;
    if (typeof programId === "string") {
      sameRunAutoMembershipProgramIds.add(programId);
    }
  }

  let demoted = 0;
  const out: Proposal[] = proposals.map((p) => {
    // 対象は autoApplicable (reviewReason 無し) の新規 program addRecord のみ。
    if (
      p.type !== "addRecord" ||
      p.collection !== "programs" ||
      p.reviewReason
    ) {
      return p;
    }
    const rec = (p as AddRecordProposal).record;
    // all-stores program は membership 0 でも自身で発火するので対象外。
    if (rec.scope !== "member-stores") return p;
    const programId = typeof rec.id === "string" ? rec.id : null;
    if (programId === null) return p;
    // 同 run auto membership にも既存 seed membership にも当該 program 参照が
    // 無ければ、member-stores program が発火対象店ゼロの死にデータになる。
    if (
      !sameRunAutoMembershipProgramIds.has(programId) &&
      !existingMembershipProgramIds.has(programId)
    ) {
      demoted += 1;
      return { ...p, reviewReason: "orphanedProgram" } as Proposal;
    }
    return p;
  });
  return { proposals: out, demoted };
}

// ───────────────────────────────────────────────────────────────
// Stale extract generation guard (旧世代 extracted 書き戻し防止)
// ───────────────────────────────────────────────────────────────
// 【背景 (#142 の実害)】
// extractor プロンプトを改訂 (例: jcb-jpoint v1.2 乗算モデル → v1.3 加算方式) しても、
// sources/extracted/<id>.json は旧版プロンプトで fetch されたキャッシュのまま残る。
// この旧世代キャッシュは seed (新方針で既に修正済) との rate 差分を「変更」として出し、
// propose が閾値内なら auto-merge 候補に載せてしまう (= 旧値への書き戻し提案)。
// 実際に 2026-07-23 の cron で jcb W 系列の 0.015→0.02 等が auto=3 で提案され、
// apply 後の safety gate (seed 契約テスト) が発火して auto batch 全体が review 降格した。
//
// 【防止策】当該 source の extracted.promptVersion が registry.yaml の
// extractorVersions[extractor] から導出される「現行 promptVersion」と不一致なら、
// PROGRAM_OVERRIDES 行きの updateField (rate/validFrom/validTo) を auto にせず
// staleExtractGeneration で needsReview に降格する。次回 fetch (新版プロンプト) で
// promptVersion が一致すれば、この gate は素通りし従来の閾値判定に戻る。
//
// 対象/非対象:
//   - 対象   : updateField かつ isApplicableProposal (= updateField/programs の
//              rate/validFrom/validTo、PROGRAM_OVERRIDES 経路) かつ現状 auto (reviewReason 無し)
//   - 非対象 : addRecord (新規追加。元々 idCollision 等で review に落ちる設計、触らない)、
//              既に reviewReason 付きの提案 (別理由で既に review 行き)
//   - registry に当該 extractor の版数が未定義なら gate skip (従来どおり)
//   - promptVersion が extracted に無い古いファイルは「不一致」扱い (安全側)

/** stale と判定した source の版数情報 (ログ用)。 */
export type StaleSourceInfo = {
  /** extracted.promptVersion (無ければ "(none)")。 */
  extractedVersion: string;
  /** registry から導出した現行 promptVersion (例: "jcb-jpoint-v1.3")。 */
  currentVersion: string;
};

/** registry.yaml から extractorVersions を読む (string 正規化)。読めなければ {}。 */
export function loadExtractorVersions(
  registryPath: string = REGISTRY_PATH,
): Partial<Record<string, string>> {
  try {
    const text = readFileSync(registryPath, "utf-8");
    const data = parseYaml(text) as RegistryFile | undefined;
    const ev = data?.extractorVersions;
    if (!ev || typeof ev !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(ev)) {
      // YAML が number 化した版数 (例: 3.5) の保険で String 化
      if (v != null) out[k] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * extracted の promptVersion が registry の現行 extractor 版と不一致 (旧世代キャッシュ)
 * な source を { extracted 版, 現行版 } 付きで返す。
 * - registry に当該 extractor の版数が未定義 → gate skip (map に入れない)
 * - promptVersion 欠落 → "(none)" として不一致扱い (安全側)
 */
export function detectStaleExtractSources(
  extracted: Pick<ExtractedSource, "sourceId" | "extractor" | "promptVersion">[],
  extractorVersions: Partial<Record<string, string>>,
): Map<string, StaleSourceInfo> {
  const stale = new Map<string, StaleSourceInfo>();
  for (const ex of extracted) {
    const version = extractorVersions[ex.extractor];
    if (!version) continue; // 版数未定義の extractor は gate skip
    const currentVersion = `${ex.extractor}-${version}`;
    const extractedVersion = ex.promptVersion ?? "(none)";
    if (extractedVersion !== currentVersion) {
      stale.set(ex.sourceId, { extractedVersion, currentVersion });
    }
  }
  return stale;
}

/**
 * 旧世代 extracted の書き戻し防止ガード。
 * stale-generation な source 由来の PROGRAM_OVERRIDES 行き updateField
 * (rate/validFrom/validTo) で、現状 auto (reviewReason 無し) のものを
 * staleExtractGeneration で needsReview に降格する。
 * addRecord / 既に review 行き / 非 PROGRAM_OVERRIDES 経路は据え置き。
 * guardedBySource は source ごとの降格件数 (ログ用)。
 */
export function guardStaleExtractGeneration(
  proposals: Proposal[],
  staleSourceIds: ReadonlySet<string>,
): { proposals: Proposal[]; guardedBySource: Map<string, number> } {
  const guardedBySource = new Map<string, number>();
  const out: Proposal[] = proposals.map((p) => {
    if (p.type !== "updateField") return p; // addRecord/delete/referenceChange は対象外
    if (p.reviewReason) return p; // 既に別理由で review 行き
    if (!isApplicableProposal(p)) return p; // PROGRAM_OVERRIDES 行き (rate/validFrom/validTo) のみ
    if (!staleSourceIds.has(p.sourceId)) return p;
    guardedBySource.set(p.sourceId, (guardedBySource.get(p.sourceId) ?? 0) + 1);
    return { ...p, reviewReason: "staleExtractGeneration" } as Proposal;
  });
  return { proposals: out, guardedBySource };
}

// ───────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────

// ─── Sync pipeline phase 一覧 (実行順、Wave 3 C-3 audit-fix で可視化) ───
//   Phase 0  : extracted/*.json 読み込み + alias 正規化
//   Phase 1  : 各エンティティの propose* (stores / cards / programs / memberships 等)
//   Phase 2  : 期限切れ campaign の自動削除提案 (proposeExpiredCampaignDeletions)
//   Phase A  : 同 run 重複の dedup (dedupeAcrossProposals) ─ 2 件目以降 idCollision
//   Phase B  : Category cap (applyCategoryCap) ─ 飲食 5/cat 等で deferred
//   Phase B' : Chain-store auto-merge promote (promoteChainStoreAutoMerge)
//              ─ storeAdditionsDisabled を campaign 参照 + チェーン判定で部分解除 (C-9)
//   Phase C  : Orphan membership guard (downgradeOrphanMemberships)
//              ─ store / program 本体が auto に無い membership を降格
//   Phase C2 : Program/membership atomicity guard (demoteChildlessMemberStorePrograms)
//              ─ Phase C で membership が全て降格した member-stores program 単独を降格
//   Phase C3 : Stale extract generation guard (guardStaleExtractGeneration)
//              ─ 旧世代 extracted (promptVersion 不一致) 由来の PROGRAM_OVERRIDES 行き
//                updateField を staleExtractGeneration で降格 (書き戻し防止)
//   Phase D  : auto / needsReview 振り分け + report 書き出し
// Phase ラベルは log メッセージにも反映済 (🧯 = guard, 📐 = cap, 🔁 = dedup, 🧹 = expired, 🔓 = chain-promote)。

function main(): void {
  console.log("📥 reading extracted/*.json ...");
  const extracted = readExtractedSources();
  console.log(`   loaded: ${extracted.length} file(s)`);

  const current = seed();
  const allProposals: Proposal[] = [];
  let processed = 0;
  let failed = 0;

  // Phase 1: 各エンティティの propose
  for (const raw of extracted) {
    if (isFailedExtraction(raw)) {
      console.log(`   ⚠️  ${raw.sourceId}: 取得失敗 (notes) - スキップ`);
      failed += 1;
      continue;
    }
    processed += 1;
    // alias 正規化: smbc-v-gold → smbc-v, seven-eleven → conv-7eleven 等
    const data = normalizeIds(raw);
    allProposals.push(...proposeStores(data, current));
    allProposals.push(...proposeCards(data, current));
    // v6 PR-1e: 抽出 loyaltyRules は propose では無視 (LoyaltyRule 廃止)。
    allProposals.push(...proposePaymentApps(data, current));
    allProposals.push(...proposePrograms(data, current));
    allProposals.push(...proposeMemberships(data, current));
    allProposals.push(...proposeJalTokuyakuMemberships(data, current));
  }

  // Phase 2: 期限切れキャンペーンの削除提案 (seed 全体 1 回だけ評価、ソース非依存)
  //   grace 経過済は autoApplicable (自動削除) として投入するが、同一 run で
  //   期間変更 (periodChange = validFrom/validTo の updateField) が出ている program は
  //   延長中の可能性があるため自動削除せず needsReview に留める (tombstone は復活不可)。
  const extendedProgramIds = new Set<string>();
  for (const p of allProposals) {
    if (
      p.type === "updateField" &&
      p.collection === "programs" &&
      (p.field === "validTo" || p.field === "validFrom")
    ) {
      extendedProgramIds.add(p.id);
    }
  }
  const expiredProposals = proposeExpiredCampaignDeletions(
    current,
    undefined,
    undefined,
    extendedProgramIds,
  );
  if (expiredProposals.length > 0) {
    const autoCount = expiredProposals.filter((p) => !p.reviewReason).length;
    const guardedCount = expiredProposals.length - autoCount;
    console.log(
      `🧹 expired-cleanup: ${expiredProposals.length} 件の期限切れ campaign を検出` +
        ` (自動削除 ${autoCount} 件 / 延長提案ありで review 保留 ${guardedCount} 件)`,
    );
  }
  allProposals.push(...expiredProposals);

  // Phase A: within-run dedup (異なるソースから同 name/id の store が提案された場合、
  //          2 件目以降は idCollision で要レビューに格下げ)
  const dedup = dedupeAcrossProposals(allProposals);
  if (dedup.collisions > 0) {
    console.log(
      `🔁 within-run dedup: ${dedup.collisions} 件の store 提案を idCollision にダウングレード`,
    );
  }

  // Phase B: Category cap (stores の新規追加のみ対象)
  const cap = readCapPerCategory();
  let finalProposals = dedup.proposals;
  let deferredCount = 0;
  if (cap !== null) {
    const { kept, deferred } = applyCategoryCap(dedup.proposals, cap);
    finalProposals = kept;
    deferredCount = deferred.length;
    if (deferred.length > 0) {
      const byCat = new Map<string, number>();
      for (const d of deferred) {
        const cat =
          ((d as AddRecordProposal).record.category as string | undefined) ??
          "(未分類)";
        byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
      }
      console.log(
        `📐 category cap = ${cap}/cat: ${deferred.length} 件を deferred`,
      );
      for (const [cat, n] of byCat.entries()) {
        console.log(`     ${cat}: ${n} 件先送り`);
      }
    }
  }

  // Phase B': Chain-store auto-merge promote (C-9 audit-fix、PR #56 部分解除)
  //   storeAdditionsDisabled の店舗のうち、同 run の campaign program に
  //   membership 参照されていて、かつチェーン名/業態を満たすものを auto に復帰。
  const chainPromote = promoteChainStoreAutoMerge(finalProposals, current);
  finalProposals = chainPromote.proposals;
  if (chainPromote.promoted > 0) {
    console.log(
      `🔓 chain-promote: ${chainPromote.promoted} 件の新規 chain store を auto-merge に復帰`,
    );
  }

  // Phase C: Orphan membership guard
  //   store / program 本体が auto に居ない場合は降格。category cap で deferred
  //   されたり (store)、proposePrograms が必ず idCollision を付けたり (program)
  //   した場合の整合性を保つ。同 run の auto 候補 store/program は内部で derive される。
  const existingStoreIds = new Set(current.stores.map((s) => s.id));
  const existingProgramIds = new Set(current.programs.map((p) => p.id));
  const orphan = downgradeOrphanMemberships(
    finalProposals,
    existingStoreIds,
    existingProgramIds,
  );
  finalProposals = orphan.proposals;
  if (orphan.downgradedStore > 0 || orphan.downgradedProgram > 0) {
    const parts: string[] = [];
    if (orphan.downgradedStore > 0)
      parts.push(`${orphan.downgradedStore} 件を missingStoreBody`);
    if (orphan.downgradedProgram > 0)
      parts.push(`${orphan.downgradedProgram} 件を missingProgramBody`);
    console.log(`🧯 orphan guard: ${parts.join(" / ")} で降格`);
  }

  // Phase C2: Program/membership atomicity guard (原子性ガード)
  //   Phase C の membership 降格の結果、member-stores program が membership 0 の
  //   死にデータになるケースを検出し program 単独も降格する (木曜 run 巻き添え防止)。
  const existingMembershipProgramIds = new Set(
    (current.memberships ?? []).map((m) => m.programId),
  );
  const atomicity = demoteChildlessMemberStorePrograms(
    finalProposals,
    existingMembershipProgramIds,
  );
  finalProposals = atomicity.proposals;
  if (atomicity.demoted > 0) {
    console.log(
      `🧯 atomicity guard: ${atomicity.demoted} 件の member-stores program を orphanedProgram で降格`,
    );
  }

  // Phase C3: Stale extract generation guard (旧世代 extracted 書き戻し防止)
  //   プロンプト改訂直後、旧版で fetch した extracted キャッシュが seed (修正済) との
  //   rate 差分を書き戻し提案として出すのを防ぐ。当該 source の promptVersion が
  //   registry の現行 extractor 版と不一致なら、PROGRAM_OVERRIDES 行きの updateField
  //   (rate/validFrom/validTo) を auto にせず staleExtractGeneration で review 降格。
  const staleSources = detectStaleExtractSources(
    extracted,
    loadExtractorVersions(),
  );
  const staleGuard = guardStaleExtractGeneration(
    finalProposals,
    new Set(staleSources.keys()),
  );
  finalProposals = staleGuard.proposals;
  for (const [src, n] of staleGuard.guardedBySource) {
    const info = staleSources.get(src)!;
    console.log(
      `🧯 stale-generation guard: ${n} 件 (source=${src}, extracted=${info.extractedVersion} ≠ 現行 ${info.currentVersion})`,
    );
  }

  const autoApplicable: Proposal[] = [];
  const needsReview: Proposal[] = [];
  for (const p of finalProposals) {
    // 安定 ID を付与 (REVIEW_QUEUE.md の項目表示 / sync:approve の項目指定用)
    p.proposalId = computeProposalId(p);
    if (p.reviewReason) needsReview.push(p);
    else autoApplicable.push(p);
  }

  const report: ProposalReport = {
    generatedAt: new Date().toISOString(),
    // cron は SEED_VERSION を bump しない (リリース粒度)。
    // from == to で「版数は据え置き」を正直に表す。
    fromSeedVersion: SEED_VERSION,
    toSeedVersion: SEED_VERSION,
    autoApplicable,
    needsReview,
    summary: {
      autoApplicableCount: autoApplicable.length,
      needsReviewCount: needsReview.length,
      sourcesProcessed: processed,
      sourcesFailed: failed,
    },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(`✓ wrote ${OUTPUT_PATH}`);
  console.log(
    `📊 summary: auto=${autoApplicable.length}, review=${needsReview.length}, deferred=${deferredCount}, sources_ok=${processed}, sources_failed=${failed}`,
  );
}

// CLI として実行された場合のみ main を呼ぶ (テストからの import 時は呼ばない)
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error("💥 Error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
