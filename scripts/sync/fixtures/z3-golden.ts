// PR-0b-3 (Z3) の実事故ゴールデン fixture。z3-golden.test.ts が使う。
//
// ⚠ seed() に依存しない凍結 SeedShape を使う。cron が seed-additions を更新すると期待値が崩れ、
//   apply 後の safety gate (npm test) を落として auto batch 全体が巻き添えで降格するため。
// ⚠ ExtractedSource は git 履歴の sources/extracted/*.json から逐語で写した (programs / memberships /
//   stores の各行はフィールドも値も当時のまま。ヘッダの notes は省略)。出典の commit は各定数のコメント。
// ⚠ now は実事故の run 日時に固定して注入する (proposePrograms の {now})。実事故の validTo は過去日なので、
//   注入しないと全件「期限切れ」(idCollision) になり検証にならない。

import type { SeedShape } from "../../../src/domain/mergeSeed";
import type { ExtractedSource, SourcePolicy } from "../types";

// ───────────────────────────────────────────────────────────────
// 凍結 seed (2026-09 時点の実名。seed() は使わない)
// ───────────────────────────────────────────────────────────────

export const GOLDEN_SEED: SeedShape = {
  cards: [
    { id: "jcb-w", name: "JCB カード W", defaultRate: 0.01, defaultCurrencyId: "j-point" },
    { id: "jcb-gold", name: "JCB ゴールド", defaultRate: 0.005, defaultCurrencyId: "j-point" },
    { id: "epos-card", name: "エポスカード", defaultRate: 0.005, defaultCurrencyId: "epos" },
  ],
  currencies: [
    { id: "d-pt", name: "dポイント", kind: "point" },
    { id: "paypay", name: "PayPayポイント", kind: "point" },
    { id: "j-point", name: "J-POINT", kind: "point" },
    { id: "epos", name: "エポスポイント", kind: "point" },
    { id: "jre", name: "JRE POINT", kind: "point" },
  ],
  stores: [
    { id: "mos-burger", name: "モスバーガー", category: "飲食" },
    { id: "yoshinoya", name: "吉野家", category: "飲食" },
    { id: "kura-sushi", name: "くら寿司", category: "飲食" },
    { id: "kappa-sushi", name: "かっぱ寿司", category: "飲食" },
    { id: "bic-camera", name: "ビックカメラ", category: "家電量販店" },
    { id: "nojima", name: "ノジマ", category: "家電量販店" },
    { id: "kojima", name: "コジマ", category: "家電量販店" },
    { id: "conv-7eleven", name: "セブン-イレブン", category: "コンビニ" },
    { id: "takashimaya", name: "高島屋", category: "百貨店" },
    { id: "marui", name: "マルイ（モディ・マルイウェブチャネル含む）", category: "百貨店" },
    { id: "tower-records", name: "タワーレコード", category: "音楽・映像" },
    { id: "hmv-books-online", name: "HMV&BOOKS online", category: "音楽・映像" },
    { id: "muji", name: "無印良品 (一部店舗)", category: "ファッション" },
    { id: "mcdonalds", name: "マクドナルド", category: "飲食" },
    { id: "sukiya", name: "すき家", category: "飲食" },
    { id: "gusto", name: "ガスト", category: "飲食" },
    { id: "bamiyan", name: "バーミヤン", category: "飲食" },
    { id: "jonathan", name: "ジョナサン", category: "飲食" },
    { id: "saint-marc-cafe", name: "サンマルクカフェ", category: "飲食" },
  ],
  edges: [],
  pointCards: [
    { id: "d-pointcard", name: "dポイントカード", currencyId: "d-pt" },
    { id: "jre-pointcard", name: "JRE POINTカード", currencyId: "jre" },
  ],
  paymentApps: [
    { id: "pa-d-pay", name: "d払い" },
    { id: "pa-paypay", name: "PayPay" },
  ],
  programs: [
    // 既存 program (membership ガードの検証用)。tier / channel は seed の実値
    {
      id: "prog-jcb-jpoint-20x", name: "J-POINT パートナー (20倍)", scope: "member-stores",
      cardIds: ["jcb-w"], rate: 0.105, currencyId: "j-point", bonusType: "primary",
    },
    {
      id: "prog-jcb-jpoint-gold-20x", name: "J-POINT パートナー Gold (20倍)", scope: "member-stores",
      cardIds: ["jcb-gold"], rate: 0.1, currencyId: "j-point", bonusType: "primary",
    },
    {
      id: "prog-jcb-jpoint-gold-2x", name: "J-POINT パートナー Gold (2倍)", scope: "member-stores",
      cardIds: ["jcb-gold"], rate: 0.01, currencyId: "j-point", bonusType: "primary",
    },
    {
      id: "prog-epos-tamaru-2x", name: "たまるマーケット (2倍)", scope: "member-stores",
      cardIds: ["epos-card"], rate: 0.01, currencyId: "epos", bonusType: "primary", channel: "online",
    },
    {
      id: "prog-epos-tamaru-3x", name: "たまるマーケット (3倍)", scope: "member-stores",
      cardIds: ["epos-card"], rate: 0.015, currencyId: "epos", bonusType: "primary", channel: "online",
    },
    // かっぱ寿司 → くら寿司 の membership を「既存 program への新規 membership」として検証するための受け皿
    {
      id: "prog-dpay-kura-sushi-existing", name: "かっぱ寿司の店舗で最大10倍！ (既存化)", scope: "member-stores",
      pointCardId: "d-pointcard", rate: 0.09, currencyId: "d-pt", bonusType: "addOn",
      validFrom: "2026-07-01", validTo: "2026-08-31",
    },
  ],
  memberships: [],
};

/**
 * 期限切れ整理 (expired-cleanup) の検証用 seed: 9/03 に auto で入った PayPay セブン 30% (2026-09-20 終了) が
 * seed にある状態。GOLDEN_SEED に混ぜると PAYPAY_0903 の同 id が「既存 program」扱いになるので分ける。
 */
export const GOLDEN_SEED_WITH_PAYPAY_SEVEN: SeedShape = {
  ...GOLDEN_SEED,
  programs: [
    ...(GOLDEN_SEED.programs ?? []),
    {
      id: "prog-paypay-seven-eleven-30-2026-09",
      name: "セブン-イレブンでPayPayポイントを利用して対象商品を買うと最大30％戻ってくるキャンペーン",
      scope: "member-stores", paymentAppId: "pa-paypay", rate: 0.3, currencyId: "paypay", bonusType: "addOn",
      validFrom: "2026-09-01", validTo: "2026-09-20",
    },
  ],
  memberships: [
    {
      id: "m-prog-paypay-seven-eleven-30-2026-09-conv-7eleven",
      programId: "prog-paypay-seven-eleven-30-2026-09",
      storeId: "conv-7eleven",
    },
  ],
};

// ───────────────────────────────────────────────────────────────
// run 日時 (実事故の cron: 日・水 21:00 UTC 過ぎ = 月・木 06:00 JST 過ぎ)
// ───────────────────────────────────────────────────────────────

export const NOW_DPAY_0702 = new Date("2026-07-02T07:27:00+09:00"); // b6d2ef7 (#103)
export const NOW_DPAY_0727 = new Date("2026-07-27T07:04:00+09:00"); // 7b91168 (#144)
export const NOW_PAYPAY_0903 = new Date("2026-09-03T08:03:00+09:00"); // 9453116 (#148)
export const NOW_EXPIRED_1022 = new Date("2026-10-22T06:00:00+09:00"); // PayPay セブン 30% の自動 tombstone 予定日

// ───────────────────────────────────────────────────────────────
// 実事故の campaign (auto で配信された / 配信され得た program)
// ───────────────────────────────────────────────────────────────

const DPAY_HEADER = {
  sourceId: "d-pay-campaigns",
  sourceUrl: "https://service.smt.docomo.ne.jp/keitai_payment/campaign/",
  extractor: "campaign",
  geminiModel: "gemini-2.5-flash",
} as const;

/** 7b91168:sources/extracted/d-pay-campaigns.json (2026-07-27 run、#144 で 5 program が auto)。全件そのまま。 */
export const DPAY_0727: ExtractedSource = {
  ...DPAY_HEADER,
  fetchedAt: "2026-07-26T22:01:03.196Z",
  promptVersion: "campaign-v3.5",
  programs: [
    {"programId":"prog-dpay-mos-burger-dpoint-3x-2026-07","name":"【モスバーガー】対象商品はdポイント3倍！","scope":"member-stores","pointCardId":"d-pointcard","rate":0.02,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-07-15","validTo":"2026-08-16","requiresEntry":true,"evidenceQuote":"【モスバーガー】対象商品はdポイント3倍！ 2026/07/15～2026/08/16 エントリー受付中","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-yoshinoya-20pc-cashback-2026-07","name":"【吉野家】最大＋20％還元！","scope":"member-stores","paymentAppId":"pa-d-pay","rate":0.2,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-07-17","validTo":"2026-08-16","requiresEntry":true,"evidenceQuote":"【吉野家】最大＋20％還元！ 2026/07/17～2026/08/16 エントリー受付中","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-kura-sushi-10x-dpoint-2026-07","name":"かっぱ寿司の店舗で最大10倍！","scope":"member-stores","pointCardId":"d-pointcard","rate":0.09,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-07-01","validTo":"2026-08-31","requiresEntry":true,"evidenceQuote":"かっぱ寿司の店舗で最大10倍！ 2026/07/01～2026/08/31 エントリー受付中","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-joyful-honda-5x-dpoint-2026-07","name":"ジョイフル本田ｄ払い５倍キャンペーン","scope":"member-stores","paymentAppId":"pa-d-pay","rate":0.04,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-07-01","validTo":"2026-07-31","requiresEntry":true,"evidenceQuote":"ジョイフル本田ｄ払い５倍キャンペーン 2026/07/01～2026/07/31 エントリー受付中","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-bic-camera-ikebukuro-5pc-cashback-2026-06","name":"【ビックカメラ池袋店舗】もれなく＋5％還元","scope":"member-stores","paymentAppId":"pa-d-pay","rate":0.05,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-06-26","validTo":"2026-08-02","requiresEntry":true,"evidenceQuote":"【ビックカメラ池袋店舗】もれなく＋5％還元 2026/06/26～2026/08/02 エントリー受付中","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-tower-records-10x-dpoint-2026-07","name":"【タワーレコード】全員！dポイント10倍！","scope":"member-stores","pointCardId":"d-pointcard","rate":0.09,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-07-21","validTo":"2026-07-29","requiresEntry":true,"evidenceQuote":"【タワーレコード】全員！dポイント10倍！ 2026/07/21～2026/07/29 エントリー受付中","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-shinseido-drug-2x-dpoint-2026-07","name":"＜新生堂薬局＞対象商品購入でdポイント2倍","scope":"member-stores","pointCardId":"d-pointcard","rate":0.01,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-07-13","validTo":"2026-08-16","evidenceQuote":"＜新生堂薬局＞対象商品購入でdポイント2倍 2026/07/13～2026/08/16 エントリー不要","explicitness":1,"ambiguity":0.05},
  ],
  memberships: [
    {"programId":"prog-dpay-mos-burger-dpoint-3x-2026-07","storeId":"mos-burger","evidenceQuote":"【モスバーガー】対象商品はdポイント3倍！","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-yoshinoya-20pc-cashback-2026-07","storeId":"yoshinoya","evidenceQuote":"【吉野家】最大＋20％還元！","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-kura-sushi-10x-dpoint-2026-07","storeId":"kura-sushi","evidenceQuote":"かっぱ寿司の店舗で最大10倍！","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-joyful-honda-5x-dpoint-2026-07","storeId":"joyful-honda","evidenceQuote":"ジョイフル本田ｄ払い５倍キャンペーン","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-bic-camera-ikebukuro-5pc-cashback-2026-06","storeId":"bic-camera","evidenceQuote":"【ビックカメラ池袋店舗】もれなく＋5％還元","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-tower-records-10x-dpoint-2026-07","storeId":"tower-records","evidenceQuote":"【タワーレコード】全員！dポイント10倍！","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-dpay-shinseido-drug-2x-dpoint-2026-07","storeId":"shinseido-yakkyoku","evidenceQuote":"＜新生堂薬局＞対象商品購入でdポイント2倍","explicitness":1,"ambiguity":0.05},
  ],
  stores: [
    {"storeId":"joyful-honda","name":"ジョイフル本田","category":"ホームセンター","evidenceQuote":"ジョイフル本田ｄ払い５倍キャンペーン","explicitness":1,"ambiguity":0.05},
    {"storeId":"tower-records","name":"タワーレコード","category":"音楽・映像","evidenceQuote":"【タワーレコード】全員！dポイント10倍！","explicitness":1,"ambiguity":0.05},
    {"storeId":"shinseido-yakkyoku","name":"新生堂薬局","category":"ドラッグストア","evidenceQuote":"＜新生堂薬局＞対象商品購入でdポイント2倍","explicitness":1,"ambiguity":0.05},
  ],
};

/** b6d2ef7:sources/extracted/d-pay-campaigns.json (2026-07-02 run、#103) から auto になった 2 program + membership。 */
export const DPAY_0702: ExtractedSource = {
  ...DPAY_HEADER,
  fetchedAt: "2026-07-01T22:26:56.848Z",
  promptVersion: "campaign-v3.3",
  programs: [
    {"programId":"prog-d-pointcard-mos-burger-05","name":"dポイントカード モスバーガー 対象商品はdポイント5倍","pointCardId":"d-pointcard","rate":0.05,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-06-05","validTo":"2026-07-05","evidenceQuote":"dポイントカード 【モスバーガー】対象商品はdポイント5倍！ 2026/06/05～2026/07/05","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-d-pointcard-nojima-10000","name":"ノジマで最大10,000ポイントプレゼント","pointCardId":"d-pointcard","rate":0.01,"currencyId":"d-pt","bonusType":"addOn","validFrom":"2026-06-06","validTo":"2026-08-23","evidenceQuote":"dポイントカード ノジマで最大10,000ポイントプレゼント 2026/06/06～2026/08/23","explicitness":1,"ambiguity":0.05},
  ],
  memberships: [
    {"programId":"prog-d-pointcard-mos-burger-05","storeId":"mos-burger","evidenceQuote":"モスバーガー","explicitness":1,"ambiguity":0.05},
    {"programId":"prog-d-pointcard-nojima-10000","storeId":"nojima","evidenceQuote":"ノジマ","explicitness":1,"ambiguity":0.05},
  ],
};

/** 9453116:sources/extracted/paypay-campaigns.json (2026-09-03 run、#148 でセブン 30% が auto)。全件そのまま。 */
export const PAYPAY_0903: ExtractedSource = {
  sourceId: "paypay-campaigns",
  sourceUrl: "https://paypay.ne.jp/event/",
  fetchedAt: "2026-09-02T23:02:14.761Z",
  promptVersion: "campaign-v3.5",
  extractor: "campaign",
  geminiModel: "gemini-2.5-flash",
  programs: [
    {"programId":"prog-paypay-seven-eleven-30-2026-09","name":"セブン-イレブンでPayPayポイントを利用して対象商品を買うと最大30％戻ってくるキャンペーン","scope":"member-stores","paymentAppId":"pa-paypay","rate":0.3,"currencyId":"paypay","bonusType":"addOn","validFrom":"2026-09-01","validTo":"2026-09-20","evidenceQuote":"セブン-イレブンでPayPayポイントを利用して対象商品を買うと最大30％戻ってくるキャンペーン 2026/9/1 〜 9/20","explicitness":1,"ambiguity":0.05,"notes":"最大30%還元ですが、期間中の常時還元と解釈し抽出しました。対象商品限定です。"},
    {"programId":"prog-paypay-u18-2-2026-03","name":"＜12〜18歳の方＞PayPay残高へのチャージ＆お支払いでPayPayポイントが最大2％上乗せでもらえるキャンペーン","scope":"member-stores","paymentAppId":"pa-paypay","rate":0.02,"currencyId":"paypay","bonusType":"addOn","validFrom":"2026-03-03","validTo":"2026-09-30","evidenceQuote":"＜12〜18歳の方＞PayPay残高へのチャージ＆お支払いでPayPayポイントが最大2％上乗せでもらえるキャンペーン 2026/3/3 〜 9/30","explicitness":1,"ambiguity":0.05,"notes":"対象者限定キャンペーンですが、対象者が明確であり、特定の店舗での利用が前提となるため抽出しました。"},
  ],
  memberships: [
    {"programId":"prog-paypay-seven-eleven-30-2026-09","storeId":"conv-7eleven","evidenceQuote":"セブン-イレブンでPayPayポイントを利用して対象商品を買うと","explicitness":1,"ambiguity":0.05},
  ],
};

/** 実事故の program 7 件 (+ 回帰 nojima / 取りこぼし寸前だった U18) とポリシー無しでの期待 reason。 */
export const GOLDEN_PROGRAM_EXPECTATIONS: ReadonlyArray<{
  programId: string;
  source: "DPAY_0727" | "DPAY_0702" | "PAYPAY_0903";
  reason: string;
  note: string;
}> = [
  { programId: "prog-dpay-mos-burger-dpoint-3x-2026-07", source: "DPAY_0727", reason: "campaignConditional", note: "モス 3 倍 (対象商品)" },
  { programId: "prog-dpay-yoshinoya-20pc-cashback-2026-07", source: "DPAY_0727", reason: "campaignRateCeiling", note: "吉野家 最大 20%" },
  { programId: "prog-dpay-kura-sushi-10x-dpoint-2026-07", source: "DPAY_0727", reason: "campaignRateCeiling", note: "かっぱ寿司 9% (上限なし)" },
  { programId: "prog-dpay-bic-camera-ikebukuro-5pc-cashback-2026-06", source: "DPAY_0727", reason: "campaignConditional", note: "ビックカメラ池袋店舗 5% (店舗限定)" },
  { programId: "prog-dpay-tower-records-10x-dpoint-2026-07", source: "DPAY_0727", reason: "campaignRateCeiling", note: "タワレコ 9% (上限なし)" },
  { programId: "prog-d-pointcard-mos-burger-05", source: "DPAY_0702", reason: "campaignConditional", note: "モス 5 倍 (対象商品)" },
  { programId: "prog-paypay-seven-eleven-30-2026-09", source: "PAYPAY_0903", reason: "campaignRateCeiling", note: "PayPay セブン 最大 30%" },
  { programId: "prog-d-pointcard-nojima-10000", source: "DPAY_0702", reason: "unsupportedRateClaim", note: "ノジマ 10,000pt (回帰)" },
  { programId: "prog-paypay-u18-2-2026-03", source: "PAYPAY_0903", reason: "campaignConditional", note: "U18 最大 2% (年齢)" },
];

// ───────────────────────────────────────────────────────────────
// membership の誤マッピング (既存 program への新規 membership)
// ───────────────────────────────────────────────────────────────

/** 既存 program への新規 membership の実データ 5 件とその期待 reason (ポリシー無し)。 */
export const MEMBERSHIP_MISMAPS: ReadonlyArray<{
  source: ExtractedSource;
  programId: string;
  storeId: string;
  reason: "storeNameMismatch" | "campaignConditional";
  note: string;
}> = [
  {
    // 7b91168 d-pay: かっぱ寿司のキャンペーンを くら寿司 に紐付け (program は凍結 seed の既存受け皿へ)
    source: {
      ...DPAY_HEADER, fetchedAt: "2026-07-26T22:01:03.196Z", promptVersion: "campaign-v3.5",
      memberships: [{"programId":"prog-dpay-kura-sushi-existing","storeId":"kura-sushi","evidenceQuote":"かっぱ寿司の店舗で最大10倍！","explicitness":1,"ambiguity":0.05}],
    },
    programId: "prog-dpay-kura-sushi-existing", storeId: "kura-sushi", reason: "storeNameMismatch",
    note: "かっぱ寿司 → くら寿司",
  },
  {
    // 890d992 (#149) jcb: タカシマヤグループの SC・レストラン街を 高島屋 (百貨店) に紐付け
    source: {
      sourceId: "jcb-jpoint-partners", sourceUrl: "https://j-pointpartner.jcb.co.jp/search",
      fetchedAt: "2026-09-13T23:00:10.817Z", promptVersion: "jcb-jpoint-v1.3", extractor: "jcb-jpoint", geminiModel: "gemini-2.5-flash",
      memberships: [{"programId":"prog-jcb-jpoint-gold-2x","storeId":"takashimaya","evidenceQuote":"タカシマヤグループのショッピングセンター・レストラン街 ポイント 2 倍","explicitness":0.95,"ambiguity":0.05}],
    },
    programId: "prog-jcb-jpoint-gold-2x", storeId: "takashimaya", reason: "storeNameMismatch",
    note: "タカシマヤグループ SC → 高島屋",
  },
  {
    // 890d992 (#149) たまる: TOWER RECORDS ONLINE を タワーレコード (実店舗) に紐付け
    source: {
      sourceId: "epos-tamaru-market", sourceUrl: "https://tamaru.eposcard.co.jp/",
      fetchedAt: "2026-09-13T23:04:03.863Z", promptVersion: "epos-tamaru-v1.1", extractor: "epos-tamaru", geminiModel: "gemini-2.5-flash",
      memberships: [{"programId":"prog-epos-tamaru-3x","storeId":"tower-records","evidenceQuote":"TOWER RECORDS ONLINE エポスポイント 3 倍","explicitness":0.95,"ambiguity":0.05}],
    },
    programId: "prog-epos-tamaru-3x", storeId: "tower-records", reason: "storeNameMismatch",
    note: "TOWER RECORDS ONLINE → タワーレコード",
  },
  {
    // 3c4bb69 (#134) たまる: nojima online を ノジマ (実店舗) に紐付け
    source: {
      sourceId: "epos-tamaru-market", sourceUrl: "https://tamaru.eposcard.co.jp/",
      fetchedAt: "2026-07-19T21:56:35.518Z", promptVersion: "epos-tamaru-v1.1", extractor: "epos-tamaru", geminiModel: "gemini-2.5-flash",
      memberships: [{"programId":"prog-epos-tamaru-3x","storeId":"nojima","evidenceQuote":"nojima online エポスポイント 3 倍","explicitness":0.95,"ambiguity":0.05}],
    },
    programId: "prog-epos-tamaru-3x", storeId: "nojima", reason: "storeNameMismatch",
    note: "nojima online → ノジマ",
  },
  {
    // 2dd5675 (#98) jcb: マクドナルドのモバイルオーダー・デリバリー限定を店頭込みで紐付け
    source: {
      sourceId: "jcb-jpoint-partners", sourceUrl: "https://j-pointpartner.jcb.co.jp/search",
      fetchedAt: "2026-06-24T22:21:41.261Z", promptVersion: "jcb-jpoint-v1.0", extractor: "jcb-jpoint", geminiModel: "gemini-2.5-flash",
      memberships: [{"programId":"prog-jcb-jpoint-20x","storeId":"mcdonalds","evidenceQuote":"マクドナルド（モバイルオーダー・マックデリバリー(R)サービス限定）ポイント 20 倍","explicitness":0.95,"ambiguity":0.05}],
    },
    programId: "prog-jcb-jpoint-20x", storeId: "mcdonalds", reason: "campaignConditional",
    note: "マクドナルド (モバイルオーダー・デリバリー限定)",
  },
];

// ───────────────────────────────────────────────────────────────
// negative (過剰ブロックの検知: auto のまま残るべき正しいデータ)
// ───────────────────────────────────────────────────────────────

/** 1885324 (#101) jcb: J-POINT Gold 20 倍の飲食 6 店 (正しい membership)。 */
export const JPOINT_20X_NEGATIVE: ExtractedSource = {
  sourceId: "jcb-jpoint-partners",
  sourceUrl: "https://j-pointpartner.jcb.co.jp/search",
  fetchedAt: "2026-06-28T22:06:52.420Z",
  promptVersion: "jcb-jpoint-v1.0",
  extractor: "jcb-jpoint",
  geminiModel: "gemini-2.5-flash",
  memberships: [
    {"programId":"prog-jcb-jpoint-gold-20x","storeId":"sukiya","evidenceQuote":"すき家 ポイント 20倍","explicitness":0.95,"ambiguity":0.05},
    {"programId":"prog-jcb-jpoint-gold-20x","storeId":"yoshinoya","evidenceQuote":"吉野家 ポイント 20倍","explicitness":0.95,"ambiguity":0.05},
    {"programId":"prog-jcb-jpoint-gold-20x","storeId":"gusto","evidenceQuote":"ガスト ポイント 20倍","explicitness":0.95,"ambiguity":0.05},
    {"programId":"prog-jcb-jpoint-gold-20x","storeId":"bamiyan","evidenceQuote":"バーミヤン ポイント 20倍","explicitness":0.95,"ambiguity":0.05},
    {"programId":"prog-jcb-jpoint-gold-20x","storeId":"saint-marc-cafe","evidenceQuote":"サンマルクカフェ ポイント 20倍","explicitness":0.95,"ambiguity":0.05},
    {"programId":"prog-jcb-jpoint-gold-20x","storeId":"jonathan","evidenceQuote":"ジョナサン ポイント 20倍","explicitness":0.95,"ambiguity":0.05},
  ],
};

/** 3c4bb69 / 890d992 たまる: EC 経由が付与条件そのもの (channel online) の正しい membership。EC 語免除 (RF6) の検知用。 */
export const TAMARU_ONLINE_NEGATIVE: ExtractedSource = {
  sourceId: "epos-tamaru-market",
  sourceUrl: "https://tamaru.eposcard.co.jp/",
  fetchedAt: "2026-09-13T23:04:03.863Z",
  promptVersion: "epos-tamaru-v1.1",
  extractor: "epos-tamaru",
  geminiModel: "gemini-2.5-flash",
  memberships: [
    {"programId":"prog-epos-tamaru-2x","storeId":"muji","evidenceQuote":"無印良品ネットストア エポスポイント 2 倍","explicitness":0.95,"ambiguity":0.05},
    {"programId":"prog-epos-tamaru-3x","storeId":"hmv-books-online","evidenceQuote":"HMV & BOOKS online エポスポイント 3 倍","explicitness":0.95,"ambiguity":0.05},
    {"programId":"prog-epos-tamaru-2x","storeId":"marui","evidenceQuote":"マルイのネット通販≪マルイウェブチャネル≫ エポスポイント 2 倍","explicitness":0.95,"ambiguity":0.05},
    {"programId":"prog-epos-tamaru-3x","storeId":"kojima","evidenceQuote":"コジマネット エポスポイント 3 倍","explicitness":0.95,"ambiguity":0.05},
  ],
};

/** 既存テストの「全条件パス」JRE NewDays 3% と「d払い 5% 還元」(ポリシー無しのソースで auto のまま)。 */
export const CAMPAIGN_NEGATIVE: ExtractedSource = {
  sourceId: "golden-negative-campaigns",
  sourceUrl: "https://example.test/campaign/",
  fetchedAt: "2026-07-26T22:00:00.000Z",
  promptVersion: "campaign-v3.5",
  extractor: "campaign",
  geminiModel: "gemini-2.5-flash",
  programs: [
    {
      programId: "prog-jre-camp-newdays-future",
      name: "JRE POINT NewDays 3%還元キャンペーン",
      pointCardId: "jre-pointcard",
      rate: 0.03,
      currencyId: "jre",
      bonusType: "addOn",
      validFrom: "2026-06-01",
      validTo: "2099-12-31",
      evidenceQuote: "キャンペーン期間：2026年6月1日〜2099年12月31日、NewDaysでJRE POINT提示で3%",
      explicitness: 1.0,
      ambiguity: 0.0,
    },
    {
      programId: "prog-d-pay-camp",
      name: "d払い 5% 還元",
      paymentAppId: "pa-d-pay",
      rate: 0.05,
      currencyId: "d-pt",
      validTo: "2099-12-31",
      evidenceQuote: "d払いで5%、期間 2099/12/31 まで",
      explicitness: 1.0,
      ambiguity: 0.0,
    },
  ],
};

// ───────────────────────────────────────────────────────────────
// registry のソース別ポリシー (sources/registry.yaml の宣言と同じ値を凍結)
// ───────────────────────────────────────────────────────────────

export const GOLDEN_POLICIES: ReadonlyMap<string, SourcePolicy> = new Map<string, SourcePolicy>([
  [
    "d-pay-campaigns",
    {
      sourceId: "d-pay-campaigns",
      extractor: "campaign",
      autoMerge: false,
      targets: [{ paymentAppId: "pa-d-pay" }, { pointCardId: "d-pointcard" }],
    },
  ],
  [
    "paypay-campaigns",
    {
      sourceId: "paypay-campaigns",
      extractor: "campaign",
      autoMerge: false,
      targets: [{ paymentAppId: "pa-paypay" }],
    },
  ],
]);
