import { describe, it, expect } from "vitest";
import {
  formatListLine,
  moveToManuallyApproved,
  proposalIdOf,
  selectProposalsByIds,
} from "./approve-proposals";
import { computeProposalId } from "./types";
import type { Proposal, ProposalReport } from "./types";

// ───────────────────────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────────────────────

const evidence = {
  evidenceQuote: "テスト引用",
  explicitness: 0.9,
  ambiguity: 0.1,
};

const storeAdd: Proposal = {
  type: "addRecord",
  collection: "stores",
  record: { id: "newdays", name: "NewDays", category: "コンビニ" },
  sourceId: "jre-point-campaigns",
  confidence: 0.81,
  evidence,
  reviewReason: "storeAdditionsDisabled",
};

const programAdd: Proposal = {
  type: "addRecord",
  collection: "programs",
  record: {
    id: "prog-paypay-7eleven-2026-06",
    name: "セブンイレブン 対象おにぎり +20%",
    paymentAppId: "pa-paypay",
    rate: 0.2,
    currencyId: "paypay",
    validFrom: "2026-06-01",
    validTo: "2026-06-30",
  },
  sourceId: "paypay-campaigns",
  confidence: 0.93,
  evidence,
  reviewReason: "idCollision",
};

const rateUpdate: Proposal = {
  type: "updateField",
  collection: "programs",
  id: "prog-dcard-bic",
  field: "rate",
  from: 0.05,
  to: 0.07,
  sourceId: "d-pay-campaigns",
  confidence: 0.95,
  evidence,
  reviewReason: "rateDeltaTooLarge",
};

const periodUpdate: Proposal = {
  type: "updateField",
  collection: "programs",
  id: "prog-dcard-bic",
  field: "validTo",
  from: "2026-06-30",
  to: "2026-07-31",
  sourceId: "d-pay-campaigns",
  confidence: 0.95,
  evidence,
  reviewReason: "periodChange",
};

// delete/programs (期限切れキャンペーン) は Phase 5 で承認可能
const deleteProposal: Proposal = {
  type: "delete",
  collection: "programs",
  id: "prog-old-campaign",
  sourceId: "expired-cleanup",
  confidence: 1.0,
  evidence,
  reviewReason: "expiredCampaign",
};

// 実書き込み経路の無い type/field (未対応のもの)
const cardUpdate: Proposal = {
  type: "updateField",
  collection: "cards",
  id: "rakuten-card",
  field: "defaultRate",
  from: 0.01,
  to: 0.02,
  sourceId: "rakuten-card-page",
  confidence: 0.95,
  evidence,
  reviewReason: "rateDeltaTooLarge",
};

const storeDelete: Proposal = {
  type: "delete",
  collection: "stores",
  id: "store-x",
  sourceId: "test",
  confidence: 1.0,
  evidence,
  reviewReason: "deletion",
};

const baseReport = (needsReview: Proposal[]): ProposalReport => ({
  generatedAt: "2026-06-10T00:00:00.000Z",
  fromSeedVersion: 41,
  toSeedVersion: 41,
  autoApplicable: [],
  needsReview,
  summary: {
    autoApplicableCount: 0,
    needsReviewCount: needsReview.length,
    sourcesProcessed: 5,
    sourcesFailed: 0,
  },
});

// ───────────────────────────────────────────────────────────────
// computeProposalId / proposalIdOf
// ───────────────────────────────────────────────────────────────

describe("computeProposalId", () => {
  it("collection 3 文字 prefix + 10 桁 hash の安定 ID を返す", () => {
    const id1 = computeProposalId(storeAdd);
    const id2 = computeProposalId({ ...storeAdd });
    expect(id1).toMatch(/^sto-[0-9a-f]{10}$/);
    expect(id1).toBe(id2); // 同内容 → 同 ID
  });

  it("内容 (record) が変わると ID も変わる", () => {
    const modified: Proposal = {
      ...storeAdd,
      record: { ...((storeAdd as { record: Record<string, unknown> }).record), name: "NewDays 改" },
    } as Proposal;
    expect(computeProposalId(modified)).not.toBe(computeProposalId(storeAdd));
  });

  it("evidence / confidence の揺れでは ID が変わらない (run 安定性)", () => {
    const jittered: Proposal = {
      ...storeAdd,
      confidence: 0.5,
      evidence: { ...evidence, evidenceQuote: "別の引用" },
    };
    expect(computeProposalId(jittered)).toBe(computeProposalId(storeAdd));
  });

  it("updateField は id/field/to で識別され from の現在値には依存しない", () => {
    const fromShift: Proposal = { ...rateUpdate, from: 0.06 } as Proposal;
    expect(computeProposalId(fromShift)).toBe(computeProposalId(rateUpdate));
    const toShift: Proposal = { ...rateUpdate, to: 0.08 } as Proposal;
    expect(computeProposalId(toShift)).not.toBe(computeProposalId(rateUpdate));
  });

  it("proposalIdOf は付与済み proposalId を優先し、無ければ計算する", () => {
    expect(proposalIdOf({ ...storeAdd, proposalId: "sto-manual0001" })).toBe(
      "sto-manual0001",
    );
    expect(proposalIdOf(storeAdd)).toBe(computeProposalId(storeAdd));
  });
});

// ───────────────────────────────────────────────────────────────
// selectProposalsByIds
// ───────────────────────────────────────────────────────────────

describe("selectProposalsByIds", () => {
  const report = baseReport([
    storeAdd,
    programAdd,
    rateUpdate,
    periodUpdate,
    cardUpdate,
    deleteProposal,
    storeDelete,
  ]);

  it("ID で needsReview から addRecord を選択する", () => {
    const sel = selectProposalsByIds(report, [computeProposalId(programAdd)]);
    expect(sel.found).toHaveLength(1);
    expect(sel.found[0]).toBe(programAdd);
    expect(sel.missing).toEqual([]);
    expect(sel.unsupported).toEqual([]);
  });

  it("存在しない ID は missing に入る", () => {
    const sel = selectProposalsByIds(report, ["pro-ffffffffff"]);
    expect(sel.found).toEqual([]);
    expect(sel.missing).toEqual(["pro-ffffffffff"]);
  });

  it("updateField/programs の rate / validTo は承認可能 (Phase 4 override layer)", () => {
    const sel = selectProposalsByIds(report, [
      computeProposalId(rateUpdate),
      computeProposalId(periodUpdate),
    ]);
    expect(sel.found).toHaveLength(2);
    expect(sel.unsupported).toEqual([]);
  });

  it("delete/programs (期限切れキャンペーン) は承認可能 (Phase 5 tombstone)", () => {
    const sel = selectProposalsByIds(report, [computeProposalId(deleteProposal)]);
    expect(sel.found).toHaveLength(1);
    expect(sel.unsupported).toEqual([]);
  });

  it("実書き込み経路の無い type/field (updateField/cards, delete/stores) は unsupported に入る", () => {
    const sel = selectProposalsByIds(report, [
      computeProposalId(cardUpdate),
      computeProposalId(storeDelete),
    ]);
    expect(sel.found).toEqual([]);
    expect(sel.unsupported).toHaveLength(2);
  });

  it("同一 ID の重複指定は 1 件として扱う", () => {
    const id = computeProposalId(storeAdd);
    const sel = selectProposalsByIds(report, [id, id, id]);
    expect(sel.found).toHaveLength(1);
  });

  it("proposalId が付与済みの report ではそちらで照合する", () => {
    const stamped = baseReport([{ ...storeAdd, proposalId: "sto-stamped123" }]);
    const sel = selectProposalsByIds(stamped, ["sto-stamped123"]);
    expect(sel.found).toHaveLength(1);
  });
});

// ───────────────────────────────────────────────────────────────
// moveToManuallyApproved
// ───────────────────────────────────────────────────────────────

describe("moveToManuallyApproved", () => {
  it("承認分を needsReview から除去し manuallyApproved に移動、summary を更新する", () => {
    const report = baseReport([storeAdd, programAdd, rateUpdate]);
    const updated = moveToManuallyApproved(report, [programAdd]);
    expect(updated.needsReview).toHaveLength(2);
    expect(updated.needsReview).not.toContain(programAdd);
    expect(updated.manuallyApproved).toEqual([programAdd]);
    expect(updated.summary.needsReviewCount).toBe(2);
    // 元 report は不変 (immutable)
    expect(report.needsReview).toHaveLength(3);
    expect(report.manuallyApproved).toBeUndefined();
  });

  it("既存の manuallyApproved に追記する", () => {
    const report: ProposalReport = {
      ...baseReport([programAdd]),
      manuallyApproved: [storeAdd],
    };
    const updated = moveToManuallyApproved(report, [programAdd]);
    expect(updated.manuallyApproved).toEqual([storeAdd, programAdd]);
    expect(updated.needsReview).toEqual([]);
    expect(updated.summary.needsReviewCount).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────
// formatListLine
// ───────────────────────────────────────────────────────────────

describe("formatListLine", () => {
  it("addRecord は record.id と name、reason、source を 1 行に含む", () => {
    const line = formatListLine(programAdd);
    expect(line).toContain(computeProposalId(programAdd));
    expect(line).toContain("addRecord/programs");
    expect(line).toContain("[idCollision]");
    expect(line).toContain("prog-paypay-7eleven-2026-06");
    expect(line).toContain("paypay-campaigns");
  });

  it("承認可能な updateField/programs に ✋ は付かない", () => {
    const line = formatListLine(rateUpdate);
    expect(line).not.toContain("✋");
    expect(line).toContain("prog-dcard-bic.rate");
  });

  it("承認可能な delete/programs に ✋ は付かない", () => {
    const line = formatListLine(deleteProposal);
    expect(line).not.toContain("✋");
    expect(line).toContain("prog-old-campaign");
  });

  it("未対応の type/field (updateField/cards, delete/stores) は ✋ を含む", () => {
    expect(formatListLine(cardUpdate)).toContain("✋");
    expect(formatListLine(cardUpdate)).toContain("rakuten-card.defaultRate");
    expect(formatListLine(storeDelete)).toContain("✋");
  });
});
