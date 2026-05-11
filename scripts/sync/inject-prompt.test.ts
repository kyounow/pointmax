import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { injectExistingEntities } from "./inject-prompt";

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

  it("filter=category:JAL特約店 で店舗が絞り込まれる", () => {
    const input = `
<!-- INJECT:stores filter=category:JAL特約店 columns=id,name -->
<!-- /INJECT -->
`;
    const out = injectExistingEntities(input);
    expect(out).toContain("ENEOS");
    expect(out).toContain("ツルハドラッグ");
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
