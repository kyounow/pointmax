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
//
// ─── Integrity check 優先順位 (low→high、後ろほど強い、配列順がそのまま反映) ───
// 1. base                    : caller の分類 (idCollision / lowConfidence / excludedCategory 等)
// 2. selfReportedExclusion   : Gemini 自身が evidence で「対象外/記載なし」と報告
// 3. unsupportedDateClaim    : validFrom/validTo を主張しているのに evidence に日付なし
//                              (= Gemini が日付を hallucinate)
// この順番で配列に積めば、より強い integrity check が後勝ちで base を上書きする。
// 個別 propose* で順番が違う場合は意図的 (e.g. memberships は日付主張なしで dateClaim 省略可)。
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
    } else {
      // 上記理由に該当しない健全な新規 store も、ポリシー上 cron では
      // 自動追加せず手動キュレ運用 (PR #56)。「キャンペーン情報の獲得に注力」
      // のため、store 増加で seed が肥大化するのを避ける。
      baseReason = "storeAdditionsDisabled";
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
      // 新規 program は原則 idCollision で要レビュー (ライブ還元計算に直結)。
      // PR #60 (B 段階): campaign 専用 source の高品質 program は auto-merge
      // を許可。integrity チェック (selfReported/unsupportedDate/zeroRate) が
      // 引っかかれば優先降格、その他は isCampaignAutoMergeable で判定。
      const integrityIssue = resolveReviewReason(undefined, [
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
      const reviewReason: ReviewReason | undefined = integrityIssue
        ? integrityIssue
        : isCampaignAutoMergeable(p, data, current, confidence)
          ? undefined // 高品質 campaign → autoApplicable
          : "idCollision"; // 既存挙動: 安全条件未達は要レビュー
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
      if (p.recurringWeekdays !== undefined)
        rec.recurringWeekdays = p.recurringWeekdays;
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
    // 既存 program: rate 変動を提案 (proposeLoyaltyRules と同方式)
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
    // 期間変更 (B-2): キャンペーン延長 / 期間訂正の検知。
    // - 抽出側に値がある場合のみ比較 (省略 = 「言及なし」であり削除主張ではない)
    // - auto はせず必ず needsReview (periodChange)。sync:approve で承認適用できる
    // - evidence に日付根拠が無ければ unsupportedDateClaim を優先 (hallucination 防御)
    for (const field of ["validFrom", "validTo"] as const) {
      const next = p[field];
      if (next === undefined) continue;
      if (found[field] === next) continue;
      result.push({
        type: "updateField",
        collection: "programs",
        id: found.id,
        field,
        from: found[field],
        to: next,
        sourceId: data.sourceId,
        confidence,
        evidence,
        reviewReason: detectUnsupportedDateClaim(p, evidence.evidenceQuote)
          ? "unsupportedDateClaim"
          : "periodChange",
      } satisfies UpdateFieldProposal);
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

// ───────────────────────────────────────────────────────────────
// 期限切れキャンペーン削除提案
// validTo + grace 日数を経過した program に対する DeleteProposal を生成。
// Calculator は isRuleActiveAt() で自動 skip 済みのため機能影響なしだが、
// seed の可読性/サイズ維持のため定期的にクリーンアップ。
//
// 【自動削除 (週次 cron)】
// 期限切れ削除は本質的に低リスク (既に非アクティブで還元計算に効いていない) なため、
// grace 経過済の削除は autoApplicable (reviewReason 無し) として投入し、週次 cron で
// 自動適用する。適用先は apply-proposals.ts の delete/programs → REMOVED_PROGRAM_IDS
// (tombstone)。seed から program + memberships が cascade 除外され、mergeSeed が
// 既存ユーザーの localStorage からも除去する (未編集の公式由来のみ)。安全弁は
// 既存機構を流用: maxAutoChangesPerRun (件数 cap)、apply 後の `npm test && npm run
// build` ゲート、autoMergeEnabled マスタスイッチ。
//
// 【延長ガード (extendedProgramIds)】
// tombstone は永久フィルタ (seed() が同 id を恒久的に除外) のため、誤って延長中の
// キャンペーンを削除すると再 fetch しても同 id は復活しない。これを防ぐため、同一 run で
// 期間変更 (validFrom/validTo の periodChange) が提案された program は自動削除せず、
// reviewReason="expiredCampaign" で needsReview に留める (人手が延長=periodChange 承認 か
// 終了=本削除承認 を選べる)。extendedProgramIds は diff-and-propose.ts が Phase 1 の
// periodChange 提案から集約して渡す。
// ───────────────────────────────────────────────────────────────

export const EXPIRED_CAMPAIGN_GRACE_DAYS = 30;

function parseDateEndLocal(s: string): number | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    23, 59, 59, 999,
  ).getTime();
}

export function proposeExpiredCampaignDeletions(
  current: SeedShape,
  now: Date = new Date(),
  graceDays: number = EXPIRED_CAMPAIGN_GRACE_DAYS,
  extendedProgramIds: ReadonlySet<string> = new Set(),
): Proposal[] {
  const cutoffMs = now.getTime() - graceDays * 24 * 60 * 60 * 1000;
  const memberships = current.memberships ?? [];
  const proposals: Proposal[] = [];

  for (const p of current.programs ?? []) {
    if (!p.validTo) continue;
    const validToMs = parseDateEndLocal(p.validTo);
    if (validToMs === null) continue;
    if (validToMs > cutoffMs) continue; // grace 内なのでスキップ

    // 同一 run で期間変更 (延長/訂正) が提案されている program は自動削除しない。
    // 延長中キャンペーンを tombstone 化すると復活不可になるため、人手判断に回す。
    const hasPendingExtension = extendedProgramIds.has(p.id);

    const cascade = memberships.filter((m) => m.programId === p.id);
    const daysExpired = Math.floor(
      (now.getTime() - validToMs) / (1000 * 60 * 60 * 24),
    );
    // cascade は先頭 5 件まで列挙、残りは件数表記 (REVIEW_QUEUE.md の冗長化を防ぐ)
    const cascadeStoreIds = cascade.map((m) => m.storeId);
    const cascadeSummary =
      cascade.length > 0
        ? ` 関連 memberships ${cascade.length} 件も同時削除 (${cascadeStoreIds.slice(0, 5).join(", ")}${cascade.length > 5 ? ` 他 ${cascade.length - 5} 件` : ""})`
        : "";
    const extensionNote = hasPendingExtension
      ? " ⚠ 同 run で期間変更提案あり: 延長なら periodChange を、終了なら本削除を承認。"
      : "";

    proposals.push({
      type: "delete",
      collection: "programs",
      id: p.id,
      sourceId: "expired-cleanup",
      confidence: 1.0,
      evidence: {
        evidenceQuote:
          `validTo=${p.validTo} (${daysExpired}日前に終了)。${cascadeSummary}${extensionNote}`.trim(),
        explicitness: 1.0,
        ambiguity: 0,
      },
      // grace 経過済は自動削除 (reviewReason 無し)。ただし延長提案中は人手判断へ。
      reviewReason: hasPendingExtension ? "expiredCampaign" : undefined,
    });
  }
  return proposals;
}

// ───────────────────────────────────────────────────────────────
// Campaign auto-merge eligibility (B 段階、PR #60)
// ───────────────────────────────────────────────────────────────
// 新規 program は本来 idCollision で全件 needsReview (ライブ還元計算に
// 直接効くため誤適用が厳禁) だが、campaign 専用 source から抽出された
// 「期限明示 + 既存参照 + 妥当 rate + 高 confidence + lifestyle 系
// キーワード無し」の高品質な campaign は auto-merge を許可する。
//
// 安全ガード:
// 1. extractor === "campaign" (ongoing-program は除外、smbc-vpoint-up
//    系の lifestyle 条件付き program の混入を防ぐ)
// 2. validTo 必須 + 未来日 (既に終了した campaign は提案不要)
// 3. rate ∈ (0, CAMPAIGN_AUTO_RATE_MAX] (30% を超える率は誤抽出疑い)
// 4. confidence ≥ CAMPAIGN_AUTO_CONFIDENCE_THRESHOLD (0.90)
// 5. cardIds / pointCardId / paymentAppId / currencyId が全て seed に
//    存在 (未定義の参照を防ぐ)
// 6. lifestyle 系キーワード除外 (memory feedback_pointmax_lifestyle_programs
//    と整合、defense-in-depth として keyword filter で更に阻む)
// 7. proposePrograms の他の reviewReason (selfReportedExclusion /
//    unsupportedDateClaim / zeroOrInvalidRate) に該当しない (=
//    その他のチェックは従来どおり通った後の最終ゲートとして本関数)
//
// 【校正メモ (confidence 閾値 0.95 → 0.90)】
// 旧 0.95 は、campaign extractor が逐語根拠つき (= 上記 1-3,5-7 の構造条件を
// 全て満たした) 健全キャンペーンに対しても実質到達不能だった。Gemini の自然な
// 自己評価は explicitness=0.9 / ambiguity=0.1 (= プロンプト模範例の数値) で
// confidence=0.81 となり、「期間明示 + 既存参照 + 妥当 rate + lifestyle 無し」を
// 満たしてもキャンペーンが一切 auto 反映されない状態だった (REVIEW_QUEUE の
// lowConfidence 過半数の主因)。本関数の他 6 条件 (特に期間の逐語明記・rate≤30%・
// 参照整合) が既に強力な構造ゲートになっているため、自己申告 confidence の足切りは
// 0.90 で十分。併せて campaign.prompt.md の校正 (逐語根拠は explicitness=1.0) で
// 健全キャンペーンが ≥0.90 に乗るようにした。
export const CAMPAIGN_AUTO_CONFIDENCE_THRESHOLD = 0.9;
export const CAMPAIGN_AUTO_RATE_MAX = 0.3;

// memory: feedback_pointmax_lifestyle_programs.md の禁止カテゴリ。
// 本来 ongoing-program prompt で除外済だが、campaign extractor 経由で
// 混入する万が一に備える defense-in-depth。
const LIFESTYLE_KEYWORDS: ReadonlyArray<string> = [
  "給与", "ボーナス振込",
  "住宅ローン",
  "外貨預金", "円預金", "預金残高",
  "投資", "証券", "NISA", "iDeCo", "SBI",
  "保険", "Vitality", "ヘルスケア",
  "カードローン", "リボ払い",
  "外貨積立",
];

function parseDateEndMs(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    23, 59, 59, 999,
  ).getTime();
}

function parseDateStartMs(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    0, 0, 0, 0,
  ).getTime();
}

/**
 * 新規 program が campaign auto-merge の安全条件を全て満たすか判定する。
 * 安全条件は 7 つの AND チェック、1 つでも外れたら false (idCollision に降格)。
 */
export function isCampaignAutoMergeable(
  p: { rate: number; validTo?: string; cardIds?: string[]; pointCardId?: string; paymentAppId?: string; currencyId: string; name?: string; description?: string; conditions?: string },
  data: ExtractedSource,
  current: SeedShape,
  confidence: number,
  now: Date = new Date(),
): boolean {
  // 1. campaign extractor source 限定
  if (data.extractor !== "campaign") return false;

  // 2. validTo 必須 + 未来日
  const validToMs = parseDateEndMs(p.validTo);
  if (validToMs === null) return false;
  if (validToMs <= now.getTime()) return false;

  // 2.5 (B-5) malformed 期間ガード: validFrom がある場合は parse 可能かつ
  // validTo 以前であること。validFrom > validTo は ruleActiveAt が常に
  // 非アクティブ判定する死にデータなので auto-merge しない。
  if (p.validFrom !== undefined) {
    const validFromMs = parseDateStartMs(p.validFrom);
    if (validFromMs === null) return false;
    if (validFromMs > validToMs) return false;
  }

  // 3. rate ∈ (0, CAMPAIGN_AUTO_RATE_MAX]
  if (!Number.isFinite(p.rate)) return false;
  if (p.rate <= 0 || p.rate > CAMPAIGN_AUTO_RATE_MAX) return false;

  // 4. confidence 厳格化
  if (confidence < CAMPAIGN_AUTO_CONFIDENCE_THRESHOLD) return false;

  // 5. seed 参照整合性
  if (p.cardIds && p.cardIds.length > 0) {
    const known = new Set((current.cards ?? []).map((c) => c.id));
    for (const cid of p.cardIds) {
      if (!known.has(cid)) return false;
    }
  }
  if (p.pointCardId) {
    const known = new Set((current.pointCards ?? []).map((c) => c.id));
    if (!known.has(p.pointCardId)) return false;
  }
  if (p.paymentAppId) {
    const known = new Set((current.paymentApps ?? []).map((a) => a.id));
    if (!known.has(p.paymentAppId)) return false;
  }
  const knownCurrencies = new Set((current.currencies ?? []).map((c) => c.id));
  if (!knownCurrencies.has(p.currencyId)) return false;

  // 6. lifestyle 系キーワード除外 (defense-in-depth)
  const text = [p.name ?? "", p.description ?? "", p.conditions ?? ""].join(" ");
  for (const kw of LIFESTYLE_KEYWORDS) {
    if (text.includes(kw)) return false;
  }

  return true;
}
