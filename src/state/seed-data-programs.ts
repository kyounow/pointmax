import type { BenefitProgram, StoreProgramMembership } from "../domain/types";

// PointMax v3: BenefitProgram の seed データ。
// PR 1 では JAL特約店 1 件のみ。次の PR 2 で SMBC 7% / Olive 8% / Loyalty / cardSpecificBonusRates 等を順次追加。
export const SEED_BENEFIT_PROGRAMS: BenefitProgram[] = [
  {
    id: "prog-jal-tokuyaku",
    name: "JALカード特約店",
    cardIds: ["jal-suica", "jal-card"],
    rate: 0.02,
    currencyId: "jal-mile",
    bonusType: "primary",
    description:
      "JALカード ショッピングマイル・プレミアム加入時、特約店で 100円=2 マイル (通常の 2 倍)",
    conditions:
      "JALカード ショッピングマイル・プレミアム (年会費 4,950円) 加入要。" +
      "CLUB-A 系は自動付帯。100円=2 マイル積算。",
    officialUrl: "https://www.jal.co.jp/jp/ja/jalcard/service/tokuyakuten/",
    notes: "v3 で JAL特約店 category を program 化 (旧 rule-jal-suica-tokuyaku / rule-jal-card-tokuyaku)",
  },
];

// 店舗 × プログラムの加盟関係 (M2M)
// PR 1 では JAL特約店 加盟店 12 件 (旧 category="JAL特約店" だった 11 stores + familymart)
export const SEED_STORE_PROGRAM_MEMBERSHIPS: StoreProgramMembership[] = [
  // JAL特約店 (旧 rule-jal-suica-tokuyaku を category="JAL特約店" で適用してた 11 stores)
  { programId: "prog-jal-tokuyaku", storeId: "eneos" },
  { programId: "prog-jal-tokuyaku", storeId: "idemitsu" },
  { programId: "prog-jal-tokuyaku", storeId: "welcia" },
  { programId: "prog-jal-tokuyaku", storeId: "matsukiyo" },
  { programId: "prog-jal-tokuyaku", storeId: "kinokuniya" },
  { programId: "prog-jal-tokuyaku", storeId: "aeon" },
  { programId: "prog-jal-tokuyaku", storeId: "daimaru-matsuzakaya" },
  { programId: "prog-jal-tokuyaku", storeId: "muji" },
  { programId: "prog-jal-tokuyaku", storeId: "uniqlo" },
  { programId: "prog-jal-tokuyaku", storeId: "royal-host" },
  { programId: "prog-jal-tokuyaku", storeId: "tsuruha" },
  // familymart (旧 rule-jal-suica-familymart / rule-jal-card-familymart の個別 storeRule 統合)
  { programId: "prog-jal-tokuyaku", storeId: "conv-familymart" },
];
