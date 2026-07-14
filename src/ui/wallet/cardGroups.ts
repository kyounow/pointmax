// クレカセクションの family グルーピング (純関数)。
// WalletCardsSection.tsx から分離 — react-refresh/only-export-components
// (component ファイルは component のみ export) を満たすため & 単体テスト用。
import type { Card, CardFamily } from "../../domain/types";

// クレカセクションの表示ブロック。family に属するカードは 1 グループにまとめ、
// family を持たないカードは連続分を 1 テーブル (従来どおりの単独行) に束ねる。
export type CardGroupBlock =
  | { kind: "family"; familyId: string; family: CardFamily; cards: Card[] }
  | { kind: "singles"; cards: Card[] };

// カード配列を family グループ / 単独行ブロックへ整理する。
//   - family あり (かつ families に実在) は familyId 単位でまとめ、初出位置を維持。
//     グループ内はグレード順 (gradeLevel 昇順、未設定は 0 扱い) にソート。
//   - family なし / 未知 familyId は「単独行」。連続する単独行は 1 ブロックに merge する
//     (テーブルヘッダの重複を抑えるため)。
export function buildCardGroups(
  cards: Card[],
  families: CardFamily[],
): CardGroupBlock[] {
  const familyById = new Map(families.map((f) => [f.id, f]));
  const blocks: CardGroupBlock[] = [];
  const familyBlockIndex = new Map<string, number>();

  for (const card of cards) {
    const fam = card.familyId ? familyById.get(card.familyId) : undefined;
    if (card.familyId && fam) {
      const idx = familyBlockIndex.get(card.familyId);
      if (idx != null) {
        (blocks[idx] as Extract<CardGroupBlock, { kind: "family" }>).cards.push(
          card,
        );
      } else {
        familyBlockIndex.set(card.familyId, blocks.length);
        blocks.push({
          kind: "family",
          familyId: card.familyId,
          family: fam,
          cards: [card],
        });
      }
    } else {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "singles") last.cards.push(card);
      else blocks.push({ kind: "singles", cards: [card] });
    }
  }

  for (const b of blocks) {
    if (b.kind === "family") {
      b.cards.sort((a, c) => (a.gradeLevel ?? 0) - (c.gradeLevel ?? 0));
    }
  }
  return blocks;
}
