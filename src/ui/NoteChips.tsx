import { useState } from "react";
import {
  extractNoteChips,
  sanitizeNoteForDisplay,
  type NoteChipKind,
} from "../domain/noteParser";

type Props = {
  /** 詳細ボタンで全文を展開できる notes (program.notes 等)。 */
  notes?: string;
  /**
   * PR-0a-2b (M3): チップの抽出元 (省略時は notes)。CalcResultCard の primary 行は
   * joinNoteTexts(prog.notes, prog.conditions, membership.notes) を渡す。
   * notes 以外 (conditions / membership.notes) 由来の部分は、チップが 1 件以上のときだけ描画し、
   * 詳細ボタン・全文展開の対象にはしない (最頻出の結果カードに新要素を増やさないため)。
   */
  chipNotes?: string;
  /**
   * PR-0a-2b: 描画してよいチップの kind (rankWarningChips で警告予算内に残ったもの)。
   * 省略時は抽出した全チップを描画する (CalcLoyaltyBanner 等の従来呼び出し)。
   */
  visibleKinds?: ReadonlySet<NoteChipKind>;
};

/**
 * notes フィールドから重要条件をチップ化して表示。
 * 加えて [詳細] ボタンで全 notes を展開可能。
 *
 * 内部マイグレーション metadata (旧 rule-... から移行 / [v3 PR 2] ...) は
 * sanitizeNoteForDisplay で除去してから扱う。
 *
 * v3.2.x: A 案 = 絵文字撤廃。色違いバッジ (note-chip-{kind}) + テキストのみで識別。
 * スマホでの行高ブレを抑え、横幅をコンパクトに保つ。
 *
 * v3.3.x: chips が出ていて notes が短い (= chips で言い切れている) ときは
 * [詳細] ボタンを抑制。chips が無いときは notes 全文を見る唯一の手段なので
 * 必ずボタンを残す。
 */
const NOTE_DETAIL_THRESHOLD = 40;

export function NoteChips({ notes, chipNotes, visibleKinds }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cleaned = sanitizeNoteForDisplay(notes);
  const chipSource =
    chipNotes === undefined ? cleaned : sanitizeNoteForDisplay(chipNotes);
  const extracted = extractNoteChips(chipSource);
  const chips = visibleKinds
    ? extracted.filter((c) => visibleKinds.has(c.kind))
    : extracted;
  const chipNodes = chips.map((c) => (
    <span
      key={c.kind}
      className={`note-chip note-chip-${c.kind}`}
      title={chipSource}
    >
      {c.label}
    </span>
  ));
  if (!cleaned) {
    // notes 無し: conditions / membership.notes 由来のチップだけ (1 件以上のときのみ、詳細なし)
    return chipNodes.length > 0 ? (
      <span className="note-chips">{chipNodes}</span>
    ) : null;
  }
  // chip も詳細もない (= 取り立てて表示する内容がない) ときは何も出さない
  if (chips.length === 0 && cleaned.length < 4) return null;
  // chips で十分カバーできている短い notes ではボタンを出さない。
  // notes 自身から取れたチップが 1 件も描画されないときは、ボタンが notes 全文を見る
  // 唯一の手段なので残す (chipNotes / visibleKinds 未指定なら従来の chips.length === 0 と同じ)。
  const ownKinds = new Set(extractNoteChips(cleaned).map((c) => c.kind));
  const showDetailButton =
    !chips.some((c) => ownKinds.has(c.kind)) ||
    cleaned.length > NOTE_DETAIL_THRESHOLD;
  return (
    <span className="note-chips">
      {chipNodes}
      {showDetailButton && (
        <button
          type="button"
          className="note-chip-detail"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          title="メモを表示"
        >
          {expanded ? "閉じる" : "詳細"}
        </button>
      )}
      {expanded && showDetailButton && (
        <div className="note-chip-full">{cleaned}</div>
      )}
    </span>
  );
}
