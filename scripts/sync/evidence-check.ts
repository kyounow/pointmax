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
