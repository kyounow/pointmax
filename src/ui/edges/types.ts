// EdgesScreen 配下で共有する型定義。
// EdgesScreen.tsx (orchestrator) と edges/*.tsx (子コンポネ) の循環参照を避けるため、
// 共有の型はこの中立な場所に置く。

/**
 * グラフ上で何が選択されているか。
 * node: 通貨ノードを選択 → NodeDetailPanel に関連ルート一覧を表示
 * edge: 交換エッジを選択 → EdgeDetailPanel に rate/notes 編集 UI を表示
 * null: 未選択 (全体表示モード)
 */
export type Selection =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | null;
