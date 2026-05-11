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
import { SCOPE_DIRECTIVES } from "./types";
import type {
  ExtractedSource,
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

function loadResolvedPrompt(source: RegistrySource): string {
  const path = resolve(EXTRACTORS_DIR, `${source.extractor}.prompt.md`);
  if (!existsSync(path)) {
    throw new Error(`extractor プロンプトが見つからない: ${path}`);
  }
  const template = readFileSync(path, "utf-8");
  // 抽出スコープの指示を先頭に prepend。プロンプト本文より優先度高めに見せる。
  const scopeDirective = SCOPE_DIRECTIVES[source.extractionScope];
  const injected = injectExistingEntities(template);
  return `${scopeDirective}\n${injected}`;
}

// ───────────────────────────────────────────────────────────────
// Gemini call (URL Context Tool 経由)
// ───────────────────────────────────────────────────────────────
// 静的 fetch は廃止。Gemini に URL ごと渡し、url_context ツールで
// Gemini 側に動的レンダリング込みでページを読ませる。
// SPA や PDF を含むソースでも動作するメリット。
// 制約: responseSchema は URL Context と併用不可な場合があるため、
// MIME type のみ application/json に固定し、ajv 側で厳格検証する。

// デフォルトは Flash (無料枠が緩く JSON 抽出に十分)。
// 高精度が必要なら GEMINI_MODEL=gemini-2.5-pro で上書き可能 (要 Pro クォータ)。
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

type GeminiResult = {
  text: string;
  retrievedUrls: string[]; // URL Context が実際に取得した URL
};

async function callGemini(args: {
  apiKey: string;
  systemInstruction: string;
  url: string;
  sourceId: string;
}): Promise<GeminiResult> {
  const ai = new GoogleGenAI({ apiKey: args.apiKey });
  const userPrompt =
    `以下の URL を読み取り、systemInstruction に従って ExtractedSource JSON を返してください。\n\n` +
    `URL: ${args.url}\n` +
    `sourceId: ${args.sourceId}\n\n` +
    `**重要**: 出力は ExtractedSource スキーマに準拠した有効な JSON のみ。コードブロック (\`\`\`json) や説明文は付けない。`;

  // 注意: URL Context Tool 使用時は responseMimeType: 'application/json' は併用不可
  // (Gemini API 制約)。プロンプトと postprocess で JSON 抽出を担保する。
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: args.systemInstruction,
      tools: [{ urlContext: {} }],
    },
  });

  const text = response.text;
  if (!text || text.trim().length === 0) {
    throw new Error("Gemini が空のレスポンスを返した");
  }

  // URL Context が実際にどの URL を取りに行ったかを (可能なら) 抽出
  const retrievedUrls: string[] = [];
  // 型 guard 経由で URL Context メタデータを探す (SDK バージョン非依存)
  const candidates = (response as { candidates?: Array<{ urlContextMetadata?: { urlMetadata?: Array<{ retrievedUrl?: string; urlRetrievalStatus?: string }> } }> }).candidates;
  if (candidates && candidates.length > 0) {
    const meta = candidates[0].urlContextMetadata;
    if (meta?.urlMetadata) {
      for (const m of meta.urlMetadata) {
        if (m.retrievedUrl) retrievedUrls.push(
          m.urlRetrievalStatus
            ? `${m.retrievedUrl} [${m.urlRetrievalStatus}]`
            : m.retrievedUrl,
        );
      }
    }
  }

  return { text, retrievedUrls };
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
  console.log(`   scope:    ${source.extractionScope}`);

  const systemInstruction = loadResolvedPrompt(source);
  console.log(
    `🧩 prompt: 解決済み ${systemInstruction.length.toLocaleString()} chars (scope directive 込み)`,
  );

  if (args.dryRun) {
    console.log("✋ --dry-run なのでここで停止 (Gemini 呼び出し無し)");
    return;
  }

  // --dry-run でなければ API キーが必要
  const apiKey = getApiKey();

  console.log(`🤖 Gemini ${GEMINI_MODEL} 呼び出し中 (URL Context Tool 経由)...`);
  const { text: rawJson, retrievedUrls } = await callGemini({
    apiKey,
    systemInstruction,
    url: source.url,
    sourceId: source.id,
  });
  if (retrievedUrls.length > 0) {
    console.log("   retrieved URLs:");
    for (const u of retrievedUrls) console.log(`     - ${u}`);
  } else {
    console.log("   ⚠️ retrievedUrls メタデータ無し (URL Context が動いてない可能性)");
  }

  // URL Context が全 URL で失敗していたら、空の ExtractedSource を書き出して exit
  // (Gemini が JSON でなく謝罪文章を返すケースに対応。proposed-migrations 側は notes で skip 判定する)
  const allFailed =
    retrievedUrls.length > 0 &&
    retrievedUrls.every((u) => u.includes("URL_RETRIEVAL_STATUS_ERROR"));
  if (allFailed) {
    console.log("⚠️ URL Context が全 URL で失敗。空の ExtractedSource を書き出します。");
    const fallback: ExtractedSource = {
      sourceId: source.id,
      sourceUrl: source.url,
      fetchedAt: new Date().toISOString(),
      promptVersion: `${source.extractor}-vUnknown`,
      extractor: source.extractor,
      geminiModel: GEMINI_MODEL,
      notes:
        `URL retrieval failed (URL_RETRIEVAL_STATUS_ERROR). ` +
        `URL を確認するか、ソースを enabled: false に設定してください。`,
    };
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const outPath = resolve(OUTPUT_DIR, `${source.id}.json`);
    writeFileSync(outPath, JSON.stringify(fallback, null, 2));
    console.log(`✓ wrote ${outPath} (空)`);
    return;
  }

  console.log("📋 JSON 解析中...");
  let parsed: ExtractedSource;
  try {
    // Gemini が ```json コードフェンスでラップしてくることがあるので除去 (保険)
    const cleaned = rawJson
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(cleaned) as ExtractedSource;
  } catch (e) {
    // Gemini が JSON でなく散文で「ページから抽出できなかった」と返した場合。
    // crash せず空の ExtractedSource を書き出し、proposed-migrations 側で skip 判定。
    console.log("⚠️ Gemini レスポンスが JSON でない (取得には成功したが抽出失敗)");
    console.log(`     raw (first 300 chars): ${rawJson.slice(0, 300)}`);
    const fallback: ExtractedSource = {
      sourceId: source.id,
      sourceUrl: source.url,
      fetchedAt: new Date().toISOString(),
      promptVersion: `${source.extractor}-vUnknown`,
      extractor: source.extractor,
      geminiModel: GEMINI_MODEL,
      notes:
        `Gemini could not extract structured data from this URL. ` +
        `Likely cause: page is a navigation hub, not the partner list itself. ` +
        `Raw response (first 300 chars): ${rawJson.slice(0, 300).replace(/\s+/g, " ")}`,
    };
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const outPath = resolve(OUTPUT_DIR, `${source.id}.json`);
    writeFileSync(outPath, JSON.stringify(fallback, null, 2));
    console.log(`✓ wrote ${outPath} (空 + 失敗 notes)`);
    return;
  }

  // 必須メタ情報を「スクリプトが知ってる事実」で上書き。
  // (Gemini はプロンプト例の値をコピーしてくることがあるため信用しない)
  parsed.sourceId = source.id;
  parsed.sourceUrl = source.url;
  parsed.fetchedAt = new Date().toISOString();
  parsed.extractor = source.extractor;
  parsed.geminiModel = GEMINI_MODEL;
  // promptVersion だけは Gemini が読み取る値を尊重 (extractor のバージョン管理)
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
