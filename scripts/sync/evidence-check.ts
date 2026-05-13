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
