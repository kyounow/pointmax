// enabled ソースを順次 fetch する weekly cron 用ドライバ。
// 1 ソースの失敗で全体停止しないよう、各ソースを subprocess で分離して実行。
//
// Usage:
//   npm run sync:fetch-all                  本番 (Gemini 実呼び出し、全 enabled = --group all 相当)
//   npm run sync:fetch-all -- --group mon   月グループのみ fetch (無料枠分割、weekly-sync 月曜 run)
//   npm run sync:fetch-all -- --group thu   木グループのみ fetch (weekly-sync 木曜 run)
//   npm run sync:fetch-all -- --group all   全 enabled (手動フル実行、後方互換)
//   npm run sync:fetch-all -- --dry-run     各ソースの prompt 解決まで確認 (Gemini 呼び出し無し)
//   npm run sync:fetch-all -- --parallel=2  並列 fetch (Wave 3 C-4 audit-fix、デフォルト 1)
//                                            ⚠ Gemini 無料枠 (10 RPM) では parallel=1 推奨。
//                                            有料枠 / GitHub Actions 環境のみ 2-3 を推奨。
//
// fetch outcome (PR-0b-2):
//   outcome ディレクトリ (PM_FETCH_OUTCOME_DIR > $RUNNER_TEMP/pointmax-fetch > mkdtemp) を用意して
//   子の fetch-source に渡し、各ソースの <id>.outcome.json を読む (spawn 前に前回分を消す)。
//   あるソースが quotaDaily / billing / config で打ち切った (abortRun) ら、後続ソースは spawn せず
//   skipped にする (dry-run では打ち切らない)。exit code ではなく outcome ファイルを唯一の信号にする。
//   GEMINI_MODEL / GEMINI_THINKING_BUDGET は冒頭で 1 回だけ検証し、不正なら全ソース skipped (0 req)。
//   終了時に GITHUB_STEP_SUMMARY へ表を書き、::warning:: / ::error:: を出す (annotation は fetch-all だけ)。
//   exit code は従来どおり常に 0 (propose を必ず走らせる)。

import { appendFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { load as parseYaml } from "js-yaml";
import type { RegistryFile, RegistrySource } from "./types";
import {
  formatFetchError,
  formatUsage,
  resolveGeminiModel,
  resolveThinkingBudget,
  type RunAbortKind,
} from "./fetch-response";
import {
  buildAnnotationLines,
  clearFetchOutcome,
  effectiveOutcome,
  escapeWorkflowData,
  outcomeIcon,
  prepareRunOutcomeDir,
  readFetchOutcome,
  renderStepSummary,
  shouldAbortRemaining,
  summarizeRun,
  type FetchOutcome,
  type SourceRunResult,
} from "./fetch-outcome";

// ───────────────────────────────────────────────────────────────
// Paths
// ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const REGISTRY_PATH = resolve(REPO_ROOT, "sources/registry.yaml");

// ───────────────────────────────────────────────────────────────
// Registry loader
// ───────────────────────────────────────────────────────────────

function loadRegistry(): RegistryFile {
  const text = readFileSync(REGISTRY_PATH, "utf-8");
  const data = parseYaml(text) as RegistryFile;
  if (!data || !Array.isArray(data.sources)) {
    throw new Error("registry.yaml の形式が不正 (sources[] が無い)");
  }
  return data;
}

// ───────────────────────────────────────────────────────────────
// CLI parsing
// ───────────────────────────────────────────────────────────────

function parseDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

function parseParallel(argv: string[]): number {
  for (const a of argv) {
    if (a.startsWith("--parallel=")) {
      const n = parseInt(a.slice("--parallel=".length), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 8) return n;
      console.log(
        `⚠️  --parallel の値が不正 (${a})、デフォルト 1 を使用 (1-8 の範囲で指定)`,
      );
    }
  }
  return 1;
}

// ───────────────────────────────────────────────────────────────
// Group filter (無料枠分割: mon / thu / all)
// ───────────────────────────────────────────────────────────────

// `--group` フィルタの受理値。all = enabled 全部 (手動フル実行 / 後方互換)。
export type GroupFilter = "mon" | "thu" | "all";

function normalizeGroup(raw: string): GroupFilter {
  const v = raw.trim().toLowerCase();
  if (v === "mon" || v === "thu" || v === "all") return v;
  console.log(`⚠️  --group の値が不正 (${raw})、all を使用 (mon|thu|all)`);
  return "all";
}

// `--group=mon` (= 区切り) と `--group mon` (スペース区切り) の両方を受理。
// 引数なしは all (手動フル実行の後方互換)。
function parseGroup(argv: string[]): GroupFilter {
  for (const a of argv) {
    if (a.startsWith("--group=")) return normalizeGroup(a.slice("--group=".length));
  }
  const i = argv.indexOf("--group");
  if (i >= 0 && argv[i + 1] !== undefined) return normalizeGroup(argv[i + 1]);
  return "all";
}

// enabled だが fetchGroup 未指定のソースを見つけた時のデフォルト警告。
const warnUnassigned = (s: RegistrySource): void =>
  console.log(
    `⚠️  ${s.id}: enabled だが fetchGroup 未指定。取りこぼし防止のため group フィルタに含めます (registry.yaml に fetchGroup: mon|thu を付与してください)`,
  );

// group フィルタの純関数 (テスト可能に切り出し)。
//   all       → enabled ソース全部 (手動フル実行 / 後方互換)
//   mon | thu → enabled かつ fetchGroup が一致するもの。ただし fetchGroup 未指定の
//               enabled ソースは onUnassigned で通知しつつ含める (新規追加の
//               取りこぼし防止。契約テストが未指定を弾くので実運用では発生しない想定)。
export function selectSourcesForGroup(
  sources: RegistrySource[],
  group: GroupFilter,
  onUnassigned: (source: RegistrySource) => void = warnUnassigned,
): RegistrySource[] {
  const enabled = sources.filter((s) => s.enabled);
  if (group === "all") return enabled;
  return enabled.filter((s) => {
    if (s.fetchGroup === undefined) {
      onUnassigned(s);
      return true;
    }
    return s.fetchGroup === group;
  });
}

// ───────────────────────────────────────────────────────────────
// Async subprocess wrapper (Wave 3 C-4 audit-fix)
// ───────────────────────────────────────────────────────────────

type SubprocResult = { code: number | null; error?: Error };

/** 1 ソースを実行する関数 (本番は fetch-source の子プロセス、テストでは偽物) */
export type RunOne = (sourceId: string, dryRun: boolean) => Promise<SubprocResult>;

// 子プロセスは process.env (PM_FETCH_OUTCOME_DIR を含む) を継承する。
function runFetchSource(sourceId: string, dryRun: boolean, cwd: string): Promise<SubprocResult> {
  return new Promise((resolvePromise) => {
    const args = ["tsx", "scripts/sync/fetch-source.ts", sourceId];
    if (dryRun) args.push("--dry-run");
    const child = spawn("npx", args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      cwd,
    });
    child.on("error", (error) => resolvePromise({ code: null, error }));
    child.on("exit", (code) => resolvePromise({ code }));
  });
}

// 簡易 concurrency limit: worker pool 方式で items を消化する。
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerLoop = async (): Promise<void> => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  };
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => workerLoop(),
  );
  await Promise.all(workers);
  return results;
}

// ───────────────────────────────────────────────────────────────
// runGroup: 逐次 / 並列実行 + outcome による後続ソースの打ち切り
// ───────────────────────────────────────────────────────────────

// ソース間 5 秒スリープ (Gemini 429 / RPM 上限緩和)。
// gemini-2.5-flash の free tier RPM 上限は 10/min = 1 call/6s。1 ソースが内部で 3 attempts まで
// retry し得るため、ソース間にも余裕を持たせる。実際に spawn する時だけ入れる (skipped の前は待たない)。
// dry-run でも習慣的に入れる (本番との動作差を最小化)。
export const INTER_SOURCE_SLEEP_MS = 5000;

export type RunGroupOptions = {
  dryRun: boolean;
  parallel: number;
  /** null なら outcome を読まない (dry-run: fetch-source は outcome を書かない) */
  outcomeDir: string | null;
  runOne: RunOne;
  sleep: (ms: number) => Promise<void>;
  interSourceSleepMs?: number;
  readOutcome?: (dir: string, sourceId: string) => FetchOutcome | null;
  clearOutcome?: (dir: string, sourceId: string) => void;
  now?: () => number;
  onStart?: (source: RegistrySource, index: number, total: number) => void;
  onFinish?: (result: SourceRunResult, index: number, total: number) => void;
};

/**
 * sources を実行し、ソースごとの SourceRunResult を registry 順で返す。
 * - spawn 前に abortedBy (前のソースの abortRun) があれば spawn せず skippedBy を付ける
 * - 無ければ clearOutcome → runOne → readOutcome。`!dryRun && abortRun` なら以後を打ち切る
 * - 並列時は worker が次を取り出す時に共有の abortedBy を確認する
 */
export async function runGroup(
  sources: RegistrySource[],
  opts: RunGroupOptions,
): Promise<SourceRunResult[]> {
  const readOutcome = opts.readOutcome ?? readFetchOutcome;
  const clearOutcome = opts.clearOutcome ?? clearFetchOutcome;
  const now = opts.now ?? Date.now;
  const interSleep = opts.interSourceSleepMs ?? INTER_SOURCE_SLEEP_MS;
  const total = sources.length;
  let abortedBy: { kind: RunAbortKind; sourceId: string } | undefined;
  const results: SourceRunResult[] = new Array(total);

  const skipped = (source: RegistrySource, by: { kind: RunAbortKind; sourceId: string }): SourceRunResult => ({
    sourceId: source.id,
    exitCode: null,
    elapsedSec: 0,
    outcome: null,
    skippedBy: { ...by },
  });

  const runAt = async (i: number): Promise<SourceRunResult> => {
    const source = sources[i];
    opts.onStart?.(source, i, total);
    if (opts.outcomeDir !== null) clearOutcome(opts.outcomeDir, source.id);
    const t0 = now();
    const res = await opts.runOne(source.id, opts.dryRun);
    const elapsedSec = (now() - t0) / 1000;
    const outcome = opts.outcomeDir !== null ? readOutcome(opts.outcomeDir, source.id) : null;
    const r: SourceRunResult = {
      sourceId: source.id,
      exitCode: res.code,
      elapsedSec,
      outcome,
      ...(res.error ? { spawnError: res.error.message } : {}),
    };
    if (!opts.dryRun && abortedBy === undefined && shouldAbortRemaining(outcome) && outcome?.abortRun) {
      abortedBy = { kind: outcome.abortRun, sourceId: source.id };
    }
    return r;
  };

  const finish = (r: SourceRunResult, i: number): void => {
    results[i] = r;
    opts.onFinish?.(r, i, total);
  };

  if (opts.parallel <= 1) {
    let spawned = 0;
    for (let i = 0; i < total; i++) {
      if (abortedBy !== undefined) {
        finish(skipped(sources[i], abortedBy), i);
        continue;
      }
      if (spawned > 0) await opts.sleep(interSleep);
      spawned += 1;
      finish(await runAt(i), i);
    }
  } else {
    // 並列 pool: ソース間 sleep は省略 (worker 内の subprocess 実行時間で自然にズレる。有料枠想定)
    await runWithConcurrency(
      sources.map((_, i) => i),
      opts.parallel,
      async (i) => {
        if (abortedBy !== undefined) {
          finish(skipped(sources[i], abortedBy), i);
          return;
        }
        finish(await runAt(i), i);
      },
    );
  }
  return results;
}

// ───────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────

function formatRowForConsole(o: FetchOutcome, elapsedSec: number): string {
  const tail = [
    o.failKind ? `(${o.failKind})` : "",
    `items=${o.totalItems}`,
    `calls=${o.geminiCalls}`,
    o.keptLastGood ? "kept" : "",
    `${elapsedSec.toFixed(1)}s`,
  ]
    .filter((s) => s !== "")
    .join(" ");
  return `${outcomeIcon(o.outcome)} ${o.sourceId.padEnd(32)} ${o.outcome.padEnd(14)} ${tail}`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = parseDryRun(argv);
  const parallel = parseParallel(argv);
  const group = parseGroup(argv);

  if (dryRun) {
    console.log("🔍 --dry-run モード: Gemini 呼び出しなし (prompt 解決まで確認)");
  }
  if (parallel > 1) {
    console.log(
      `⚡ --parallel=${parallel} モード: 並列 fetch (⚠ Gemini RPM 上限注意。free tier は parallel=1 推奨)`,
    );
  }

  const registry = loadRegistry();
  const enabledCount = registry.sources.filter((s) => s.enabled).length;
  const selectedSources = selectSourcesForGroup(registry.sources, group);

  console.log(
    `📋 registry: ${registry.sources.length} ソース中 ${enabledCount} 件 enabled、group=${group} (${selectedSources.length}/${enabledCount} sources) を fetch`,
  );

  // モデル名 / thinking 予算を 1 回だけ事前検証 (0 req)。不正なら全ソースを skipped (config) にする。
  let configError: string | undefined;
  try {
    const model = resolveGeminiModel(process.env.GEMINI_MODEL);
    const budget = resolveThinkingBudget(process.env.GEMINI_THINKING_BUDGET);
    console.log(`🤖 model=${model} thinkingBudget=${budget}`);
  } catch (e) {
    configError = formatFetchError(e);
  }

  // outcome ディレクトリを用意して子に渡す (spawn は process.env を継承する)。dry-run は outcome を書かない。
  const outcomeDir = dryRun ? null : prepareRunOutcomeDir(process.env);
  if (outcomeDir !== null) {
    process.env.PM_FETCH_OUTCOME_DIR = outcomeDir;
    console.log(`🗃 outcome dir: ${outcomeDir}`);
  }

  let results: SourceRunResult[];
  if (configError !== undefined) {
    console.log(
      `::error title=sync-fetch::${escapeWorkflowData(
        `GEMINI_MODEL / GEMINI_THINKING_BUDGET が不正: ${configError}。全 ${selectedSources.length} ソースを skipped (0 req)`,
      )}`,
    );
    results = selectedSources.map((s) => ({
      sourceId: s.id,
      exitCode: null,
      elapsedSec: 0,
      outcome: null,
      skippedBy: { kind: "config", sourceId: "GEMINI_MODEL/GEMINI_THINKING_BUDGET" },
    }));
  } else {
    results = await runGroup(selectedSources, {
      dryRun,
      parallel,
      outcomeDir,
      runOne: (id, dr) => runFetchSource(id, dr, REPO_ROOT),
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      onStart: (source, i, total) => {
        if (parallel > 1) return;
        console.log(`\n${"─".repeat(60)}`);
        console.log(`🚀 [${i + 1}/${total}] ${source.id}`);
      },
      onFinish: (r, i, total) => {
        if (r.skippedBy) {
          console.log(
            `⏭ [${i + 1}/${total}] ${r.sourceId} skipped (${r.skippedBy.sourceId} の ${r.skippedBy.kind} で打ち切り)`,
          );
          return;
        }
        if (r.exitCode !== 0) {
          console.log(`❌ ${r.sourceId} exit ${r.exitCode ?? "null"} (${r.elapsedSec.toFixed(1)}s)`);
          if (r.spawnError) console.log(`   spawn error: ${r.spawnError}`);
        } else if (parallel > 1) {
          console.log(`✓ [${i + 1}/${total}] ${r.sourceId} (${r.elapsedSec.toFixed(1)}s)`);
        }
      },
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 fetch-all summary (group=${group}):`);

  if (dryRun) {
    // dry-run は outcome を書かないので exit code だけで表示する
    for (const r of results) {
      const ok = r.exitCode === 0;
      console.log(`  ${ok ? "✓" : "✗"} ${r.sourceId.padEnd(32)} (${r.elapsedSec.toFixed(1)}s)${ok ? " dry-run ok" : ` exit ${r.exitCode ?? "null"}`}`);
    }
    process.exit(0);
  }

  const summary = summarizeRun(group, results);
  for (let i = 0; i < results.length; i++) {
    console.log(`  ${formatRowForConsole(effectiveOutcome(results[i]), results[i].elapsedSec)}`);
  }
  const counts = new Map<string, number>();
  for (const row of summary.rows) counts.set(row.outcome, (counts.get(row.outcome) ?? 0) + 1);
  console.log(
    `total: ${[...counts.entries()].map(([k, n]) => `${k} ${n}`).join(" / ")} (${results.length} sources)`,
  );
  console.log(`📈 usage total ${formatUsage(summary.usage)}`);
  if (summary.abortedBy) {
    console.log(`⛔ ${summary.abortedBy.kind} (${summary.abortedBy.sourceId}) で後続ソースを打ち切り`);
  }

  const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummaryPath) {
    try {
      appendFileSync(stepSummaryPath, `${renderStepSummary(summary)}\n`);
    } catch (e) {
      console.log(`⚠️ GITHUB_STEP_SUMMARY への書き込みに失敗: ${formatFetchError(e)}`);
    }
  }
  for (const line of buildAnnotationLines(summary)) console.log(line);

  // 1 ソース失敗で workflow 停止させない設計: 常に exit 0
  // propose 側が失敗 fallback (prefix 付き notes) を gracefully 扱い、keep-last-good のソースは前回版で進む。
  process.exit(0);
}

// エントリポイントとして直接実行された時のみ main() を走らせる
// (registry-consistency.test.ts が selectSourcesForGroup を import しても
//  副作用で fetch が走らないようにする)。
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  main().catch((err) => {
    console.error("💥 fetch-all unexpected error:", err instanceof Error ? err.message : String(err));
    // 予期しないエラーも exit 0 で抜ける (propose を走らせる)
    process.exit(0);
  });
}
