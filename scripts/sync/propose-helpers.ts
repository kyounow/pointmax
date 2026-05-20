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
// pointCard ロイヤリティ → 正準モデル (BenefitProgram) への決定論変換
//
// seed の既存規約 (10 件で確認):
//   id          : prog-{pointCardId}-{rate%}pc
//                 0.005→"0.5pc" / 0.01→"1pc" / 0.015→"1.5pc"
//   currencyId  : その pointCard の通貨
//   bonusType   : "primary"
//   店舗との紐付けは StoreProgramMembership (programId↔storeId)
//
// ★ ID 採番を AI ではなくこの純関数に閉じ込めることで、迷子 membership
//   (存在しない program を指す) を構造的に防ぐ。テストベクタで固定。
// ───────────────────────────────────────────────────────────────

export function rateToProgramSlug(rate: number): string | null {
  if (!Number.isFinite(rate) || rate <= 0) return null;
  // 浮動小数誤差回避のため整数化してから %（小数1桁まで）に整形
  const pct = Math.round(rate * 100000) / 1000; // 0.005→0.5, 0.01→1, 0.015→1.5
  return `${pct}pc`;
}

export function deriveLoyaltyProgramId(
  pointCardId: string,
  rate: number,
): string | null {
  const slug = rateToProgramSlug(rate);
  return slug ? `prog-${pointCardId}-${slug}` : null;
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
  const pcCurrency = new Map(
    current.pointCards.map((p) => [p.id, p.currencyId]),
  );
  const pcName = new Map(current.pointCards.map((p) => [p.id, p.name]));
  // 既存 + 同 run 内で出した program / membership を覚えて重複提案を防ぐ
  const seenPrograms = new Set((current.programs ?? []).map((p) => p.id));
  const seenMemberships = new Set(
    (current.memberships ?? []).map((m) => `${m.programId}__${m.storeId}`),
  );
  for (const r of data.loyaltyRules) {
    const { evidence, confidence } = evidenceAndConfidence(r);
    // guard ラダー (現行 proposeLoyaltyRules と同一の base+override 順序)
    const guardReason = resolveReviewReason(
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

    const programId = deriveLoyaltyProgramId(r.pointCardId, r.rate);
    if (!programId) {
      // rate 不正。現行同様 needsReview 1 件で可視化 (auto-merge 不可)。
      // 迷子 membership を作らないよう program addRecord として残す。
      result.push({
        type: "addRecord",
        collection: "programs",
        record: {
          id: `prog-${r.pointCardId}-invalid-${r.storeId}`,
          name: `${pcName.get(r.pointCardId) ?? r.pointCardId} 提示 (rate不正)`,
          pointCardId: r.pointCardId,
          rate: r.rate ?? 0,
          currencyId: r.currencyId ?? pcCurrency.get(r.pointCardId) ?? "",
          bonusType: "primary",
        },
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: guardReason ?? "zeroOrInvalidRate",
      });
      continue;
    }

    const currencyId =
      r.currencyId ?? pcCurrency.get(r.pointCardId) ?? "";

    // rate バケツ program が未存在なら新規提案。ライブ還元計算に直接
    // 効くため base "idCollision" で必ず needsReview (proposePrograms と同規約)。
    // ※ point-partner は常時レート。validFrom/validTo は共有 program に
    //   載せない (期間物は campaign extractor の担当)。
    if (!seenPrograms.has(programId)) {
      const pct = Math.round(r.rate * 100000) / 1000;
      const programReason = resolveReviewReason("idCollision", [
        () =>
          detectSelfReportedExclusion(evidence.evidenceQuote)
            ? "selfReportedExclusion"
            : undefined,
        () =>
          detectUnsupportedDateClaim(r, evidence.evidenceQuote)
            ? "unsupportedDateClaim"
            : undefined,
      ]);
      result.push({
        type: "addRecord",
        collection: "programs",
        record: {
          id: programId,
          name: `${pcName.get(r.pointCardId) ?? r.pointCardId} 提示 ${pct}%`,
          pointCardId: r.pointCardId,
          rate: r.rate,
          currencyId,
          bonusType: "primary",
        },
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: programReason,
      });
      seenPrograms.add(programId);
    }

    // store ↔ rate-program の membership。既存/同 run 重複は skip。
    const mkey = `${programId}__${r.storeId}`;
    if (!seenMemberships.has(mkey)) {
      const rec: Record<string, unknown> = {
        programId,
        storeId: r.storeId,
      };
      if (r.notes !== undefined) rec.notes = r.notes;
      result.push({
        type: "addRecord",
        collection: "memberships",
        record: rec,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: guardReason,
      });
      seenMemberships.add(mkey);
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
// programs: BenefitProgram (v3+ 正準モデル)。campaign extractor 等が
// 期間限定プロモを programs[] として出力。新規は安全側で要レビュー。
// ───────────────────────────────────────────────────────────────

export function proposePrograms(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.programs || data.programs.length === 0) return [];
  const existing = current.programs ?? [];
  const result: Proposal[] = [];
  for (const p of data.programs) {
    const { evidence, confidence } = evidenceAndConfidence(p);
    const found = existing.find((x) => x.id === p.programId);
    if (!found) {
      // 新規 program はライブ還元計算に直接効くため、proposeCards /
      // proposePaymentApps と同じく base "idCollision" で必ず人手レビュー。
      // 順序は loyaltyRules と同一: selfReported → unsupportedDate → zeroRate。
      const reviewReason = resolveReviewReason("idCollision", [
        () =>
          detectSelfReportedExclusion(evidence.evidenceQuote)
            ? "selfReportedExclusion"
            : undefined,
        () =>
          detectUnsupportedDateClaim(p, evidence.evidenceQuote)
            ? "unsupportedDateClaim"
            : undefined,
        () => (!p.rate || p.rate === 0 ? "zeroOrInvalidRate" : undefined),
      ]);
      // 定義済みフィールドのみ詰める (apply の emitObjectLiteral が
      // undefined/null を除外するのと整合、loyaltyRecord と同方式)
      const rec: Record<string, unknown> = {
        id: p.programId,
        name: p.name ?? p.programId,
        rate: p.rate,
        currencyId: p.currencyId,
      };
      if (p.cardIds !== undefined) rec.cardIds = p.cardIds;
      if (p.pointCardId !== undefined) rec.pointCardId = p.pointCardId;
      if (p.paymentAppId !== undefined) rec.paymentAppId = p.paymentAppId;
      if (p.bonusType !== undefined) rec.bonusType = p.bonusType;
      if (p.validFrom !== undefined) rec.validFrom = p.validFrom;
      if (p.validTo !== undefined) rec.validTo = p.validTo;
      if (p.recurringDays !== undefined) rec.recurringDays = p.recurringDays;
      if (p.description !== undefined) rec.description = p.description;
      if (p.officialUrl !== undefined) rec.officialUrl = p.officialUrl;
      if (p.entryUrl !== undefined) rec.entryUrl = p.entryUrl;
      if (p.conditions !== undefined) rec.conditions = p.conditions;
      if (p.monthlyCapAmountYen !== undefined)
        rec.monthlyCapAmountYen = p.monthlyCapAmountYen;
      if (p.notes !== undefined) rec.notes = p.notes;
      result.push({
        type: "addRecord",
        collection: "programs",
        record: rec,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason,
      });
      continue;
    }
    // 既存 program: rate 変動のみ提案 (proposeLoyaltyRules と同方式の最小経路)
    if (found.rate !== p.rate) {
      result.push(
        buildRateUpdate(
          found.id,
          "programs",
          found.rate,
          p.rate,
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
// memberships: StoreProgramMembership (program ↔ store の M2M join)。
// join なので loyaltyRules と同じ分類 (idCollision ではなく lowConfidence base)。
// ───────────────────────────────────────────────────────────────

export function proposeMemberships(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (!data.memberships || data.memberships.length === 0) return [];
  const existing = current.memberships ?? [];
  const result: Proposal[] = [];
  for (const m of data.memberships) {
    const { evidence, confidence } = evidenceAndConfidence(m);
    const found = existing.find(
      (x) => x.programId === m.programId && x.storeId === m.storeId,
    );
    if (found) continue; // 既存 membership は更新経路なし (PR-D1 は最小)
    const reviewReason = resolveReviewReason(
      confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined,
      [
        () =>
          detectSelfReportedExclusion(evidence.evidenceQuote)
            ? "selfReportedExclusion"
            : undefined,
      ],
    );
    const rec: Record<string, unknown> = {
      programId: m.programId,
      storeId: m.storeId,
    };
    if (m.overrideRate !== undefined) rec.overrideRate = m.overrideRate;
    if (m.overrideCurrencyId !== undefined)
      rec.overrideCurrencyId = m.overrideCurrencyId;
    if (m.notes !== undefined) rec.notes = m.notes;
    result.push({
      type: "addRecord",
      collection: "memberships",
      record: rec,
      sourceId: data.sourceId,
      confidence,
      evidence,
      reviewReason,
    });
  }
  return result;
}

// ───────────────────────────────────────────────────────────────
// jal-tokuyaku: 新規 JAL特約店 store → 既存 prog-jal-tokuyaku への
// membership を決定論的に提案 (PR-D2b)。
//
// card 系 program は ID が bespoke で自動採番不可だが、JAL特約店だけは
// 「prog-jal-tokuyaku」という既知の定数 program (rate 0.02 / cardIds
// [jal-suica,jal-card]) があり、特約店 store をそこへ繋ぐのは決定論的に安全。
//
// 安全策:
//  - data.extractor==="jal-tokuyaku" のソースのみ対象 (他に影響なし)
//  - prog-jal-tokuyaku が seed.programs に無ければ何もしない (迷子防止)
//  - 抽出 categoryRule の JAL特約店 rate が program.rate と食い違う場合は
//    基本レート変更の疑い → 一括リンクしない (誤クレジット防止)
//  - storeRules で標準レート≠の例外店は対象外 (手動キュレーション領域、
//    従来どおり drop。silent loss でない=元々 consumer 無し)
// ───────────────────────────────────────────────────────────────

const JAL_TOKUYAKU_PROGRAM_ID = "prog-jal-tokuyaku";

export function proposeJalTokuyakuMemberships(
  data: ExtractedSource,
  current: SeedShape,
): Proposal[] {
  if (data.extractor !== "jal-tokuyaku") return [];
  if (!data.stores || data.stores.length === 0) return [];
  const prog = (current.programs ?? []).find(
    (p) => p.id === JAL_TOKUYAKU_PROGRAM_ID,
  );
  if (!prog) return []; // 定数 program 不在: 迷子を作らないため何もしない

  // 抽出 categoryRule の JAL特約店 基本レート。program.rate と乖離したら
  // 基本レート変更の疑いなので一括 membership 化しない (誤クレジット防止)。
  const baseCat = (data.categoryRules ?? []).find(
    (c) => c.category === "JAL特約店",
  );
  if (baseCat && baseCat.rate !== prog.rate) return [];

  // 例外レート店 (storeRules で rate≠program.rate) は対象外
  const exceptionStoreIds = new Set(
    (data.storeRules ?? [])
      .filter((r) => r.rate !== prog.rate)
      .map((r) => r.storeId),
  );

  const seenMemberships = new Set(
    (current.memberships ?? []).map((m) => `${m.programId}__${m.storeId}`),
  );
  const result: Proposal[] = [];
  for (const st of data.stores) {
    if (exceptionStoreIds.has(st.storeId)) continue;
    const mkey = `${JAL_TOKUYAKU_PROGRAM_ID}__${st.storeId}`;
    if (seenMemberships.has(mkey)) continue;
    const { evidence, confidence } = evidenceAndConfidence(st);
    const reviewReason = resolveReviewReason(
      confidence < CONFIDENCE_AUTO_THRESHOLD ? "lowConfidence" : undefined,
      [
        () =>
          detectSelfReportedExclusion(evidence.evidenceQuote)
            ? "selfReportedExclusion"
            : undefined,
      ],
    );
    result.push({
      type: "addRecord",
      collection: "memberships",
      record: { programId: JAL_TOKUYAKU_PROGRAM_ID, storeId: st.storeId },
      sourceId: data.sourceId,
      confidence,
      evidence,
      reviewReason,
    });
    seenMemberships.add(mkey);
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
