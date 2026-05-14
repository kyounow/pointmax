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

/**
 * 内部マイグレーション metadata (e.g. "[v3 PR 2] BenefitProgram で評価: prog-...",
 * "旧 rule-... から移行 (v3 PR 2)", "v3 で ... 化 (旧 rule-...)") を notes から除去。
 *
 * これらは developer 向けの履歴情報で、エンドユーザの「メモ」表示としては
 * ノイズになるので UI 描画前にクリーンアップする。
 */
export function sanitizeNoteForDisplay(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const cleaned = notes
    // "[v3 PR 2] BenefitProgram で評価: prog-foo + prog-bar" 形式の説明文
    .replace(/\s*\[v\d+\s+PR\s+\d+\][^.。\n]*[.。]?/g, "")
    // "(v3 PR 2)" 形式の bare バージョンタグ
    .replace(/\s*[（(]\s*v\d+\s+PR\s+\d+\s*[）)]/g, "")
    // "旧 rule-foo から移行" / "旧 SEED_LOYALTY_RULES (xxx) から移行"
    .replace(
      /旧\s+[A-Za-z0-9_*\-]+(?:\s*\([^)]+\))?\s*\d*\s*件?\s*から移行/g,
      "",
    )
    // "v3 で ... 化 (旧 rule-xxx)"
    .replace(/v\d+\s*で\s*[^、,。\n]*?化(?:\s*\([^)]+\))?/g, "")
    // 連続する句読点を 1 つに圧縮
    .replace(/[、,]\s*[、,]/g, "、")
    .replace(/。\s*。/g, "。")
    // 先頭末尾の余白だけクリーンアップ (。 や 、 は文意のため残す)
    .replace(/^[\s,;]+/, "")
    .replace(/\s+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

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
