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
