// 店舗カテゴリの語彙 (PR-4a)。seed() の stores が使う category 名の正本と、抽出時の alias。
//
// ⚠ アプリ (src の UI / domain / store) からは import しない。読むのは scripts/sync
//   (propose の unknownCategory・inject-prompt の INJECT:categories) と seed.test などの契約テストだけで、
//   main chunk には入らない (0 B)。vite.config.ts の manualChunks の seed-data 判定
//   (`/src/state/seed-data-` / `/src/state/seed-additions`) にも当たらない。
//   アプリから import していないことは seed-categories.test が src を走査して検査する。
//   scripts (Node / tsx) からも読まれるので DOM API や import.meta.env を使わない。
//
// 語彙 (STORE_CATEGORIES):
//   - seed() の実測 36 名 (2026-09-28、SEED_VERSION 47。並びは店舗数の多い順)。
//     「汎用」は擬似店舗 general (PSEUDO_STORE_IDS) 専用の pseudo。
//   - 語彙の追加・改名は PR で行う。seed 契約 (seed().stores の category は全て語彙内、seed.test) と
//     propose の unknownCategory (語彙外・未設定の新規店は自動追加しない) が連動する。
//   - UI の並び順には影響しない (店舗画面のカテゴリ選択肢は名前順のまま、この配列を見ない)。
//   - pseudo は INJECT:categories で Gemini に見せず、新規店の category としても認めない。
//   - カテゴリの統合・改名 (C5b) は命名の決定後に別 PR で行う。
//
// alias (旧名 → 正規名) は 2 層:
//   - CATEGORY_ALIASES (seed-category-aliases.ts、アプリも読む 7 組): seed-additions.ts に旧名のまま
//     残っている行を seed() が読み取り時に remap するためのもの。定義はそちらが正本で、ここでは
//     再 export するだけ (重複定義しない)。
//   - EXTRACTED_CATEGORY_ALIASES (ここ、アプリは読まない 8 組): Gemini 抽出の表記揺れ。propose が
//     addRecord の前に正規化するので seed-additions.ts には正規名で書かれ、seed() で remap する必要が無い。
//     旧名のまま seed-additions.ts に残る 5 行 (airbnb / princess-cruises / mercedes-benz /
//     hyundai-mobility-japan / kamei) は全て BLOCKED_STORE_IDS で seed() に出ない。BLOCKED の解除などで
//     旧名の行が seed() に出るようになったら、その組を CATEGORY_ALIASES 側へ移す (seed 契約が CI で落ちて気付ける)。
//   - 2 層のキーは互いに素、値は全て語彙内、値がキーに現れない (多段 alias 無し) を seed-categories.test で検査。
import { CATEGORY_ALIASES, resolveCategory } from "./seed-category-aliases";

export { CATEGORY_ALIASES, resolveCategory };

export type StoreCategoryDef = {
  name: string;
  /** 擬似店舗 (general) 専用。Gemini に語彙として見せず、新規店の category にも認めない。 */
  pseudo?: true;
};

export const STORE_CATEGORIES: readonly StoreCategoryDef[] = [
  { name: "飲食" },
  { name: "ドラッグストア" },
  { name: "書店" },
  { name: "ファッション" },
  { name: "スーパー" },
  { name: "コンビニ" },
  { name: "スポーツ" },
  { name: "百貨店" },
  { name: "駅ナカ" },
  { name: "車・バイク" },
  { name: "ネット通販" },
  { name: "ガソリンスタンド" },
  { name: "家電量販店" },
  { name: "美容" },
  { name: "メガネ" },
  { name: "音楽・映像" },
  { name: "旅行代理店" },
  { name: "雑貨" },
  { name: "電気・ガス" },
  { name: "ホテル" },
  { name: "ペット" },
  { name: "ホームセンター" },
  { name: "レンタカー" },
  { name: "コンタクト" },
  { name: "引越し" },
  { name: "交通" },
  { name: "通信" },
  { name: "買取" },
  { name: "エンタメ・チケット" },
  { name: "電子マネー" },
  { name: "カメラ・写真" },
  { name: "クリーニング" },
  { name: "生活サービス" },
  { name: "おもちゃ" },
  { name: "ビジネス・教育" },
  { name: "汎用", pseudo: true },
];

/** 語彙の全名前 (pseudo を含む 36 名)。seed 契約用。 */
export const STORE_CATEGORY_SET: ReadonlySet<string> = new Set(
  STORE_CATEGORIES.map((c) => c.name),
);

/** Gemini に語彙として見せ、新規店の category として認める名前 (pseudo を除く 35 名、語彙の並び順)。 */
export const EXTRACTABLE_STORE_CATEGORIES: readonly string[] = STORE_CATEGORIES.filter(
  (c) => !c.pseudo,
).map((c) => c.name);

const EXTRACTABLE_STORE_CATEGORY_SET: ReadonlySet<string> = new Set(
  EXTRACTABLE_STORE_CATEGORIES,
);

/** seed 契約用: 語彙内 (pseudo を含む) か。未設定は false。 */
export function isKnownStoreCategory(c: string | undefined): c is string {
  return c !== undefined && STORE_CATEGORY_SET.has(c);
}

/** propose 用: 新規店の category として認めるか (語彙内かつ pseudo でない)。未設定は false。 */
export function isExtractableStoreCategory(c: string | undefined): c is string {
  return c !== undefined && EXTRACTABLE_STORE_CATEGORY_SET.has(c);
}

// Gemini 抽出の表記揺れ → 正規名 (8 組)。propose (proposeStores) だけが使う。
export const EXTRACTED_CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  // たまるマーケットの抽出が化粧品・健康食品の EC を「美容・健康」にまとめる (2026-09-13 抽出で 11 件)
  "美容・健康": "美容",
  // J-POINT パートナーの抽出が書店・文具店を「書籍・文房具」にする (2026-09-13 抽出で 2 件)
  "書籍・文房具": "書店",
  // J-POINT パートナーの抽出がテーマパーク・レジャー施設を「レジャー・エンタメ」にする (2026-09-13 抽出で 3 件)
  "レジャー・エンタメ": "エンタメ・チケット",
  // 家具・インテリア雑貨の店は語彙では雑貨に寄せる (家具だけの独立カテゴリは作らない)
  "家具・インテリア": "雑貨",
  // 宿泊予約・宿泊施設はホテルに寄せる (seed-additions の旧行 airbnb = BLOCKED が「宿泊」)
  宿泊: "ホテル",
  // 旅行予約・ツアーは旅行代理店に寄せる (seed-additions の旧行 princess-cruises = BLOCKED が「旅行」)
  旅行: "旅行代理店",
  // 自動車販売・整備は車・バイクに寄せる (seed-additions の旧行 mercedes-benz 等 = BLOCKED が「自動車」)
  自動車: "車・バイク",
  // 電力・ガス会社は電気・ガスに寄せる (seed-additions の旧行 kamei = BLOCKED が「エネルギー」)
  エネルギー: "電気・ガス",
};

/** 全 alias (seed() が読み取り時に使う 7 組 + 抽出時の 8 組)。契約テストと resolveExtractedCategory 用。 */
export const ALL_CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  ...CATEGORY_ALIASES,
  ...EXTRACTED_CATEGORY_ALIASES,
};

/**
 * propose 用: 抽出された category を正規名にする (抽出時の 8 組 → seed() と同じ 7 組の順に引く)。
 * alias が無ければ原文を返し、未設定は undefined のまま (unknownCategory で review に回る)。
 */
export function resolveExtractedCategory(
  category: string | undefined,
): string | undefined {
  if (!category) return category;
  return EXTRACTED_CATEGORY_ALIASES[category] ?? resolveCategory(category);
}
