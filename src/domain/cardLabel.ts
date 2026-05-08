import type { Card } from "./types";

// カード名 + グレードの統一表示。グレードが空なら名前のみ。
export function cardLabel(c: Card): string {
  return c.grade ? `${c.name} (${c.grade})` : c.name;
}
