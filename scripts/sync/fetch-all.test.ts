import { describe, expect, it } from "vitest";
import { runGroup, type RunOne } from "./fetch-all";
import { effectiveOutcome, type FetchOutcome } from "./fetch-outcome";
import { ZERO_USAGE, type RunAbortKind } from "./fetch-response";
import type { RegistrySource } from "./types";

const src = (id: string): RegistrySource => ({
  id,
  label: id,
  url: `https://example.com/${id}`,
  extractor: "campaign",
  produces: ["programs"],
  extractionScope: "chains-only",
  enabled: true,
  fetchGroup: "mon",
});

function outcomeOf(
  sourceId: string,
  kind: FetchOutcome["outcome"],
  extra: Partial<FetchOutcome> = {},
): FetchOutcome {
  return {
    version: 1,
    sourceId,
    outcome: kind,
    itemCounts: {},
    totalItems: 0,
    geminiCalls: 1,
    quotaErrors: 0,
    errorKinds: [],
    usage: { ...ZERO_USAGE, calls: 1 },
    model: "gemini-2.5-flash",
    keptLastGood: kind !== "ok" && kind !== "empty",
    finishedAt: "2026-09-28T00:00:00.000Z",
    ...extra,
  };
}

const ok = (id: string) => outcomeOf(id, "ok", { totalItems: 3 });
const aborted = (id: string, kind: RunAbortKind) =>
  outcomeOf(id, kind === "quotaDaily" ? "quotaExhausted" : "failed", {
    abortRun: kind,
    failKind: kind,
  });

/**
 * メモリ上の outcome ストアで runGroup を動かす。plan[id] が outcome を返せばそれを「書く」、
 * null なら outcome を書かずに exitCode で終わる (crash 相当)。
 */
function harness(plan: Record<string, { outcome: FetchOutcome | null; code?: number }>) {
  const store = new Map<string, FetchOutcome>();
  const ran: string[] = [];
  const sleeps: number[] = [];
  const cleared: string[] = [];
  const runOne: RunOne = async (id) => {
    ran.push(id);
    const p = plan[id];
    if (p.outcome) store.set(id, p.outcome);
    return { code: p.code ?? 0 };
  };
  return {
    ran,
    sleeps,
    cleared,
    store,
    opts: {
      parallel: 1,
      outcomeDir: "mem",
      runOne,
      sleep: async (ms: number) => {
        sleeps.push(ms);
      },
      readOutcome: (_dir: string, id: string) => store.get(id) ?? null,
      clearOutcome: (_dir: string, id: string) => {
        cleared.push(id);
        store.delete(id);
      },
      now: () => 0,
    },
  };
}

describe("runGroup (後続ソースの打ち切り)", () => {
  it("2 本目が quotaExhausted (abortRun quotaDaily) → 3・4 本目は spawn せず skipped", async () => {
    const h = harness({
      a: { outcome: ok("a") },
      b: { outcome: aborted("b", "quotaDaily") },
      c: { outcome: ok("c") },
      d: { outcome: ok("d") },
    });
    const r = await runGroup([src("a"), src("b"), src("c"), src("d")], { ...h.opts, dryRun: false });
    expect(h.ran).toEqual(["a", "b"]);
    expect(r.map((x) => effectiveOutcome(x).outcome)).toEqual([
      "ok",
      "quotaExhausted",
      "skipped",
      "skipped",
    ]);
    expect(r[2].skippedBy).toEqual({ kind: "quotaDaily", sourceId: "b" });
    expect(r[3].skippedBy?.sourceId).toBe("b");
    // ソース間 sleep は実際に spawn した間だけ (a→b の 1 回)
    expect(h.sleeps).toEqual([5000]);
  });

  it("1 本目が billing なら残りは全部 skipped", async () => {
    const h = harness({
      a: { outcome: aborted("a", "billing") },
      b: { outcome: ok("b") },
      c: { outcome: ok("c") },
    });
    const r = await runGroup([src("a"), src("b"), src("c")], { ...h.opts, dryRun: false });
    expect(h.ran).toEqual(["a"]);
    expect(r.slice(1).every((x) => x.skippedBy?.kind === "billing")).toBe(true);
  });

  it("abortRun の無い failed (apiError、keep-last-good) では打ち切らない", async () => {
    const h = harness({
      a: { outcome: outcomeOf("a", "failed", { failKind: "apiError", keptLastGood: true }) },
      b: { outcome: ok("b") },
    });
    await runGroup([src("a"), src("b")], { ...h.opts, dryRun: false });
    expect(h.ran).toEqual(["a", "b"]);
  });

  it("outcome を書かずに exit 1 で終わったソースは crashed(exit1)、後続は続行", async () => {
    const h = harness({ a: { outcome: null, code: 1 }, b: { outcome: ok("b") } });
    const r = await runGroup([src("a"), src("b")], { ...h.opts, dryRun: false });
    expect(h.ran).toEqual(["a", "b"]);
    expect(effectiveOutcome(r[0])).toMatchObject({ outcome: "crashed", failKind: "exit1" });
  });

  it("spawn 前に前回 run の outcome を消す (残骸を読まない)", async () => {
    const h = harness({ a: { outcome: null, code: 0 } });
    h.store.set("a", ok("a")); // 前回 run の残骸
    const r = await runGroup([src("a")], { ...h.opts, dryRun: false });
    expect(h.cleared).toEqual(["a"]);
    expect(r[0].outcome).toBeNull();
  });

  it("dryRun=true なら quota の outcome があっても打ち切らない", async () => {
    const h = harness({
      a: { outcome: aborted("a", "quotaDaily") },
      b: { outcome: ok("b") },
    });
    await runGroup([src("a"), src("b")], { ...h.opts, dryRun: true });
    expect(h.ran).toEqual(["a", "b"]);
  });

  it("parallel=2 でも共有フラグで未着手のソースが skipped になる", async () => {
    // a は b の完了を待ってから終わる (決定論的な順序)。b が quotaDaily で打ち切り
    // → b の worker が次に取る c と、a の worker が次に取る d は spawn されない。
    let releaseA: () => void = () => {};
    const aGate = new Promise<void>((r) => {
      releaseA = r;
    });
    const store = new Map<string, FetchOutcome>();
    const ran: string[] = [];
    const runOne: RunOne = async (id) => {
      ran.push(id);
      if (id === "a") {
        await aGate;
        store.set("a", ok("a"));
      } else if (id === "b") {
        store.set("b", aborted("b", "quotaDaily"));
        queueMicrotask(() => releaseA());
      } else {
        store.set(id, ok(id));
      }
      return { code: 0 };
    };
    const r = await runGroup([src("a"), src("b"), src("c"), src("d")], {
      dryRun: false,
      parallel: 2,
      outcomeDir: "mem",
      runOne,
      sleep: async () => {},
      readOutcome: (_d, id) => store.get(id) ?? null,
      clearOutcome: (_d, id) => {
        store.delete(id);
      },
    });
    expect(ran.sort()).toEqual(["a", "b"]);
    expect(r.map((x) => effectiveOutcome(x).outcome)).toEqual([
      "ok",
      "quotaExhausted",
      "skipped",
      "skipped",
    ]);
  });

  it("outcomeDir=null (dry-run) では outcome を読まずに exit code だけ返す", async () => {
    const h = harness({ a: { outcome: ok("a") } });
    const r = await runGroup([src("a")], { ...h.opts, outcomeDir: null, dryRun: true });
    expect(h.cleared).toEqual([]);
    expect(r[0]).toMatchObject({ sourceId: "a", exitCode: 0, outcome: null });
  });
});
