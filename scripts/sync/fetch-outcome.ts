// scripts/sync/fetch-outcome.ts
//
// 1 ソース分の fetch 結果 (outcome) の型・入出力・集約・Step Summary 描画 (PR-0b-2)。
//
// 流れ:
//   fetch-all (親) が outcome ディレクトリを用意して PM_FETCH_OUTCOME_DIR で子に渡す
//     → fetch-source (子) が終了時 (finally) に <dir>/<sourceId>.outcome.json を書く
//     → fetch-all が読んで後続ソースの打ち切り (abortRun) を判定し、Step Summary と
//       ::warning:: / ::error:: annotation を出す
// exit code ではなくこのファイルを唯一の信号にする (fetch-all は従来どおり常に exit 0)。
// fetch-source は PM_FETCH_OUTCOME_DIR が渡された時だけ書く (単発のローカル実行では書かない)。
// run.json / runKey / SYNC_HISTORY への埋め込みは PR-1 (H1) で追加する。

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addUsage,
  ZERO_USAGE,
  type AttemptKind,
  type FetchFailureNoteKind,
  type GeminiErrorKind,
  type GeminiUsage,
  type ResponseStatus,
  type RunAbortKind,
} from "./fetch-response";
import { EXTRACTED_ARRAY_KEYS } from "./types";
import type { ExtractedArrayKey, ExtractedSource } from "./types";

// ───────────────────────────────────────────────────────────────
// 型
// ───────────────────────────────────────────────────────────────

export const FETCH_OUTCOME_VERSION = 1;

//   ok             : extracted を書いた (1 件以上)
//   empty          : extracted を書いた (0 件。paypay の「該当なし」等の正当な 0 件を含む)
//   failed         : 内容が原因の失敗で fallback を書いた、または API エラーで keep-last-good
//   quotaExhausted : 日次枠 (429 PerDay) で keep-last-good。後続ソースは skipped
//   skipped        : 前のソースの quotaDaily / billing / config で未実行 (fetch-all が付ける)
//   crashed        : 環境・設定エラー等で異常終了 (extracted は書かない = 前回版のまま)
export type FetchOutcomeKind =
  | "ok"
  | "empty"
  | "failed"
  | "quotaExhausted"
  | "skipped"
  | "crashed";

export const FETCH_OUTCOME_KINDS: readonly FetchOutcomeKind[] = [
  "ok",
  "empty",
  "failed",
  "quotaExhausted",
  "skipped",
  "crashed",
];

// failed / crashed / skipped の内訳。
//   FetchFailureNoteKind : 内容が原因の失敗 (fallback notes の kind と同じ)
//   RunAbortKind         : run 打ち切り (quotaDaily / billing / config)
//   apiError             : 打ち切り以外の API エラーで応答ゼロ (503 / network 等) → keep-last-good
//   crash / noOutcome / exitN : 異常終了 (fetch-all が outcome ファイル無しを検知したもの含む)
export type FetchFailKind =
  | FetchFailureNoteKind
  | RunAbortKind
  | "apiError"
  | "prefetchFailed"
  | "crash"
  | "noOutcome"
  | `exit${string}`;

export type OutcomeAttempt = {
  kind: AttemptKind | "indexSelect";
  status?: ResponseStatus;
  errorKind?: GeminiErrorKind;
  finishReason?: string;
  prefetchFailed?: boolean;
};

export type FetchOutcome = {
  version: typeof FETCH_OUTCOME_VERSION;
  sourceId: string;
  outcome: FetchOutcomeKind;
  failKind?: FetchFailKind;
  /** 160 字以内。Step Summary / annotation にだけ使う (SYNC_HISTORY には入れない) */
  detail?: string;
  itemCounts: Partial<Record<ExtractedArrayKey, number>>;
  totalItems: number;
  geminiCalls: number;
  quotaErrors: number;
  errorKinds: GeminiErrorKind[];
  usage: GeminiUsage;
  model: string;
  /** extracted を上書きしなかった (前回版 = checkout 時点の main 版が残る) */
  keptLastGood: boolean;
  abortRun?: RunAbortKind;
  attempts?: OutcomeAttempt[];
  finishedAt: string;
};

export const OUTCOME_DETAIL_MAX = 160;

// ───────────────────────────────────────────────────────────────
// ディレクトリ
// ───────────────────────────────────────────────────────────────

type Env = Readonly<Record<string, string | undefined>>;

/** fetch-source 用: PM_FETCH_OUTCOME_DIR が渡された時だけ書く。無ければ null。 */
export function resolveFetchOutcomeDir(env: Env): string | null {
  const v = env.PM_FETCH_OUTCOME_DIR?.trim();
  return v ? v : null;
}

/**
 * fetch-all 用: 必ずディレクトリを用意する。
 * 優先順: PM_FETCH_OUTCOME_DIR > $RUNNER_TEMP/pointmax-fetch > mkdtemp(os.tmpdir()/pointmax-fetch-)
 */
export function prepareRunOutcomeDir(
  env: Env,
  mk: (prefix: string) => string = mkdtempSync,
): string {
  const explicit = env.PM_FETCH_OUTCOME_DIR?.trim();
  const runnerTemp = env.RUNNER_TEMP?.trim();
  const dir = explicit
    ? explicit
    : runnerTemp
      ? join(runnerTemp, "pointmax-fetch")
      : mk(join(tmpdir(), "pointmax-fetch-"));
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function outcomeFilePath(dir: string, sourceId: string): string {
  return join(dir, `${sourceId}.outcome.json`);
}

// ───────────────────────────────────────────────────────────────
// 読み書き
// ───────────────────────────────────────────────────────────────

export function writeFetchOutcome(dir: string, o: FetchOutcome): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(outcomeFilePath(dir, o.sourceId), JSON.stringify(o, null, 2));
}

function isUsage(u: unknown): u is GeminiUsage {
  if (u === null || typeof u !== "object") return false;
  const r = u as Record<string, unknown>;
  return (
    typeof r.calls === "number" &&
    typeof r.promptTokens === "number" &&
    typeof r.toolUseTokens === "number" &&
    typeof r.outputTokens === "number" &&
    typeof r.thoughtTokens === "number"
  );
}

/** 無い / JSON 不正 / version 違い / sourceId 違い / 形が壊れている → null */
export function readFetchOutcome(dir: string, sourceId: string): FetchOutcome | null {
  const p = outcomeFilePath(dir, sourceId);
  if (!existsSync(p)) return null;
  try {
    const o = JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown> | null;
    if (!o || typeof o !== "object") return null;
    if (o.version !== FETCH_OUTCOME_VERSION) return null;
    if (o.sourceId !== sourceId) return null;
    if (!FETCH_OUTCOME_KINDS.includes(o.outcome as FetchOutcomeKind)) return null;
    if (typeof o.totalItems !== "number" || typeof o.geminiCalls !== "number") return null;
    if (!isUsage(o.usage)) return null;
    return o as unknown as FetchOutcome;
  } catch {
    return null;
  }
}

/** spawn 前に前回 run の残骸を消す (読み違い防止)。 */
export function clearFetchOutcome(dir: string, sourceId: string): void {
  rmSync(outcomeFilePath(dir, sourceId), { force: true });
}

// ───────────────────────────────────────────────────────────────
// 集計・判定
// ───────────────────────────────────────────────────────────────

/** 全配列キー (programs / memberships 含む) の件数。0 件のキーは counts に入れない。 */
export function countExtractedItems(
  ex: Partial<Pick<ExtractedSource, ExtractedArrayKey>>,
): { counts: Partial<Record<ExtractedArrayKey, number>>; total: number } {
  const counts: Partial<Record<ExtractedArrayKey, number>> = {};
  let total = 0;
  for (const k of EXTRACTED_ARRAY_KEYS) {
    const arr = ex[k];
    if (Array.isArray(arr) && arr.length > 0) {
      counts[k] = arr.length;
      total += arr.length;
    }
  }
  return { counts, total };
}

export function deriveOutcomeKind(args: {
  wrote: boolean;
  keptLastGood: boolean;
  abortRun?: RunAbortKind;
  totalItems: number;
  failKind?: FetchFailKind;
}): FetchOutcomeKind {
  if (args.keptLastGood) {
    return args.abortRun === "quotaDaily" ? "quotaExhausted" : "failed";
  }
  if (args.wrote) {
    if (args.failKind !== undefined) return "failed"; // prefix 付き fallback を書いた
    return args.totalItems > 0 ? "ok" : "empty";
  }
  return "crashed";
}

/** fetch-source が run 中に積む統計 (Gemini 呼び出しの境界で加算する)。 */
export type FetchStats = {
  usage: GeminiUsage;
  quotaErrors: number;
  errorKinds: GeminiErrorKind[];
  attempts: OutcomeAttempt[];
};

export function createFetchStats(): FetchStats {
  return { usage: { ...ZERO_USAGE }, quotaErrors: 0, errorKinds: [], attempts: [] };
}

/**
 * fetch-source の main が組み立てる途中結果。初期値 (wrote=false / keptLastGood=false) のまま
 * finally に達した = 例外で抜けた → crashed。
 */
export type OutcomeDraft = {
  sourceId: string;
  wrote: boolean;
  keptLastGood: boolean;
  abortRun?: RunAbortKind;
  failKind?: FetchFailKind;
  detail?: string;
  itemCounts: Partial<Record<ExtractedArrayKey, number>>;
  totalItems: number;
};

export function createOutcomeDraft(sourceId: string): OutcomeDraft {
  return { sourceId, wrote: false, keptLastGood: false, itemCounts: {}, totalItems: 0 };
}

function truncateDetail(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > OUTCOME_DETAIL_MAX ? `${t.slice(0, OUTCOME_DETAIL_MAX - 1)}…` : t;
}

export function finalizeOutcome(
  draft: OutcomeDraft,
  stats: FetchStats,
  model: string,
  now: Date,
): FetchOutcome {
  const outcome = deriveOutcomeKind(draft);
  const failKind: FetchFailKind | undefined =
    draft.failKind ?? (outcome === "crashed" ? "crash" : undefined);
  return {
    version: FETCH_OUTCOME_VERSION,
    sourceId: draft.sourceId,
    outcome,
    ...(failKind !== undefined ? { failKind } : {}),
    ...(draft.detail ? { detail: truncateDetail(draft.detail) } : {}),
    itemCounts: { ...draft.itemCounts },
    totalItems: draft.totalItems,
    geminiCalls: stats.usage.calls,
    quotaErrors: stats.quotaErrors,
    errorKinds: [...stats.errorKinds],
    usage: { ...stats.usage },
    model,
    // 書かなかった (keep-last-good / crash) なら extracted は前回版のまま
    keptLastGood: draft.keptLastGood || !draft.wrote,
    ...(draft.abortRun !== undefined ? { abortRun: draft.abortRun } : {}),
    ...(stats.attempts.length > 0 ? { attempts: [...stats.attempts] } : {}),
    finishedAt: now.toISOString(),
  };
}

export function shouldAbortRemaining(o: FetchOutcome | null): boolean {
  return o?.abortRun !== undefined;
}

export type SourceRunResult = {
  sourceId: string;
  exitCode: number | null;
  elapsedSec: number;
  outcome: FetchOutcome | null;
  /** 前のソースの run 打ち切りで未実行 */
  skippedBy?: { kind: RunAbortKind; sourceId: string };
  spawnError?: string;
};

function syntheticOutcome(
  sourceId: string,
  outcome: FetchOutcomeKind,
  failKind: FetchFailKind,
  detail: string,
): FetchOutcome {
  return {
    version: FETCH_OUTCOME_VERSION,
    sourceId,
    outcome,
    failKind,
    detail: truncateDetail(detail),
    itemCounts: {},
    totalItems: 0,
    geminiCalls: 0,
    quotaErrors: 0,
    errorKinds: [],
    usage: { ...ZERO_USAGE },
    model: "-",
    keptLastGood: true,
    finishedAt: new Date(0).toISOString(),
  };
}

/** outcome ファイルが無い → crashed (exitN)。打ち切りで未実行 → skipped。 */
export function effectiveOutcome(r: SourceRunResult): FetchOutcome {
  if (r.skippedBy) {
    return syntheticOutcome(
      r.sourceId,
      "skipped",
      r.skippedBy.kind,
      `${r.skippedBy.sourceId} の ${r.skippedBy.kind} で打ち切り (未実行、extracted は前回版)`,
    );
  }
  if (r.outcome) return r.outcome;
  return syntheticOutcome(
    r.sourceId,
    "crashed",
    `exit${r.exitCode ?? "null"}`,
    r.spawnError
      ? `spawn error: ${r.spawnError}`
      : `outcome ファイル無し (fetch-source が exit ${r.exitCode ?? "null"} で異常終了)`,
  );
}

export type FetchRunSummary = {
  group: string;
  selected: number;
  calls: number;
  usage: GeminiUsage;
  abortedBy?: { kind: RunAbortKind; sourceId: string };
  rows: FetchOutcome[];
};

export function summarizeRun(group: string, results: SourceRunResult[]): FetchRunSummary {
  const rows = results.map(effectiveOutcome);
  const usage = rows.reduce<GeminiUsage>((acc, r) => addUsage(acc, r.usage), { ...ZERO_USAGE });
  const aborter = rows.find((r) => r.outcome !== "skipped" && r.abortRun !== undefined);
  const abortedBy = aborter?.abortRun
    ? { kind: aborter.abortRun, sourceId: aborter.sourceId }
    : results.find((r) => r.skippedBy)?.skippedBy;
  return {
    group,
    selected: results.length,
    calls: usage.calls,
    usage,
    ...(abortedBy ? { abortedBy } : {}),
    rows,
  };
}

// ───────────────────────────────────────────────────────────────
// 描画 (GITHUB_STEP_SUMMARY / workflow command)
// ───────────────────────────────────────────────────────────────

const OUTCOME_ICON: Record<FetchOutcomeKind, string> = {
  ok: "✅",
  empty: "⚪",
  failed: "❌",
  quotaExhausted: "⛔",
  skipped: "⏭",
  crashed: "💥",
};

export function outcomeIcon(k: FetchOutcomeKind): string {
  return OUTCOME_ICON[k];
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function tokenCell(u: GeminiUsage): string {
  return `${fmtInt(u.promptTokens)} / ${fmtInt(u.toolUseTokens)} / ${fmtInt(u.outputTokens)} / ${fmtInt(u.thoughtTokens)}`;
}

function mdCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\s+/g, " ");
}

export function renderStepSummary(s: FetchRunSummary): string {
  const lines: string[] = [];
  lines.push(`### Fetch (group=${s.group})`, "");
  lines.push("| source | outcome | failKind | items | calls | in / tool / out / thoughts | kept |");
  lines.push("|---|---|---|--:|--:|---|:-:|");
  let totalItems = 0;
  for (const r of s.rows) {
    totalItems += r.totalItems;
    lines.push(
      `| ${mdCell(r.sourceId)} | ${OUTCOME_ICON[r.outcome]} ${r.outcome} | ${mdCell(r.failKind ?? "")} | ${fmtInt(r.totalItems)} | ${fmtInt(r.geminiCalls)} | ${tokenCell(r.usage)} | ${r.keptLastGood ? "✓" : ""} |`,
    );
  }
  lines.push(
    `| **合計** (${s.selected} 本) | | | ${fmtInt(totalItems)} | ${fmtInt(s.calls)} | ${tokenCell(s.usage)} | |`,
  );
  lines.push("");
  if (s.abortedBy) {
    const skipped = s.rows.filter((r) => r.outcome === "skipped").length;
    lines.push(
      `> ⛔ ${s.abortedBy.kind} (${s.abortedBy.sourceId}) で打ち切り: 後続 ${skipped} 本は skipped (extracted は前回版を保持)`,
      "",
    );
  }
  const details = s.rows.filter((r) => r.detail && r.outcome !== "ok" && r.outcome !== "empty");
  for (const r of details) {
    lines.push(`- ${mdCell(r.sourceId)}: ${mdCell(r.detail ?? "")}`);
  }
  if (details.length > 0) lines.push("");
  return lines.join("\n");
}

/** workflow command の message 部のエスケープ (% / CR / LF)。 */
export function escapeWorkflowData(s: string): string {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

const WARN_OUTCOMES: ReadonlySet<FetchOutcomeKind> = new Set<FetchOutcomeKind>([
  "failed",
  "quotaExhausted",
  "skipped",
  "crashed",
]);

function isErrorLevel(r: FetchOutcome): boolean {
  return (
    r.outcome !== "skipped" && (r.abortRun === "billing" || r.abortRun === "config")
  );
}

/**
 * billing / config は ::error、quotaExhausted / skipped / failed / crashed は ::warning。
 * error を先に並べ、max 行を超えた分は 1 行にまとめる。
 */
export function buildAnnotationLines(s: FetchRunSummary, max = 5): string[] {
  const bad = s.rows
    .filter((r) => WARN_OUTCOMES.has(r.outcome))
    .sort((a, b) => Number(isErrorLevel(b)) - Number(isErrorLevel(a)));
  const toLine = (r: FetchOutcome): string => {
    const level = isErrorLevel(r) ? "error" : "warning";
    const msg =
      `${r.sourceId}: ${r.outcome}${r.failKind ? ` (${r.failKind})` : ""}` +
      (r.keptLastGood ? " / extracted は前回版を保持" : "") +
      (r.detail ? ` / ${r.detail}` : "");
    return `::${level} title=sync-fetch::${escapeWorkflowData(msg)}`;
  };
  if (bad.length <= max) return bad.map(toLine);
  const rest = bad.slice(max);
  return [
    ...bad.slice(0, max).map(toLine),
    `::warning title=sync-fetch::${escapeWorkflowData(
      `他 ${rest.length} 件: ${rest.map((r) => `${r.sourceId}=${r.outcome}`).join(", ")}`,
    )}`,
  ];
}
