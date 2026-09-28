// 統合された category 名のマップ「旧名 → 新名」
//
// 動作:
//   - src/state/seed.ts: 手書き店 (SEED_STORES、PR-4a から。既に正規名なので出力は不変) と
//     ADDED_STORES の category を読み取り時に remap
//   - scripts/sync/propose-helpers.ts: 新規 store の addRecord 提案でも remap
//     (sync 結果として seed-additions.ts に書かれる category も統合済みに)。
//     propose は seed-categories.ts の resolveExtractedCategory 経由で、抽出時だけの 8 組
//     (EXTRACTED_CATEGORY_ALIASES) を先に引いてからこのマップを引く
//
// 追加方針:
//   2つ以上のカテゴリ名で同じ業態を指している、または PointMax の
//   分類粒度として細かすぎる場合のみここに追加。
//   ここはアプリ (main chunk) にも入るので、seed-additions.ts に旧名のまま残っていて seed() が
//   remap する必要のある組だけを置く。Gemini 抽出の揺れだけの組は seed-categories.ts の
//   EXTRACTED_CATEGORY_ALIASES に置く (語彙と alias の全体像は seed-categories.ts を参照)。

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
// 自前のキーだけを引く (Object.hasOwn)。"constructor" 等のプロトタイプ名を alias と誤認しない。
export function resolveCategory(
  category: string | undefined,
): string | undefined {
  if (!category) return category;
  return Object.hasOwn(CATEGORY_ALIASES, category)
    ? CATEGORY_ALIASES[category]
    : category;
}
