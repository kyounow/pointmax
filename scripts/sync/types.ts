// ===========================================================
// Master sync pipeline types
// ===========================================================
// このファイルは scripts/sync/ 配下の各スクリプトと、
// sources/extracted/*.json の構造を一元定義する。
//
// 流れ:
//   registry.yaml ─▶ fetch-source.ts (Gemini CLI 呼び出し)
//                     ─▶ sources/extracted/<sourceId>.json (ExtractedSource)
//                     ─▶ diff-and-propose.ts
//                     ─▶ sources/proposed-migrations.json (ProposalReport)
//                     ─▶ apply-proposals.ts / GitHub Actions
//                     ─▶ seed.ts / MIGRATIONS / PR or Issue

import type { CollectionName } from "../../src/domain/migrations";

// ===========================================================
// Layer 0: Source registry
// ===========================================================

// sources/registry.yaml の各エントリ
export type RegistrySource = {
  id: string;               // ユニークなソース ID (slug)
  label: string;            // 人間向け表示名
  url: string;              // 取得元 URL
  extractor: ExtractorKind; // 使うプロンプト種別
  produces: ProducesKind[]; // このソースから出るエンティティ種別
  enabled: boolean;         // 一時的に止めたい時 false
  notes?: string;
};

export type RegistryFile = {
  version: number; // 現在は 1
  sources: RegistrySource[];
};

export type ExtractorKind =
  | "card"          // 単一カード詳細
  | "jal-tokuyaku"  // JAL 特約店リスト系
  | "point-partner" // ポイントカード加盟店系
  | "payment-app";  // 決済アプリ詳細

export type ProducesKind =
  | "cards"
  | "storeRules"
  | "categoryRules"
  | "stores"
  | "loyaltyRules"
  | "paymentApps";

// ===========================================================
// Layer 1: Extracted (Gemini 出力)
// ===========================================================

// 1ソース 1ファイル: sources/extracted/<sourceId>.json
export type ExtractedSource = {
  sourceId: string;
  sourceUrl: string;
  fetchedAt: string;       // ISO8601
  promptVersion: string;   // 例: "card-v1.0"
  extractor: ExtractorKind;
  geminiModel: string;     // 例: "gemini-2.5-pro"
  notes?: string;          // Gemini からの自由コメント

  // 抽出されたエンティティ群 (extractor によって埋まる配列が変わる)
  cards?: ExtractedCard[];
  storeRules?: ExtractedStoreRule[];
  categoryRules?: ExtractedCategoryRule[];
  stores?: ExtractedStore[];
  loyaltyRules?: ExtractedLoyaltyRule[];
  paymentApps?: ExtractedPaymentApp[];
};

// 各抽出項目に必ず付くエビデンス・自己評価。
// confidence は computeConfidence() で機械的に算出する。
export type Evidence = {
  evidenceQuote: string;   // 元ページからの逐語引用 (必須)
  evidenceUrl?: string;    // 引用箇所のアンカー URL (任意)
  explicitness: number;    // 0.0 - 1.0  ページ記述の直接度 (1.0=直接記述、0.5=表組み解釈、0.2=推論)
  ambiguity: number;       // 0.0 - 1.0  言い回しの曖昧度 (0.0=一意、1.0=複数解釈可)
};

// (a) カード本体スペック
export type ExtractedCard = Evidence & {
  cardId: string;          // seed.ts の Card.id と一致させる
  // 以下、変更があるフィールドだけ Gemini に出させる (差分検出はスクリプト側)
  name?: string;
  grade?: string;
  defaultRate?: number;    // 0.01 = 1%
  defaultCurrencyId?: string;
};

// (b) 店舗別ルール
export type ExtractedStoreRule = Evidence & {
  cardId: string;
  storeId: string;         // seed.ts の Store.id と一致 (なければ stores[] にも追加)
  paymentAppId?: string;   // 特定の決済方法限定の場合のみ
  rate: number;
  currencyId: string;
  monthlyCapAmountYen?: number;
  notes?: string;
};

// (c) カテゴリ別ルール
export type ExtractedCategoryRule = Evidence & {
  cardId: string;
  category: string;        // 例: "JAL特約店"
  paymentAppId?: string;
  rate: number;
  currencyId: string;
  monthlyCapAmountYen?: number;
  notes?: string;
};

// 新規店舗 (e に紐づくが、店舗マスタ自体の追加)
export type ExtractedStore = Evidence & {
  storeId: string;         // 提案 slug。collision したらレビュー
  name: string;
  category?: string;
};

// (e)(f) ポイントカード加盟店ルール
export type ExtractedLoyaltyRule = Evidence & {
  pointCardId: string;     // seed.ts の PointCard.id
  storeId: string;
  rate: number;
  currencyId?: string;     // 通常は省略 (PointCard.currencyId と同じ)
  notes?: string;
};

// (i) 決済アプリ
export type ExtractedPaymentApp = Evidence & {
  paymentAppId: string;
  name?: string;
  defaultBonusRate?: number;
  defaultBonusCurrencyId?: string;
  chargeBased?: boolean;
  compatibleCardIds?: string[];
};

// ===========================================================
// Layer 2: Diff / Proposal output
// ===========================================================

// scripts/sync/diff-and-propose.ts の出力
// Path: sources/proposed-migrations.json
export type ProposalReport = {
  generatedAt: string;
  fromSeedVersion: number;
  toSeedVersion: number;
  autoApplicable: Proposal[];
  needsReview: Proposal[];
  summary: {
    autoApplicableCount: number;
    needsReviewCount: number;
    sourcesProcessed: number;
    sourcesFailed: number;
  };
};

export type Proposal =
  | AddRecordProposal
  | UpdateFieldProposal
  | DeleteProposal
  | ReferenceChangeProposal;

type ProposalBase = {
  sourceId: string;
  confidence: number;        // computeConfidence(evidence)
  evidence: Evidence;
  // needsReview 行きの理由 (autoApplicable には付かない)
  reviewReason?: ReviewReason;
};

export type ReviewReason =
  | "lowConfidence"        // confidence < 0.9
  | "rateDeltaTooLarge"    // pp 差が ±10pp 超
  | "rateRatioOutOfRange"  // 倍率が 0.5x〜2x の範囲外
  | "deletion"             // 削除提案
  | "referenceChange"      // 通貨・カード参照変更
  | "idCollision"          // 新規追加だが既存 ID と衝突
  | "multiSourceConflict"; // 複数ソースで同じフィールドが矛盾

export type AddRecordProposal = ProposalBase & {
  type: "addRecord";
  collection: CollectionName;
  record: Record<string, unknown>; // collection ごとに形が変わる
};

export type UpdateFieldProposal = ProposalBase & {
  type: "updateField";
  collection: CollectionName;
  id: string;
  field: string;
  from: unknown;
  to: unknown;
};

export type DeleteProposal = ProposalBase & {
  type: "delete";
  collection: CollectionName;
  id: string;
};

export type ReferenceChangeProposal = ProposalBase & {
  type: "referenceChange";
  collection: CollectionName;
  id: string;
  field: string; // "currencyId" / "cardId" / "paymentAppId"
  from: unknown;
  to: unknown;
};

// ===========================================================
// Helpers / thresholds
// ===========================================================

// confidence 合成。evidenceQuote が空なら強制的に低くする。
export function computeConfidence(ev: Evidence): number {
  const quote = ev.evidenceQuote?.trim() ?? "";
  if (quote.length === 0) return 0.3;
  const ex = clamp01(ev.explicitness);
  const am = clamp01(ev.ambiguity);
  return ex * (1 - am);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// === 自動マージ閾値 ===
// confidence: 0.9 以上で autoApplicable 候補
export const CONFIDENCE_AUTO_THRESHOLD = 0.9;

// rate 変動: pp (絶対値) と相対倍率 (比) の両方を見る
// from = 0.01 (1%), to = 0.05 (5%) → ppDelta = 0.04, ratio = 5.0
//   → ppDelta 0.04 は 0.10 以内、ratio 5.0 は 2.0 超 → 要レビュー
export const RATE_PP_LIMIT = 0.10;   // ±10 percentage points
export const RATE_RATIO_MIN = 0.5;   // 1/2 まで縮小は可
export const RATE_RATIO_MAX = 2.0;   // 2倍まで拡大は可

// rate 変動を判定 (自動マージ可否)
export type RateChangeJudgment = {
  ppDelta: number;   // 絶対値 pp 差 (符号付き、to - from)
  ratio: number;     // to / from (from が 0 の時は Infinity)
  withinPp: boolean;
  withinRatio: boolean;
  autoMergeable: boolean;
};

export function judgeRateChange(
  from: number,
  to: number,
): RateChangeJudgment {
  const ppDelta = to - from;
  const ratio = from === 0 ? (to === 0 ? 1 : Number.POSITIVE_INFINITY) : to / from;
  const withinPp = Math.abs(ppDelta) <= RATE_PP_LIMIT;
  const withinRatio = ratio >= RATE_RATIO_MIN && ratio <= RATE_RATIO_MAX;
  return {
    ppDelta,
    ratio,
    withinPp,
    withinRatio,
    autoMergeable: withinPp && withinRatio,
  };
}
