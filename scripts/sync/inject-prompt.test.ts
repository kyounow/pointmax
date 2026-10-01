import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { load as parseYaml } from "js-yaml";
import { injectExistingEntities } from "./inject-prompt";
import type { RegistryFile } from "./types";
import { seed } from "../../src/state/seed";
import { PSEUDO_PAYMENT_APP_IDS, PSEUDO_STORE_IDS } from "../../src/state/seed-blocklist";
import { EXTRACTABLE_STORE_CATEGORIES } from "../../src/state/seed-categories";

describe("injectExistingEntities", () => {
  it("INJECT:stores マーカーが Markdown テーブルに置換される", () => {
    const input = `
# test
<!-- INJECT:stores columns=id,name -->
placeholder
<!-- /INJECT -->
`;
    const out = injectExistingEntities(input);
    expect(out).toContain("| id | name |");
    expect(out).toMatch(/\|\s*rakuten-ichiba\s*\|\s*楽天市場\s*\|/);
    expect(out).not.toContain("placeholder");
    // マーカー自体は残る (再注入が冪等)
    expect(out).toContain("<!-- INJECT:stores columns=id,name -->");
    expect(out).toContain("<!-- /INJECT -->");
  });

  it("filter=category:ガソリンスタンド で店舗が絞り込まれる", () => {
    // v3 PR 1: 旧 JAL特約店カテゴリは業種別に変更済み (ENEOS → ガソリンスタンド)
    const input = `
<!-- INJECT:stores filter=category:ガソリンスタンド columns=id,name -->
<!-- /INJECT -->
`;
    const out = injectExistingEntities(input);
    expect(out).toContain("ENEOS");
    expect(out).toContain("出光");
    // 飲食カテゴリの店は含まれないはず
    expect(out).not.toContain("スターバックス");
    expect(out).not.toContain("マクドナルド");
  });

  it("複数の INJECT が独立して解決される", () => {
    const input = `
<!-- INJECT:cards columns=id,name -->
<!-- /INJECT -->

<!-- INJECT:currencies columns=id,name -->
<!-- /INJECT -->
`;
    const out = injectExistingEntities(input);
    expect(out).toContain("jal-suica");
    expect(out).toContain("jal-mile");
    expect(out).toContain("rakuten-pt");
  });

  it("rate 値が % 表記で出力される (0.01 → 1%)", () => {
    const input = `
<!-- INJECT:cards columns=id,defaultRate -->
<!-- /INJECT -->
`;
    const out = injectExistingEntities(input);
    expect(out).toMatch(/1%/);
  });

  it("chargeBased=true は明示、未設定は '-' で表示", () => {
    // seed では charge-based なアプリのみ chargeBased: true、
    // 直接決済 (Visaタッチ等) は chargeBased を未設定にしている
    const input = `
<!-- INJECT:paymentApps columns=id,chargeBased -->
<!-- /INJECT -->
`;
    const out = injectExistingEntities(input);
    expect(out).toMatch(/pa-d-pay\s*\|\s*true/);
    expect(out).toMatch(/pa-visa-touch\s*\|\s*-/);
  });

  it("未知のエンティティ種別は例外", () => {
    const input = `<!-- INJECT:unknown -->\n<!-- /INJECT -->`;
    expect(() => injectExistingEntities(input)).toThrow(/未知のエンティティ種別/);
  });

  it("filter の形式が不正だと例外", () => {
    const input = `<!-- INJECT:stores filter=invalidformat -->\n<!-- /INJECT -->`;
    expect(() => injectExistingEntities(input)).toThrow(/filter の形式が不正/);
  });

  it("INJECT が無いプロンプトはそのまま返る", () => {
    const input = "# 普通の Markdown\nテキストのみ";
    expect(injectExistingEntities(input)).toBe(input);
  });

  it("PR-4a: INJECT:categories は語彙 35 名 (汎用を除く) の 1 列表に展開される", () => {
    const out = injectExistingEntities(
      `<!-- INJECT:categories -->\nplaceholder\n<!-- /INJECT -->`,
    );
    expect(out).toContain("| name |");
    expect(out).not.toContain("placeholder");
    const rows = [...out.matchAll(/^\|\s*([^|]+?)\s*\|$/gm)]
      .map((m) => m[1])
      .filter((v) => v !== "name" && v !== "---");
    expect(rows).toEqual([...EXTRACTABLE_STORE_CATEGORIES]);
    expect(rows).toHaveLength(35);
    expect(rows).not.toContain("汎用");
    expect(out).toContain("<!-- INJECT:categories -->");
  });

  it("PR-4a: INJECT:categories に filter を付けると例外", () => {
    const input = `<!-- INJECT:categories filter=name:飲食 -->\n<!-- /INJECT -->`;
    expect(() => injectExistingEntities(input)).toThrow(/INJECT:categories は filter を受け付けない/);
  });

  it("PR-4a: INJECT:categories の columns は name だけ受け付ける (他の列は空セルになるので例外)", () => {
    const bad = `<!-- INJECT:categories columns=name,id -->\n<!-- /INJECT -->`;
    expect(() => injectExistingEntities(bad)).toThrow(/INJECT:categories の columns は name だけ/);
    const ok = `<!-- INJECT:categories columns=name -->\n<!-- /INJECT -->`;
    expect(injectExistingEntities(ok)).toContain("| 飲食 |");
  });
});

describe("全プロンプトファイルが解決可能", () => {
  const promptsDir = resolve(__dirname, "../../sources/extractors");
  const promptFiles = readdirSync(promptsDir).filter((f) =>
    f.endsWith(".prompt.md"),
  );

  it.each(promptFiles)("%s が例外なく解決される", (filename) => {
    const content = readFileSync(resolve(promptsDir, filename), "utf-8");
    expect(() => injectExistingEntities(content)).not.toThrow();
  });

  it.each(promptFiles)(
    "%s 解決後にプレースホルダ文言が消える",
    (filename) => {
      const content = readFileSync(resolve(promptsDir, filename), "utf-8");
      const resolved = injectExistingEntities(content);
      // プレースホルダ (注入前の説明テキスト) は INJECT ブロック内なので消えるはず
      expect(resolved).not.toContain("ビルド時に scripts/sync/inject-prompt.ts が seed.ts から最新一覧を注入");
    },
  );
});

// cron 構築後に seed へ追加されたカード/通貨 (例: v4 の orico-pt/mufg-pt,
// orico-card/mufg-card) が、動的注入から漏れず Gemini プロンプトに必ず現れることの
// 回帰契約。注入は seed() のライブ参照なので本来自動反映されるが、将来の
// seed shape 変更・filter バグ・INJECT マーカー消失で静かに欠落しても気付けるよう、
// 「全 seed エンティティが注入テーブルに存在する」ことをハードコードでなく
// seed を走査して検証する。v5+ で通貨/カードを足した時もこの契約が自動で守る。
describe("post-cron 追加エンティティのカバレッジ契約", () => {
  const promptsDir = resolve(__dirname, "../../sources/extractors");

  // columns=id 単一列にすると各行が `| <id> |` になり、id の部分一致誤検知を避けられる
  function injectedIds(entity: string): string[] {
    const out = injectExistingEntities(
      `<!-- INJECT:${entity} columns=id -->\n<!-- /INJECT -->`,
    );
    return [...out.matchAll(/^\|\s*([^\s|]+)\s*\|$/gm)].map((m) => m[1]);
  }

  it.each([
    ["currencies", () => seed().currencies.map((c) => c.id)],
    ["cards", () => seed().cards.map((c) => c.id)],
    ["pointCards", () => seed().pointCards.map((p) => p.id)],
    [
      "paymentApps",
      // PSEUDO_PAYMENT_APP_IDS (例: "pa-default" = 基本決済モード) は
      // H3 対応で INJECT から意図的に除外されるため、期待値からも除く
      // (PSEUDO_STORE_IDS の "general" が stores から除外されるのと同型)。
      () =>
        seed()
          .paymentApps.map((a) => a.id)
          .filter((id) => !PSEUDO_PAYMENT_APP_IDS.has(id)),
    ],
  ] as const)(
    "INJECT:%s は全 seed エンティティ ID を漏れなく含む",
    (entity, getSeedIds) => {
      const injected = new Set(injectedIds(entity));
      const seedIds = getSeedIds();
      expect(seedIds.length).toBeGreaterThan(0);
      const missing = seedIds.filter((id) => !injected.has(id));
      expect(missing).toEqual([]);
    },
  );

  it("v4 で追加した orico/mufg 通貨・カードが明示的に注入される", () => {
    // 本契約を導入する直接の動機 (セッションログ #3(b))。
    // 一般ループでも捕捉されるが、退行時にこの名前付きテストが理由を即示す。
    const currencyIds = new Set(injectedIds("currencies"));
    const cardIds = new Set(injectedIds("cards"));
    expect(currencyIds).toContain("orico-pt");
    expect(currencyIds).toContain("mufg-pt");
    expect(cardIds).toContain("orico-card");
    expect(cardIds).toContain("mufg-card");
  });

  it("PR-4a: INJECT:categories は seed() の店舗が使う全カテゴリ (pseudo = 擬似店舗 general の汎用を除く) を含む", () => {
    const out = injectExistingEntities(`<!-- INJECT:categories -->\n<!-- /INJECT -->`);
    const injected = new Set(
      [...out.matchAll(/^\|\s*([^|]+?)\s*\|$/gm)].map((m) => m[1]),
    );
    const used = new Set(
      seed()
        .stores.filter((s) => !PSEUDO_STORE_IDS.has(s.id))
        .map((s) => s.category ?? "(未設定)"),
    );
    expect(used.size).toBeGreaterThan(10);
    expect([...used].filter((c) => !injected.has(c))).toEqual([]);
  });

  it("card extractor の実プロンプトが全 seed 通貨を含む (defaultCurrencyId マッピング用)", () => {
    // card extractor は cards[].defaultCurrencyId を既存通貨へ対応付ける。
    // 新通貨が card.prompt.md の INJECT:currencies から漏れると、Gemini が
    // 正規 ID を知らず referenceChange / 誤抽出ノイズの原因になる。
    const content = readFileSync(
      resolve(promptsDir, "card.prompt.md"),
      "utf-8",
    );
    const resolved = injectExistingEntities(content);
    for (const c of seed().currencies) {
      expect(resolved).toContain(c.id);
    }
  });
});

// PR-4a: stores[] を出力するソースの prompt に店舗カテゴリ語彙 (INJECT:categories) があることの契約。
// 語彙外の category の新規店は propose の unknownCategory で review に回るので、語彙を見せていない
// extractor はレビュー行きが増えるだけになる。対象外にする extractor は理由付きで EXEMPT に書く。
describe("PR-4a: INJECT:categories の対象 extractor 契約", () => {
  const REPO_ROOT = resolve(__dirname, "../..");
  const promptsDir = resolve(REPO_ROOT, "sources/extractors");
  const registry = parseYaml(
    readFileSync(resolve(REPO_ROOT, "sources/registry.yaml"), "utf-8"),
  ) as RegistryFile;

  const CATEGORY_INJECT_EXTRACTORS = ["jcb-jpoint", "epos-tamaru", "ongoing-program"] as const;
  const CATEGORY_INJECT_EXEMPT: Record<string, string> = {
    campaign:
      "固定語彙行 (語彙内 + alias キーの 9 名) のまま。F1p の campaign v3.6 改訂で INJECT に置換する",
    "point-partner": "4 ソースとも停止中 (2026-09-27 Z4)。再開する PR で置換する",
    "jal-tokuyaku": "停止中。JAL特約店の業種別カテゴリを扱う別系統 (再開する PR で判断する)",
  };

  it("stores を produces に持つ全ソースの extractor は、INJECT 対象か理由付きの対象外", () => {
    const withStores = registry.sources.filter((s) => s.produces?.includes("stores"));
    expect(withStores.length).toBeGreaterThan(0);
    const unclassified = withStores
      .filter(
        (s) =>
          !(CATEGORY_INJECT_EXTRACTORS as readonly string[]).includes(s.extractor) &&
          !(s.extractor in CATEGORY_INJECT_EXEMPT),
      )
      .map((s) => `${s.id}:${s.extractor}`);
    expect(unclassified).toEqual([]);
  });

  it.each(CATEGORY_INJECT_EXTRACTORS)(
    "%s.prompt.md は INJECT:categories を持ち、解決後に語彙 35 名が全て載る",
    (extractor) => {
      const content = readFileSync(resolve(promptsDir, `${extractor}.prompt.md`), "utf-8");
      expect(content).toMatch(/<!--\s*INJECT:categories\s*-->/);
      const resolved = injectExistingEntities(content);
      for (const name of EXTRACTABLE_STORE_CATEGORIES) {
        expect(resolved, name).toMatch(new RegExp(`^\\| ${name} \\|$`, "m"));
      }
    },
  );

  it.each(CATEGORY_INJECT_EXTRACTORS)(
    "%s.prompt.md の promptVersion は registry の extractorVersions と一致したまま (INJECT の追加では上げない)",
    (extractor) => {
      const content = readFileSync(resolve(promptsDir, `${extractor}.prompt.md`), "utf-8");
      const version = registry.extractorVersions?.[extractor];
      expect(version).toBeTruthy();
      expect(content).toContain(`"promptVersion": "${extractor}-${version}"`);
    },
  );
});
