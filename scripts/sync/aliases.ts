import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALIASES_PATH = resolve(__dirname, "../../sources/aliases.json");

export type AliasesFile = {
  version: number;
  cardIds?: Record<string, string>;
  storeIds?: Record<string, string>;
};

let cached: AliasesFile | null = null;

export function loadAliases(): AliasesFile {
  if (cached) return cached;
  try {
    const text = readFileSync(ALIASES_PATH, "utf-8");
    cached = JSON.parse(text) as AliasesFile;
    return cached;
  } catch {
    // ファイル無し or 不正 → 空エイリアス
    cached = { version: 1, cardIds: {}, storeIds: {} };
    return cached;
  }
}

export function resolveCardId(id: string, aliases?: AliasesFile): string {
  const a = aliases ?? loadAliases();
  return a.cardIds?.[id] ?? id;
}

export function resolveStoreId(id: string, aliases?: AliasesFile): string {
  const a = aliases ?? loadAliases();
  return a.storeIds?.[id] ?? id;
}

// テスト用にキャッシュをクリア
export function _resetAliasesCache(): void {
  cached = null;
}
