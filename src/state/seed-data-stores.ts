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
  // V5-3 follow-up: すかいらーくグループ minor チェーン (SMBC タッチ決済 7% / Olive 8% の対象)
  { id: "aiya", name: "藍屋", category: "飲食" },
  { id: "grazie-gardens", name: "グラッチェガーデンズ", category: "飲食" },
  { id: "steak-gusto", name: "ステーキガスト", category: "飲食" },
  { id: "karaage-karayoshi", name: "から好し", category: "飲食" },
  { id: "musashino-mori-coffee", name: "むさしの森珈琲", category: "飲食" },
  { id: "uoya-michi", name: "魚屋路", category: "飲食" },
  { id: "chawan", name: "chawan", category: "飲食" },
  { id: "la-ohana", name: "La Ohana", category: "飲食" },
  { id: "tonkara-tei", name: "とんから亭", category: "飲食" },
  { id: "yumean-shokudo", name: "ゆめあん食堂", category: "飲食" },
  { id: "monana", name: "桃菜", category: "飲食" },
  { id: "hachiro-soba", name: "八郎そば", category: "飲食" },
  { id: "sanmarusan", name: "三〇三", category: "飲食" },
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

  // 孤児 membership backfill (cron pipeline の category cap で store 本体だけ deferred
  // されて membership が孤児化した分の補完、PR #53)。
  // 元データ: sources/extracted/{rakuten-point-partners,ponta-partners,v-point-partners}.json
  // 飲食系 (rakuten-point-partners 由来、prog-rakuten-pointcard-0.5pc)
  { id: "korakuen", name: "幸楽苑", category: "飲食" },
  { id: "jolly-pasta", name: "ジョリーパスタ", category: "飲食" },
  { id: "nakau", name: "なか卯", category: "飲食" },
  { id: "zetteria", name: "ゼッテリア", category: "飲食" },
  { id: "jukusei-yakiniku-ichiban", name: "熟成焼肉いちばん", category: "飲食" },
  { id: "olive-no-oka", name: "オリーブの丘", category: "飲食" },
  { id: "kyubeya", name: "久兵衛屋", category: "飲食" },
  { id: "katsuan", name: "かつ庵", category: "飲食" },
  { id: "mister-donut", name: "ミスタードーナツ", category: "飲食" },
  { id: "mosdo", name: "MOSDO", category: "飲食" },
  { id: "kura-sushi", name: "くら寿司", category: "飲食" },
  { id: "god-katsu", name: "ゴッドカツ", category: "飲食" },
  { id: "pasta-de-coco", name: "パスタ・デ・ココ", category: "飲食" },
  { id: "hidakaya", name: "日高屋", category: "飲食" },
  { id: "rairaken", name: "来来軒", category: "飲食" },
  { id: "yakitori-hidaka", name: "焼鳥日高", category: "飲食" },
  { id: "chukafast-ichiban", name: "中華一番", category: "飲食" },
  { id: "tainan", name: "台南", category: "飲食" },
  { id: "ramen-hidaka", name: "らーめん日高", category: "飲食" },
  { id: "taishu-sakaba-hidaka", name: "大衆酒場日高", category: "飲食" },
  { id: "taishu-shokudo-hidaka", name: "大衆食堂日高", category: "飲食" },
  { id: "hanamaru-udon", name: "はなまるうどん", category: "飲食" },
  { id: "umagena", name: "うまげな", category: "飲食" },
  { id: "tsurusaku", name: "つるさく", category: "飲食" },
  { id: "sanuki-menya", name: "さぬき麺屋", category: "飲食" },
  { id: "takamatsu-teshi", name: "高松勅使", category: "飲食" },
  { id: "mango-tree-cafe", name: "マンゴツリーカフェ", category: "飲食" },
  { id: "mango-tree-kitchen", name: "マンゴツリーキッチン", category: "飲食" },
  { id: "dancing-crab", name: "ダンシングクラブ", category: "飲食" },
  { id: "saint-marc-cafe", name: "サンマルクカフェ", category: "飲食" },
  { id: "kamakura-pasta", name: "鎌倉パスタ", category: "飲食" },
  { id: "gion-tsubaki-an", name: "ぎをん椿庵", category: "飲食" },
  { id: "baguette", name: "バケット", category: "飲食" },
  { id: "bistro309", name: "BISTRO309", category: "飲食" },
  // ponta-partners 由来 (prog-ponta-card-0.5pc)
  { id: "tomod-s", name: "トモズ", category: "ドラッグストア" },
  { id: "steak-asakuma", name: "ステーキのあさくま", category: "飲食" },
  { id: "jumble-store", name: "ジャンブルストア", category: "ファッション" },
  { id: "sanyodo-shoten", name: "三洋堂書店", category: "書店" },
  { id: "yaesu-book-center", name: "八重洲ブックセンター", category: "書店" },
  { id: "softmap", name: "ソフマップ", category: "家電量販店" },

  // 汎用 (デフォルト選択用。基本還元率を確認したい時に使う)
  { id: "general", name: "一般店舗 (規定還元)", category: "汎用" },
];

// 店舗 × ポイントカードの提示還元 (二重取り用)。
// v3 PR 2 で全件を BenefitProgram (seed-data-programs.ts) に統合。
// 旧 loyaltyRules は空配列に変更。PR 3 で型定義・evaluator ロジックを削除予定。
export const SEED_LOYALTY_RULES: LoyaltyRule[] = [
  // (空配列: v3 PR 2 で全件 BenefitProgram に移行済み)
];
