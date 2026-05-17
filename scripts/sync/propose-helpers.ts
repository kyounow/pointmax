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

// 全 proposeX で同一の 2 行 (evidence 抽出 + confidence 計算) を共通化。
// 純粋なホイストで挙動は不変。PR-D の proposePrograms 等も再利用する。
function evidenceAndConfidence(x: Evidence): {
  evidence: Evidence;
  confidence: number;
} {
  const evidence = toEvidence(x);
  return { evidence, confidence: computeConfidence(evidence) };
}

// reviewReason の「base 判定 → evidence-integrity による上書き」ラダーを共通化。
//
// 現行コードは `let rr = base; if (A) rr = a; if (B) rr = b; ...` という
// 逐次・無条件の last-wins 上書きだった。これと**完全に同義**:
//   - base は呼出側が従来どおり算出 (関数ごとに分岐が異なるので一切変えない)
//   - overrides は呼出側が**現行と同じ順序**で渡す。各 check が値を返せば上書き、
//     undefined なら据え置き。最後に返した非 undefined が勝つ (= 逐次 if と同一)
// 順序の責任は呼出側に残るため、抽出による挙動変化は構造的に起こらない。
type IntegrityCheck = () => ReviewReason | undefined;

function resolveReviewReason(
  base: ReviewReason | undefined,
  overrides: IntegrityCheck[],
): ReviewReason | undefined {
  let rr = base;
  for (const check of overrides) {
    const r = check();
    if (r) rr = r;
  }
  return rr;
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
    const { evidence, confidence } = evidenceAndConfidence(s);
    // alias 適用: 旧名 (e.g., "鉄道・交通") は新名 ("交通") に正規化
    const normalizedCategory = resolveCategory(s.category);

    // base 判定 (現行の if/else-if を一切変えず維持)
    let baseReason: ReviewReason | undefined;
    if (BLOCKED_STORE_IDS.has(s.storeId)) {
      baseReason = "userBlocked";
    } else if (
      normalizedCategory &&
      EXCLUDED_CATEGORIES.has(normalizedCategory)
    ) {
      baseReason = "excludedCategory";
    } else if (existingIds.has(s.storeId) || existingNames.has(s.name)) {
      baseReason = "idCollision";
    } else if (confidence < CONFIDENCE_AUTO_THRESHOLD) {
      baseReason = "lowConfidence";
    }
    // evidence integrity: Gemini 自身が除外と報告している場合は強制 needsReview
    const reviewReason = resolveReviewReason(baseReason, [
      () =>
        detectSelfReportedExclusion(evidence.evidenceQuote)
          ? "selfReportedExclusion"
          : undefined,
    ]);

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
// cards: 新規 cardId は idCollision (人間レビュー前提)、既存は rate/currencyId 更新
// ───────────────────────────────────────────────────────────────

export function proposeCards(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.cards || data.cards.length === 0) return [];
  const result: Proposal[] = [];
  for (const c of data.cards) {
    const { evidence, confidence } = evidenceAndConfidence(c);
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
    const { evidence, confidence } = evidenceAndConfidence(r);
    const existing = current.loyaltyRules.find(
      (x) => x.storeId === r.storeId && x.pointCardId === r.pointCardId,
    );
    if (!existing) {
      const loyaltyId = `loy-${r.pointCardId}-${r.storeId}`;
      // base + override 順序は現行の逐次 if と完全に同一:
      //   base: lowConfidence → selfReportedExclusion → unsupportedDateClaim
      //         → zeroOrInvalidRate (後勝ち)
      const loyaltyReviewReason = resolveReviewReason(
        confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined,
        [
          () =>
            detectSelfReportedExclusion(evidence.evidenceQuote)
              ? "selfReportedExclusion"
              : undefined,
          () =>
            detectUnsupportedDateClaim(r, evidence.evidenceQuote)
              ? "unsupportedDateClaim"
              : undefined,
          () => (!r.rate || r.rate === 0 ? "zeroOrInvalidRate" : undefined),
        ],
      );
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
    const { evidence, confidence } = evidenceAndConfidence(a);
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
      // cardSpecificBonusRates に日付主張があるのに evidenceQuote に根拠がない場合は降格
      const hasDateBearingBonus = a.cardSpecificBonusRates?.some(
        (b) => b.validFrom || b.validTo,
      );
      // base "idCollision" を unsupportedDateClaim が条件付き上書き (現行と同一)
      const newAppReviewReason = resolveReviewReason("idCollision", [
        () =>
          hasDateBearingBonus &&
          detectUnsupportedDateClaim({ validFrom: "x" }, evidence.evidenceQuote)
            ? "unsupportedDateClaim"
            : undefined,
      ]);
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
