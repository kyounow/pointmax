// 1ソース分のマスタ情報を Gemini で抽出するスクリプト。
//
// Usage:
//   npx tsx scripts/sync/fetch-source.ts <sourceId> [--dry-run]
//
// 流れ:
//   1. .env.local / process.env から GEMINI_API_KEY を読み込み
//   2. sources/registry.yaml から <sourceId> を探す
//   3. extractors/<extractor>.prompt.md を読み込み、INJECT マーカーを seed の現状で解決
//   4. (--dry-run なら) ここで停止
//   5. source.url を fetch して HTML を取得 (script/style を除去)
//   6. Gemini に systemInstruction = 解決済みプロンプト、user = HTML として送る
//   7. レスポンス JSON を ajv で schema 検証
//   8. sources/extracted/<sourceId>.json に書き出し

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { GoogleGenAI } from "@google/genai";
import { injectExistingEntities } from "./inject-prompt";
import type {
  ExtractedSource,
  ExtractorKind,
  RegistryFile,
  RegistrySource,
} from "./types";

// ───────────────────────────────────────────────────────────────
// Paths
// ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const REGISTRY_PATH = resolve(REPO_ROOT, "sources/registry.yaml");
const SCHEMA_PATH = resolve(
  REPO_ROOT,
  "sources/schema/extracted-source.schema.json",
);
const EXTRACTORS_DIR = resolve(REPO_ROOT, "sources/extractors");
const OUTPUT_DIR = resolve(REPO_ROOT, "sources/extracted");

// ───────────────────────────────────────────────────────────────
// CLI parsing
// ───────────────────────────────────────────────────────────────

type CliArgs = {
  sourceId: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  let sourceId: string | undefined;
  let dryRun = false;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    } else if (!a.startsWith("--")) sourceId = a;
    else {
      console.error(`unknown flag: ${a}`);
      printUsage();
      process.exit(1);
    }
  }
  if (!sourceId) {
    printUsage();
    process.exit(1);
  }
  return { sourceId, dryRun };
}

function printUsage(): void {
  console.error(
    [
      "Usage: tsx scripts/sync/fetch-source.ts <sourceId> [options]",
      "",
      "Args:",
      "  <sourceId>   sources/registry.yaml で定義された id",
      "",
      "Options:",
      "  --dry-run    Gemini を呼び出さず、registry読込・prompt解決まで実施",
      "  --help, -h   この使い方を表示",
      "",
      "例:",
      "  npm run sync:fetch -- jal-card-tokuyaku-list --dry-run",
      "  npm run sync:fetch -- rakuten-point-partners",
    ].join("\n"),
  );
}

// ───────────────────────────────────────────────────────────────
// .env.local loader
// ───────────────────────────────────────────────────────────────

function loadDotEnvLocal(): void {
  const path = resolve(REPO_ROOT, ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf-8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    // 既に環境変数があれば上書きしない (CI が優先)
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY が未設定。.env.local か環境変数にセットしてください。",
    );
  }
  if (key.includes("PASTE_YOUR_KEY_HERE")) {
    throw new Error(
      ".env.local の GEMINI_API_KEY がプレースホルダのまま。実際のキーに置き換えてください。",
    );
  }
  return key;
}

// ───────────────────────────────────────────────────────────────
// Registry / prompt loading
// ───────────────────────────────────────────────────────────────

function loadRegistry(): RegistryFile {
  const text = readFileSync(REGISTRY_PATH, "utf-8");
  const data = parseYaml(text) as RegistryFile;
  if (!data || !Array.isArray(data.sources)) {
    throw new Error("registry.yaml の形式が不正 (sources[] が無い)");
  }
  return data;
}

function findSource(registry: RegistryFile, sourceId: string): RegistrySource {
  const s = registry.sources.find((x) => x.id === sourceId);
  if (!s) {
    const available = registry.sources.map((x) => x.id).join(", ");
    throw new Error(
      `registry.yaml に "${sourceId}" は無い。\n登録済み: ${available}`,
    );
  }
  if (!s.enabled) {
    throw new Error(`"${sourceId}" は enabled: false。registry を確認してください。`);
  }
  return s;
}

function loadResolvedPrompt(extractor: ExtractorKind): string {
  const path = resolve(EXTRACTORS_DIR, `${extractor}.prompt.md`);
  if (!existsSync(path)) {
    throw new Error(`extractor プロンプトが見つからない: ${path}`);
  }
  const template = readFileSync(path, "utf-8");
  return injectExistingEntities(template);
}

// ───────────────────────────────────────────────────────────────
// Page fetch
// ───────────────────────────────────────────────────────────────

const PAGE_MAX_CHARS = 120_000; // Gemini に渡す最大長 (token 節約)

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (PointMax master-sync bot; +https://github.com/kyounow/pointmax)",
      "Accept-Language": "ja,en;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  const html = await res.text();
  let stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\r\n/g, "\n");
  // 改行が無駄に多い箇所を圧縮 (Gemini に noise を渡さない)
  stripped = stripped.replace(/\n{3,}/g, "\n\n");
  if (stripped.length > PAGE_MAX_CHARS) {
    stripped =
      stripped.slice(0, PAGE_MAX_CHARS) + "\n\n[...truncated due to length]";
  }
  return stripped;
}

// ───────────────────────────────────────────────────────────────
// Gemini call
// ───────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.5-pro";

async function callGemini(args: {
  apiKey: string;
  systemInstruction: string;
  userContent: string;
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: args.apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: args.userContent,
    config: {
      systemInstruction: args.systemInstruction,
      responseMimeType: "application/json",
    },
  });
  const text = response.text;
  if (!text || text.trim().length === 0) {
    throw new Error("Gemini が空のレスポンスを返した");
  }
  return text;
}

// ───────────────────────────────────────────────────────────────
// Schema validation
// ───────────────────────────────────────────────────────────────

function loadSchema(): object {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
}

function validateAgainstSchema(data: unknown, schema: object): void {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    const errs = (validate.errors ?? [])
      .map((e) => `  ${e.instancePath || "/"} ${e.message}`)
      .join("\n");
    throw new Error(`schema 違反:\n${errs}`);
  }
}

// ───────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadDotEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const registry = loadRegistry();
  const source = findSource(registry, args.sourceId);

  console.log(`📥 source: ${source.id}`);
  console.log(`   label:    ${source.label}`);
  console.log(`   url:      ${source.url}`);
  console.log(`   extractor:${source.extractor}`);
  console.log(`   produces: ${source.produces.join(", ")}`);

  const systemInstruction = loadResolvedPrompt(source.extractor);
  console.log(
    `🧩 prompt: 解決済み ${systemInstruction.length.toLocaleString()} chars`,
  );

  if (args.dryRun) {
    console.log("✋ --dry-run なのでここで停止 (Gemini 呼び出し無し)");
    return;
  }

  // --dry-run でなければ API キーが必要
  const apiKey = getApiKey();

  console.log("🌐 ページ取得中...");
  const pageText = await fetchPageText(source.url);
  console.log(`   fetched: ${pageText.length.toLocaleString()} chars`);

  console.log(`🤖 Gemini ${GEMINI_MODEL} 呼び出し中...`);
  const userContent =
    `対象 URL: ${source.url}\n` +
    `sourceId: ${source.id}\n\n` +
    `以下はこのページの本文 (HTML、script/styleは除去済み) です。指定のスキーマに従って ExtractedSource JSON を返してください:\n\n---\n\n` +
    pageText;
  const rawJson = await callGemini({
    apiKey,
    systemInstruction,
    userContent,
  });

  console.log("📋 JSON 解析中...");
  let parsed: ExtractedSource;
  try {
    parsed = JSON.parse(rawJson) as ExtractedSource;
  } catch (e) {
    throw new Error(
      `Gemini レスポンスが JSON として解析不能:\n${(e as Error).message}\n--- raw ---\n${rawJson.slice(0, 500)}`,
    );
  }

  // 必須メタ情報を補完 (Gemini が落とした場合のため)
  parsed.sourceId = source.id;
  parsed.sourceUrl = source.url;
  parsed.fetchedAt = parsed.fetchedAt || new Date().toISOString();
  parsed.extractor = source.extractor;
  parsed.geminiModel = parsed.geminiModel || GEMINI_MODEL;
  parsed.promptVersion = parsed.promptVersion || `${source.extractor}-vUnknown`;

  console.log("✅ schema 検証中...");
  const schema = loadSchema();
  validateAgainstSchema(parsed, schema);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = resolve(OUTPUT_DIR, `${source.id}.json`);
  writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  console.log(`✓ wrote ${outPath}`);

  // 抽出件数のサマリ
  const summary = {
    cards: parsed.cards?.length ?? 0,
    storeRules: parsed.storeRules?.length ?? 0,
    categoryRules: parsed.categoryRules?.length ?? 0,
    stores: parsed.stores?.length ?? 0,
    loyaltyRules: parsed.loyaltyRules?.length ?? 0,
    paymentApps: parsed.paymentApps?.length ?? 0,
  };
  console.log("📊 summary:", JSON.stringify(summary));
}

main().catch((err) => {
  console.error("💥 Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
