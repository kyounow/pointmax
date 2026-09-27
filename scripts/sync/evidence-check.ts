const EXCLUSION_PATTERNS = [
  /記載がない/,
  /記載なし/,
  /対象外/,
  /見送り/,
  /該当しない/,
  /該当する.{0,10}が見つか/,
  /確認できない/,
  /確認できず/,
];

export function detectSelfReportedExclusion(quote: string | undefined): boolean {
  if (!quote) return false;
  return EXCLUSION_PATTERNS.some((p) => p.test(quote));
}

// 日付主張 (validFrom/validTo) があるのに evidenceQuote に日付の根拠が無い場合を検知。
// Gemini が source ページに無い日付を hallucinate するのを防ぐ。
const DATE_EVIDENCE_PATTERNS = [
  /期間/,               // "ご利用期間" "実施期間" 等
  /\d{4}\s*年/,         // "2026年"
  /\d{4}\/\d{1,2}/,    // "2026/4" "2026/04/01"
  /\d{4}-\d{2}-\d{2}/, // ISO
  /\d+\s*月\s*\d+\s*日/, // "4月3日"
  /以降/,               // "○○以降" は開始日マーカ
  /まで/,               // "○○まで" は終了日マーカ
];

export function detectUnsupportedDateClaim(
  rule: { validFrom?: string; validTo?: string },
  evidenceQuote: string | undefined,
): boolean {
  if (!rule.validFrom && !rule.validTo) return false; // 日付主張なし
  if (!evidenceQuote) return true; // 日付主張あるが evidence なし → unsupported
  return !DATE_EVIDENCE_PATTERNS.some((p) => p.test(evidenceQuote));
}

// rate (還元率) があるのに evidenceQuote に数値根拠が無い場合を検知。
// Gemini が「最大◯◯ポイントプレゼント」のような曖昧なプレゼント企画文言から
// rate を hallucinate するのを防ぐ (detectUnsupportedDateClaim と対称)。
// 実害第1号: prog-d-pointcard-nojima-10000 (evidenceQuote「ノジマで最大10,000
// ポイントプレゼント」に rate 1% の根拠皆無、auto 通過・配信済み)。
const RATE_EVIDENCE_PATTERNS = [
  /\d+(\.\d+)?\s*[%％]/,                          // "3%" "1.5％"
  /\d+(\.\d+)?\s*倍/,                              // "20倍"
  /\d+\s*円.{0,12}?\d+\s*(ポイント|pt|P|マイル)/i, // "200円につき1ポイント" 等
];

export function detectUnsupportedRateClaim(
  rate: number | undefined,
  evidenceQuote: string | undefined,
): boolean {
  if (!rate || rate === 0) return false; // rate 不正は zeroOrInvalidRate の担当
  if (!evidenceQuote) return true; // rate 主張あるが evidence なし → unsupported
  return !RATE_EVIDENCE_PATTERNS.some((p) => p.test(evidenceQuote));
}

// ───────────────────────────────────────────────────────────────
// PR-0b-3 (Z3): キャンペーンの条件文言・ライフスタイル語の検知
// ───────────────────────────────────────────────────────────────
// record (rate / 期間 / 対象キー) では「上限」「対象商品」「一部店舗」「新規・年齢」「抽選」「EC 経由」を
// 表現できない。こうした条件付きキャンペーンを auto で取り込むと、全額に高率が乗る過大表示になる
// (2026-07〜09 の実事故: 吉野家 最大+20%、かっぱ寿司 最大10倍、ビックカメラ池袋店舗 +5%、
// モスバーガー 対象商品 3倍 / 5倍、PayPay セブン 対象おにぎり 最大30%、U18 最大2%)。
// 語彙は取りこぼしと誤検知の両方が起こる。campaign の auto 経路は autoMerge:false で休眠中なので、
// 解除 (d-pay / paypay の autoMerge を外す別 PR) の前に語彙を見直すこと。
// 次の語は誤検知するので入れない:『アプリ』単独 (「d払いアプリ」に当たる)、『EC』(英字列の中で当たる、例 SECOM)、
// 素の『限定』(membership の「この店舗限定」は店舗を特定する本質的な記述)。

/** 照合前の正規化 (NFKC: 全角英数・記号 → 半角、％ → % 等)。 */
export function normalizeForMatch(s: string): string {
  return s.normalize("NFKC");
}

// かな・漢字 (対象限定の「対象○○」の○○部分)
const KANA_KANJI = String.raw`[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー・]`;
// 漢字・カタカナ (支店名「池袋店」「新宿店舗」の地名部分)
const KANJI_KATAKANA = String.raw`[\p{Script=Han}\p{Script=Katakana}ー]`;

/** 条件文言の語彙。[label, pattern]。label は reviewDetail に出す。 */
export const CONDITIONAL_WORDING_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["最大", /最大|MAX/i],
  // 「対象商品」「対象おにぎり」「対象者」は拾い、「対象店舗」「対象期間」「対象カード」は拾わない
  [
    "対象限定",
    new RegExp(String.raw`対象(?!店|加盟店|期間|カード|のお店|の店舗)${KANA_KANJI}{1,10}`, "u"),
  ],
  ["一部商品", /一部の?(?:商品|メニュー|対象)/],
  ["ポイント利用", /ポイントを?(?:利用|使|払|で支払)/],
  [
    "店舗限定",
    new RegExp(
      String.raw`一部の?店舗|店舗限定|限定店舗|(?:店|店舗)のみ|${KANJI_KATAKANA}{2,}店舗?[】\]）)]`,
      "u",
    ),
  ],
  ["割引", /%\s*OFF|割引|値引|優待|クーポン/i],
  ["ユーザー状態", /新規|初回|はじめて|初めて|ランク|ステップ|ステージ|\d+\s*歳|学生/],
  // C2 (チャネル UI) が入るまでは EC 経由も条件扱い
  ["EC経由", /オンライン|ネット|通販|経由|モバイルオーダー|デリバリー/],
  ["抽選", /抽選|先着|当選|くじ/],
];

// 上限 (monthlyCapAmountYen) を持たないキャンペーンの「上限」文言 (上限額を record で表現できていない)
const CAP_WORDING = /上限|進呈上限|付与上限/;

/** 条件文言・ライフスタイル語の走査対象フィールド (この順に走査する)。 */
export type WordingFields = {
  name?: string;
  description?: string;
  conditions?: string;
  notes?: string;
  evidenceQuote?: string;
};

const WORDING_FIELD_ORDER = [
  "name",
  "description",
  "conditions",
  "notes",
  "evidenceQuote",
] as const satisfies readonly (keyof WordingFields)[];

/**
 * キャンペーンの条件文言を検知する。fields を name から順に走査し、最初の一致を
 * 『label:「一致語」@field』で返す (一致が無ければ null)。
 * hasCap が false (月上限が record に無い) のときだけ「上限 / 進呈上限 / 付与上限」も一致として扱う。
 */
export function detectConditionalWording(
  fields: WordingFields,
  hasCap: boolean,
): string | null {
  for (const field of WORDING_FIELD_ORDER) {
    const raw = fields[field];
    if (!raw) continue;
    const text = normalizeForMatch(raw);
    for (const [label, re] of CONDITIONAL_WORDING_PATTERNS) {
      const m = text.match(re);
      if (m) return `${label}:「${m[0]}」@${field}`;
    }
    if (!hasCap) {
      const m = text.match(CAP_WORDING);
      if (m) return `上限:「${m[0]}」@${field}`;
    }
  }
  return null;
}

// memory: feedback_pointmax_lifestyle_programs.md の禁止カテゴリ (給与振込 / 住宅ローン / 投資 / 保険 等の
// ライフスタイル条件付き還元は、cardIds 保有者全員に過大計算される)。本来 ongoing-program prompt で
// 除外済みだが、campaign extractor 経由で混入する場合の defense-in-depth。PR-3b の triage も再利用する。
export const LIFESTYLE_KEYWORDS: ReadonlyArray<string> = [
  "給与", "ボーナス振込",
  "住宅ローン",
  "外貨預金", "円預金", "預金残高",
  "投資", "証券", "NISA", "iDeCo", "SBI",
  "保険", "Vitality", "ヘルスケア",
  "カードローン", "リボ払い",
  "外貨積立",
  "家族ポイント", "人以上",
];

/**
 * ライフスタイル語を検知する。5 フィールド (name / description / conditions / notes / evidenceQuote) を
 * NFKC で連結して走査し、最初に見つかった語を『lifestyle:「語」』で返す (無ければ null)。
 */
export function detectLifestyleWording(fields: WordingFields): string | null {
  const text = normalizeForMatch(
    WORDING_FIELD_ORDER.map((f) => fields[f] ?? "").join(" "),
  );
  for (const kw of LIFESTYLE_KEYWORDS) {
    if (text.includes(normalizeForMatch(kw))) return `lifestyle:「${kw}」`;
  }
  return null;
}
