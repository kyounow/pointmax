import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  carryForward,
  checkAssertion,
  checkStoreSet,
  loadRateWatchFile,
  loadWatchedSubjects,
  normalizeForMatch,
  parseCliArgs,
  parseRateWatchFile,
  readPreviousRun,
  renderProbeMarkdown,
  renderRateWatchMarkdown,
  resolveOutPath,
  runProbe,
  runRateWatch,
  runTarget,
  subjectKey,
  type FetchedPage,
  type RateWatchFile,
  type RateWatchRun,
  type RateWatchTarget,
  type TargetResult,
} from "./rate-watch";
import { PrefetchError } from "./fetch-response";

// PR-5c-1: 率カナリアのコア (正規化・照合・取得・carry-forward・CLI の引数)。
// seed との整合の契約 (sources/rate-watch.yaml の中身) は下の「契約」節。

const LONG_FILLER = "ご利用ガイド よくあるご質問 お問い合わせ ".repeat(30); // 正規化後 500 字超

const W_SUKIYA = { kind: "membership", programId: "prog-jcb-jpoint-20x", storeId: "sukiya" } as const;

const target = (extra: Partial<RateWatchTarget> = {}): RateWatchTarget => ({
  id: "jpoint-20x-sukiya",
  label: "J-POINT すき家",
  url: "https://example.com/shop/000450",
  priority: 1,
  assertions: [
    {
      subject: W_SUKIYA,
      seedRateAtCuration: 0.105,
      anchor: "ポイントアップ期間",
      phrases: ["J-POINT 20倍", "ポイントアップ登録"],
    },
  ],
  ...extra,
});

const page = (text: string, status = 200): FetchedPage => ({ status, text });
const fetcher = (p: FetchedPage | Error) => ({
  fetchText: async () => {
    if (p instanceof Error) throw p;
    return p;
  },
});

const SHOP_TEXT =
  `${LONG_FILLER} すき家 J-POINT 20 倍 下の手順でポイントアップ! 手順 1 ポイントアップ登録 無料 ` +
  `ポイントアップ期間 2026年4月16日 〜 予告なく終了または延期する場合があります ${LONG_FILLER}`;

// 見えない空白はソース上でも区別できるようコードポイントで作る
const NBSP = String.fromCodePoint(0xa0);
const IDEO_SPACE = String.fromCodePoint(0x3000);

describe("normalizeForMatch", () => {
  it("全角の数字・％を半角に (７％ → 7%)", () => {
    expect(normalizeForMatch("還元率７％")).toBe("還元率7%");
  });
  it("NBSP・全角空白・改行を 1 つの空白に", () => {
    expect(normalizeForMatch(`J-POINT${NBSP}${IDEO_SPACE}パートナー\n\n手順`)).toBe(
      "J-POINT パートナー 手順",
    );
  });
  it("数字中の 3 桁区切りカンマを除去 ('1,000' → '1000')", () => {
    expect(normalizeForMatch("1,000円ごとに 10,000,000")).toBe("1000円ごとに 10000000");
  });
  it("数字と 倍 / % / pt の間の空白を除去 ('20 倍' → '20倍')", () => {
    expect(normalizeForMatch("J-POINT 20 倍")).toBe("J-POINT 20倍");
    expect(normalizeForMatch("0.5 % と 3 pt")).toBe("0.5% と 3pt");
    expect(normalizeForMatch("ポイント２０倍！")).toBe("ポイント20倍!");
  });
  it("冪等", () => {
    const once = normalizeForMatch(`エポスポイント  ２ 倍${IDEO_SPACE}（無印）`);
    expect(once).toBe("エポスポイント 2倍 (無印)");
    expect(normalizeForMatch(once)).toBe(once);
  });
});

describe("checkAssertion (phrases)", () => {
  const a = { anchor: "ポイントアップ期間", phrases: ["J-POINT 20倍", "ポイントアップ登録"] };

  it("anchor の近くに全 phrase がそろえば match", () => {
    const r = checkAssertion(SHOP_TEXT, a);
    expect(r.status).toBe("match");
    expect(r.snippet).toContain("ポイントアップ期間");
  });
  it("phrase が 1 つでも無ければ phraseMissing (欠けた句を返す)", () => {
    const r = checkAssertion(SHOP_TEXT.replace("20 倍", "10 倍"), a);
    expect(r.status).toBe("phraseMissing");
    expect(r.missing).toEqual(["J-POINT 20倍"]);
  });
  it("anchor が無ければ anchorMissing", () => {
    expect(checkAssertion(SHOP_TEXT.replace("ポイントアップ期間", "実施期間"), a).status).toBe(
      "anchorMissing",
    );
  });
  it("phrase が window の外にあれば phraseMissing", () => {
    const far = `J-POINT 20倍 ${"x".repeat(400)} ポイントアップ登録 ポイントアップ期間`;
    expect(checkAssertion(far, a).status).toBe("phraseMissing");
    expect(checkAssertion(far, { ...a, window: 600 }).status).toBe("match");
  });
  it("anchor が複数あれば、どれか 1 か所でそろえば match", () => {
    const text = `ポイントアップ期間 ${"x".repeat(700)} J-POINT 20倍 ポイントアップ登録 ポイントアップ期間`;
    expect(checkAssertion(text, a).status).toBe("match");
  });
  it("anchor を省くと全文で判定", () => {
    expect(checkAssertion(SHOP_TEXT, { phrases: ["J-POINT 20倍"] }).status).toBe("match");
    expect(checkAssertion(SHOP_TEXT, { phrases: ["30倍"] }).status).toBe("phraseMissing");
  });
});

describe("checkStoreSet", () => {
  const names = ["すき家", "吉野家", "スターバックス（モバイルオーダー）"];
  it("全店名があれば match (全角括弧も正規化して比較)", () => {
    const text = "11 件 すき家 20 倍 吉野家 20 倍 スターバックス(モバイルオーダー) 20 倍";
    expect(checkStoreSet(text, { expectedStoreNames: names })).toEqual({ status: "match" });
  });
  it("欠けた店名を storeMissing で返す", () => {
    const r = checkStoreSet("10 件 すき家 20 倍 スターバックス(モバイルオーダー)", {
      expectedStoreNames: names,
    });
    expect(r).toEqual({ status: "storeMissing", missing: ["吉野家"] });
  });
});

describe("runTarget (stub fetcher)", () => {
  const now = new Date("2026-09-28T00:00:00Z");

  it("200 → 照合して match", async () => {
    const r = await runTarget(target(), fetcher(page(SHOP_TEXT)), now);
    expect(r.status).toBe("match");
    expect(r.httpStatus).toBe(200);
    expect(r.assertions).toHaveLength(1);
    expect(r.since).toBeUndefined();
  });
  it("200 で句が欠ければ phraseMissing + since (JST の日付)", async () => {
    const r = await runTarget(target(), fetcher(page(SHOP_TEXT.replace("20 倍", "10 倍"))), now);
    expect(r.status).toBe("phraseMissing");
    expect(r.since).toBe("2026-09-28");
  });
  it("403 → unreachable (httpStatus 403)", async () => {
    const r = await runTarget(target(), fetcher(page("", 403)), now);
    expect(r).toMatchObject({ status: "unreachable", httpStatus: 403, unreachableReason: "http" });
  });
  it("404 / 410 → notFound (ページ消滅。unreachable と違い引き継がない)", async () => {
    expect((await runTarget(target(), fetcher(page("", 404)), now)).status).toBe("notFound");
    expect((await runTarget(target(), fetcher(page("", 410)), now)).status).toBe("notFound");
  });
  it("timeout → unreachable (timeout)", async () => {
    const err = new PrefetchError("prefetch timeout: aborted", null, "timeout");
    const r = await runTarget(target(), fetcher(err), now);
    expect(r).toMatchObject({ status: "unreachable", httpStatus: null, unreachableReason: "timeout" });
  });
  it("接続エラー → unreachable (network)", async () => {
    const r = await runTarget(target(), fetcher(new TypeError("fetch failed")), now);
    expect(r).toMatchObject({ status: "unreachable", unreachableReason: "network" });
  });
  it("本文が短い (JS 描画の疑い) → unreachable (tooShort)", async () => {
    const r = await runTarget(target(), fetcher(page("<div id=root></div> J-POINT 20倍")), now);
    expect(r).toMatchObject({ status: "unreachable", unreachableReason: "tooShort" });
  });
  it("minTextLength で短いページも照合する (一覧が空になると短くなるページ用)", async () => {
    const t = target({
      minTextLength: 100,
      assertions: [
        {
          kind: "storeSet",
          subject: { kind: "category", id: "jpoint-20x-restaurants" },
          expectedStoreNames: ["すき家", "吉野家"],
        },
      ],
    });
    const text = `カテゴリ: ポイント20倍!飲食店 0 件 ${"ヘルプ ".repeat(20)}`;
    const r = await runTarget(t, fetcher(page(text)), now);
    expect(r.status).toBe("storeMissing");
    expect(r.assertions[0].missing).toEqual(["すき家", "吉野家"]);
  });
});

describe("runRateWatch / runProbe", () => {
  it("target を順に実行し、間に sleep を挟む", async () => {
    const sleeps: number[] = [];
    const run = await runRateWatch([target(), target({ id: "b" })], {
      ...fetcher(page(SHOP_TEXT)),
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(run.mode).toBe("check");
    expect(run.targets.map((t) => t.status)).toEqual(["match", "match"]);
    expect(sleeps).toHaveLength(1);
  });
  it("probe は target と candidate の HTTP status・本文長・title だけ (照合しない)", async () => {
    const file: RateWatchFile = {
      version: 1,
      targets: [target()],
      candidates: [{ id: "cand", url: "https://example.com/c", note: "n" }],
      excluded: [],
    };
    const run = await runProbe(file, {
      fetchText: async (url) =>
        url.endsWith("/c") ? page("", 403) : { status: 200, text: "short", title: "すき家｜ J-POINTパートナー" },
    });
    expect(run.rows).toEqual([
      expect.objectContaining({ id: "jpoint-20x-sukiya", kind: "target", httpStatus: 200, textLength: 5, title: "すき家｜ J-POINTパートナー" }),
      expect.objectContaining({ id: "cand", kind: "candidate", httpStatus: 403 }),
    ]);
    expect(run.rows[1].textLength).toBeUndefined();
    const md = renderProbeMarkdown(run);
    expect(md).toContain("| target | [`jpoint-20x-sukiya`]");
    expect(md).toContain("| candidate | [`cand`](https://example.com/c) | 403 |");
  });
  it("probe --only は 1 件だけ", async () => {
    const file: RateWatchFile = {
      version: 1,
      targets: [target(), target({ id: "other" })],
      excluded: [],
    };
    const run = await runProbe(file, fetcher(page(SHOP_TEXT)), { only: "other" });
    expect(run.rows.map((r) => r.id)).toEqual(["other"]);
  });
});

describe("carryForward", () => {
  const res = (extra: Partial<TargetResult>): TargetResult => ({
    id: "t",
    label: "t",
    url: "https://example.com/",
    priority: 1,
    status: "match",
    httpStatus: 200,
    assertions: [],
    checkedAt: "2026-10-01T00:00:00.000Z",
    ...extra,
  });
  const run = (t: TargetResult): RateWatchRun => ({
    version: 1,
    mode: "check",
    generatedAt: t.checkedAt,
    targets: [t],
  });

  it("unreachable は前回の phraseMissing を carried で維持する (since も保つ)", () => {
    const prev = run(res({ status: "phraseMissing", since: "2026-09-24" }));
    const cur = run(res({ status: "unreachable", httpStatus: 403, unreachableReason: "http" }));
    const out = carryForward(prev, cur).targets[0];
    expect(out).toMatchObject({
      status: "phraseMissing",
      carried: true,
      since: "2026-09-24",
      httpStatus: 403,
      unreachableReason: "http",
    });
  });
  it("前回が無ければ unreachable のまま", () => {
    const cur = run(res({ status: "unreachable", httpStatus: null, unreachableReason: "timeout" }));
    expect(carryForward(null, cur).targets[0].status).toBe("unreachable");
  });
  it("不一致が続くと since は初出日のまま", () => {
    const prev = run(res({ status: "phraseMissing", since: "2026-09-24" }));
    const cur = run(res({ status: "anchorMissing", since: "2026-10-01" }));
    expect(carryForward(prev, cur).targets[0].since).toBe("2026-09-24");
  });
  it("match になったら since を解除する", () => {
    const prev = run(res({ status: "phraseMissing", since: "2026-09-24" }));
    const out = carryForward(prev, run(res({ status: "match" }))).targets[0];
    expect(out.status).toBe("match");
    expect(out.since).toBeUndefined();
    expect("since" in out).toBe(false);
  });
});

describe("renderRateWatchMarkdown", () => {
  const t = (id: string, status: TargetResult["status"], priority: 1 | 2 = 1): TargetResult => ({
    id,
    label: id,
    url: `https://example.com/${id}`,
    priority,
    status,
    httpStatus: 200,
    assertions:
      status === "phraseMissing"
        ? [{ subject: W_SUKIYA, status: "phraseMissing", missing: ["J-POINT 20倍"] }]
        : [],
    checkedAt: "2026-10-01T00:00:00.000Z",
    ...(status === "phraseMissing" ? { since: "2026-10-01" } : {}),
  });
  const run = (targets: TargetResult[]): RateWatchRun => ({
    version: 1,
    mode: "check",
    generatedAt: "2026-10-01T00:00:00.000Z",
    targets,
  });

  it("表に全 target、不一致だけ ::warning::", () => {
    const { markdown, annotations } = renderRateWatchMarkdown(
      run([t("a", "match", 2), t("b", "phraseMissing")]),
    );
    expect(markdown).toContain("| 1 | [b](https://example.com/b) `b` | ⚠️ phraseMissing |");
    expect(markdown).toContain("欠けた句「J-POINT 20倍」");
    expect(markdown).toContain("2026-10-01 から");
    expect(markdown.indexOf("`b`")).toBeLessThan(markdown.indexOf("`a`")); // 優先度順
    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toMatch(/^::warning title=rate-watch b::/);
  });
  it("::warning:: は最大 5 行 (6 件以上は 4 件 + ほか N 件)", () => {
    const many = Array.from({ length: 7 }, (_, i) => t(`m${i}`, "phraseMissing"));
    const { annotations } = renderRateWatchMarkdown(run(many));
    expect(annotations).toHaveLength(5);
    expect(annotations[4]).toContain("ほか 3 件");
  });
  it("unreachable は警告しない", () => {
    const u: TargetResult = { ...t("u", "match"), status: "unreachable", unreachableReason: "timeout", httpStatus: null };
    expect(renderRateWatchMarkdown(run([u])).annotations).toEqual([]);
  });
});

describe("CLI の引数と出力先", () => {
  it("--out の既定は os.tmpdir()/rate-watch.json", () => {
    expect(parseCliArgs([]).out).toBe(resolve(tmpdir(), "rate-watch.json"));
  });
  it("--out に sources/extracted/ 配下を渡すと throw", () => {
    const extracted = resolve("sources/extracted");
    expect(() => resolveOutPath(join(extracted, "rate-watch.json"), extracted)).toThrow(
      /sources\/extracted 配下/,
    );
    expect(() => resolveOutPath(extracted, extracted)).toThrow();
    expect(() => parseCliArgs(["--out", "sources/extracted/x.json"])).toThrow();
    expect(resolveOutPath(join(tmpdir(), "x.json"), extracted)).toBe(resolve(tmpdir(), "x.json"));
  });
  it("--probe / --only / --history を読む。未知の引数と値の欠けは throw", () => {
    const a = parseCliArgs(["--probe", "--only", "jpoint-20x-sukiya", "--history", "h.json"]);
    expect(a).toMatchObject({ probe: true, only: "jpoint-20x-sukiya", history: resolve("h.json") });
    expect(() => parseCliArgs(["--nope"])).toThrow(/未知の引数/);
    expect(() => parseCliArgs(["--only"])).toThrow(/値が無い/);
  });
});

describe("readPreviousRun", () => {
  it("CLI の出力 JSON と、entries[].rateWatch を持つ履歴 JSON の両方を読む", () => {
    const dir = mkdtempSync(join(tmpdir(), "rate-watch-test-"));
    try {
      const r: RateWatchRun = { version: 1, mode: "check", generatedAt: "x", targets: [] };
      writeFileSync(join(dir, "run.json"), JSON.stringify(r));
      writeFileSync(join(dir, "hist.json"), JSON.stringify({ version: 1, entries: [{ date: "d" }, { rateWatch: r }] }));
      writeFileSync(join(dir, "other.json"), JSON.stringify({ foo: 1 }));
      expect(readPreviousRun(join(dir, "run.json"))).toEqual(r);
      expect(readPreviousRun(join(dir, "hist.json"))).toEqual(r);
      expect(readPreviousRun(join(dir, "other.json"))).toBeNull();
      expect(readPreviousRun(join(dir, "missing.json"))).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadRateWatchFile / parseRateWatchFile (fail-closed)", () => {
  it("ファイルが無ければ null", () => {
    expect(loadRateWatchFile(join(tmpdir(), "no-such-rate-watch.yaml"))).toBeNull();
  });
  it("YAML が壊れていれば throw", () => {
    const dir = mkdtempSync(join(tmpdir(), "rate-watch-test-"));
    try {
      const p = join(dir, "rate-watch.yaml");
      writeFileSync(p, "version: 1\ntargets: [\n  - id: x");
      expect(() => loadRateWatchFile(p)).toThrow(/YAML が不正/);
      writeFileSync(p, "version: 2\ntargets: []\nexcluded: []\n");
      expect(() => loadRateWatchFile(p)).toThrow(/version は 1/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("構造の不正 (subject.kind 不明 / storeSet 以外の category / seedRateAtCuration 欠け) は throw", () => {
    const base = { version: 1, excluded: [] };
    const t = (assertion: unknown) => ({
      ...base,
      targets: [{ id: "a", label: "a", url: "https://example.com/", priority: 1, assertions: [assertion] }],
    });
    expect(() => parseRateWatchFile(t({ subject: { kind: "shop", id: "x" }, seedRateAtCuration: 0.1, phrases: [] }))).toThrow(/subject.kind/);
    expect(() => parseRateWatchFile(t({ subject: { kind: "category", id: "x" }, seedRateAtCuration: 0.1, phrases: [] }))).toThrow(/storeSet でだけ/);
    expect(() => parseRateWatchFile(t({ subject: { kind: "program", id: "x" }, phrases: [] }))).toThrow(/seedRateAtCuration/);
    expect(() => parseRateWatchFile(t({ kind: "storeSet", subject: { kind: "program", id: "x" }, expectedStoreNames: [] }))).toThrow(/category/);
    expect(() => parseRateWatchFile({ version: 1, targets: [] })).toThrow(/excluded/);
  });
  it("storeSet と phrases を読み分ける", () => {
    const f = parseRateWatchFile({
      version: 1,
      targets: [
        {
          id: "a",
          label: "a",
          url: "https://example.com/",
          priority: 1,
          minTextLength: 300,
          assertions: [
            { kind: "storeSet", subject: { kind: "category", id: "c" }, expectedStoreNames: ["すき家"] },
            { subject: W_SUKIYA, seedRateAtCuration: 0.105, anchor: "期間", phrases: ["20倍"], window: 600 },
          ],
        },
      ],
      excluded: [{ subject: { kind: "program", id: "p" }, reason: "r" }],
    });
    expect(f.targets[0].minTextLength).toBe(300);
    expect(f.targets[0].assertions[0].kind).toBe("storeSet");
    expect(f.targets[0].assertions[1]).toEqual({
      subject: W_SUKIYA,
      seedRateAtCuration: 0.105,
      anchor: "期間",
      phrases: ["20倍"],
      window: 600,
    });
  });
});

describe("subjectKey / loadWatchedSubjects", () => {
  it("membership は membershipId で id にし、その program も監視対象に入れる", () => {
    expect(subjectKey(W_SUKIYA)).toBe("membership:m-prog-jcb-jpoint-20x-sukiya");
    const w = loadWatchedSubjects({
      version: 1,
      targets: [
        target(),
        target({
          id: "p",
          assertions: [
            { subject: { kind: "program", id: "prog-x" }, seedRateAtCuration: 0.01, phrases: ["x"] },
            { subject: { kind: "card", id: "card-x" }, seedRateAtCuration: 0.01, phrases: ["x"] },
            { kind: "storeSet", subject: { kind: "category", id: "c" }, expectedStoreNames: ["a"] },
          ],
        }),
      ],
      excluded: [],
    });
    expect([...w.membershipIds.keys()]).toEqual(["m-prog-jcb-jpoint-20x-sukiya"]);
    expect([...w.programIds.keys()].sort()).toEqual(["prog-jcb-jpoint-20x", "prog-x"]);
    expect([...w.cardIds.keys()]).toEqual(["card-x"]);
    expect(w.programIds.get("prog-jcb-jpoint-20x")).toContain("m-prog-jcb-jpoint-20x-sukiya");
  });
  it("file が null なら全部空", () => {
    const w = loadWatchedSubjects(null);
    expect(w.programIds.size + w.cardIds.size + w.membershipIds.size).toBe(0);
  });
});
