// 統合された category 名のマップ「旧名 → 新名」
//
// 動作:
//   - src/state/seed.ts: ADDED_STORES の category を読み取り時に remap
//   - scripts/sync/diff-and-propose.ts: 新規 store の addRecord 提案でも remap
//     (sync 結果として seed-additions.ts に書かれる category も統合済みに)
//
// 追加方針:
//   2つ以上のカテゴリ名で同じ業態を指している、または PointMax の
//   分類粒度として細かすぎる場合のみここに追加。

export const CATEGORY_ALIASES: Record<string, string> = {
  // 「鉄道・交通」を「交通」に統合 (タクシー・電車・バス等を一括で扱う)
  "鉄道・交通": "交通",

  // 「本・電子書籍・新聞」「電子書籍」「書籍/ゲーム」を「書店」に統合
  "本・電子書籍・新聞": "書店",
  "電子書籍": "書店",
  "書籍/ゲーム": "書店",

  // 「ネット買取」「リサイクル/買取」を「買取」に統合
  "ネット買取": "買取",
  "リサイクル/買取": "買取",

  // 「エンターテイメント」を「エンタメ・チケット」に統合
  "エンターテイメント": "エンタメ・チケット",
};

// category 文字列を alias 適用後の名前で返す。alias が無ければ原文を返す。
export function resolveCategory(
  category: string | undefined,
): string | undefined {
  if (!category) return category;
  return CATEGORY_ALIASES[category] ?? category;
}
