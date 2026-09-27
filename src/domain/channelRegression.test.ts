// PR-0a-2a: 購入チャネルの実データ回帰テスト (seed() + rankCards / evaluatePrograms)。
//
// ⚠ 書き方の規約: **否定形・包含形で書き、厳密な率は assert しない**。
//   この file は cron の Safety check (npm test) でも走る。「店頭 0.5%」のような厳密値を書くと、
//   cron が同じ店に正当な program を auto で足した週に safety gate が落ちて、その run の
//   auto 変更が全件降格する。ここで守るのは「たまる / 経由型 20倍が店頭で採用されない」
//   「純 EC 店・店頭対象店では候補に残る」ことだけ。
//
// 対象カードのみ enabled、ポイントカード・決済アプリは seed どおり全 OFF (v7 R1)。
// 目標通貨はカード自身の通貨 (epos / j-point) にして交換ルートの影響を除く。

import { describe, it, expect } from "vitest";
import { seed } from "../state/seed";
import { rankCards } from "./rankCards";
import { evaluatePrograms } from "./programEvaluator";
import type { PurchaseChannel } from "./types";

const NOW = new Date("2026-09-28T12:00:00+09:00");
const AMOUNT = 10000;
const S = seed();

const TAMARU_RE = /^prog-epos-tamaru-\d+x$/;

function rankFor(cardId: string, storeId: string, targetCurrencyId: string) {
  const cards = S.cards.map((c) => (c.id === cardId ? { ...c, enabled: true } : c));
  const { rankings } = rankCards({
    payment: { storeId, amount: AMOUNT },
    targetCurrencyId,
    cards,
    stores: S.stores,
    edges: S.edges,
    pointCards: S.pointCards,
    paymentApps: S.paymentApps,
    programs: S.programs,
    memberships: S.memberships,
    now: NOW,
  });
  const row = rankings.find((r) => r.card.id === cardId);
  if (!row) throw new Error(`${cardId} の ranking が無い`);
  return row;
}

function adoptedProgramId(row: ReturnType<typeof rankFor>): string | null {
  return row.resolved.source === "program" ? row.resolved.programId : null;
}

function candidatesFor(cardId: string, storeId: string, channel?: PurchaseChannel) {
  const card = S.cards.find((c) => c.id === cardId);
  const store = S.stores.find((s) => s.id === storeId);
  if (!card) throw new Error(`card ${cardId} が seed に無い`);
  if (!store) throw new Error(`store ${storeId} が seed に無い`);
  return evaluatePrograms({
    card,
    store,
    paymentApp: { id: "__direct__", name: "直接決済" },
    programs: S.programs,
    memberships: S.memberships,
    now: NOW,
    channel,
  }).primaryCandidates;
}

describe("PR-0a-2a 回帰: たまるマーケットは物理店の店頭計算に載らない", () => {
  it.each([
    "bic-camera",
    "uniqlo",
    "muji",
    "marui",
    "kojima",
    "nojima",
    "tower-records",
  ])("epos-card × %s (店頭): prog-epos-tamaru-* が不採用・候補にも無い", (storeId) => {
    const row = rankFor("epos-card", storeId, "epos");
    expect(adoptedProgramId(row) ?? "").not.toMatch(TAMARU_RE);
    const ids = candidatesFor("epos-card", storeId).map((c) => c.program.id);
    expect(ids.filter((id) => TAMARU_RE.test(id))).toEqual([]);
  });

  it.each(["bic-camera", "uniqlo", "muji"])(
    "epos-card × %s: channel:'online' を指定すると たまるが候補に入る (membership は残っている)",
    (storeId) => {
      const ids = candidatesFor("epos-card", storeId, "online").map((c) => c.program.id);
      expect(ids.some((id) => TAMARU_RE.test(id))).toBe(true);
    },
  );
});

describe("PR-0a-2a 回帰: 純 EC 店では たまるが既定で採用される (楽天市場 / Yahoo / じゃらん / HMV)", () => {
  it.each(["rakuten-ichiba", "yahoo-shopping", "jalannet", "hmv-books-online"])(
    "epos-card × %s: prog-epos-tamaru-* が候補に入り、結果は たまる分を下回らない",
    (storeId) => {
      const tamaru = candidatesFor("epos-card", storeId).filter((c) =>
        TAMARU_RE.test(c.program.id),
      );
      expect(tamaru.length, `${storeId} で たまるが候補に無い`).toBeGreaterThan(0);
      // 包含形: 採用結果 (epos 建て) は たまる候補の最小 earn 以上 (より良い program が
      // 足されても落ちない。厳密値は書かない)。
      const minTamaruEarn = Math.min(...tamaru.map((c) => AMOUNT * c.effectiveRate));
      const row = rankFor("epos-card", storeId, "epos");
      expect(row.resolved.source).toBe("program");
      expect(row.totalFinalAmount).toBeGreaterThanOrEqual(minTamaruEarn - 1e-9);
    },
  );
});

describe("PR-0a-2a 回帰 (A16): J-POINT 20倍の経由型 2 店は店頭計算から外れる", () => {
  it.each(["starbucks", "mcdonalds"])(
    "jcb-w × %s (既定 = 店頭): prog-jcb-jpoint-20x が不採用・候補にも無い",
    (storeId) => {
      const row = rankFor("jcb-w", storeId, "j-point");
      expect(adoptedProgramId(row)).not.toBe("prog-jcb-jpoint-20x");
      const ids = candidatesFor("jcb-w", storeId).map((c) => c.program.id);
      expect(ids).not.toContain("prog-jcb-jpoint-20x");
    },
  );

  it.each(["starbucks", "mcdonalds"])(
    "jcb-w × %s: channel:'online' を指定すると prog-jcb-jpoint-20x が候補に入る",
    (storeId) => {
      const ids = candidatesFor("jcb-w", storeId, "online").map((c) => c.program.id);
      expect(ids).toContain("prog-jcb-jpoint-20x");
    },
  );

  it.each(["starbucks", "mcdonalds"])(
    "jcb-gold × %s (既定 = 店頭): prog-jcb-jpoint-gold-20x が不採用",
    (storeId) => {
      const row = rankFor("jcb-gold", storeId, "j-point");
      expect(adoptedProgramId(row)).not.toBe("prog-jcb-jpoint-gold-20x");
    },
  );

  it("jcb-w × sukiya (店頭カード払いが対象、公式確認済み): 既定で prog-jcb-jpoint-20x が採用される", () => {
    const candidates = candidatesFor("jcb-w", "sukiya");
    const twenty = candidates.find((c) => c.program.id === "prog-jcb-jpoint-20x");
    expect(twenty, "sukiya で 20倍が候補に無い").toBeDefined();
    const row = rankFor("jcb-w", "sukiya", "j-point");
    expect(row.resolved.source).toBe("program");
    // 包含形: 20倍分の earn を下回らない (より良い program が足されても落ちない)
    if (twenty) {
      expect(row.totalFinalAmount).toBeGreaterThanOrEqual(
        AMOUNT * twenty.effectiveRate - 1e-9,
      );
    }
  });
});
