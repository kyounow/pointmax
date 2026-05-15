import type { BenefitProgram, StoreProgramMembership } from "../domain/types";

// PointMax v3: BenefitProgram の seed データ。
// PR 1: JAL特約店 1 件
// PR 2: 旧 StoreRule / LoyaltyRule / PaymentApp.cardSpecificBonusRates 全件を移行
//   A. StoreRule 系 11 件 (SMBC 7% / Olive 8% / 楽天市場 / JAL Suica / ビューカード / メルカード / d払い×ビックカメラ)
//   B. LoyaltyRule 系 10 件 (pointCard × rate group で集約)
//   C. PaymentApp 系 11 件 (defaultBonusRate → primary / cardSpecificBonusRates → addOn)
export const SEED_BENEFIT_PROGRAMS: BenefitProgram[] = [
  // ═══════════════════════════════════════════════════════════════
  // PR 1: JAL特約店
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // PR 2 A: StoreRule 系
  // ═══════════════════════════════════════════════════════════════

  // A-1: 楽天カード × 楽天市場 通常 3% (SPU 基本込み)
  {
    id: "prog-rakuten-ichiba-base",
    name: "楽天カード × 楽天市場 通常",
    cardIds: ["rakuten-card"],
    rate: 0.03,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    description: "楽天カード × 楽天市場 通常 + SPU 基本 = 3%",
    notes: "旧 rule-rakuten-ichiba から移行 (v3 PR 2)",
  },

  // A-2: 楽天カード × 楽天市場「5と0のつく日」4% (recurringDays)
  {
    id: "prog-rakuten-ichiba-zero-five-day",
    name: "楽天市場「5と0のつく日」",
    cardIds: ["rakuten-card"],
    rate: 0.04,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    validFrom: "2020-01-01",
    recurringDays: [5, 10, 15, 20, 25, 30],
    description: "楽天市場「5と0のつく日」+1% (毎月 5/10/15/20/25/30 日)",
    notes:
      "5と0のつく日 (毎月 5/10/15/20/25/30) のみ、要エントリー。SPU 基本 +2% 込みで実質 +4% 還元。" +
      "旧 rule-rakuten-ichiba-zero-five-day から移行 (v3 PR 2)",
  },

  // A-3: SMBC ゴールド(NL) × タッチ決済 7% (22 stores)
  {
    id: "prog-smbc-7p",
    name: "三井住友ゴールド(NL) Visa タッチ決済 7%",
    cardIds: ["smbc-v"],
    paymentAppId: "pa-visa-touch",
    rate: 0.07,
    currencyId: "v-pt",
    bonusType: "primary",
    validFrom: "2023-04-03",
    description:
      "SMBC ゴールド(NL) Visa/Master タッチ決済 + スマホ利用で 7% Vポイント還元",
    notes: "旧 rule-smbc-* 22 件から移行 (v3 PR 2)",
  },

  // A-4: Olive × タッチ決済 8% (22 stores)
  {
    id: "prog-olive-8p",
    name: "Oliveフレキシブルペイ スマホタッチ決済 8%",
    cardIds: ["olive"],
    paymentAppId: "pa-visa-touch",
    rate: 0.08,
    currencyId: "v-pt",
    bonusType: "primary",
    validFrom: "2023-04-03",
    description:
      "Oliveフレキシブルペイ スマホタッチ決済で 8% Vポイント還元 (smbc-v 7% + Olive 連携 +1%)",
    notes: "旧 rule-olive-* 22 件から移行 (v3 PR 2)",
  },

  // A-5: JALカードSuica × Suicaチャージ 1.5% JRE POINT
  {
    id: "prog-jal-suica-charge",
    name: "JALカードSuica × Suicaチャージ",
    cardIds: ["jal-suica"],
    rate: 0.015,
    currencyId: "jre",
    bonusType: "primary",
    description: "JALカードSuica (ビューカード機能) × Suicaチャージで 1.5% JRE POINT",
    notes: "旧 rule-jal-suica-charge から移行 (v3 PR 2)",
  },

  // A-6: JALカードSuica × えきねっと新幹線 8%
  {
    id: "prog-jal-suica-ekinet-shinkansen",
    name: "JALカードSuica × えきねっと新幹線eチケット",
    cardIds: ["jal-suica"],
    rate: 0.08,
    currencyId: "jre",
    bonusType: "primary",
    description: "ビューカード会員 新幹線eチケット 8% JRE POINT 還元",
    notes: "旧 rule-jal-suica-ekinet-shinkansen から移行 (v3 PR 2)",
  },

  // A-7: JALカードSuica × えきねっと在来線 5%
  {
    id: "prog-jal-suica-ekinet-zairaisen",
    name: "JALカードSuica × えきねっと在来線特急",
    cardIds: ["jal-suica"],
    rate: 0.05,
    currencyId: "jre",
    bonusType: "primary",
    description: "ビューカード会員 在来線チケットレス特急券 5% JRE POINT 還元",
    notes: "旧 rule-jal-suica-ekinet-zairaisen から移行 (v3 PR 2)",
  },

  // A-8: ビューカード × Suicaチャージ 1.5%
  {
    id: "prog-viewcard-suica-charge",
    name: "ビューカード × Suicaチャージ",
    cardIds: ["viewcard"],
    rate: 0.015,
    currencyId: "jre",
    bonusType: "primary",
    description: "ビューカード スタンダード × Suica オートチャージ/モバイルチャージで 1.5% JRE POINT",
    notes: "旧 rule-viewcard-suica-charge から移行 (v3 PR 2)",
  },

  // A-9: メルカード × メルカリ 4% (定常最大)
  {
    id: "prog-mercard-mercari",
    name: "メルカード × メルカリ",
    cardIds: ["mercard"],
    rate: 0.04,
    currencyId: "mercari-pt",
    bonusType: "primary",
    description: "メルカリ内お買い物で最大 4% メルカリポイント還元 (利用額連動、定常最大)",
    notes: "旧 rule-mercard-mercari から移行 (v3 PR 2)",
  },

  // A-10: メルカード × メルカリ 毎月8日 8%
  {
    id: "prog-mercard-mercari-day8",
    name: "メルカード × メルカリ 毎月8日",
    cardIds: ["mercard"],
    rate: 0.08,
    currencyId: "mercari-pt",
    bonusType: "primary",
    recurringDays: [8],
    description: "メルカード毎月8日: メルカリ内お買い物で 8% 還元 (常設)",
    notes: "旧 rule-mercard-mercari-day8 から移行 (v3 PR 2)",
  },

  // A-11: dカード × d払い × ビックカメラ 6% 期間限定 (2026/5/16〜5/31)
  {
    id: "prog-dcard-bic-camera-may2026",
    name: "d払い × dカード × ビックカメラ +5% キャンペーン",
    cardIds: ["dcard"],
    paymentAppId: "pa-d-pay",
    rate: 0.06,
    currencyId: "d-pt",
    bonusType: "primary",
    validFrom: "2026-05-16",
    validTo: "2026-05-31",
    description: "d払い+5% ビックカメラ限定キャンペーン (要エントリー、進呈上限 2000pt)",
    officialUrl:
      "https://service.smt.docomo.ne.jp/keitai_payment/campaign/dpay_biccamera_260507_7487/",
    monthlyCapAmountYen: 40000, // 2000pt ÷ 0.05
    notes: "旧 rule-dcard-bic-camera-d-pay-202605 から移行 (v3 PR 2)",
  },

  // ═══════════════════════════════════════════════════════════════
  // PR 2 B: LoyaltyRule 系 (pointCard × rate group で集約)
  // ═══════════════════════════════════════════════════════════════

  // B-1: 楽天ポイントカード 0.5% (複数店舗)
  {
    id: "prog-rakuten-pointcard-0.5pc",
    name: "楽天ポイントカード提示 0.5%",
    pointCardId: "rakuten-pointcard",
    rate: 0.005,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    description: "楽天ポイントカード提示で 200円=1pt (0.5%) 還元",
    notes: "旧 SEED_LOYALTY_RULES + ADDED_LOYALTY_RULES (rakuten-pointcard 0.5%) から移行 (v3 PR 2)",
  },

  // B-2: 楽天ポイントカード 1% (複数店舗)
  {
    id: "prog-rakuten-pointcard-1pc",
    name: "楽天ポイントカード提示 1%",
    pointCardId: "rakuten-pointcard",
    rate: 0.01,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    description: "楽天ポイントカード提示で 100円=1pt (1%) 還元",
    notes: "旧 SEED_LOYALTY_RULES (rakuten-pointcard 1%) から移行 (v3 PR 2)",
  },

  // B-3: dポイントカード 0.5% (複数店舗)
  {
    id: "prog-d-pointcard-0.5pc",
    name: "dポイントカード提示 0.5%",
    pointCardId: "d-pointcard",
    rate: 0.005,
    currencyId: "d-pt",
    bonusType: "primary",
    description: "dポイントカード提示で 200円=1pt (0.5%) 還元",
    notes: "旧 SEED_LOYALTY_RULES (d-pointcard 0.5%) から移行 (v3 PR 2)",
  },

  // B-4: dポイントカード 1% (複数店舗)
  {
    id: "prog-d-pointcard-1pc",
    name: "dポイントカード提示 1%",
    pointCardId: "d-pointcard",
    rate: 0.01,
    currencyId: "d-pt",
    bonusType: "primary",
    description: "dポイントカード提示で 100円=1pt (1%) 還元",
    notes: "旧 SEED_LOYALTY_RULES (d-pointcard 1%) から移行 (v3 PR 2)",
  },

  // B-5: Pontaカード 0.5% (複数店舗)
  {
    id: "prog-ponta-card-0.5pc",
    name: "Pontaカード提示 0.5%",
    pointCardId: "ponta-card",
    rate: 0.005,
    currencyId: "ponta-pt",
    bonusType: "primary",
    description: "Pontaカード提示で 200円=1pt (0.5%) 還元",
    notes: "旧 SEED_LOYALTY_RULES (ponta-card 0.5%) から移行 (v3 PR 2)",
  },

  // B-6: Pontaカード 1% (複数店舗)
  {
    id: "prog-ponta-card-1pc",
    name: "Pontaカード提示 1%",
    pointCardId: "ponta-card",
    rate: 0.01,
    currencyId: "ponta-pt",
    bonusType: "primary",
    description: "Pontaカード提示で 100円=1pt (1%) 還元",
    notes: "旧 ADDED_LOYALTY_RULES (ponta-card 1%) から移行 (v3 PR 2)",
  },

  // B-7: Vポイントカード 0.5% (複数店舗)
  {
    id: "prog-vpoint-card-0.5pc",
    name: "Vポイントカード提示 0.5%",
    pointCardId: "vpoint-card",
    rate: 0.005,
    currencyId: "v-pt",
    bonusType: "primary",
    description: "Vポイントカード(旧Tカード)提示で 200円=1pt (0.5%) 還元",
    notes: "旧 SEED_LOYALTY_RULES (vpoint-card 0.5%) から移行 (v3 PR 2)",
  },

  // B-8: nanacoカード 1% (セブン-イレブン)
  {
    id: "prog-nanaco-card-1pc",
    name: "nanacoカード提示 1%",
    pointCardId: "nanaco-card",
    rate: 0.01,
    currencyId: "nanaco-pt",
    bonusType: "primary",
    description: "nanacoカード提示で 100円=1pt (1%) 還元 (電子マネー支払い時)",
    notes: "旧 SEED_LOYALTY_RULES (nanaco-card 1%) から移行 (v3 PR 2)",
  },

  // B-9: WAONカード 0.5% (複数店舗)
  {
    id: "prog-waon-card-0.5pc",
    name: "WAONカード提示 0.5%",
    pointCardId: "waon-card",
    rate: 0.005,
    currencyId: "waon-pt",
    bonusType: "primary",
    description: "WAONカード提示で 200円=1pt (0.5%) 還元",
    notes: "旧 SEED_LOYALTY_RULES (waon-card 0.5%) から移行 (v3 PR 2)",
  },

  // B-10: JRE POINT カード 0.5% (駅ナカ加盟店)
  {
    id: "prog-jre-pointcard-0.5pc",
    name: "JRE POINT カード提示 0.5%",
    pointCardId: "jre-pointcard",
    rate: 0.005,
    currencyId: "jre",
    bonusType: "primary",
    description: "JRE POINT カード提示で 200円(税抜)=1pt (0.5%) 還元 (駅ナカ加盟店)",
    notes: "旧 SEED_LOYALTY_RULES (jre-pointcard 0.5%) 8 件から移行 (v3 PR 2)",
  },

  // ═══════════════════════════════════════════════════════════════
  // PR 2 C: PaymentApp 系 (defaultBonusRate → primary / cardSpecificBonusRates → addOn)
  // ═══════════════════════════════════════════════════════════════

  // C-1: 楽天Pay ベース還元 1% (全 store、primary)
  {
    id: "prog-rakuten-pay-base",
    name: "楽天Pay ベース還元",
    paymentAppId: "pa-rakuten-pay",
    rate: 0.01,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    description: "楽天Pay 利用で 1% 楽天ポイント還元 (誰でも)",
    notes: "旧 pa-rakuten-pay.defaultBonusRate=0.01 から移行 (v3 PR 2)",
  },

  // C-2: 楽天Pay × 楽天カード 上乗せ 0.5% (addOn)
  {
    id: "prog-rakuten-pay-rakuten-card-addon",
    name: "楽天Pay × 楽天カード 上乗せ",
    paymentAppId: "pa-rakuten-pay",
    cardIds: ["rakuten-card"],
    rate: 0.005,
    currencyId: "rakuten-pt",
    bonusType: "addOn",
    description: "楽天カード経由チャージで +0.5% 上乗せ (楽天Pay 1% と合わせて 1.5%)",
    notes: "旧 pa-rakuten-pay.cardSpecificBonusRates[rakuten-card] から移行 (v3 PR 2)",
  },

  // C-3: d払い ベース還元 0.5% (全 store、primary)
  {
    id: "prog-d-pay-base",
    name: "d払い ベース還元",
    paymentAppId: "pa-d-pay",
    rate: 0.005,
    currencyId: "d-pt",
    bonusType: "primary",
    description: "d払い利用で 0.5% dポイント還元 (誰でも、200円=1pt)",
    notes: "旧 pa-d-pay.defaultBonusRate=0.005 から移行 (v3 PR 2)",
  },

  // C-4: d払い × dカード 上乗せ 0.5% (addOn)
  {
    id: "prog-d-pay-dcard-addon",
    name: "d払い × dカード 上乗せ",
    paymentAppId: "pa-d-pay",
    cardIds: ["dcard"],
    rate: 0.005,
    currencyId: "d-pt",
    bonusType: "addOn",
    description: "dカード設定で +0.5% 上乗せ (d払い 0.5% と合わせて 1.0%)",
    notes: "旧 pa-d-pay.cardSpecificBonusRates[dcard] から移行 (v3 PR 2)",
  },

  // C-5: PayPay ベース還元 0.5% (全 store、primary)
  {
    id: "prog-paypay-base",
    name: "PayPay ベース還元",
    paymentAppId: "pa-paypay",
    rate: 0.005,
    currencyId: "paypay",
    bonusType: "primary",
    description: "PayPay 残高払いで 0.5% PayPayポイント還元 (誰でも)",
    notes: "旧 pa-paypay.defaultBonusRate=0.005 から移行 (v3 PR 2)",
  },

  // C-6: PayPay × PayPayカード 上乗せ 0.5% (addOn)
  {
    id: "prog-paypay-card-addon",
    name: "PayPay × PayPayカード 上乗せ",
    paymentAppId: "pa-paypay",
    cardIds: ["paypay-card"],
    rate: 0.005,
    currencyId: "paypay",
    bonusType: "addOn",
    description: "PayPayクレジット連携で +0.5% 上乗せ (PayPay 0.5% と合わせて 1.0%)",
    notes: "旧 pa-paypay.cardSpecificBonusRates[paypay-card] から移行 (v3 PR 2)",
  },

  // C-7: au PAY ベース還元 0.5% (全 store、primary)
  {
    id: "prog-au-pay-base",
    name: "au PAY ベース還元",
    paymentAppId: "pa-au-pay",
    rate: 0.005,
    currencyId: "ponta-pt",
    bonusType: "primary",
    description: "au PAY コード支払いで 0.5% Pontaポイント還元 (誰でも)",
    notes: "旧 pa-au-pay.defaultBonusRate=0.005 から移行 (v3 PR 2)",
  },

  // C-8: au PAY × au PAYカード 上乗せ 1% (addOn)
  {
    id: "prog-au-pay-card-addon",
    name: "au PAY × au PAYカード 上乗せ",
    paymentAppId: "pa-au-pay",
    cardIds: ["au-pay-card"],
    rate: 0.01,
    currencyId: "ponta-pt",
    bonusType: "addOn",
    description: "au PAYカードからチャージで +1% 上乗せ (au PAY 0.5% と合わせて 1.5%)",
    notes: "旧 pa-au-pay.cardSpecificBonusRates[au-pay-card] から移行 (v3 PR 2)",
  },

  // C-9: ファミペイ ベース還元 0.5% (全 store、primary)
  {
    id: "prog-famipay-base",
    name: "ファミペイ ベース還元",
    paymentAppId: "pa-famipay",
    rate: 0.005,
    currencyId: "edy",
    bonusType: "primary",
    description: "ファミペイ支払いで 0.5% FamiPayボーナス還元 (誰でも)",
    notes: "旧 pa-famipay.defaultBonusRate=0.005 から移行 (v3 PR 2)",
  },

  // C-10: ファミペイ × ファミマカード 上乗せ 0.5% (addOn)
  {
    id: "prog-famima-card-addon",
    name: "ファミペイ × ファミマカード 上乗せ",
    paymentAppId: "pa-famipay",
    cardIds: ["famima-card"],
    rate: 0.005,
    currencyId: "edy",
    bonusType: "addOn",
    description: "ファミマカード経由チャージで +0.5% 上乗せ (ファミペイ 0.5% と合わせて 1.0%)",
    notes: "旧 pa-famipay.cardSpecificBonusRates[famima-card] から移行 (v3 PR 2)",
  },

  // C-11: メルペイ × メルカード 上乗せ 1% (addOn)
  // ※ メルペイ defaultBonusRate=0 なので primary program は不要
  {
    id: "prog-merpay-mercard-addon",
    name: "メルペイ × メルカード 上乗せ",
    paymentAppId: "pa-merpay",
    cardIds: ["mercard"],
    rate: 0.01,
    currencyId: "mercari-pt",
    bonusType: "addOn",
    description: "メルカード連携時 +1% 上乗せ (メルペイ単体は 0%)",
    notes: "旧 pa-merpay.cardSpecificBonusRates[mercard] から移行 (v3 PR 2)",
  },
];

// 店舗 × プログラムの加盟関係 (M2M)
// PR 1: JAL特約店 12 件
// PR 2: 上記 Programs の memberships を大幅追加 (合計 200+ 件)
export const SEED_STORE_PROGRAM_MEMBERSHIPS: StoreProgramMembership[] = [
  // ═══════════════════════════════════════════════════════════════
  // PR 1: JAL特約店 加盟店 12 件
  // ═══════════════════════════════════════════════════════════════
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
  { programId: "prog-jal-tokuyaku", storeId: "conv-familymart" },

  // ═══════════════════════════════════════════════════════════════
  // PR 2 A: StoreRule 系 memberships
  // ═══════════════════════════════════════════════════════════════

  // A-1: 楽天カード × 楽天市場 通常
  { programId: "prog-rakuten-ichiba-base", storeId: "rakuten-ichiba" },

  // A-2: 楽天市場「5と0のつく日」
  { programId: "prog-rakuten-ichiba-zero-five-day", storeId: "rakuten-ichiba" },

  // A-3: SMBC 7% タッチ決済 22 stores
  { programId: "prog-smbc-7p", storeId: "conv-7eleven" },
  { programId: "prog-smbc-7p", storeId: "conv-lawson" },
  { programId: "prog-smbc-7p", storeId: "mcdonalds" },
  { programId: "prog-smbc-7p", storeId: "conv-ministop" },
  { programId: "prog-smbc-7p", storeId: "sukiya" },
  { programId: "prog-smbc-7p", storeId: "saizeriya" },
  { programId: "prog-smbc-7p", storeId: "gusto" },
  { programId: "prog-smbc-7p", storeId: "doutor" },
  { programId: "prog-smbc-7p", storeId: "starbucks" },
  { programId: "prog-smbc-7p", storeId: "mos-burger" },
  { programId: "prog-smbc-7p", storeId: "kfc" },
  { programId: "prog-smbc-7p", storeId: "yoshinoya" },
  { programId: "prog-smbc-7p", storeId: "bamiyan" },
  { programId: "prog-smbc-7p", storeId: "jonathan" },
  { programId: "prog-smbc-7p", storeId: "yumetoan" },
  { programId: "prog-smbc-7p", storeId: "hamazushi" },
  { programId: "prog-smbc-7p", storeId: "cocos" },
  { programId: "prog-smbc-7p", storeId: "excelsior-cafe" },
  { programId: "prog-smbc-7p", storeId: "kappa-sushi" },
  { programId: "prog-smbc-7p", storeId: "shabuyo" },
  { programId: "prog-smbc-7p", storeId: "seicomart" },
  { programId: "prog-smbc-7p", storeId: "poplar" },

  // A-4: Olive 8% スマホタッチ決済 22 stores (SMBC と同じ店舗)
  { programId: "prog-olive-8p", storeId: "conv-7eleven" },
  { programId: "prog-olive-8p", storeId: "conv-lawson" },
  { programId: "prog-olive-8p", storeId: "mcdonalds" },
  { programId: "prog-olive-8p", storeId: "conv-ministop" },
  { programId: "prog-olive-8p", storeId: "sukiya" },
  { programId: "prog-olive-8p", storeId: "saizeriya" },
  { programId: "prog-olive-8p", storeId: "gusto" },
  { programId: "prog-olive-8p", storeId: "doutor" },
  { programId: "prog-olive-8p", storeId: "starbucks" },
  { programId: "prog-olive-8p", storeId: "mos-burger" },
  { programId: "prog-olive-8p", storeId: "kfc" },
  { programId: "prog-olive-8p", storeId: "yoshinoya" },
  { programId: "prog-olive-8p", storeId: "bamiyan" },
  { programId: "prog-olive-8p", storeId: "jonathan" },
  { programId: "prog-olive-8p", storeId: "yumetoan" },
  { programId: "prog-olive-8p", storeId: "hamazushi" },
  { programId: "prog-olive-8p", storeId: "cocos" },
  { programId: "prog-olive-8p", storeId: "excelsior-cafe" },
  { programId: "prog-olive-8p", storeId: "kappa-sushi" },
  { programId: "prog-olive-8p", storeId: "shabuyo" },
  { programId: "prog-olive-8p", storeId: "seicomart" },
  { programId: "prog-olive-8p", storeId: "poplar" },

  // A-5: JALカードSuica × Suicaチャージ
  { programId: "prog-jal-suica-charge", storeId: "suica-charge" },

  // A-6: JALカードSuica × えきねっと新幹線
  { programId: "prog-jal-suica-ekinet-shinkansen", storeId: "ekinet-shinkansen" },

  // A-7: JALカードSuica × えきねっと在来線
  { programId: "prog-jal-suica-ekinet-zairaisen", storeId: "ekinet-zairaisen" },

  // A-8: ビューカード × Suicaチャージ
  { programId: "prog-viewcard-suica-charge", storeId: "suica-charge" },

  // A-9: メルカード × メルカリ
  { programId: "prog-mercard-mercari", storeId: "mercari" },

  // A-10: メルカード × メルカリ 毎月8日
  { programId: "prog-mercard-mercari-day8", storeId: "mercari" },

  // A-11: dカード × d払い × ビックカメラ 期間限定
  { programId: "prog-dcard-bic-camera-may2026", storeId: "bic-camera" },

  // ═══════════════════════════════════════════════════════════════
  // PR 2 B: LoyaltyRule 系 memberships
  // ═══════════════════════════════════════════════════════════════

  // B-1: 楽天ポイントカード 0.5% memberships
  // SEED_LOYALTY_RULES から
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "conv-familymart" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "gusto" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "seiyu" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "tsuruha" },
  // ADDED_LOYALTY_RULES から (rakuten-pointcard 0.5%)
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "kfc" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "bamiyan" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "shabuyo" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "jonathan" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "yumetoan" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "aiya" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "grazie-gardens" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "sukiya" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "hamazushi" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "cocos" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "big-boy" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "hanaya-yohei" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "royal-host" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "yoshinoya" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "coco-ichibanya" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "daily-yamazaki" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "poplar" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "beisia" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "kaldi-coffee-farm" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "commodi-iida" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "ooga-yakkyoku" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "hands" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "golf-five" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "alpen-mountains" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "alpen-outdoors" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "kojitsu-sanso" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "joshin" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "edion" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "kojima" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "angie" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "maruzen-junkudo-shoten" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "gyokukodo" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "super-kids-land" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "ari-san-hikkoshi" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "sakai-hikkoshi" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "heart-hikkoshi" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "toku-taku" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "seagull-japan" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "haneda-airport-pet-hotel" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "pet-design" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "pet-land-peace-one" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "rakuten-mobile" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "apollo-station" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "eneos" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "enejet" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "enex-fleet" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "cosmo-oil" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "cygnus-oil" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "autobacs" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "a-pit-autobacs" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "j-net-rent-a-car" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "sky-rent-a-car" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "nippon-rent-a-car" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "cd-energy-direct-point-denki" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "kamei" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "tokyu-hotel" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "excel-hotel-tokyu" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "princess-cruises" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "hotel-keihan-chain" },
  // v3.5.0: Phase A 楽天 追加
  // welcia: ウエルシアは楽天ポイントカード加盟 (Sonnet 検証)
  // nico-pet: 公式 JSON にあるが storeId mismatch (`nicopet` → `nico-pet`) で漏れていた
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "welcia" },
  { programId: "prog-rakuten-pointcard-0.5pc", storeId: "nico-pet" },

  // B-2: 楽天ポイントカード 1% memberships
  { programId: "prog-rakuten-pointcard-1pc", storeId: "mcdonalds" },
  { programId: "prog-rakuten-pointcard-1pc", storeId: "doutor" },

  // B-3: dポイントカード 0.5% memberships
  { programId: "prog-d-pointcard-0.5pc", storeId: "conv-lawson" },
  { programId: "prog-d-pointcard-0.5pc", storeId: "conv-familymart" },
  { programId: "prog-d-pointcard-0.5pc", storeId: "sukiya" },
  { programId: "prog-d-pointcard-0.5pc", storeId: "eneos" },
  { programId: "prog-d-pointcard-0.5pc", storeId: "gusto" },
  { programId: "prog-d-pointcard-0.5pc", storeId: "takashimaya" },
  // v3.5.0: Phase A 高信頼度追加 (Sonnet + Gemini 両方が支持)
  { programId: "prog-d-pointcard-0.5pc", storeId: "yoshinoya" },
  { programId: "prog-d-pointcard-0.5pc", storeId: "welcia" },
  { programId: "prog-d-pointcard-0.5pc", storeId: "tsuruha" },

  // B-4: dポイントカード 1% memberships
  { programId: "prog-d-pointcard-1pc", storeId: "mcdonalds" },
  { programId: "prog-d-pointcard-1pc", storeId: "matsukiyo" },
  { programId: "prog-d-pointcard-1pc", storeId: "nojima" },
  { programId: "prog-d-pointcard-1pc", storeId: "cocokara" },

  // B-5: Pontaカード 0.5% memberships
  { programId: "prog-ponta-card-0.5pc", storeId: "conv-lawson" },
  { programId: "prog-ponta-card-0.5pc", storeId: "sukiya" },
  { programId: "prog-ponta-card-0.5pc", storeId: "idemitsu" },
  // v3.5.0: Phase 2 Ponta 拡張 (Gemini が示唆、Sonnet が store 存在を確認)
  { programId: "prog-ponta-card-0.5pc", storeId: "kfc" },
  { programId: "prog-ponta-card-0.5pc", storeId: "doutor" },
  { programId: "prog-ponta-card-0.5pc", storeId: "joshin" },
  { programId: "prog-ponta-card-0.5pc", storeId: "apollo-station" },

  // B-6: Pontaカード 1% memberships (ADDED_LOYALTY_RULES)
  { programId: "prog-ponta-card-1pc", storeId: "jalannet" },
  { programId: "prog-ponta-card-1pc", storeId: "hotpepper-beauty" },
  { programId: "prog-ponta-card-1pc", storeId: "hotpepper-gourmet" },
  { programId: "prog-ponta-card-1pc", storeId: "jalan-golf" },
  { programId: "prog-ponta-card-1pc", storeId: "jal-rentacar" },

  // B-7: Vポイントカード 0.5% memberships
  { programId: "prog-vpoint-card-0.5pc", storeId: "conv-familymart" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "welcia" },
  // v3.5.0: Phase 2 V 拡張
  // 飲食大手 (旧Tポイント時代からの主要加盟先)
  { programId: "prog-vpoint-card-0.5pc", storeId: "yoshinoya" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "sukiya" },
  // すかいらーくグループ
  { programId: "prog-vpoint-card-0.5pc", storeId: "gusto" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "jonathan" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "shabuyo" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "yumetoan" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "bamiyan" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "aiya" },
  // ゼンショーグループ
  { programId: "prog-vpoint-card-0.5pc", storeId: "cocos" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "hamazushi" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "big-boy" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "hanaya-yohei" },
  // 家電・書店・GS
  { programId: "prog-vpoint-card-0.5pc", storeId: "edion" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "tsutaya" },
  { programId: "prog-vpoint-card-0.5pc", storeId: "eneos" },

  // B-8: nanacoカード 1% memberships
  // 注: nanaco は「カード提示で貯まる loyalty」と「電子マネー決済で貯まる」の
  // 2 モードがある。ここは loyalty (提示で貯まる) 加盟店のみ = セブン&アイグループ。
  // 「電子マネーとして使えるだけ」の店 (吉野家・マック等) はここに入れない。
  // 電子マネー支払側の還元は将来 PaymentApp として nanaco をモデル化する別議題。
  { programId: "prog-nanaco-card-1pc", storeId: "conv-7eleven" },

  // B-9: WAONカード 0.5% memberships
  // 注: WAON も nanaco と同じく loyalty / 電子マネー の 2 モードがある。
  // ここは loyalty (提示で貯まる) 加盟店のみ = イオングループ系。
  // ウエルシアはイオングループ傘下のドラッグなので loyalty 加盟。
  // ファミマ・ローソン・ガスト・吉野家・ビックカメラ・コスモ石油は WAON 電子マネー
  // 決済は可能だが loyalty 提示加盟ではないため除外。
  { programId: "prog-waon-card-0.5pc", storeId: "aeon" },
  { programId: "prog-waon-card-0.5pc", storeId: "conv-ministop" },
  // v3.5.0: WAON loyalty 拡張 (カード提示でポイントが貯まる加盟店)
  // - welcia: イオン系ドラッグ、WAON POINT 提示加盟 (確認済)
  // - tsuruha: 提示・支払どちらでも WAON POINT 加盟 (Gemini 検証で確認)
  // - cosmo-oil: 提示のみで WAON POINT 加盟 (e-money 支払では貯まらないので注意)
  { programId: "prog-waon-card-0.5pc", storeId: "welcia" },
  { programId: "prog-waon-card-0.5pc", storeId: "tsuruha" },
  { programId: "prog-waon-card-0.5pc", storeId: "cosmo-oil" },

  // B-10: JRE POINT カード 0.5% memberships (8 件)
  { programId: "prog-jre-pointcard-0.5pc", storeId: "newdays" },
  { programId: "prog-jre-pointcard-0.5pc", storeId: "kiosk" },
  { programId: "prog-jre-pointcard-0.5pc", storeId: "acure" },
  { programId: "prog-jre-pointcard-0.5pc", storeId: "ecute" },
  { programId: "prog-jre-pointcard-0.5pc", storeId: "gransta" },
  { programId: "prog-jre-pointcard-0.5pc", storeId: "atre" },
  { programId: "prog-jre-pointcard-0.5pc", storeId: "lumine" },
  { programId: "prog-jre-pointcard-0.5pc", storeId: "newoman" },

  // ═══════════════════════════════════════════════════════════════
  // PR 2 C: PaymentApp 系 memberships
  // PaymentApp 系 programs は membership 無し = 全 store 適用 (global program)
  // → memberships なし (空のまま)
  // ═══════════════════════════════════════════════════════════════
];
