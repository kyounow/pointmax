import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { load as parseYaml } from "js-yaml";
import { SCOPE_DIRECTIVES } from "./types";
import type { RegistryFile, RegistrySource } from "./types";
import { selectSourcesForGroup } from "./fetch-all";
import { autoMergeDisabledSourceIds, loadRegistryPolicy } from "./registry-policy";

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
    "epos-tamaru",
    "ongoing-program",
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

  // ── crawl: index (A-1 索引ハブ 2 段階クロール) の契約 ──
  it("crawl 設定は mode=index のみで、campaign extractor のソースに限る", () => {
    const crawlSources = registry.sources.filter((s) => s.crawl !== undefined);
    expect(crawlSources.length).toBeGreaterThan(0);
    for (const s of crawlSources) {
      expect(s.crawl?.mode).toBe("index");
      // 現状 index crawl の 2 段目は campaign extractor のみを想定
      // (他 extractor で使う時はこの契約を緩める)
      expect(s.extractor).toBe("campaign");
      if (s.crawl?.maxChildren !== undefined) {
        expect(s.crawl.maxChildren).toBeGreaterThanOrEqual(1);
        expect(s.crawl.maxChildren).toBeLessThanOrEqual(10);
      }
    }
  });

  it("crawl: index 用の campaign-index prompt が存在する", () => {
    expect(
      existsSync(
        resolve(REPO_ROOT, "sources/extractors/campaign-index.prompt.md"),
      ),
    ).toBe(true);
  });

  it("索引ハブ既知の 2 source は停止中でも crawl:index 設定を保持する (再開の前提)", () => {
    for (const id of ["jre-point-campaigns", "rakuten-pay-campaigns"]) {
      const s = registry.sources.find((x) => x.id === id);
      expect(s?.crawl?.mode, id).toBe("index");
    }
  });

  // crawl:index は 1 ソースで索引 2〜3 + 子 maxChildren×3 ≈ 17〜18 req を使い得る。
  // 429 で後続ソースを打ち切る回路遮断 (Z5-4) が入るまでは有効化しない、というガード。
  it("enabled な crawl:index ソースは 0 本", () => {
    const enabledCrawl = registry.sources.filter(
      (s) => s.enabled && s.crawl?.mode === "index",
    );
    expect(enabledCrawl.map((s) => s.id)).toEqual([]);
  });
});

// ── fetchGroup (無料枠 mon/thu 分割) の契約 ──
// enabled: true のソースは gemini-2.5-flash 無料枠 (20 req/日) を超えないよう
// mon / thu いずれかのグループに必ず属する。付け忘れると CI で気付ける。
describe("fetchGroup 契約 (無料枠 mon/thu 分割)", () => {
  const enabled = registry.sources.filter((s) => s.enabled);

  it("enabled: true のソースは全て fetchGroup を持つ", () => {
    const missing = enabled.filter((s) => s.fetchGroup === undefined);
    expect(missing.map((s) => s.id)).toEqual([]);
  });

  it("enabled: true のソースの fetchGroup は mon|thu のいずれか", () => {
    const bad = enabled.filter(
      (s) => s.fetchGroup !== "mon" && s.fetchGroup !== "thu",
    );
    expect(bad.map((s) => `${s.id}:${s.fetchGroup}`)).toEqual([]);
  });

  it("mon / thu 両グループに 1 件以上あり、enabled を過不足なく尽くす", () => {
    const mon = enabled.filter((s) => s.fetchGroup === "mon");
    const thu = enabled.filter((s) => s.fetchGroup === "thu");
    expect(mon.length).toBeGreaterThan(0);
    expect(thu.length).toBeGreaterThan(0);
    expect(mon.length + thu.length).toBe(enabled.length);
  });

  it("enabled: false のソースは fetchGroup を持たない (有効化 PR で付与)", () => {
    const disabledWithGroup = registry.sources.filter(
      (s) => !s.enabled && s.fetchGroup !== undefined,
    );
    expect(disabledWithGroup.map((s) => s.id)).toEqual([]);
  });

  // 一般契約 (Z4 の個別 id 一覧に依存しない): 停止したソースの extracted を残すと、
  // SYNC_INCLUDE_SOURCES 指定時の propose や手動確認で残骸が入力に混ざる。停止時に git rm する
  // (registry ヘッダの編集ルール)。再開検証で --allow-disabled 実行した結果も commit しない。
  it("enabled: false のソースは sources/extracted/<id>.json を持たない", () => {
    const leftovers = registry.sources.filter(
      (s) =>
        !s.enabled &&
        existsSync(resolve(REPO_ROOT, `sources/extracted/${s.id}.json`)),
    );
    expect(leftovers.map((s) => s.id)).toEqual([]);
  });

  // PR-0b-3: 記載順 = 実行順 (selectSourcesForGroup)。取得が不安定な campaign 決済系 (d-pay / paypay) は
  // 各グループの末尾に置き、先頭で無料枠を使い切って収穫のあるソースを巻き添えにしないようにする。
  // ソースを足す / 止める PR はこの期待値も同時に更新する。
  it("enabled ソースのグループ内の並び (mon: jcb → たまる → d払い / thu: smbc → PayPay)", () => {
    expect(selectSourcesForGroup(registry.sources, "mon").map((s) => s.id)).toEqual([
      "jcb-jpoint-partners",
      "epos-tamaru-market",
      "d-pay-campaigns",
    ]);
    expect(selectSourcesForGroup(registry.sources, "thu").map((s) => s.id)).toEqual([
      "smbc-vpoint-up",
      "paypay-campaigns",
    ]);
  });
});

// ── Z4 停止ソース (2026-09-27、収穫ゼロのソース停止) の契約 ──
// 停止したソースが fetchGroup 付きで enabled:true に戻る (= 無料枠を再び消費する)
// のを防ぐ。再開する PR は notes の再開条件を満たしたうえで、この一覧から id を外す。
const Z4_STOPPED = [
  // 索引ハブ / 単一カテゴリ (commit 1)
  "jre-point-campaigns",
  "rakuten-pay-campaigns",
  "jal-card-tokuyaku-list",
  // point-partner: stores のみ出力で auto 経路が無い (commit 2)
  "rakuten-point-partners",
  "d-point-partners",
  "v-point-partners",
  "ponta-partners",
  // card extractor: cards の updateField に apply / approve 経路が無い (commit 3)
  "mufg-card-global-point",
  "orico-card-member-point",
  "smbc-v-gold-7percent",
  // campaign 決済系 (d-pay-campaigns / paypay-campaigns) の一時停止 (0b-1 commit 4) は
  // PR-0b-3 で autoMerge:false + target 付きで解除した (下の「enabled ソースの並び」で固定)。
];

describe("Z4 停止ソース (収穫ゼロのソース停止)", () => {
  it.each(Z4_STOPPED)(
    "Z4 停止ソースは enabled:false で fetchGroup を持たない: %s",
    (id) => {
      const s = registry.sources.find((x) => x.id === id);
      expect(s, id).toBeDefined();
      expect(s?.enabled, id).toBe(false);
      expect(s?.fetchGroup, id).toBeUndefined();
    },
  );

  // propose は Phase 0′ の registry filter で enabled:false のソースを読み飛ばすが、
  // SYNC_INCLUDE_SOURCES で含めたときや手動確認で残骸が混ざらないよう、停止時に git rm する
  // (上の「enabled: false のソースは extracted を持たない」一般契約と同じ趣旨の個別版)。
  it.each(Z4_STOPPED)("Z4 停止ソースの extracted は削除済み: %s", (id) => {
    expect(
      existsSync(resolve(REPO_ROOT, `sources/extracted/${id}.json`)),
      id,
    ).toBe(false);
  });
});

// ── ソース別ポリシー (PR-0b-3: target / autoMerge) の契約 ──
// propose は registry を fail-closed で読む (registry-policy.ts)。壊れた target / autoMerge は
// cron の Propose step を exit 1 で止めるので、ここで先に気付けるようにする。
describe("ソース別ポリシー (target / autoMerge) の契約", () => {
  const policy = loadRegistryPolicy();

  it("実際の registry.yaml は loadRegistryPolicy を通る (target / autoMerge の値が正しい)", () => {
    expect(policy.sources.length).toBe(registry.sources.length);
    expect(policy.policies.size).toBe(registry.sources.length);
  });

  it("enabled な campaign extractor のソースは target を 1 つ以上宣言している", () => {
    const missing = registry.sources.filter(
      (s) =>
        s.enabled &&
        s.extractor === "campaign" &&
        (policy.policies.get(s.id)?.targets.length ?? 0) === 0,
    );
    expect(missing.map((s) => s.id)).toEqual([]);
  });

  // 解除は PR-1 H4 の事後レビュー表で 4 週連続して誤りが無いことを確認してから別 PR で行い、
  // この期待値も同じ PR で更新する。
  it("autoMerge:false のソースは d-pay-campaigns と paypay-campaigns (解除 PR で意図的に更新する)", () => {
    expect([...autoMergeDisabledSourceIds(policy.policies)].sort()).toEqual([
      "d-pay-campaigns",
      "paypay-campaigns",
    ]);
  });

  it("d-pay は [pa-d-pay, d-pointcard] (d払い一覧に dポイントカード提示型が同居)、paypay は pa-paypay を宣言する", () => {
    expect(policy.policies.get("d-pay-campaigns")?.targets).toEqual([
      { paymentAppId: "pa-d-pay" },
      { pointCardId: "d-pointcard" },
    ]);
    expect(policy.policies.get("paypay-campaigns")?.targets).toEqual([
      { paymentAppId: "pa-paypay" },
    ]);
  });
  // target が指す id が seed に存在するかは検査しない (seed↔registry 契約は保留中の別項目)。
});

// ── selectSourcesForGroup 単体 ──
describe("selectSourcesForGroup", () => {
  const mk = (
    id: string,
    enabled: boolean,
    fetchGroup?: "mon" | "thu",
  ): RegistrySource => ({
    id,
    label: id,
    url: `https://example.com/${id}`,
    extractor: "card",
    produces: ["cards"],
    extractionScope: "chains-only",
    enabled,
    ...(fetchGroup ? { fetchGroup } : {}),
  });

  const sources: RegistrySource[] = [
    mk("a-mon", true, "mon"),
    mk("b-thu", true, "thu"),
    mk("c-mon", true, "mon"),
    mk("d-disabled", false, "thu"),
  ];

  it("all は enabled 全部 (disabled は除外)", () => {
    const r = selectSourcesForGroup(sources, "all");
    expect(r.map((s) => s.id)).toEqual(["a-mon", "b-thu", "c-mon"]);
  });

  it("mon は fetchGroup=mon の enabled のみ", () => {
    const r = selectSourcesForGroup(sources, "mon");
    expect(r.map((s) => s.id)).toEqual(["a-mon", "c-mon"]);
  });

  it("thu は fetchGroup=thu の enabled のみ", () => {
    const r = selectSourcesForGroup(sources, "thu");
    expect(r.map((s) => s.id)).toEqual(["b-thu"]);
  });

  it("fetchGroup 未指定の enabled ソースは警告付きで mon/thu 両方に含める", () => {
    const withUnassigned = [...sources, mk("e-unassigned", true)];
    const warned: string[] = [];
    const rMon = selectSourcesForGroup(withUnassigned, "mon", (s) =>
      warned.push(s.id),
    );
    const rThu = selectSourcesForGroup(withUnassigned, "thu", (s) =>
      warned.push(s.id),
    );
    expect(rMon.map((s) => s.id)).toContain("e-unassigned");
    expect(rThu.map((s) => s.id)).toContain("e-unassigned");
    expect(warned).toEqual(["e-unassigned", "e-unassigned"]);
  });

  it("all は未指定でも警告なし (enabled 全部を無条件に含む)", () => {
    const withUnassigned = [...sources, mk("e-unassigned", true)];
    const warned: string[] = [];
    const r = selectSourcesForGroup(withUnassigned, "all", (s) =>
      warned.push(s.id),
    );
    expect(r.map((s) => s.id)).toContain("e-unassigned");
    expect(warned).toEqual([]);
  });
});
