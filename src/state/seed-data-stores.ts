// 店舗まわりのデータ:
//   - SEED_STORES         : お店マスタ (category 必須、preferredPointCardIds 任意)
//   - SEED_LOYALTY_RULES  : 店舗 × ポイントカード提示の還元率 (二重取り)
//
// 編集時のガイド:
//   - pointCardId は seed-data-cards.ts に存在する id を参照
//   - storeId / category は SEED_STORES と整合させる
//   - v3 PR 1 以降、JAL特約店の還元は BenefitProgram (seed-data-programs.ts) で管理。
import type { LoyaltyRule, Store } from "../domain/types";

export const SEED_STORES: Store[] = [
  // ネット通販
  { id: "rakuten-ichiba", name: "楽天市場", category: "ネット通販" },
  { id: "amazon", name: "Amazon", category: "ネット通販" },
  { id: "mercari", name: "メルカリ", category: "ネット通販" },
  // コンビニ
  {
    id: "conv-7eleven",
    name: "セブン-イレブン",
    category: "コンビニ",
    preferredPointCardIds: ["nanaco-card"],
  },
  {
    id: "conv-lawson",
    name: "ローソン",
    category: "コンビニ",
    preferredPointCardIds: ["ponta-card"],
  },
  {
    id: "conv-familymart",
    name: "ファミリーマート",
    category: "コンビニ",
    preferredPointCardIds: ["vpoint-card"],
  },
  {
    id: "conv-ministop",
    name: "ミニストップ",
    category: "コンビニ",
    preferredPointCardIds: ["waon-card"],
  },
  { id: "seicomart", name: "セイコーマート", category: "コンビニ" },
  { id: "poplar", name: "ポプラ", category: "コンビニ" },
  // 飲食 (三井住友ゴールド7%対象が多め)
  { id: "mcdonalds", name: "マクドナルド", category: "飲食" },
  { id: "sukiya", name: "すき家", category: "飲食" },
  { id: "saizeriya", name: "サイゼリヤ", category: "飲食" },
  { id: "gusto", name: "ガスト", category: "飲食" },
  { id: "doutor", name: "ドトール", category: "飲食" },
  { id: "sushiro", name: "スシロー", category: "飲食" },
  { id: "starbucks", name: "スターバックス", category: "飲食" },
  { id: "mos-burger", name: "モスバーガー", category: "飲食" },
  { id: "kfc", name: "ケンタッキーフライドチキン", category: "飲食" },
  { id: "yoshinoya", name: "吉野家", category: "飲食" },
  { id: "bamiyan", name: "バーミヤン", category: "飲食" },
  { id: "jonathan", name: "ジョナサン", category: "飲食" },
  { id: "yumetoan", name: "夢庵", category: "飲食" },
  { id: "hamazushi", name: "はま寿司", category: "飲食" },
  { id: "cocos", name: "ココス", category: "飲食" },
  { id: "excelsior-cafe", name: "エクセルシオール カフェ", category: "飲食" },
  { id: "kappa-sushi", name: "かっぱ寿司", category: "飲食" },
  { id: "shabuyo", name: "しゃぶ葉", category: "飲食" },
  // 交通 / 電子マネー
  { id: "suica-charge", name: "Suicaチャージ", category: "電子マネー" },
  {
    id: "ekinet-shinkansen",
    name: "えきねっと(新幹線eチケット)",
    category: "交通",
  },
  {
    id: "ekinet-zairaisen",
    name: "えきねっと(在来線特急)",
    category: "交通",
  },
  // 旧 JAL特約店カテゴリ → v3 で業種別 category に変更 (加盟関係は StoreProgramMembership で管理)
  { id: "eneos", name: "ENEOS", category: "ガソリンスタンド" },
  { id: "idemitsu", name: "出光", category: "ガソリンスタンド" },
  { id: "welcia", name: "ウエルシア", category: "ドラッグストア" },
  { id: "matsukiyo", name: "マツモトキヨシ", category: "ドラッグストア" },
  { id: "kinokuniya", name: "紀伊國屋書店", category: "書店" },
  { id: "aeon", name: "イオン", category: "スーパー" },
  { id: "daimaru-matsuzakaya", name: "大丸・松坂屋", category: "百貨店" },
  { id: "muji", name: "無印良品 (一部店舗)", category: "ファッション" },
  { id: "uniqlo", name: "ユニクロ (一部店舗)", category: "ファッション" },
  { id: "royal-host", name: "ロイヤルホスト", category: "飲食" },
  { id: "tsuruha", name: "ツルハドラッグ", category: "ドラッグストア" },
  // 百貨店・家電量販店・ドラッグストア (主にdポイント加盟)
  { id: "takashimaya", name: "高島屋", category: "百貨店" },
  { id: "nojima", name: "ノジマ", category: "家電量販店" },
  { id: "bic-camera", name: "ビックカメラ", category: "家電量販店" },
  { id: "cocokara", name: "ココカラファイン", category: "ドラッグストア" },
  { id: "seiyu", name: "西友", category: "スーパー" },
  // 駅ナカ (JRE POINT カード提示で 200円1pt = 0.5% 還元)
  { id: "newdays", name: "NewDays", category: "駅ナカ" },
  { id: "kiosk", name: "KIOSK", category: "駅ナカ" },
  { id: "acure", name: "acure (自販機)", category: "駅ナカ" },
  { id: "ecute", name: "エキュート", category: "駅ナカ" },
  { id: "gransta", name: "グランスタ", category: "駅ナカ" },
  { id: "atre", name: "アトレ", category: "駅ナカ" },
  { id: "lumine", name: "ルミネ", category: "駅ナカ" },
  { id: "newoman", name: "ニュウマン", category: "駅ナカ" },
  // dangling loyaltyRule (ponta-card) が指す Recruit/出光系の store。
  // 手書きで追加して日本語 name + 正しい category を提供する。
  { id: "jalannet", name: "じゃらん net", category: "旅行代理店" },
  { id: "hotpepper-beauty", name: "ホットペッパービューティー", category: "美容" },
  { id: "hotpepper-gourmet", name: "ホットペッパーグルメ", category: "飲食" },
  { id: "jalan-golf", name: "じゃらんゴルフ", category: "旅行代理店" },
  { id: "jal-rentacar", name: "JAL レンタカー (Tabitto)", category: "レンタカー" },

  // 既存 ADDED_STORES の apollo-station (name="apollostation") を日本語に上書き
  { id: "apollo-station", name: "apollostation (アポロステーション)", category: "ガソリンスタンド" },

  // 汎用 (デフォルト選択用。基本還元率を確認したい時に使う)
  { id: "general", name: "一般店舗 (規定還元)", category: "汎用" },
];

// 店舗 × ポイントカードの提示還元 (二重取り用)。
// v3 PR 2 で全件を BenefitProgram (seed-data-programs.ts) に統合。
// 旧 loyaltyRules は空配列に変更。PR 3 で型定義・evaluator ロジックを削除予定。
export const SEED_LOYALTY_RULES: LoyaltyRule[] = [
  // (空配列: v3 PR 2 で全件 BenefitProgram に移行済み)
];
