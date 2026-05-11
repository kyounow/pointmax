// Gemini に渡すプロンプトの動的注入。
//
// プロンプト本文中の以下のマーカーを、現在の seed.ts の内容に置き換える:
//
//   <!-- INJECT:<entity> [filter=<field>:<value>] [columns=<col1>,<col2>] -->
//   ...任意のプレースホルダ内容 (置換される)...
//   <!-- /INJECT -->
//
// 例:
//   <!-- INJECT:stores filter=category:JAL特約店 columns=id,name -->
//   <!-- /INJECT -->
//
// 対応する entity:
//   cards | currencies | stores | pointCards | paymentApps
//
// マーカー自体は出力にも保存される (再注入が冪等)。

import { seed } from "../../src/state/seed";

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

type InjectableEntity =
  | "cards"
  | "currencies"
  | "stores"
  | "pointCards"
  | "paymentApps";

type InjectParams = {
  filter?: { field: string; value: string };
  columns: string[];
};

// 各 entity のデフォルト列
const DEFAULT_COLUMNS: Record<InjectableEntity, string[]> = {
  cards: ["id", "name", "defaultRate", "defaultCurrencyId"],
  currencies: ["id", "name", "kind"],
  stores: ["id", "name", "category"],
  pointCards: ["id", "name", "currencyId"],
  paymentApps: ["id", "name", "chargeBased"],
};

// ───────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────

/**
 * プロンプト全体を解析し、全 INJECT ブロックを現在の seed 内容で置換する。
 * 未解決のマーカーがあれば例外を投げる (デバッグしやすさのため厳格)。
 */
export function injectExistingEntities(prompt: string): string {
  const data = seed();
  let resolved = 0;

  const result = prompt.replace(
    /<!--\s*INJECT:(\w+)([^>]*?)-->([\s\S]*?)<!--\s*\/INJECT\s*-->/g,
    (_match, kindRaw: string, paramStr: string) => {
      const kind = kindRaw as InjectableEntity;
      if (!(kind in DEFAULT_COLUMNS)) {
        throw new Error(`inject-prompt: 未知のエンティティ種別: "${kind}"`);
      }
      const params = parseParams(paramStr, DEFAULT_COLUMNS[kind]);
      const records = collectRecords(data, kind, params.filter);
      const table = renderMarkdownTable(records, params.columns);
      resolved += 1;
      // マーカー自体は保存して冪等性を保つ
      return `<!-- INJECT:${kind}${paramStr.replace(/\s+$/, "")} -->\n${table}\n<!-- /INJECT -->`;
    },
  );

  // 未解決の INJECT が残っていないか確認 (誤字や閉じ忘れの検出)
  const stray = result.match(/<!--\s*INJECT:\w+[^>]*-->/g);
  if (stray) {
    // ↑の正規表現にマッチした INJECT がペアで処理されたかを確認したい
    // 上のreplaceで全マッチを処理しているなら問題なし。
    // ここで気にするのは「閉じタグが無いブロック」 = replace でマッチしなかったもの
    const unhandled = stray.filter((m) => {
      // 直後の最初の閉じタグまでが十分長くて処理されたなら OK
      const idx = result.indexOf(m);
      const rest = result.slice(idx + m.length);
      return !/<!--\s*\/INJECT\s*-->/.test(rest);
    });
    if (unhandled.length > 0) {
      throw new Error(
        `inject-prompt: 閉じ忘れの INJECT ブロック:\n${unhandled.join("\n")}`,
      );
    }
  }

  return result;
}

// ───────────────────────────────────────────────────────────────
// Internals
// ───────────────────────────────────────────────────────────────

function parseParams(paramStr: string, defaultColumns: string[]): InjectParams {
  const params: InjectParams = { columns: defaultColumns };
  const matches = paramStr.matchAll(/(\w+)=([^\s]+)/g);
  for (const m of matches) {
    const key = m[1];
    const value = m[2];
    if (key === "filter") {
      const [field, ...rest] = value.split(":");
      if (!field || rest.length === 0) {
        throw new Error(`inject-prompt: filter の形式が不正: "${value}" (期待: field:value)`);
      }
      params.filter = { field, value: rest.join(":") };
    } else if (key === "columns") {
      params.columns = value.split(",").map((c) => c.trim()).filter(Boolean);
    } else {
      throw new Error(`inject-prompt: 未知のパラメータ: "${key}"`);
    }
  }
  return params;
}

type SeedData = ReturnType<typeof seed>;

function collectRecords(
  data: SeedData,
  kind: InjectableEntity,
  filter?: { field: string; value: string },
): Record<string, unknown>[] {
  const all = data[kind] as unknown as Record<string, unknown>[];
  if (!filter) return all;
  return all.filter((r) => {
    const v = r[filter.field];
    // 厳格な文字列一致 (型混乱を避ける)
    return String(v) === filter.value;
  });
}

function renderMarkdownTable(
  records: Record<string, unknown>[],
  columns: string[],
): string {
  if (records.length === 0) {
    return "_(該当エンティティ無し)_";
  }
  const header = `| ${columns.join(" | ")} |`;
  const sep = `|${columns.map(() => "---").join("|")}|`;
  const body = records
    .map(
      (r) =>
        `| ${columns
          .map((c) => formatCell(r[c]))
          .join(" | ")} |`,
    )
    .join("\n");
  return `${header}\n${sep}\n${body}`;
}

function formatCell(v: unknown): string {
  if (v == null) return "-";
  if (typeof v === "number") {
    // rate っぽい値は % 表記、その他は数字のまま
    if (v > 0 && v < 1) return `${(v * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
    return String(v);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.join(",");
  return String(v);
}
