import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import {
  applySourcePolicies,
  autoMergeDisabledSourceIds,
  loadRegistryPolicy,
  normalizeTargets,
  parseRegistryPolicy,
} from "./registry-policy";
import type { Proposal, SourcePolicy } from "./types";

// PR-0b-3: registry.yaml → ソース別ポリシー (target / autoMerge) の parse と、Phase B″ の適用。

const src = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  label: id,
  url: `https://example.com/${id}`,
  extractor: "campaign",
  produces: ["programs"],
  extractionScope: "chains-only",
  enabled: true,
  fetchGroup: "mon",
  ...extra,
});

describe("parseRegistryPolicy", () => {
  it("autoMerge を省略すると true、target 未宣言は []", () => {
    const r = parseRegistryPolicy({ version: 1, sources: [src("a")] });
    expect(r.policies.get("a")).toEqual({
      sourceId: "a",
      extractor: "campaign",
      autoMerge: true,
      targets: [],
    });
  });

  it("target の単数形は配列に正規化され、配列はそのまま (候補順を保つ)", () => {
    const r = parseRegistryPolicy({
      version: 1,
      sources: [
        src("paypay", { target: { paymentAppId: "pa-paypay" }, autoMerge: false }),
        src("d-pay", {
          target: [{ paymentAppId: "pa-d-pay" }, { pointCardId: "d-pointcard" }],
          autoMerge: false,
        }),
        src("jcb", { target: { cardIds: ["jcb-w", "jcb-gold"] } }),
      ],
    });
    expect(r.policies.get("paypay")?.targets).toEqual([{ paymentAppId: "pa-paypay" }]);
    expect(r.policies.get("paypay")?.autoMerge).toBe(false);
    expect(r.policies.get("d-pay")?.targets).toEqual([
      { paymentAppId: "pa-d-pay" },
      { pointCardId: "d-pointcard" },
    ]);
    expect(r.policies.get("jcb")?.targets).toEqual([{ cardIds: ["jcb-w", "jcb-gold"] }]);
  });

  it("enabledIds は enabled:true のソースだけ、policies は enabled:false のソースも含む", () => {
    const r = parseRegistryPolicy({
      version: 1,
      sources: [src("on"), src("off", { enabled: false, fetchGroup: undefined })],
    });
    expect([...r.enabledIds]).toEqual(["on"]);
    expect(r.policies.has("off")).toBe(true);
    expect(r.sources.map((s) => s.id)).toEqual(["on", "off"]);
  });

  it("extractorVersions は String 化される (YAML の number 化対策)", () => {
    const r = parseRegistryPolicy({
      version: 1,
      extractorVersions: { campaign: "v3.5", card: 1.1 },
      sources: [],
    });
    expect(r.extractorVersions).toEqual({ campaign: "v3.5", card: "1.1" });
  });

  it.each([
    ["sources[] が無い", { version: 1 }],
    ["sources が配列でない", { version: 1, sources: {} }],
    ["id が無いソース", { version: 1, sources: [{ label: "x" }] }],
    ["id の重複", { version: 1, sources: [src("a"), src("a")] }],
    ["autoMerge が文字列 'false'", { version: 1, sources: [src("a", { autoMerge: "false" })] }],
    ["target のキーが 2 つ", {
      version: 1,
      sources: [src("a", { target: { paymentAppId: "pa-d-pay", pointCardId: "d-pointcard" } })],
    }],
    ["target の cardIds が []", { version: 1, sources: [src("a", { target: { cardIds: [] } })] }],
    ["target の cardIds に空文字", { version: 1, sources: [src("a", { target: { cardIds: [""] } })] }],
    ["target の未知キー", { version: 1, sources: [src("a", { target: { storeId: "x" } })] }],
    ["target の paymentAppId が空文字", { version: 1, sources: [src("a", { target: { paymentAppId: " " } })] }],
    ["target が空配列", { version: 1, sources: [src("a", { target: [] })] }],
    ["target の要素が文字列", { version: 1, sources: [src("a", { target: ["pa-d-pay"] })] }],
  ])("%s は throw (fail-closed)", (_label, data) => {
    expect(() => parseRegistryPolicy(data)).toThrow(/registry/);
  });

  it("throw のメッセージに sourceId が入る", () => {
    expect(() =>
      parseRegistryPolicy({ version: 1, sources: [src("paypay-campaigns", { autoMerge: "no" })] }),
    ).toThrow(/paypay-campaigns/);
    expect(() => normalizeTargets("d-pay-campaigns", { cardIds: [] })).toThrow(/d-pay-campaigns/);
  });
});

describe("loadRegistryPolicy", () => {
  it("読めないパスは throw (fail-closed、黙って空ポリシーにしない)", () => {
    expect(() => loadRegistryPolicy(resolve(__dirname, "no-such-registry.yaml"))).toThrow();
  });
  // 実際の registry.yaml が loader を通ることは registry-consistency.test.ts で固定する。
});

describe("autoMergeDisabledSourceIds", () => {
  it("autoMerge:false のソース id だけを返す", () => {
    const r = parseRegistryPolicy({
      version: 1,
      sources: [src("a"), src("b", { autoMerge: false }), src("c", { autoMerge: true })],
    });
    expect([...autoMergeDisabledSourceIds(r.policies)]).toEqual(["b"]);
  });
});

describe("applySourcePolicies (Phase B″)", () => {
  const policies = new Map<string, SourcePolicy>([
    ["d-pay-campaigns", { sourceId: "d-pay-campaigns", extractor: "campaign", autoMerge: false, targets: [] }],
    ["jcb-jpoint-partners", { sourceId: "jcb-jpoint-partners", extractor: "jcb-jpoint", autoMerge: true, targets: [] }],
  ]);
  const ev = { evidenceQuote: "x", explicitness: 1, ambiguity: 0 };
  const add = (collection: "stores" | "programs" | "memberships", sourceId: string, reviewReason?: Proposal["reviewReason"]): Proposal => ({
    type: "addRecord",
    collection,
    record: { id: `${collection}-${sourceId}` },
    sourceId,
    confidence: 0.95,
    evidence: ev,
    ...(reviewReason ? { reviewReason } : {}),
  });
  const update = (sourceId: string): Proposal => ({
    type: "updateField",
    collection: "programs",
    id: "prog-x",
    field: "rate",
    from: 0.03,
    to: 0.04,
    sourceId,
    confidence: 0.95,
    evidence: ev,
  });

  it("autoMerge:false のソースの auto 候補 (store / program / membership / updateField) は全て sourceAutoMergeDisabled", () => {
    const { proposals, demotedBySource } = applySourcePolicies(
      [
        add("stores", "d-pay-campaigns"),
        add("programs", "d-pay-campaigns"),
        add("memberships", "d-pay-campaigns"),
        update("d-pay-campaigns"),
      ],
      policies,
    );
    expect(proposals.map((p) => p.reviewReason)).toEqual([
      "sourceAutoMergeDisabled",
      "sourceAutoMergeDisabled",
      "sourceAutoMergeDisabled",
      "sourceAutoMergeDisabled",
    ]);
    expect(proposals[0].reviewDetail).toContain("d-pay-campaigns");
    expect(demotedBySource).toEqual(new Map([["d-pay-campaigns", 4]]));
  });

  it("既に reason を持つ提案は変えない (既存の理由を優先)", () => {
    const p = add("programs", "d-pay-campaigns", "campaignRateCeiling");
    const { proposals, demotedBySource } = applySourcePolicies([p], policies);
    expect(proposals[0]).toBe(p);
    expect(demotedBySource.size).toBe(0);
  });

  it("autoMerge:true のソースと registry に無い sourceId (expired-cleanup の delete) は auto のまま", () => {
    const expired: Proposal = {
      type: "delete",
      collection: "programs",
      id: "prog-paypay-seven-eleven-30-2026-09",
      sourceId: "expired-cleanup",
      confidence: 1,
      evidence: { evidenceQuote: "validTo=2026-09-21", explicitness: 1, ambiguity: 0 },
    };
    const jcb = add("memberships", "jcb-jpoint-partners");
    const { proposals, demotedBySource } = applySourcePolicies([jcb, expired], policies);
    expect(proposals[0]).toBe(jcb);
    expect(proposals[1]).toBe(expired);
    expect(proposals[1].reviewReason).toBeUndefined();
    expect(demotedBySource.size).toBe(0);
  });

  // main は B″ (C の前) で memberships 以外、C″ (C′ の後) で memberships だけに適用する
  it("scope.excludeCollections: memberships を外すと store / program / updateField だけ降格 (B″)", () => {
    const m = add("memberships", "d-pay-campaigns");
    const { proposals, demotedBySource } = applySourcePolicies(
      [add("stores", "d-pay-campaigns"), add("programs", "d-pay-campaigns"), m, update("d-pay-campaigns")],
      policies,
      { excludeCollections: ["memberships"] },
    );
    expect(proposals.map((p) => p.reviewReason)).toEqual([
      "sourceAutoMergeDisabled",
      "sourceAutoMergeDisabled",
      undefined,
      "sourceAutoMergeDisabled",
    ]);
    expect(proposals[2]).toBe(m);
    expect(demotedBySource).toEqual(new Map([["d-pay-campaigns", 3]]));
  });

  it("scope.onlyCollections: memberships だけ降格し、C / C′ の reason が付いた membership はそのまま (C″)", () => {
    const store = add("stores", "d-pay-campaigns");
    const named = add("memberships", "d-pay-campaigns", "storeNameMismatch");
    const { proposals, demotedBySource } = applySourcePolicies(
      [store, add("memberships", "d-pay-campaigns"), named],
      policies,
      { onlyCollections: ["memberships"] },
    );
    expect(proposals[0]).toBe(store);
    expect(proposals[1].reviewReason).toBe("sourceAutoMergeDisabled");
    expect(proposals[2]).toBe(named);
    expect(demotedBySource).toEqual(new Map([["d-pay-campaigns", 1]]));
  });
});
