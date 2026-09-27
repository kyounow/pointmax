/**
 * StoreRule.notes / LoyaltyRule.notes の自由テキストから
 * 重要な条件を抽出してチップ化する。
 *
 * パターン辞書 (拡張容易):
 *   - "要エントリー" → entry チップ (赤)
 *   - 経由型・チャネル限定の語 (モバイルオーダー / オンライン入金 / オートチャージ / eGift /
 *     ネット限定 / オンライン限定 / 経由) → channel チップ (青、ラベル『{語}限定』、PR-0a-2b)
 *   - "上限\s*N\s*(pt|円|ポイント)" → cap チップ (黄、額付き)
 *   - "上限あり" / "上限\s*\d+" → cap チップ (黄)
 *   - "対象外" → exclusion チップ (灰)
 *   - "限定" → limited チップ (青) ※channel チップが出たら抑止 (同じ「限定」の言い直しのため)
 *
 * 同じ kind は 1 件まで (deduplicate)。表示の優先順と件数予算は
 * src/domain/warningChips.ts の rankWarningChips が決める (CalcResultCard)。
 */

export type NoteChipKind = "entry" | "channel" | "cap" | "exclusion" | "limited";

// PR-0a-2b (M3): 経由型・チャネル限定の語。最初に現れた語をラベル『{語}限定』にする。
// 「ネット」「オンライン」は直後が「限定」のときだけ (「オンラインストアは対象外」等を拾わない)。
// 「オンライン入金」は「オンライン(?=限定)」より前に置いて優先させる。
const CHANNEL_WORD_RE =
  /モバイルオーダー|オンライン入金|オートチャージ|eGift|ネット(?=限定)|オンライン(?=限定)|経由/;

/**
 * 複数の条件文 (program.notes / program.conditions / membership.notes 等) を 1 本にまとめる
 * (PR-0a-2b)。undefined・空白だけの文と重複を除き、" / " で連結する。全て空なら undefined。
 */
export function joinNoteTexts(
  ...parts: ReadonlyArray<string | undefined>
): string | undefined {
  const out: string[] = [];
  for (const p of parts) {
    const t = p?.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out.length > 0 ? out.join(" / ") : undefined;
}

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
      /旧\s+[A-Za-z0-9_*-]+(?:\s*\([^)]+\))?\s*\d*\s*件?\s*から移行/g,
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

  const channelMatch = notes.match(CHANNEL_WORD_RE);
  if (channelMatch) {
    push("channel", `${channelMatch[0]}限定`);
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
  // PR-0a-2b: channel チップ (『モバイルオーダー限定』等) が出たら汎用の『限定条件』は出さない。
  if (!channelMatch && /限定|のみ(?!の|に)/.test(notes)) {
    push("limited", "限定条件");
  }

  return chips;
}
