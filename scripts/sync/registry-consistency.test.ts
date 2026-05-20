import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { load as parseYaml } from "js-yaml";
import { SCOPE_DIRECTIVES } from "./types";
import type { RegistryFile } from "./types";

// registry.yaml の各ソースが「schema の extractor enum」「対応する
// extractor プロンプトファイル」「有効な extractionScope」と整合することを
// 固定する契約テスト。campaign 等の extractor を足した時、enum 追加や
// prompt 新設を忘れると CI で気付ける。
const REPO_ROOT = resolve(__dirname, "../..");

const registry = parseYaml(
  readFileSync(resolve(REPO_ROOT, "sources/registry.yaml"), "utf-8"),
) as RegistryFile;

const schema = JSON.parse(
  readFileSync(
    resolve(REPO_ROOT, "sources/schema/extracted-source.schema.json"),
    "utf-8",
  ),
) as { properties: { extractor: { enum: string[] } } };

const schemaExtractorEnum = schema.properties.extractor.enum;

describe("registry.yaml 整合性契約", () => {
  it("registry が 1 件以上の source を持つ", () => {
    expect(Array.isArray(registry.sources)).toBe(true);
    expect(registry.sources.length).toBeGreaterThan(0);
  });

  it.each([
    "card",
    "jal-tokuyaku",
    "point-partner",
    "payment-app",
    "campaign",
    "jcb-jpoint",
  ])(
    "schema の extractor enum に %s が含まれる",
    (kind) => {
      expect(schemaExtractorEnum).toContain(kind);
    },
  );

  it("全 source の extractor が schema enum に存在する", () => {
    const bad = registry.sources.filter(
      (s) => !schemaExtractorEnum.includes(s.extractor),
    );
    expect(bad.map((s) => `${s.id}:${s.extractor}`)).toEqual([]);
  });

  it("全 source の extractor に対応する prompt ファイルが存在する", () => {
    const missing = registry.sources.filter(
      (s) =>
        !existsSync(
          resolve(REPO_ROOT, `sources/extractors/${s.extractor}.prompt.md`),
        ),
    );
    expect(missing.map((s) => `${s.id}:${s.extractor}`)).toEqual([]);
  });

  it("全 source の extractionScope が有効", () => {
    const validScopes = Object.keys(SCOPE_DIRECTIVES);
    const bad = registry.sources.filter(
      (s) => !validScopes.includes(s.extractionScope),
    );
    expect(bad.map((s) => `${s.id}:${s.extractionScope}`)).toEqual([]);
  });

  it("JRE campaign source が登録されている (#B 第1弾、PR-D1 で programs 化)", () => {
    const jre = registry.sources.find((s) => s.id === "jre-point-campaigns");
    expect(jre).toBeDefined();
    expect(jre?.extractor).toBe("campaign");
    expect(jre?.produces).toContain("programs");
    expect(jre?.produces).toContain("memberships");
  });
});
