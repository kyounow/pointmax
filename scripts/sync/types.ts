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
  id: string;                       // ユニークなソース ID (slug)
  label: string;                    // 人間向け表示名
  url: string;                      // 取得元 URL
  extractor: ExtractorKind;         // 使うプロンプト種別
  produces: ProducesKind[];         // このソースから出るエンティティ種別
  extractionScope: ExtractionScope; // 抽出範囲 (店舗数が膨大なソース対策)
  enabled: boolean;                 // 一時的に止めたい時 false
  notes?: string;
};

export type RegistryFile = {
  version: number; // 現在は 1
  sources: RegistrySource[];
};

export type ExtractorKind =
  | "card"            // 単一カード詳細
  | "jal-tokuyaku"    // JAL 特約店リスト系
  | "point-partner"   // ポイントカード加盟店系
  | "payment-app"     // 決済アプリ詳細
  | "campaign"        // 期間限定キャンペーン一覧系 (loyaltyRules + validFrom/validTo)
  | "jcb-jpoint"      // JCB J-POINT パートナー (旧 Oki Doki ランド系、倍率階層別 programs + memberships)
  | "ongoing-program";// 常設優遇プログラム (validFrom/validTo を付けず、conditions に常時条件記述。jcb-jpoint の汎用版、銀行/カード会社の常設還元アップ等を抽出)

export type ProducesKind =
  | "cards"
  | "categoryRules"
  | "stores"
  | "loyaltyRules"
  | "paymentApps"
  | "programs"
  | "memberships";

// 抽出範囲。ローカル個店まで含めると膨大になるソース (JAL特約店、楽天加盟店等)
// で「チェーン店だけ拾う」を明示できるようにする。
//
//  - comprehensive  : 個店も含めて網羅的に抽出 (デフォルト)
//  - chains-only    : 全国/広域チェーンだけ抽出。地域店・1店舗業態は除外。
//                     既存登録済み店舗のキャンペーン/還元率変動は引き続き検知する。
//  - existing-only  : 新規追加はせず、既存エンティティの変更のみ検知。
export type ExtractionScope = "comprehensive" | "chains-only" | "existing-only";

// scope ごとに systemInstruction に prepend する追加指示
export const SCOPE_DIRECTIVES: Record<ExtractionScope, string> = {
  comprehensive: `## 抽出スコープ: comprehensive (網羅)
このソースは個店も含めて全件抽出する方針です。ページ上に明示された店舗は基本的に取り込んでください。
`,
  "chains-only": `## 抽出スコープ: chains-only (チェーン店のみ)
**重要**: このソースは個店数が膨大なため、抽出対象を**全国/広域チェーン店**に限定します。

### 新規追加対象 (stores[] に入れる):
- 全国チェーン (例: マクドナルド、ファミリーマート、ENEOS、ヤマダ電機)
- 主要広域チェーン (複数都道府県に展開している有名業態)

### 抽出対象外 (stores[] には入れない):
- 単一店舗の個人店、地元のみの飲食店、地域限定スーパー
- 「○○店」「△△支店」のような特定店舗指定
- そのチェーン名が PointMax 既存に**ない場合のみ追加候補**

### 対象外カテゴリ (PointMax は「店舗での支払いでポイント還元」用途)
以下のカテゴリ/業態は **stores[] に追加しないでください**:
- **金融** (銀行・証券・カードローン・キャッシング等)
- **保険** (生命保険・損害保険・自動車保険・共済等)
- **医療** (病院・クリニック・歯科・薬局のうち調剤専業)
- **ギャンブル** (パチンコ・パチスロ・競馬・競輪・宝くじ・トト等)
- **葬儀** (斎場・葬儀社・墓石・仏壇)
- **不動産 / 住宅** (賃貸契約・売買仲介・リフォーム契約等)
- **ネットサービスのみ** (実店舗を持たない web サービス、SaaS、サブスク登録窓口)
- **「サービス」「その他」「事業者」等の漠然カテゴリ** (具体的業態が判定できない場合)

判断に迷う場合:
- ドラッグストア(物販あり) → ✅ 対象
- 調剤専業の薬局 → ❌ 対象外
- ホテル・宿泊 → ✅ 対象 (滞在費の支払い対象)
- 旅行代理店 → ✅ 対象 (店頭契約)
- 通信キャリア → ✅ 対象 (機種購入・料金支払い)
- 電気・ガス会社 → ✅ 対象 (定常支払い)

### 既存店舗については引き続き全力でチェック
既に PointMax に登録済みの特約店/加盟店 (上記 INJECT で示した一覧) については、
還元率の変動・キャンペーン情報・廃止情報を**従来通り** storeRules / categoryRules / notes で報告してください。

迷ったら追加しない方向で。誤って大量の個店や対象外カテゴリを登録すると、後の運用で逆にノイズになります。

### 抽出件数の目安
- 1 ソースあたり **stores[] は最大 60 件まで**
- それ以上の加盟店が掲載されている場合、主要・知名度の高いチェーンを優先
- カットした分は notes に「総 N 件中 60 件抽出」と記載
- カテゴリ偏りに注意 (同カテゴリで 30 件入れるより、複数カテゴリにバランスよく)
`,
  "existing-only": `## 抽出スコープ: existing-only (既存エンティティのみ)
**重要**: このソースでは新規エンティティの追加は行いません (stores[] / cards[] 等の "新規追加" 用配列は空にしてください)。

抽出対象: 既存 PointMax エンティティ (INJECT で表示した一覧のもの) の
- 還元率変動
- 廃止/契約終了
- キャンペーンや条件変更
のみ、storeRules / categoryRules / notes 経由で報告してください。
`,
};

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
  programs?: ExtractedProgram[];      // v3+ 正準モデル (campaign extractor 等)
  memberships?: ExtractedMembership[]; // program ↔ store の M2M join
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

// (b) 店舗別ルール (legacy extractor I/O。card/jal-tokuyaku が出力。
// propose 層は消費しない=手動キュレ用情報。schema の storeRules item と対応。
// 方式B: legacy 配列は extractor I/O として温存するため型も schema と整合させる)
export type ExtractedStoreRule = Evidence & {
  cardId: string;
  storeId: string;
  paymentAppId?: string;
  rate: number;
  currencyId: string;
  monthlyCapAmountYen?: number;
  notes?: string;
  validFrom?: string;      // ISO date (YYYY-MM-DD). 公式ページに明示された開始日のみ。
  validTo?: string;        // ISO date (YYYY-MM-DD). 公式ページに明示された終了日のみ。
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
  validFrom?: string;      // ISO date (YYYY-MM-DD). 公式ページに明示された開始日のみ。
  validTo?: string;        // ISO date (YYYY-MM-DD). 公式ページに明示された終了日のみ。
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
  validFrom?: string;      // ISO date (YYYY-MM-DD). 公式ページに明示された開始日のみ。
  validTo?: string;        // ISO date (YYYY-MM-DD). 公式ページに明示された終了日のみ。
};

// (g) BenefitProgram (v3+ 正準モデル)。campaign extractor が期間限定
// プロモを programs[] として出力。schema の programs item と対応。
export type ExtractedProgram = Evidence & {
  programId: string;        // 提案 BenefitProgram.id (slug)
  name?: string;
  cardIds?: string[];       // クレカ保有要件 (OR)
  pointCardId?: string;     // 提示ポイントカード (loyalty 系)
  paymentAppId?: string;    // 特定 paymentApp 経由限定
  rate: number;             // 0.01 = 1%
  currencyId: string;
  bonusType?: "primary" | "addOn";
  validFrom?: string;       // ISO date (YYYY-MM-DD). 公式明示時のみ。
  validTo?: string;         // ISO date (YYYY-MM-DD). 公式明示時のみ。
  recurringDays?: number[]; // 曜日限定 (0=日..6=土)
  description?: string;
  officialUrl?: string;
  entryUrl?: string;        // エントリー/参加サイト URL (公式情報源 URL とは分離)
  conditions?: string;
  monthlyCapAmountYen?: number;
  notes?: string;
};

// (h) StoreProgramMembership: program ↔ store の M2M join
export type ExtractedMembership = Evidence & {
  programId: string;        // 既存 or 同抽出 programs[] の id
  storeId: string;          // 既存 or 同抽出 stores[] の id
  overrideRate?: number;
  overrideCurrencyId?: string;
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
  cardSpecificBonusRates?: {
    cardId: string;
    rate: number;
    currencyId?: string;
    notes?: string;
    validFrom?: string;  // ISO date (YYYY-MM-DD). 公式ページに明示された開始日のみ。
    validTo?: string;    // ISO date (YYYY-MM-DD). 公式ページに明示された終了日のみ。
  }[];
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
  | "lowConfidence"           // confidence < 0.9
  | "rateDeltaTooLarge"       // pp 差が ±10pp 超
  | "rateRatioOutOfRange"     // 倍率が 0.5x〜2x の範囲外
  | "deletion"                // 削除提案
  | "referenceChange"         // 通貨・カード参照変更
  | "idCollision"             // 新規追加だが既存 ID と衝突
  | "multiSourceConflict"     // 複数ソースで同じフィールドが矛盾
  | "excludedCategory"        // Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)
  | "userBlocked"             // src/state/seed-blocklist.ts でユーザが除外指定
  | "selfReportedExclusion"   // evidenceQuote に Gemini 自身による除外記述を検知
  | "unsupportedDateClaim"    // validFrom/validTo があるのに evidenceQuote に日付根拠がない
  | "zeroOrInvalidRate"       // rate=0 または未定義。Gemini が還元率を抽出できなかった疑い
  | "missingStoreBody"        // membership 提案だが、参照先 store 本体が seed 未存在 + 同 run autoApplicable にも無い (category cap 等で deferred 済の orphan を防止)
  | "missingProgramBody"      // membership 提案だが、参照先 program 本体が seed 未存在 + 同 run autoApplicable にも無い (proposePrograms の idCollision 強制 → membership だけ通過するケースを防止)
  | "storeAdditionsDisabled"  // 新規 store 追加を cron では行わない方針 (キャンペーン情報の獲得に注力)。proposeStores の出力は他の理由が無い場合この理由で needsReview に
  | "expiredCampaign"         // validTo + grace (30日) 経過済の campaign 削除提案。誤削除防止のため必ず人手レビュー
  | "safetyFailed";           // auto-merge 候補だが件数が maxAutoChangesPerRun を超えたため安全弁で降格

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
// Layer 3: Sync history (cron 自動マージの監査ログ)
// ===========================================================
// 自動マージされた変更を JSON + Markdown で時系列に蓄積し、
// アプリ内「更新履歴」タブと GitHub 上の閲覧の両方で参照する。
// scripts/sync/report.ts が cron 実行ごとに先頭追記する。
// 最新エントリーが先頭 (entries[0])、最大 SYNC_HISTORY_MAX_ENTRIES 件で truncate。

export type SyncHistorySourceCount = {
  sourceId: string;
  collection: string;
  count: number;
  /** registry.yaml の label (例: 「楽天ポイントカード 加盟店 (公式)」)。無ければ sourceId を fallback。 */
  sourceLabel?: string;
  /** collection の日本語表示 (例: 「提携店舗」)。無ければ collection slug を fallback。 */
  collectionLabel?: string;
};

export type SyncHistoryItem = {
  sourceId: string;
  collection: string;
  /** 日本語化された 1 行要約 (例: 「楽天ポイントカード提示 0.5% → 幸楽苑」)。ID が seed に無ければ slug fallback。 */
  summary: string;
  /** registry.yaml の label。app 表示用、fallback あり。 */
  sourceLabel?: string;
  /** collection の日本語表示。app 表示用、fallback あり。 */
  collectionLabel?: string;
};

export type SyncHistoryEntry = {
  /** JST 暦日 YYYY-MM-DD (cron 21:00 UTC = 翌 06:00 JST のずれ補正済み) */
  date: string;
  /** ProposalReport.generatedAt をそのまま継承 (ISO8601) */
  generatedAt: string;
  totalCount: number;
  /** 自動マージ全件の平均 confidence。0 件のときは null */
  avgConfidence: number | null;
  sourcesProcessed: number;
  bySource: SyncHistorySourceCount[];
  items: SyncHistoryItem[];
  /**
   * 当該 run の needsReview 集計 (PR #61 で追加)。
   * - total: needsReview の総件数
   * - byReason: reviewReason ごとの件数マップ (idCollision / lowConfidence /
   *   missingStoreBody / missingProgramBody / storeAdditionsDisabled 等)
   * - 履歴上の trend 可視化用 (例: 「先週 idCollision=14、今週 8」)
   * - 旧 entry には未設定 (optional、UI 側で fallback 表示)
   */
  reviewStats?: {
    total: number;
    byReason: Record<string, number>;
  };
  /** Backfill 時のみ設定 (PR 経由化後の新規エントリーには付かない) */
  commitSha?: string;
  /** PR 経由のエントリーには PR 番号を付与 (将来 workflow 側で書き込み) */
  prNumber?: number;
};

export type SyncHistoryFile = {
  version: 1;
  entries: SyncHistoryEntry[]; // newest first
};

/** 保持する履歴件数 (週 2 回 × 52 週 = 104。実質 1 年分) */
export const SYNC_HISTORY_MAX_ENTRIES = 104;

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

// === Policy B: 除外カテゴリ ===
// SCOPE_DIRECTIVES['chains-only'] でも Gemini に指示しているが、漏れた場合の
// defense-in-depth として Phase C (diff-and-propose) でも store の addRecord を
// 強制的に needsReview に振り分ける。
export const EXCLUDED_CATEGORIES = new Set<string>([
  "金融",
  "保険",
  "医療",
  "ギャンブル",
  "葬儀",
  "不動産",
  "住宅",
  "不動産・住宅",
  "ネットサービス",
  "サービス",        // 漠然カテゴリ
  "その他",           // 漠然カテゴリ
  "(未分類)",         // category 未設定で inject-prompt が補ったもの
]);

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
