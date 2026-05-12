import { useEffect, useMemo, useRef, useState } from "react";
import { groupBy } from "../domain/groupBy";
import type { Store } from "../domain/types";

type Props = {
  stores: Store[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  // 表示ラベルの prefix。例: "店舗" → "店舗 (3店舗選択中)"
  label?: string;
  // 何も選んでない時のラベル
  emptyLabel?: string;
};

// 複数店舗を選択するためのポップオーバー UI。
// - トグルボタンを押すとカテゴリ別 checkbox リストが開く
// - 文字列検索で絞り込み
// - カテゴリ単位の「全選択 / 全解除」
// - 外側クリック / Esc で閉じる
export function MultiStorePicker({
  stores,
  selected,
  onChange,
  label = "店舗",
  emptyLabel = "選択",
}: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLSpanElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? stores.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.category ?? "").toLowerCase().includes(q),
        )
      : stores;
    return groupBy(filtered, (s) => s.category ?? "その他");
  }, [stores, filter]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const toggleCategoryAll = (items: Store[]) => {
    const allSelected = items.every((s) => selected.has(s.id));
    const next = new Set(selected);
    if (allSelected) {
      for (const s of items) next.delete(s.id);
    } else {
      for (const s of items) next.add(s.id);
    }
    onChange(next);
  };

  const buttonLabel =
    selected.size > 0
      ? `${label} (${selected.size}店舗選択中)`
      : `${label} (${emptyLabel})`;

  return (
    <span className="multi-store-picker" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="multi-store-picker-toggle"
      >
        {buttonLabel} <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="multi-store-picker-panel">
          <div className="multi-store-picker-header">
            <input
              type="search"
              placeholder="絞り込み..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => onChange(new Set())}
              disabled={selected.size === 0}
            >
              全解除
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              閉じる
            </button>
          </div>
          <div className="multi-store-picker-list">
            {filteredGroups.length === 0 && (
              <div className="empty">ヒットなし</div>
            )}
            {filteredGroups.map((g) => {
              const allSelected =
                g.items.length > 0 && g.items.every((s) => selected.has(s.id));
              return (
                <div key={g.key} className="multi-store-picker-cat">
                  <div className="multi-store-picker-cat-head">
                    <strong>
                      {g.key} ({g.items.length})
                    </strong>
                    <button
                      type="button"
                      className="cat-toggle"
                      onClick={() => toggleCategoryAll(g.items)}
                    >
                      {allSelected ? "全解除" : "全選択"}
                    </button>
                  </div>
                  {g.items.map((s) => (
                    <label
                      key={s.id}
                      className="multi-store-picker-item"
                      title={s.name}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}
