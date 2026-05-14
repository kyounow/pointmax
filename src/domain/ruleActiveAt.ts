// キャンペーン期間判定の共通ヘルパ。
// StoreRule / LoyaltyRule の validFrom / validTo / recurringDays を受け取り、
// 指定時刻にそのルールがアクティブかを返す。
//
// 仕様:
//   - validFrom / validTo はどちらも optional (ISO date 文字列 "YYYY-MM-DD")
//   - 両方未指定 → 常時アクティブ (キャンペーン無しの通常ルール)
//   - validFrom のみ指定 → その日以降ずっとアクティブ
//   - validTo のみ指定 → その日まで (23:59:59 末まで含む)
//   - 両方指定 → 区間 [validFrom 00:00, validTo 23:59:59] にあればアクティブ
//   - validTo が validFrom より前など不正データは active=false (安全側)
//   - recurringDays: 今日 (1〜31) がリスト内にない場合は非アクティブ
//     validFrom/validTo の範囲チェックと AND で結合される

type WithValidWindow = {
  validFrom?: string;
  validTo?: string;
  recurringDays?: number[];
};

export function isRuleActiveAt(
  rule: WithValidWindow,
  now: Date = new Date(),
): boolean {
  const t = now.getTime();
  if (rule.validFrom) {
    const from = parseDateStart(rule.validFrom);
    if (from === null || t < from) return false;
  }
  if (rule.validTo) {
    const to = parseDateEnd(rule.validTo);
    if (to === null || t > to) return false;
  }
  // recurringDays: 今日 (1〜31) がリスト内にない場合は非アクティブ
  if (rule.recurringDays && rule.recurringDays.length > 0) {
    const day = now.getDate();
    if (!rule.recurringDays.includes(day)) return false;
  }
  return true;
}

// 期間・recurringDays を人間が読みやすい文字列に整形する共通フォーマッタ。
// RulesScreen / CampaignsScreen / PaymentAppsScreen で共用。
export function formatRulePeriod(rule: {
  validFrom?: string;
  validTo?: string;
  recurringDays?: number[];
}): string {
  const parts: string[] = [];
  if (rule.validFrom) parts.push(`${rule.validFrom}〜`);
  if (rule.validTo) parts.push(`〜${rule.validTo}`);
  if (rule.recurringDays && rule.recurringDays.length > 0) {
    parts.push(`毎月 ${rule.recurringDays.join("/")} 日`);
  }
  return parts.length > 0 ? parts.join(" ") : "常時";
}

// "YYYY-MM-DD" を当日の 00:00:00 (ローカル時刻) として返す
function parseDateStart(s: string): number | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    0,
    0,
    0,
    0,
  );
  return d.getTime();
}

// "YYYY-MM-DD" を当日の 23:59:59.999 として返す
function parseDateEnd(s: string): number | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    23,
    59,
    59,
    999,
  );
  return d.getTime();
}
