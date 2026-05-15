import { useState } from "react";
import {
  extractNoteChips,
  sanitizeNoteForDisplay,
} from "../domain/noteParser";

type Props = {
  notes?: string;
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

export function NoteChips({ notes }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cleaned = sanitizeNoteForDisplay(notes);
  if (!cleaned) return null;
  const chips = extractNoteChips(cleaned);
  // chip も詳細もない (= 取り立てて表示する内容がない) ときは何も出さない
  if (chips.length === 0 && cleaned.length < 4) return null;
  // chips で十分カバーできている短い notes ではボタンを出さない。
  // chips が無いときはボタンが notes 全文を見る唯一の手段なので残す。
  const showDetailButton =
    chips.length === 0 || cleaned.length > NOTE_DETAIL_THRESHOLD;
  return (
    <span className="note-chips">
      {chips.map((c) => (
        <span
          key={c.kind}
          className={`note-chip note-chip-${c.kind}`}
          title={cleaned}
        >
          {c.label}
        </span>
      ))}
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
