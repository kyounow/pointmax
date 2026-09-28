// sources/registry.yaml → propose 用のソース別ポリシー (PR-0b-3)。
//
// registry.yaml を 1 回だけ parse し、次を返す:
//   - sources          : registry の記載順のソース一覧 (enabled でないものも含む)
//   - enabledIds       : enabled: true のソース id 集合
//   - policies         : sourceId → SourcePolicy { autoMerge, targets } (全ソース分。SYNC_INCLUDE_SOURCES
//                        等で enabled:false のソースの extracted が入力に入っても、そのポリシーで判定する)
//   - extractorVersions: extractorVersions (YAML が number 化した版数も String 化)
//
// fail-closed: registry が読めない / 形式が不正 (sources[] が無い、autoMerge が boolean でない、target の
// キーが不正) なら throw する。ポリシーを黙って空にすると autoMerge:false のソースが auto に戻るため。
// diff-and-propose の main はこれを呼び、throw は exit 1 (fetch-all も同じ条件で throw する)。
//
// ⚠ PR-0b-2 (Z6 の registry フィルタ) は diff-and-propose.ts に loadRegistrySources /
// filterExtractedByRegistry を持つ。rebase 時はこの loader の `sources` / `enabledIds` に乗り換え、
// registry の読み込みを 1 か所にする (loadRegistryPolicy().sources を filterExtractedByRegistry に渡せる)。

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import type {
  Proposal,
  RegistrySource,
  RegistryTarget,
  SourcePolicy,
} from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REGISTRY_PATH = resolve(__dirname, "../../sources/registry.yaml");

export type RegistryPolicy = {
  /** registry の記載順 (= fetch-all の実行順)。enabled:false のソースも含む。 */
  sources: RegistrySource[];
  /** enabled: true のソース id。 */
  enabledIds: ReadonlySet<string>;
  /** sourceId → ポリシー (全ソース分)。registry に無い sourceId (expired-cleanup 等) は get が undefined。 */
  policies: ReadonlyMap<string, SourcePolicy>;
  /** extractorVersions (値は String 化済み)。未定義なら {}。 */
  extractorVersions: Partial<Record<string, string>>;
};

const TARGET_KEYS = ["cardIds", "paymentAppId", "pointCardId"] as const;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

/**
 * registry の target 宣言 (単数または配列) を検証して配列に正規化する。未宣言なら []。
 * 各要素はキーがちょうど 1 つ (cardIds / paymentAppId / pointCardId)。cardIds は非空の string[]、
 * 各 id と paymentAppId / pointCardId は非空文字列。違反は sourceId 付きで throw。
 */
export function normalizeTargets(sourceId: string, raw: unknown): RegistryTarget[] {
  if (raw === undefined || raw === null) return [];
  const items = Array.isArray(raw) ? raw : [raw];
  if (items.length === 0) {
    throw new Error(`registry: ${sourceId} の target が空配列 (宣言しないなら target ごと省く)`);
  }
  return items.map((t, i) => {
    const where = `${sourceId} の target[${i}]`;
    if (!isObject(t)) throw new Error(`registry: ${where} がオブジェクトではない`);
    const keys = Object.keys(t);
    if (keys.length !== 1) {
      throw new Error(
        `registry: ${where} のキーは 1 つだけ (cardIds / paymentAppId / pointCardId のどれか): ${keys.join(", ") || "(なし)"}`,
      );
    }
    const key = keys[0];
    if (!(TARGET_KEYS as readonly string[]).includes(key)) {
      throw new Error(`registry: ${where} に未知のキー ${key}`);
    }
    const v = t[key];
    if (key === "cardIds") {
      if (!Array.isArray(v) || v.length === 0 || !v.every(isNonEmptyString)) {
        throw new Error(`registry: ${where}.cardIds は非空文字列の非空配列であること`);
      }
      return { cardIds: [...v] };
    }
    if (!isNonEmptyString(v)) {
      throw new Error(`registry: ${where}.${key} は非空文字列であること`);
    }
    return key === "paymentAppId" ? { paymentAppId: v } : { pointCardId: v };
  });
}

/** parse 済みの registry (YAML の load 結果) からポリシーを作る。不正なら throw。 */
export function parseRegistryPolicy(data: unknown): RegistryPolicy {
  if (!isObject(data) || !Array.isArray(data.sources)) {
    throw new Error("registry: sources[] が無い (registry.yaml の形式が不正)");
  }
  const sources = data.sources as RegistrySource[];
  const policies = new Map<string, SourcePolicy>();
  const enabledIds = new Set<string>();
  sources.forEach((s, i) => {
    if (!isObject(s) || !isNonEmptyString(s.id)) {
      throw new Error(`registry: sources[${i}] に id が無い`);
    }
    if (policies.has(s.id)) throw new Error(`registry: source id ${s.id} が重複している`);
    const autoMerge: unknown = (s as { autoMerge?: unknown }).autoMerge;
    if (autoMerge !== undefined && typeof autoMerge !== "boolean") {
      throw new Error(
        `registry: ${s.id} の autoMerge は true / false (boolean) であること: ${JSON.stringify(autoMerge)}`,
      );
    }
    policies.set(s.id, {
      sourceId: s.id,
      extractor: s.extractor,
      autoMerge: autoMerge ?? true,
      targets: normalizeTargets(s.id, (s as { target?: unknown }).target),
    });
    if (s.enabled === true) enabledIds.add(s.id);
  });

  const extractorVersions: Record<string, string> = {};
  const ev = data.extractorVersions;
  if (isObject(ev)) {
    for (const [k, v] of Object.entries(ev)) {
      // YAML が number 化した版数 (例: 3.5) の保険で String 化 (loadExtractorVersions と同じ)
      if (v != null) extractorVersions[k] = String(v);
    }
  }
  return { sources, enabledIds, policies, extractorVersions };
}

/** registry.yaml を読んでポリシーを作る。読み込み失敗も parse 失敗も throw (fail-closed)。 */
export function loadRegistryPolicy(path: string = REGISTRY_PATH): RegistryPolicy {
  const text = readFileSync(path, "utf-8");
  return parseRegistryPolicy(parseYaml(text));
}

/** autoMerge:false のソース id 集合 (chain-promote の除外に使う)。 */
export function autoMergeDisabledSourceIds(
  policies: ReadonlyMap<string, SourcePolicy>,
): Set<string> {
  const out = new Set<string>();
  for (const p of policies.values()) if (!p.autoMerge) out.add(p.sourceId);
  return out;
}

// ───────────────────────────────────────────────────────────────
// Phase B″ / C″: ソース別ポリシー (autoMerge:false) の適用
// ───────────────────────────────────────────────────────────────
// reviewReason の無い提案 (= ここまでのガードを通過した auto 候補) のうち、registry で autoMerge:false の
// ソース由来のものを sourceAutoMergeDisabled で review に回す。stores / programs / memberships /
// updateField を問わない。registry に無い sourceId (期限切れ整理の "expired-cleanup") は素通りする
// (期限切れの自動削除はソース別ポリシーの対象外)。
//
// sourceAutoMergeDisabled は「ほかのガードは全部通過した」という意味なので、後段のガードより先に付けると
// そのガードの具体的な reason (missing*Body / storeNameMismatch / campaignConditional) を隠してしまう
// (承認時の --accept-risk もすり抜ける)。そこで diff-and-propose の main は 2 回に分けて呼ぶ:
//   Phase B″ (C の直前) : scope { excludeCollections: ["memberships"] }。stores / programs / updateField 等。
//                         ここで降格した store / program を参照する (他ソースの) membership を Phase C が
//                         missing*Body で拾えるようにするため、C より前に置く (不変条件)。
//   Phase C″ (C′ の後・C2 の前): scope { onlyCollections: ["memberships"] }。membership は Phase C (orphan) と
//                         Phase C′ (店名照合・条件文言) を通ったものだけが残る。C2 より前に置くのは、ここで
//                         降格した membership を C2 (atomicity) が数えないようにするため。
// scope を省くと全コレクションに適用する (単体テスト・過去の呼び出しとの互換)。

export type SourcePolicyScope = {
  /** 指定したコレクションの提案だけに適用する。 */
  onlyCollections?: readonly string[];
  /** 指定したコレクションの提案には適用しない。 */
  excludeCollections?: readonly string[];
};

export function applySourcePolicies(
  proposals: Proposal[],
  policies: ReadonlyMap<string, SourcePolicy>,
  scope: SourcePolicyScope = {},
): { proposals: Proposal[]; demotedBySource: Map<string, number> } {
  const demotedBySource = new Map<string, number>();
  const out = proposals.map((p) => {
    if (p.reviewReason) return p;
    if (scope.onlyCollections && !scope.onlyCollections.includes(p.collection)) return p;
    if (scope.excludeCollections?.includes(p.collection)) return p;
    if (policies.get(p.sourceId)?.autoMerge !== false) return p;
    demotedBySource.set(p.sourceId, (demotedBySource.get(p.sourceId) ?? 0) + 1);
    return {
      ...p,
      reviewReason: "sourceAutoMergeDisabled",
      reviewDetail: `registry の ${p.sourceId} が autoMerge:false`,
    } as Proposal;
  });
  return { proposals: out, demotedBySource };
}
