// 一回限りの調査スクリプト: 現在の seed で参照されているが
// stores に存在しない storeId (孤児 membership) を一覧化し、
// extracted/*.json から name/category を引いて補完候補を生成する。
//
// Usage: tsx scripts/sync/find-orphan-stores.ts

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { seed } from "../../src/state/seed";
import type { ExtractedSource } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const EXTRACTED_DIR = resolve(REPO_ROOT, "sources/extracted");

function loadExtracted(): ExtractedSource[] {
  const files = readdirSync(EXTRACTED_DIR).filter((f) => f.endsWith(".json"));
  const out: ExtractedSource[] = [];
  for (const f of files) {
    const text = readFileSync(resolve(EXTRACTED_DIR, f), "utf-8");
    try {
      out.push(JSON.parse(text) as ExtractedSource);
    } catch {
      // skip malformed
    }
  }
  return out;
}

const s = seed();
const storeIds = new Set(s.stores.map((x) => x.id));

const orphanIds = new Set<string>();
for (const m of s.memberships) {
  if (!storeIds.has(m.storeId)) orphanIds.add(m.storeId);
}

console.log(`# Orphan stores: ${orphanIds.size}`);
console.log("");

const extracted = loadExtracted();
// storeId → { name, category, sourceId }[] (複数ソース対応)
const candidateMap = new Map<
  string,
  Array<{ name: string; category?: string; sourceId: string }>
>();

for (const src of extracted) {
  if (!src.stores) continue;
  for (const sx of src.stores) {
    if (!orphanIds.has(sx.storeId)) continue;
    if (!sx.name) continue;
    if (!candidateMap.has(sx.storeId)) candidateMap.set(sx.storeId, []);
    candidateMap.get(sx.storeId)!.push({
      name: sx.name,
      category: sx.category,
      sourceId: src.sourceId,
    });
  }
}

// 出力: TypeScript リテラル配列形式
console.log("// extracted から補完候補:");
const sortedOrphans = [...orphanIds].sort();
let resolved = 0;
const unresolved: string[] = [];
for (const id of sortedOrphans) {
  const cands = candidateMap.get(id);
  if (!cands || cands.length === 0) {
    unresolved.push(id);
    console.log(`  // 未解決: ${id}`);
    continue;
  }
  resolved += 1;
  // 1 つ目を採用 (複数ソースから name が出てれば最初のを基準)
  const c = cands[0];
  const cat = c.category ? `, category: "${c.category}"` : "";
  const note =
    cands.length > 1
      ? ` // sources: ${cands.map((x) => x.sourceId).join(", ")}`
      : ` // source: ${c.sourceId}`;
  console.log(`  { id: "${id}", name: "${c.name}"${cat} },${note}`);
}

console.log("");
console.log(`# resolved: ${resolved} / unresolved: ${unresolved.length}`);
if (unresolved.length > 0) {
  console.log(`# unresolved: ${unresolved.join(", ")}`);
}
