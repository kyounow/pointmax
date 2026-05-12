import { useState, type ReactNode } from "react";

export type ColumnDef<T> = {
  key: string;
  label: string;
  // 通常表示
  view: (row: T) => ReactNode;
  // 編集モード時の入力UI (省略時は view と同じ表示で編集不可)
  edit?: (
    draft: T,
    set: (patch: Partial<T>) => void,
  ) => ReactNode;
  // セルの幅 (任意)
  width?: number | string;
};

type Props<T extends { id: string }> = {
  rows: T[];
  columns: ColumnDef<T>[];
  // 保存時のコールバック (差分のみのパッチが渡される)
  onSave?: (id: string, patch: Partial<T>) => void;
  // 削除時のコールバック (省略時は削除ボタン非表示)
  onDelete?: (id: string) => void;
  // 行ごとの削除可否。省略時は onDelete が定義されていれば全行削除可能。
  // 偽を返した行は削除ボタン非表示 (編集モード時の「削除」ボタンも、view モードの onSave 無しケースの「削除」ボタンも両方に適用)。
  canDelete?: (row: T) => boolean;
  // 行ごとの追加アクション (削除以外、view/edit 両方で表示)
  extraActions?: (row: T) => ReactNode;
  // 全行が編集不可なら true (操作列が出ない)
  readOnly?: boolean;
  empty?: string;
  // ID prefix (テーブル複数並ぶ画面で衝突回避用)
  testId?: string;
};

export function ResponsiveTable<T extends { id: string }>({
  rows,
  columns,
  onSave,
  onDelete,
  canDelete,
  extraActions,
  readOnly,
  empty = "まだありません",
  testId,
}: Props<T>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<T | null>(null);

  const startEdit = (row: T) => {
    setEditingId(row.id);
    setDraft({ ...row });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };
  const saveEdit = (original: T) => {
    if (!draft) return;
    if (onSave) {
      // diff 計算: 値が変わったキーだけ送る
      const patch: Partial<T> = {};
      (Object.keys(draft) as (keyof T)[]).forEach((k) => {
        if (draft[k] !== original[k]) {
          patch[k] = draft[k];
        }
      });
      if (Object.keys(patch).length > 0) onSave(original.id, patch);
    }
    cancelEdit();
  };
  const setField = (patch: Partial<T>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const hasActions = !readOnly && (onSave || onDelete || extraActions);

  return (
    <div className="responsive-table" data-testid={testId}>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
            {hasActions && <th style={{ width: 130 }}>操作</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isEditing = editingId === row.id;
            const display = isEditing && draft ? draft : row;
            const deletable = !canDelete || canDelete(display);
            return (
              <tr key={row.id} className={isEditing ? "row-editing" : ""}>
                {columns.map((c) => (
                  <td key={c.key} data-label={c.label}>
                    <div className="cell-content">
                      {isEditing && c.edit
                        ? c.edit(display, setField)
                        : c.view(display)}
                    </div>
                  </td>
                ))}
                {hasActions && (
                  <td data-label="操作" className="row-actions-cell">
                    <div className="row-actions">
                      {isEditing ? (
                        <>
                          <button
                            className="primary"
                            onClick={() => saveEdit(row)}
                          >
                            保存
                          </button>
                          <button onClick={cancelEdit}>キャンセル</button>
                          {onDelete && deletable && (
                            <button
                              className="danger"
                              onClick={() => {
                                onDelete(row.id);
                                cancelEdit();
                              }}
                              title="この行を削除"
                            >
                              削除
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {onSave && (
                            <button onClick={() => startEdit(row)}>
                              編集
                            </button>
                          )}
                          {extraActions && extraActions(row)}
                          {!onSave && onDelete && deletable && (
                            <button
                              className="danger"
                              onClick={() => onDelete(row.id)}
                            >
                              削除
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (hasActions ? 1 : 0)}
                className="empty"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
