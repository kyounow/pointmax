import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildAnnotationLines,
  clearFetchOutcome,
  countExtractedItems,
  createFetchStats,
  createOutcomeDraft,
  deriveOutcomeKind,
  effectiveOutcome,
  escapeWorkflowData,
  finalizeOutcome,
  outcomeFilePath,
  prepareRunOutcomeDir,
  readFetchOutcome,
  renderStepSummary,
  resolveFetchOutcomeDir,
  shouldAbortRemaining,
  summarizeRun,
  writeFetchOutcome,
  type FetchOutcome,
  type SourceRunResult,
} from "./fetch-outcome";
import { ZERO_USAGE } from "./fetch-response";

const tmpDirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "pm-outcome-test-"));
  tmpDirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function outcome(partial: Partial<FetchOutcome> & { sourceId: string }): FetchOutcome {
  return {
    version: 1,
    outcome: "ok",
    itemCounts: {},
    totalItems: 0,
    geminiCalls: 1,
    quotaErrors: 0,
    errorKinds: [],
    usage: { ...ZERO_USAGE, calls: 1 },
    model: "gemini-2.5-flash",
    keptLastGood: false,
    finishedAt: "2026-09-28T00:00:00.000Z",
    ...partial,
  };
}

describe("outcome ディレクトリ", () => {
  it("resolveFetchOutcomeDir: env が空なら null、PM_FETCH_OUTCOME_DIR があればそれ", () => {
    expect(resolveFetchOutcomeDir({})).toBeNull();
    expect(resolveFetchOutcomeDir({ PM_FETCH_OUTCOME_DIR: "  " })).toBeNull();
    expect(resolveFetchOutcomeDir({ PM_FETCH_OUTCOME_DIR: "/x/y" })).toBe("/x/y");
  });

  it("prepareRunOutcomeDir: 明示 > RUNNER_TEMP/pointmax-fetch > mkdtemp の優先順", () => {
    const base = tmp();
    const calls: string[] = [];
    const mk = (prefix: string) => {
      calls.push(prefix);
      return join(base, "mk");
    };
    const explicit = join(base, "explicit");
    expect(
      prepareRunOutcomeDir({ PM_FETCH_OUTCOME_DIR: explicit, RUNNER_TEMP: base }, mk),
    ).toBe(explicit);
    expect(existsSync(explicit)).toBe(true);
    expect(prepareRunOutcomeDir({ RUNNER_TEMP: base }, mk)).toBe(
      join(base, "pointmax-fetch"),
    );
    expect(calls).toEqual([]);
    expect(prepareRunOutcomeDir({}, mk)).toBe(join(base, "mk"));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("pointmax-fetch-");
  });
});

describe("write / read / clear", () => {
  it("往復できる", () => {
    const dir = tmp();
    const o = outcome({ sourceId: "jcb-jpoint-partners", totalItems: 3 });
    writeFetchOutcome(dir, o);
    expect(readFetchOutcome(dir, "jcb-jpoint-partners")).toEqual(o);
    clearFetchOutcome(dir, "jcb-jpoint-partners");
    expect(readFetchOutcome(dir, "jcb-jpoint-partners")).toBeNull();
    // 無いファイルの clear は例外にならない
    expect(() => clearFetchOutcome(dir, "none")).not.toThrow();
  });

  it("無い / JSON 不正 / version 違い / sourceId 違いは null", () => {
    const dir = tmp();
    expect(readFetchOutcome(dir, "a")).toBeNull();
    writeFileSync(outcomeFilePath(dir, "a"), "{not json");
    expect(readFetchOutcome(dir, "a")).toBeNull();
    writeFileSync(
      outcomeFilePath(dir, "a"),
      JSON.stringify({ ...outcome({ sourceId: "a" }), version: 2 }),
    );
    expect(readFetchOutcome(dir, "a")).toBeNull();
    writeFileSync(outcomeFilePath(dir, "a"), JSON.stringify(outcome({ sourceId: "b" })));
    expect(readFetchOutcome(dir, "a")).toBeNull();
    writeFileSync(
      outcomeFilePath(dir, "a"),
      JSON.stringify({ ...outcome({ sourceId: "a" }), usage: null }),
    );
    expect(readFetchOutcome(dir, "a")).toBeNull();
  });
});

describe("countExtractedItems", () => {
  const ev = { evidenceQuote: "q", explicitness: 1, ambiguity: 0 };
  it("programs / memberships を含む全キーを数える (0 件のキーは counts に入れない)", () => {
    const r = countExtractedItems({
      stores: [{ storeId: "s", name: "S", ...ev }],
      programs: [
        { programId: "p1", rate: 0.01, currencyId: "c", ...ev },
        { programId: "p2", rate: 0.02, currencyId: "c", ...ev },
      ],
      memberships: [{ programId: "p1", storeId: "s", ...ev }],
      cards: [],
    });
    expect(r.counts).toEqual({ stores: 1, programs: 2, memberships: 1 });
    expect(r.total).toBe(4);
  });
  it("空なら total 0", () => {
    expect(countExtractedItems({})).toEqual({ counts: {}, total: 0 });
  });
});

describe("deriveOutcomeKind", () => {
  it.each([
    [{ wrote: true, keptLastGood: false, totalItems: 3 }, "ok"],
    [{ wrote: true, keptLastGood: false, totalItems: 0 }, "empty"],
    [{ wrote: true, keptLastGood: false, totalItems: 0, failKind: "nonJson" as const }, "failed"],
    [{ wrote: false, keptLastGood: true, totalItems: 0, abortRun: "quotaDaily" as const }, "quotaExhausted"],
    [{ wrote: false, keptLastGood: true, totalItems: 0, abortRun: "billing" as const }, "failed"],
    [{ wrote: false, keptLastGood: true, totalItems: 0 }, "failed"],
    [{ wrote: false, keptLastGood: false, totalItems: 0 }, "crashed"],
  ])("%o → %s", (args, expected) => {
    expect(deriveOutcomeKind(args)).toBe(expected);
  });
});

describe("finalizeOutcome", () => {
  it("初期 draft のまま (例外で抜けた) → crashed / failKind crash / keptLastGood", () => {
    const o = finalizeOutcome(
      createOutcomeDraft("x"),
      createFetchStats(),
      "gemini-2.5-flash",
      new Date("2026-09-28T00:00:00Z"),
    );
    expect(o).toMatchObject({
      version: 1,
      sourceId: "x",
      outcome: "crashed",
      failKind: "crash",
      keptLastGood: true,
      geminiCalls: 0,
      finishedAt: "2026-09-28T00:00:00.000Z",
    });
    expect(o.abortRun).toBeUndefined();
  });

  it("keep-last-good (quotaDaily) → quotaExhausted + abortRun、stats を写す、detail は 160 字に丸める", () => {
    const stats = createFetchStats();
    stats.usage = { ...ZERO_USAGE, calls: 3, promptTokens: 10 };
    stats.quotaErrors = 1;
    stats.errorKinds = ["quotaDaily"];
    stats.attempts = [{ kind: "urlContext", status: "nonJson" }];
    const o = finalizeOutcome(
      {
        ...createOutcomeDraft("d"),
        keptLastGood: true,
        abortRun: "quotaDaily",
        failKind: "quotaDaily",
        detail: "x".repeat(400),
      },
      stats,
      "gemini-2.5-flash",
      new Date(),
    );
    expect(o.outcome).toBe("quotaExhausted");
    expect(o.abortRun).toBe("quotaDaily");
    expect(o.keptLastGood).toBe(true);
    expect(o.geminiCalls).toBe(3);
    expect(o.quotaErrors).toBe(1);
    expect(o.attempts).toHaveLength(1);
    expect(o.detail?.length).toBeLessThanOrEqual(160);
    expect(shouldAbortRemaining(o)).toBe(true);
  });

  it("書いた (fallback 以外) → ok / keptLastGood=false / 打ち切らない", () => {
    const o = finalizeOutcome(
      { ...createOutcomeDraft("s"), wrote: true, itemCounts: { programs: 2 }, totalItems: 2 },
      createFetchStats(),
      "m",
      new Date(),
    );
    expect(o.outcome).toBe("ok");
    expect(o.keptLastGood).toBe(false);
    expect(shouldAbortRemaining(o)).toBe(false);
    expect(shouldAbortRemaining(null)).toBe(false);
  });
});

describe("effectiveOutcome / summarizeRun", () => {
  it("outcome=null かつ exit 1 → crashed (failKind exit1)", () => {
    const r: SourceRunResult = { sourceId: "a", exitCode: 1, elapsedSec: 1, outcome: null };
    expect(effectiveOutcome(r)).toMatchObject({ outcome: "crashed", failKind: "exit1", keptLastGood: true });
  });
  it("skippedBy → skipped (failKind = 打ち切り種別)", () => {
    const r: SourceRunResult = {
      sourceId: "c",
      exitCode: null,
      elapsedSec: 0,
      outcome: null,
      skippedBy: { kind: "quotaDaily", sourceId: "b" },
    };
    expect(effectiveOutcome(r)).toMatchObject({ outcome: "skipped", failKind: "quotaDaily" });
  });
  it("summarizeRun: calls / usage を合計し、打ち切り元を abortedBy に入れる", () => {
    const s = summarizeRun("mon", [
      {
        sourceId: "a",
        exitCode: 0,
        elapsedSec: 1,
        outcome: outcome({ sourceId: "a", totalItems: 5, usage: { ...ZERO_USAGE, calls: 1, promptTokens: 100 } }),
      },
      {
        sourceId: "b",
        exitCode: 0,
        elapsedSec: 1,
        outcome: outcome({
          sourceId: "b",
          outcome: "quotaExhausted",
          abortRun: "quotaDaily",
          keptLastGood: true,
          geminiCalls: 1,
          usage: { ...ZERO_USAGE, calls: 1 },
        }),
      },
      { sourceId: "c", exitCode: null, elapsedSec: 0, outcome: null, skippedBy: { kind: "quotaDaily", sourceId: "b" } },
    ]);
    expect(s.calls).toBe(2);
    expect(s.usage.promptTokens).toBe(100);
    expect(s.abortedBy).toEqual({ kind: "quotaDaily", sourceId: "b" });
    expect(s.rows.map((r) => r.outcome)).toEqual(["ok", "quotaExhausted", "skipped"]);
  });
});

describe("renderStepSummary / buildAnnotationLines", () => {
  const results: SourceRunResult[] = [
    {
      sourceId: "a",
      exitCode: 0,
      elapsedSec: 1,
      outcome: outcome({
        sourceId: "a",
        totalItems: 7,
        geminiCalls: 2,
        usage: { calls: 2, promptTokens: 1000, toolUseTokens: 5000, outputTokens: 300, thoughtTokens: 900 },
      }),
    },
    {
      sourceId: "b",
      exitCode: 0,
      elapsedSec: 1,
      outcome: outcome({
        sourceId: "b",
        outcome: "failed",
        failKind: "nonJson",
        geminiCalls: 3,
        usage: { calls: 3, promptTokens: 10, toolUseTokens: 20, outputTokens: 30, thoughtTokens: 40 },
        detail: "Gemini の応答が JSON でない",
      }),
    },
  ];

  it("合計行の calls / tokens が行の合計に一致する", () => {
    const s = summarizeRun("thu", results);
    const md = renderStepSummary(s);
    expect(md).toContain("### Fetch (group=thu)");
    expect(md).toContain("| a | ✅ ok |  | 7 | 2 | 1,000 / 5,000 / 300 / 900 |  |");
    expect(md).toContain("| b | ❌ failed | nonJson | 0 | 3 | 10 / 20 / 30 / 40 |  |");
    expect(md).toContain("| **合計** (2 本) | | | 7 | 5 | 1,010 / 5,020 / 330 / 940 | |");
    expect(md).toContain("- b: Gemini の応答が JSON でない");
  });

  it("7 件の不調 → 5 行 + 集約 1 行、billing は ::error で先頭", () => {
    const many: SourceRunResult[] = [
      ...Array.from({ length: 6 }, (_, i) => ({
        sourceId: `s${i}`,
        exitCode: 0,
        elapsedSec: 1,
        outcome: outcome({ sourceId: `s${i}`, outcome: "failed", failKind: "nonJson" }),
      })),
      {
        sourceId: "bill",
        exitCode: 0,
        elapsedSec: 1,
        outcome: outcome({
          sourceId: "bill",
          outcome: "failed",
          failKind: "billing",
          abortRun: "billing",
          keptLastGood: true,
        }),
      },
    ];
    const lines = buildAnnotationLines(summarizeRun("mon", many));
    expect(lines).toHaveLength(6);
    expect(lines[0]).toMatch(/^::error title=sync-fetch::bill: failed \(billing\)/);
    expect(lines.slice(1, 5).every((l) => l.startsWith("::warning title=sync-fetch::"))).toBe(true);
    expect(lines[5]).toContain("他 2 件");
  });

  it("ok / empty は annotation を出さない", () => {
    const lines = buildAnnotationLines(
      summarizeRun("mon", [
        { sourceId: "a", exitCode: 0, elapsedSec: 1, outcome: outcome({ sourceId: "a" }) },
        { sourceId: "b", exitCode: 0, elapsedSec: 1, outcome: outcome({ sourceId: "b", outcome: "empty" }) },
      ]),
    );
    expect(lines).toEqual([]);
  });

  it("escapeWorkflowData: % / 改行をエスケープ", () => {
    expect(escapeWorkflowData("50%\nx\r")).toBe("50%25%0Ax%0D");
  });
});
