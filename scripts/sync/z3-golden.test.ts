// PR-0b-3 (Z3): 実事故のゴールデンテスト。
//
// 2026-07〜09 に auto で配信された (または配信され得た) campaign program と membership の誤マッピングを、
// 凍結 seed (fixtures/z3-golden.ts、seed() 非依存) と実事故の run 日時 (now 注入) で diff-and-propose の
// Phase 順に通し、1 件も auto にならず期待どおりの reason になることを固定する。negative (正しいデータ) が
// auto のまま残ることも同時に固定する (過剰ブロックの検知)。

import { describe, it, expect } from "vitest";
import {
  applyCategoryCap,
  dedupeAcrossProposals,
  demoteChildlessMemberStorePrograms,
  downgradeOrphanMemberships,
  promoteChainStoreAutoMerge,
} from "./diff-and-propose";
import {
  guardMembershipContent,
  proposeExpiredCampaignDeletions,
  proposeMemberships,
  proposePrograms,
  proposeStores,
} from "./propose-helpers";
import { applySourcePolicies, autoMergeDisabledSourceIds } from "./registry-policy";
import { findRiskyApprovals } from "./approve-proposals";
import type { AddRecordProposal, ExtractedSource, Proposal, SourcePolicy } from "./types";
import type { SeedShape } from "../../src/domain/mergeSeed";
import {
  CAMPAIGN_NEGATIVE,
  DPAY_0702,
  DPAY_0727,
  GOLDEN_POLICIES,
  GOLDEN_PROGRAM_EXPECTATIONS,
  GOLDEN_SEED,
  GOLDEN_SEED_WITH_PAYPAY_SEVEN,
  JPOINT_20X_NEGATIVE,
  MEMBERSHIP_MISMAPS,
  NOW_DPAY_0702,
  NOW_DPAY_0727,
  NOW_EXPIRED_1022,
  NOW_PAYPAY_0903,
  PAYPAY_0903,
  TAMARU_ONLINE_NEGATIVE,
} from "./fixtures/z3-golden";

// diff-and-propose の main と同じ Phase 順:
//   1 (propose*) → 2 (expired-cleanup) → A dedup → B cap → B' chain-promote (autoMerge:false ソース除外)
//   → B″ applySourcePolicies (memberships 以外) → C orphan → C′ membership 内容ガード
//   → C″ applySourcePolicies (memberships のみ) → C2 atomicity
// (C3 の stale ガードは promptVersion の世代差だけを見るので省く)。
// membership tombstone は実 seed-blocklist に依存させないため空集合を渡す。
function runPhases(
  extracted: ExtractedSource[],
  current: SeedShape,
  opts: { now: Date; policies?: ReadonlyMap<string, SourcePolicy> },
): Proposal[] {
  const policies = opts.policies ?? new Map<string, SourcePolicy>();
  const all: Proposal[] = [];
  for (const data of extracted) {
    all.push(...proposeStores(data, current));
    all.push(...proposePrograms(data, current, { now: opts.now, policy: policies.get(data.sourceId) }));
    all.push(...proposeMemberships(data, current, new Set()));
  }
  all.push(...proposeExpiredCampaignDeletions(current, opts.now));
  const dedup = dedupeAcrossProposals(all);
  const cap = applyCategoryCap(dedup.proposals, 5);
  const chain = promoteChainStoreAutoMerge(cap.kept, current, autoMergeDisabledSourceIds(policies));
  const sourcePolicy = applySourcePolicies(chain.proposals, policies, {
    excludeCollections: ["memberships"],
  });
  const orphan = downgradeOrphanMemberships(
    sourcePolicy.proposals,
    new Set(current.stores.map((s) => s.id)),
    new Set((current.programs ?? []).map((p) => p.id)),
  );
  const content = guardMembershipContent(orphan.proposals, current);
  const sourcePolicyMemberships = applySourcePolicies(content.proposals, policies, {
    onlyCollections: ["memberships"],
  });
  return demoteChildlessMemberStorePrograms(
    sourcePolicyMemberships.proposals,
    new Set((current.memberships ?? []).map((m) => m.programId)),
  ).proposals;
}

const SOURCES = { DPAY_0727, DPAY_0702, PAYPAY_0903 } as const;
const NOW_OF = { DPAY_0727: NOW_DPAY_0727, DPAY_0702: NOW_DPAY_0702, PAYPAY_0903: NOW_PAYPAY_0903 } as const;

const recordOf = (p: Proposal) => (p as AddRecordProposal).record as Record<string, unknown>;
const findProgram = (ps: Proposal[], id: string) =>
  ps.find((p) => p.type === "addRecord" && p.collection === "programs" && recordOf(p).id === id);
const findMembership = (ps: Proposal[], programId: string, storeId: string) =>
  ps.find(
    (p) =>
      p.type === "addRecord" &&
      p.collection === "memberships" &&
      recordOf(p).programId === programId &&
      recordOf(p).storeId === storeId,
  );
const autoOf = (ps: Proposal[]) => ps.filter((p) => !p.reviewReason);

describe("Z3 ゴールデン: 実事故の campaign program (ポリシー無し = ガードだけで止まる)", () => {
  it.each(GOLDEN_PROGRAM_EXPECTATIONS.map((e) => [e.note, e] as const))(
    "%s",
    (_note, e) => {
      const ps = runPhases([SOURCES[e.source]], GOLDEN_SEED, { now: NOW_OF[e.source] });
      const p = findProgram(ps, e.programId);
      expect(p, e.programId).toBeDefined();
      expect(p!.reviewReason).toBe(e.reason);
    },
  );

  it("実事故 7 件 + 回帰 2 件は 1 件も autoApplicable にならない", () => {
    for (const e of GOLDEN_PROGRAM_EXPECTATIONS) {
      const ps = runPhases([SOURCES[e.source]], GOLDEN_SEED, { now: NOW_OF[e.source] });
      expect(findProgram(ps, e.programId)?.reviewReason, e.programId).toBeTruthy();
    }
  });
});

describe("Z3 ゴールデン: membership の誤マッピング (既存 program への新規 membership)", () => {
  it.each(MEMBERSHIP_MISMAPS.map((m) => [m.note, m] as const))("%s", (_note, m) => {
    const ps = runPhases([m.source], GOLDEN_SEED, { now: NOW_DPAY_0727 });
    const p = findMembership(ps, m.programId, m.storeId);
    expect(p, `${m.programId}|${m.storeId}`).toBeDefined();
    expect(p!.reviewReason).toBe(m.reason);
    expect(p!.reviewDetail).toBeTruthy();
  });

  // 出荷時の設定 (d-pay / paypay が autoMerge:false) でも、membership の具体的な reason が
  // sourceAutoMergeDisabled に隠れず、sync:approve が --accept-risk を要求する (Phase C″ は C′ の後)。
  it.each(MEMBERSHIP_MISMAPS.map((m) => [m.note, m] as const))(
    "GOLDEN_POLICIES 付きでも同じ reason で --accept-risk の対象: %s",
    (_note, m) => {
      const ps = runPhases([m.source], GOLDEN_SEED, { now: NOW_DPAY_0727, policies: GOLDEN_POLICIES });
      const p = findMembership(ps, m.programId, m.storeId);
      expect(p, `${m.programId}|${m.storeId}`).toBeDefined();
      expect(p!.reviewReason).toBe(m.reason);
      expect(findRiskyApprovals([p!])).toEqual([p]);
    },
  );

  it("d-pay の かっぱ寿司 → くら寿司 (MEMBERSHIP_MISMAPS[0]) は GOLDEN_POLICIES 付きで storeNameMismatch", () => {
    const m = MEMBERSHIP_MISMAPS[0];
    expect(m.source.sourceId).toBe("d-pay-campaigns");
    const ps = runPhases([m.source], GOLDEN_SEED, { now: NOW_DPAY_0727, policies: GOLDEN_POLICIES });
    const p = findMembership(ps, m.programId, m.storeId);
    expect(p?.reviewReason).toBe("storeNameMismatch");
    expect(p?.reviewDetail).toContain("くら寿司");
    expect(findRiskyApprovals(ps)).toEqual([p]);
  });

  it("paypay の既存 program への membership で evidence が『モバイルオーダー限定』なら GOLDEN_POLICIES 付きでも campaignConditional", () => {
    const src: ExtractedSource = {
      ...PAYPAY_0903,
      programs: [],
      memberships: [
        {
          programId: "prog-paypay-seven-eleven-30-2026-09",
          storeId: "mcdonalds",
          evidenceQuote: "マクドナルド（モバイルオーダー限定）",
          explicitness: 1,
          ambiguity: 0.05,
        },
      ],
    };
    for (const policies of [undefined, GOLDEN_POLICIES]) {
      const ps = runPhases([src], GOLDEN_SEED_WITH_PAYPAY_SEVEN, { now: NOW_PAYPAY_0903, policies });
      const p = findMembership(ps, "prog-paypay-seven-eleven-30-2026-09", "mcdonalds");
      expect(p?.reviewReason, policies ? "with policies" : "no policies").toBe("campaignConditional");
      expect(findRiskyApprovals([p!])).toHaveLength(1);
    }
  });

  it("C / C′ を通過した d-pay の membership は GOLDEN_POLICIES 付きで sourceAutoMergeDisabled (--accept-risk 不要)", () => {
    const clean: ExtractedSource = {
      ...MEMBERSHIP_MISMAPS[0].source,
      memberships: [
        {
          programId: "prog-dpay-kura-sushi-existing",
          storeId: "kappa-sushi",
          evidenceQuote: "かっぱ寿司 dポイント 10倍",
          explicitness: 1,
          ambiguity: 0.05,
        },
      ],
    };
    const noPolicy = runPhases([clean], GOLDEN_SEED, { now: NOW_DPAY_0727 });
    expect(findMembership(noPolicy, "prog-dpay-kura-sushi-existing", "kappa-sushi")?.reviewReason).toBeUndefined();
    const ps = runPhases([clean], GOLDEN_SEED, { now: NOW_DPAY_0727, policies: GOLDEN_POLICIES });
    const p = findMembership(ps, "prog-dpay-kura-sushi-existing", "kappa-sushi");
    expect(p?.reviewReason).toBe("sourceAutoMergeDisabled");
    expect(findRiskyApprovals(ps)).toEqual([]);
  });
});

describe("Z3 ゴールデン: ソース別ポリシー (d-pay / paypay の autoMerge:false)", () => {
  it("d-pay 7/27 run 全体 (7 program・7 membership・3 store) の auto が 0 件", () => {
    const ps = runPhases([DPAY_0727], GOLDEN_SEED, { now: NOW_DPAY_0727, policies: GOLDEN_POLICIES });
    expect(ps).toHaveLength(17);
    expect(autoOf(ps).map((p) => `${p.collection}:${JSON.stringify(recordOf(p))}`)).toEqual([]);
    // program は Phase 1 で review 行きなので、membership は Phase C で missingProgramBody (新規店は missingStoreBody)。
    // sourceAutoMergeDisabled (= ほかのガードは通過済み) は付かない。新規店自体は storeAdditionsDisabled
    expect(findMembership(ps, "prog-dpay-mos-burger-dpoint-3x-2026-07", "mos-burger")?.reviewReason).toBe(
      "missingProgramBody",
    );
    const memberships = ps.filter((p) => p.collection === "memberships");
    expect(memberships).toHaveLength(7);
    for (const m of memberships) {
      expect(["missingProgramBody", "missingStoreBody"], String(recordOf(m).storeId)).toContain(m.reviewReason);
    }
    // ポリシーの有無で membership の reason は変わらない
    const noPolicy = runPhases([DPAY_0727], GOLDEN_SEED, { now: NOW_DPAY_0727 });
    const reasonsOf = (xs: Proposal[]) =>
      xs.filter((p) => p.collection === "memberships").map((p) => `${String(recordOf(p).storeId)}:${p.reviewReason}`);
    expect(reasonsOf(ps)).toEqual(reasonsOf(noPolicy));
    const joyful = ps.find((p) => p.collection === "stores" && recordOf(p).id === "joyful-honda");
    expect(joyful?.reviewReason).toBe("storeAdditionsDisabled");
  });

  it("d-pay 7/02 run・paypay 9/03 run もポリシー付きで auto 0 件、提示型 (d-pointcard) は targetMismatch にならない", () => {
    const d = runPhases([DPAY_0702], GOLDEN_SEED, { now: NOW_DPAY_0702, policies: GOLDEN_POLICIES });
    const pp = runPhases([PAYPAY_0903], GOLDEN_SEED, { now: NOW_PAYPAY_0903, policies: GOLDEN_POLICIES });
    expect(autoOf(d)).toEqual([]);
    expect(autoOf(pp)).toEqual([]);
    expect(findProgram(d, "prog-d-pointcard-mos-burger-05")?.reviewReason).toBe("campaignConditional");
  });

  it("誤帰属 (d-pay のソースに PayPay の program) は review 行きでも targetMismatch で表示される", () => {
    const misattributed: ExtractedSource = {
      ...DPAY_0727,
      programs: [{ ...PAYPAY_0903.programs![0], programId: "prog-misattributed-paypay" }],
      memberships: [],
      stores: [],
    };
    const ps = runPhases([misattributed], GOLDEN_SEED, { now: NOW_PAYPAY_0903, policies: GOLDEN_POLICIES });
    expect(findProgram(ps, "prog-misattributed-paypay")?.reviewReason).toBe("targetMismatch");
  });

  it("期限切れ整理 (sourceId=expired-cleanup) は paypay 由来の program でもソース別ポリシーを素通りし auto のまま", () => {
    const ps = runPhases([], GOLDEN_SEED_WITH_PAYPAY_SEVEN, { now: NOW_EXPIRED_1022, policies: GOLDEN_POLICIES });
    const del = ps.find((p) => p.type === "delete" && (p as { id: string }).id === "prog-paypay-seven-eleven-30-2026-09");
    expect(del).toBeDefined();
    expect(del!.sourceId).toBe("expired-cleanup");
    expect(del!.reviewReason).toBeUndefined();
  });
});

describe("Z3 ゴールデン: negative (正しいデータは auto のまま = 過剰ブロックしない)", () => {
  it("J-POINT Gold 20 倍の飲食 6 店 membership は auto", () => {
    const ps = runPhases([JPOINT_20X_NEGATIVE], GOLDEN_SEED, { now: NOW_DPAY_0727 });
    expect(ps).toHaveLength(6);
    expect(ps.map((p) => p.reviewReason)).toEqual(new Array(6).fill(undefined));
  });

  it("たまるマーケット (channel online) の EC 経由 membership (無印ネットストア / HMV online / マルイウェブ / コジマネット) は auto (RF6)", () => {
    const ps = runPhases([TAMARU_ONLINE_NEGATIVE], GOLDEN_SEED, { now: NOW_DPAY_0727 });
    expect(ps).toHaveLength(4);
    expect(ps.map((p) => p.reviewReason)).toEqual(new Array(4).fill(undefined));
  });

  it("JRE NewDays 3% (全条件パス) とポリシー無しソースの d払い 5% は auto", () => {
    const ps = runPhases([CAMPAIGN_NEGATIVE], GOLDEN_SEED, { now: NOW_DPAY_0727, policies: GOLDEN_POLICIES });
    expect(findProgram(ps, "prog-jre-camp-newdays-future")?.reviewReason).toBeUndefined();
    expect(findProgram(ps, "prog-d-pay-camp")?.reviewReason).toBeUndefined();
  });
});
