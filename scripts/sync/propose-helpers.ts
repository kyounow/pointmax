// 個別エンティティ (stores / rules / loyaltyRules / cards / paymentApps) について
// 「現在の seed と Gemini 抽出結果を突き合わせて Proposal を生成する」関数群。
//
// 分類ロジックの中心ルール:
//   - confidence < CONFIDENCE_AUTO_THRESHOLD (0.9)        → "lowConfidence"
//   - rate の絶対差 > RATE_PP_LIMIT (10pp)                → "rateDeltaTooLarge"
//   - rate の倍率が RATE_RATIO_MIN〜MAX 範囲外 (0.5〜2.0) → "rateRatioOutOfRange"
//   - 通貨/カード/支払方法参照変更                       → "referenceChange"
//   - 既存ID / 既存 name と衝突                          → "idCollision"
//   - BLOCKED_STORE_IDS 入りの id                        → "userBlocked"
//   - EXCLUDED_CATEGORIES (金融/保険/医療等)             → "excludedCategory"
//
// 全て満たさない場合 reviewReason は undefined となり、autoApplicable に分類される。
//
// 注意: ここでは個別エンティティの分類だけ行う。同一 run 内の重複検出
// (dedupeAcrossProposals) や category cap は diff-and-propose.ts 側で実施。

import type { SeedShape } from "../../src/domain/mergeSeed";
import { BLOCKED_STORE_IDS } from "../../src/state/seed-blocklist";
import { resolveCategory } from "../../src/state/seed-category-aliases";
import {
  CONFIDENCE_AUTO_THRESHOLD,
  EXCLUDED_CATEGORIES,
  computeConfidence,
  judgeRateChange,
} from "./types";
import type {
  AddRecordProposal,
  Evidence,
  ExtractedSource,
  Proposal,
  ReferenceChangeProposal,
  ReviewReason,
  UpdateFieldProposal,
} from "./types";
import { detectSelfReportedExclusion, detectUnsupportedDateClaim } from "./evidence-check";

// Extracted* レコードから Evidence のみを抜き出す。
// Extracted は各エンティティに Evidence のフィールドを混ぜている (型上のフラット化)
// ので、Proposal の evidence プロパティに移すときに使用。
function toEvidence(x: Evidence): Evidence {
  return {
    evidenceQuote: x.evidenceQuote,
    evidenceUrl: x.evidenceUrl,
    explicitness: x.explicitness,
    ambiguity: x.ambiguity,
  };
}

// ───────────────────────────────────────────────────────────────
// stores: 新規追加のみ (既存 store の更新提案は現状なし)
// ───────────────────────────────────────────────────────────────

export function proposeStores(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.stores || data.stores.length === 0) return [];
  const existingIds = new Set(current.stores.map((s) => s.id));
  const existingNames = new Set(current.stores.map((s) => s.name));
  const result: Proposal[] = [];

  for (const s of data.stores) {
    const evidence = toEvidence(s);
    const confidence = computeConfidence(evidence);
    // alias 適用: 旧名 (e.g., "鉄道・交通") は新名 ("交通") に正規化
    const normalizedCategory = resolveCategory(s.category);
    let reviewReason: ReviewReason | undefined;

    if (BLOCKED_STORE_IDS.has(s.storeId)) {
      reviewReason = "userBlocked";
    } else if (
      normalizedCategory &&
      EXCLUDED_CATEGORIES.has(normalizedCategory)
    ) {
      reviewReason = "excludedCategory";
    } else if (existingIds.has(s.storeId) || existingNames.has(s.name)) {
      reviewReason = "idCollision";
    } else if (confidence < CONFIDENCE_AUTO_THRESHOLD) {
      reviewReason = "lowConfidence";
    }
    // evidence integrity: Gemini 自身が除外と報告している場合は強制 needsReview
    if (detectSelfReportedExclusion(evidence.evidenceQuote)) {
      reviewReason = "selfReportedExclusion";
    }

    const prop: AddRecordProposal = {
      type: "addRecord",
      collection: "stores",
      record: {
        id: s.storeId,
        name: s.name,
        category: normalizedCategory,
      },
      sourceId: data.sourceId,
      confidence,
      evidence,
      reviewReason,
    };
    result.push(prop);
  }
  return result;
}

// ───────────────────────────────────────────────────────────────
// storeRules: 直接ルール (storeId 指定)。新規追加 + rate / currencyId 変更
// ───────────────────────────────────────────────────────────────

export function proposeStoreRules(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.storeRules || data.storeRules.length === 0) return [];
  const result: Proposal[] = [];
  for (const r of data.storeRules) {
    const evidence = toEvidence(r);
    const confidence = computeConfidence(evidence);
    const existing = current.rules.find(
      (x) =>
        x.cardId === r.cardId &&
        x.storeId === r.storeId &&
        x.paymentAppId === r.paymentAppId,
    );

    if (!existing) {
      // 新規追加 (id は deterministic に生成して冪等性確保)
      let reviewReason: ReviewReason | undefined =
        confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined;
      // evidence integrity: Gemini 自身が除外と報告している場合は強制 needsReview
      if (detectSelfReportedExclusion(evidence.evidenceQuote)) {
        reviewReason = "selfReportedExclusion";
      }
      // 日付主張があるのに evidenceQuote に日付根拠がない場合は hallucination 疑い
      if (detectUnsupportedDateClaim(r, evidence.evidenceQuote)) {
        reviewReason = "unsupportedDateClaim";
      }
      // rate=0 は Gemini 抽出失敗の証拠。自動マージ防止のため強制 review。
      if (!r.rate || r.rate === 0) {
        reviewReason = "zeroOrInvalidRate";
      }
      const ruleId = `rule-${r.cardId}-${r.storeId}${r.paymentAppId ? `-${r.paymentAppId}` : ""}`;
      const record: Record<string, unknown> = {
        id: ruleId,
        cardId: r.cardId,
        storeId: r.storeId,
        paymentAppId: r.paymentAppId,
        rate: r.rate,
        currencyId: r.currencyId,
        monthlyCapAmountYen: r.monthlyCapAmountYen,
        notes: r.notes,
      };
      if (r.validFrom !== undefined) record.validFrom = r.validFrom;
      if (r.validTo !== undefined) record.validTo = r.validTo;
      result.push({
        type: "addRecord",
        collection: "rules",
        record,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason,
      });
      continue;
    }

    // 既存あり: rate / currencyId のいずれかが変わっていれば提案
    if (existing.rate !== r.rate) {
      result.push(
        buildRateUpdate(
          existing.id,
          "rules",
          existing.rate,
          r.rate,
          data.sourceId,
          confidence,
          evidence,
        ),
      );
    }
    if (existing.currencyId !== r.currencyId) {
      result.push({
        type: "referenceChange",
        collection: "rules",
        id: existing.id,
        field: "currencyId",
        from: existing.currencyId,
        to: r.currencyId,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "referenceChange",
      } satisfies ReferenceChangeProposal);
    }
  }
  return result;
}

// ───────────────────────────────────────────────────────────────
// categoryRules: カテゴリ指定ルール (例: JAL特約店 2%)
// ───────────────────────────────────────────────────────────────

export function proposeCategoryRules(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.categoryRules || data.categoryRules.length === 0) return [];
  const result: Proposal[] = [];
  for (const r of data.categoryRules) {
    const evidence = toEvidence(r);
    const confidence = computeConfidence(evidence);
    const existing = current.rules.find(
      (x) =>
        x.cardId === r.cardId &&
        x.category === r.category &&
        x.paymentAppId === r.paymentAppId &&
        !x.storeId,
    );
    if (!existing) {
      const catRuleId = `catrule-${r.cardId}-${r.category}${r.paymentAppId ? `-${r.paymentAppId}` : ""}`;
      let catReviewReason: ReviewReason | undefined =
        confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined;
      // evidence integrity: Gemini 自身が除外と報告している場合は強制 needsReview
      if (detectSelfReportedExclusion(evidence.evidenceQuote)) {
        catReviewReason = "selfReportedExclusion";
      }
      // 日付主張があるのに evidenceQuote に日付根拠がない場合は hallucination 疑い
      if (detectUnsupportedDateClaim(r, evidence.evidenceQuote)) {
        catReviewReason = "unsupportedDateClaim";
      }
      // rate=0 は Gemini 抽出失敗の証拠。自動マージ防止のため強制 review。
      if (!r.rate || r.rate === 0) {
        catReviewReason = "zeroOrInvalidRate";
      }
      const catRecord: Record<string, unknown> = {
        id: catRuleId,
        cardId: r.cardId,
        category: r.category,
        paymentAppId: r.paymentAppId,
        rate: r.rate,
        currencyId: r.currencyId,
        monthlyCapAmountYen: r.monthlyCapAmountYen,
        notes: r.notes,
      };
      if (r.validFrom !== undefined) catRecord.validFrom = r.validFrom;
      if (r.validTo !== undefined) catRecord.validTo = r.validTo;
      result.push({
        type: "addRecord",
        collection: "rules",
        record: catRecord,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: catReviewReason,
      });
      continue;
    }
    if (existing.rate !== r.rate) {
      result.push(
        buildRateUpdate(
          existing.id,
          "rules",
          existing.rate,
          r.rate,
          data.sourceId,
          confidence,
          evidence,
        ),
      );
    }
    if (existing.currencyId !== r.currencyId) {
      result.push({
        type: "referenceChange",
        collection: "rules",
        id: existing.id,
        field: "currencyId",
        from: existing.currencyId,
        to: r.currencyId,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "referenceChange",
      } satisfies ReferenceChangeProposal);
    }
  }
  return result;
}

// ───────────────────────────────────────────────────────────────
// cards: 新規 cardId は idCollision (人間レビュー前提)、既存は rate/currencyId 更新
// ───────────────────────────────────────────────────────────────

export function proposeCards(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.cards || data.cards.length === 0) return [];
  const result: Proposal[] = [];
  for (const c of data.cards) {
    const evidence = toEvidence(c);
    const confidence = computeConfidence(evidence);
    const existing = current.cards.find((x) => x.id === c.cardId);
    if (!existing) {
      // 既存にない cardId が抽出された (通常想定外)
      result.push({
        type: "addRecord",
        collection: "cards",
        record: {
          id: c.cardId,
          name: c.name ?? c.cardId,
          grade: c.grade,
          defaultRate: c.defaultRate ?? 0,
          defaultCurrencyId: c.defaultCurrencyId ?? "",
        },
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "idCollision", // 新規カードは要レビュー
      });
      continue;
    }
    if (c.defaultRate != null && existing.defaultRate !== c.defaultRate) {
      result.push(
        buildRateUpdate(
          existing.id,
          "cards",
          existing.defaultRate,
          c.defaultRate,
          data.sourceId,
          confidence,
          evidence,
          "defaultRate",
        ),
      );
    }
    if (
      c.defaultCurrencyId &&
      existing.defaultCurrencyId !== c.defaultCurrencyId
    ) {
      result.push({
        type: "referenceChange",
        collection: "cards",
        id: existing.id,
        field: "defaultCurrencyId",
        from: existing.defaultCurrencyId,
        to: c.defaultCurrencyId,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "referenceChange",
      } satisfies ReferenceChangeProposal);
    }
  }
  return result;
}

// ───────────────────────────────────────────────────────────────
// loyaltyRules: ポイントカード × 店舗の提示還元
// ───────────────────────────────────────────────────────────────

export function proposeLoyaltyRules(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.loyaltyRules || data.loyaltyRules.length === 0) return [];
  const result: Proposal[] = [];
  for (const r of data.loyaltyRules) {
    const evidence = toEvidence(r);
    const confidence = computeConfidence(evidence);
    const existing = current.loyaltyRules.find(
      (x) => x.storeId === r.storeId && x.pointCardId === r.pointCardId,
    );
    if (!existing) {
      const loyaltyId = `loy-${r.pointCardId}-${r.storeId}`;
      let loyaltyReviewReason: ReviewReason | undefined =
        confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined;
      // evidence integrity: Gemini 自身が除外と報告している場合は強制 needsReview
      if (detectSelfReportedExclusion(evidence.evidenceQuote)) {
        loyaltyReviewReason = "selfReportedExclusion";
      }
      // 日付主張があるのに evidenceQuote に日付根拠がない場合は hallucination 疑い
      if (detectUnsupportedDateClaim(r, evidence.evidenceQuote)) {
        loyaltyReviewReason = "unsupportedDateClaim";
      }
      // rate=0 は Gemini 抽出失敗の証拠。自動マージ防止のため強制 review。
      if (!r.rate || r.rate === 0) {
        loyaltyReviewReason = "zeroOrInvalidRate";
      }
      const loyaltyRecord: Record<string, unknown> = {
        id: loyaltyId,
        storeId: r.storeId,
        pointCardId: r.pointCardId,
        rate: r.rate,
        currencyId: r.currencyId,
        notes: r.notes,
      };
      if (r.validFrom !== undefined) loyaltyRecord.validFrom = r.validFrom;
      if (r.validTo !== undefined) loyaltyRecord.validTo = r.validTo;
      result.push({
        type: "addRecord",
        collection: "loyaltyRules",
        record: loyaltyRecord,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: loyaltyReviewReason,
      });
      continue;
    }
    if (existing.rate !== r.rate) {
      result.push(
        buildRateUpdate(
          existing.id,
          "loyaltyRules",
          existing.rate,
          r.rate,
          data.sourceId,
          confidence,
          evidence,
        ),
      );
    }
  }
  return result;
}

// ───────────────────────────────────────────────────────────────
// paymentApps: 新規 paymentAppId は idCollision、既存は bonusRate/chargeBased 更新
// ───────────────────────────────────────────────────────────────

export function proposePaymentApps(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.paymentApps || data.paymentApps.length === 0) return [];
  const result: Proposal[] = [];
  for (const a of data.paymentApps) {
    const evidence = toEvidence(a);
    const confidence = computeConfidence(evidence);
    const existing = current.paymentApps.find((x) => x.id === a.paymentAppId);
    if (!existing) {
      const newAppRecord: Record<string, unknown> = {
        id: a.paymentAppId,
        name: a.name ?? a.paymentAppId,
        chargeBased: a.chargeBased,
        defaultBonusRate: a.defaultBonusRate,
        defaultBonusCurrencyId: a.defaultBonusCurrencyId,
        compatibleCardIds: a.compatibleCardIds,
      };
      if (a.cardSpecificBonusRates !== undefined) {
        newAppRecord.cardSpecificBonusRates = a.cardSpecificBonusRates;
      }
      let newAppReviewReason: ReviewReason = "idCollision";
      // cardSpecificBonusRates に日付主張があるのに evidenceQuote に根拠がない場合は降格
      const hasDateBearingBonus = a.cardSpecificBonusRates?.some(
        (b) => b.validFrom || b.validTo,
      );
      if (hasDateBearingBonus && detectUnsupportedDateClaim({ validFrom: "x" }, evidence.evidenceQuote)) {
        newAppReviewReason = "unsupportedDateClaim";
      }
      result.push({
        type: "addRecord",
        collection: "paymentApps",
        record: newAppRecord,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: newAppReviewReason,
      });
      continue;
    }
    if (
      a.defaultBonusRate != null &&
      existing.defaultBonusRate !== a.defaultBonusRate
    ) {
      result.push(
        buildRateUpdate(
          existing.id,
          "paymentApps",
          existing.defaultBonusRate ?? 0,
          a.defaultBonusRate,
          data.sourceId,
          confidence,
          evidence,
          "defaultBonusRate",
        ),
      );
    }
    if (a.chargeBased != null && existing.chargeBased !== a.chargeBased) {
      // boolean 変更は構造変更扱い → reviewReason
      result.push({
        type: "updateField",
        collection: "paymentApps",
        id: existing.id,
        field: "chargeBased",
        from: existing.chargeBased,
        to: a.chargeBased,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: "referenceChange", // 構造変更扱いで人間レビュー
      } satisfies UpdateFieldProposal);
    }
  }
  return result;
}

// ───────────────────────────────────────────────────────────────
// 共通: rate 変更の autoMergeable 判定
// pp 差 / 倍率 / confidence のチェックを集約
// ───────────────────────────────────────────────────────────────

export function buildRateUpdate(
  id: string,
  collection: UpdateFieldProposal["collection"],
  from: number,
  to: number,
  sourceId: string,
  confidence: number,
  evidence: Evidence,
  field: string = "rate",
): UpdateFieldProposal {
  const judge = judgeRateChange(from, to);
  let reviewReason: ReviewReason | undefined;
  if (confidence < CONFIDENCE_AUTO_THRESHOLD) {
    reviewReason = "lowConfidence";
  } else if (!judge.withinPp) {
    reviewReason = "rateDeltaTooLarge";
  } else if (!judge.withinRatio) {
    reviewReason = "rateRatioOutOfRange";
  }
  return {
    type: "updateField",
    collection,
    id,
    field,
    from,
    to,
    sourceId,
    confidence,
    evidence,
    reviewReason,
  };
}
