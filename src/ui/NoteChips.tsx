import { useState } from "react";
import { extractNoteChips, type NoteChip } from "../domain/noteParser";

const CHIP_ICONS: Record<NoteChip["kind"], string> = {
  entry: "🔔",
  cap: "💎",
  exclusion: "🚫",
  limited: "🗓",
};

type Props = {
  notes?: string;
};

/**
 * notes フィールドから重要条件をチップ化して表示。
 * 加えて [詳細] ボタンで全 notes を展開可能。
 */
export function NoteChips({ notes }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!notes) return null;
  const chips = extractNoteChips(notes);
  return (
    <span className="note-chips">
      {chips.map((c) => (
        <span
          key={c.kind}
          className={`note-chip note-chip-${c.kind}`}
          title={notes}
        >
          {CHIP_ICONS[c.kind]} {c.label}
        </span>
      ))}
      <button
        type="button"
        className="note-chip-detail"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        title="この rule の notes 全文"
      >
        {expanded ? "▴ 閉じる" : "ⓘ 詳細"}
      </button>
      {expanded && (
        <div className="note-chip-full">
          📋 {notes}
        </div>
      )}
    </span>
  );
}
