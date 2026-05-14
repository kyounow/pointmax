/**
 * StoreRule.notes / LoyaltyRule.notes の自由テキストから
 * 重要な条件を抽出してチップ化する。
 *
 * パターン辞書 (拡張容易):
 *   - "要エントリー" → entry チップ (赤)
 *   - "上限\s*N\s*(pt|円|ポイント)" → cap チップ (黄、額付き)
 *   - "上限あり" / "上限\s*\d+" → cap チップ (黄)
 *   - "対象外" → exclusion チップ (灰)
 *   - "限定" → limited チップ (青) ※他で取れた場合は重複排除
 *
 * 同じ kind は 1 件まで (deduplicate)。
 */

export type NoteChipKind = "entry" | "cap" | "exclusion" | "limited";

export type NoteChip = {
  kind: NoteChipKind;
  label: string;  // 表示文字 (例: "要エントリー", "上限 2000pt")
};

export function extractNoteChips(notes: string | undefined): NoteChip[] {
  if (!notes) return [];
  const chips: NoteChip[] = [];
  const seen = new Set<NoteChipKind>();

  const push = (kind: NoteChipKind, label: string) => {
    if (seen.has(kind)) return;
    seen.add(kind);
    chips.push({ kind, label });
  };

  if (/要エントリー|エントリー必須/.test(notes)) {
    push("entry", "要エントリー");
  }

  // 上限の額がパターンに含まれてれば付加、なければ「上限あり」
  const capMatch = notes.match(/上限\s*(\d+(?:,\d{3})*)\s*(pt|ポイント|円)/);
  if (capMatch) {
    push("cap", `上限 ${capMatch[1]}${capMatch[2]}`);
  } else if (/上限/.test(notes)) {
    push("cap", "上限あり");
  }

  if (/対象外|除外/.test(notes)) {
    push("exclusion", "対象外あり");
  }

  // 「○○限定」「○○のみ」は限定チップ。「対象外」既に取れた場合はスキップしない (異種扱い)
  if (/限定|のみ(?!の|に)/.test(notes)) {
    push("limited", "限定条件");
  }

  return chips;
}
