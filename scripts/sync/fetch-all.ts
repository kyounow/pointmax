// 全 enabled ソースを順次 fetch する weekly cron 用ドライバ。
// 1 ソースの失敗で全体停止しないよう、各ソースを subprocess で分離して実行。
//
// Usage:
//   npm run sync:fetch-all              本番 (Gemini 実呼び出し)
//   npm run sync:fetch-all -- --dry-run 各ソースの prompt 解決まで確認 (Gemini 呼び出し無し)

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { load as parseYaml } from "js-yaml";
import type { RegistryFile } from "./types";

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

// ───────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun = parseDryRun(process.argv.slice(2));

  if (dryRun) {
    console.log("🔍 --dry-run モード: Gemini 呼び出しなし (prompt 解決まで確認)");
  }

  const registry = loadRegistry();
  const enabledSources = registry.sources.filter((s) => s.enabled);

  console.log(
    `📋 registry: ${registry.sources.length} ソース中 ${enabledSources.length} 件 enabled`,
  );

  type SourceResult = {
    id: string;
    success: boolean;
    elapsed: number; // seconds
  };

  const results: SourceResult[] = [];

  for (const source of enabledSources) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🚀 [${results.length + 1}/${enabledSources.length}] ${source.id}`);

    const startMs = Date.now();

    const spawnArgs = ["tsx", "scripts/sync/fetch-source.ts", source.id];
    if (dryRun) spawnArgs.push("--dry-run");

    const result = spawnSync("npx", spawnArgs, {
      stdio: "inherit",
      shell: process.platform === "win32",
      cwd: REPO_ROOT,
    });

    const elapsed = (Date.now() - startMs) / 1000;
    const success = result.status === 0;

    results.push({ id: source.id, success, elapsed });

    if (!success) {
      console.log(
        `❌ ${source.id} failed (exit ${result.status ?? "null"}, ${elapsed.toFixed(1)}s)`,
      );
      if (result.error) {
        console.log(`   spawn error: ${result.error.message}`);
      }
    }

    // ソース間で 5 秒スリープ (Gemini 429 / RPM 上限緩和)
    // gemini-2.5-flash の free tier RPM 上限は 10/min = 1 call/6s。
    // 1 ソースが内部で 3 attempts まで retry し得るため、ソース間にも
    // 余裕を持たせて RPM 超過を避ける。dry-run でも習慣的に入れる
    // (本番との動作差を最小化、6 ソースで合計 25s 待機程度)。
    if (results.length < enabledSources.length) {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  // ───────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 fetch-all summary:`);
  for (const r of results) {
    const icon = r.success ? "✓" : "✗";
    const suffix = r.success ? "" : "  failed";
    console.log(`  ${icon} ${r.id.padEnd(32)} (${r.elapsed.toFixed(1)}s)${suffix}`);
  }
  console.log(
    `total: ${succeeded.length} success / ${failed.length} failed / ${results.length} total`,
  );

  // 1 ソース失敗で workflow 停止させない設計: 常に exit 0
  // propose 側が失敗 fallback を gracefully 扱う。
  process.exit(0);
}

main().catch((err) => {
  console.error("💥 fetch-all unexpected error:", err instanceof Error ? err.message : String(err));
  // 予期しないエラーも exit 0 で抜ける (propose を走らせる)
  process.exit(0);
});
