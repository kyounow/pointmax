// 店舗まわりのデータ:
//   - SEED_STORES         : お店マスタ (category 必須、preferredPointCardIds 任意)
//   - SEED_STORE_RULES    : クレカ × 店舗 (or カテゴリ) で還元率が変わるルール
//   - SEED_LOYALTY_RULES  : 店舗 × ポイントカード提示の還元率 (二重取り)
//
// 編集時のガイド:
//   - cardId / pointCardId は seed-data-cards.ts に存在する id を参照
//   - storeId / category は SEED_STORES と整合させる
//   - paymentAppId は seed-data-cards.ts の SEED_PAYMENT_APPS の id を参照
//   - 「JAL特約店」カテゴリは多数の店舗が属するため、SEED_STORE_RULES では
//     category 指定で 1 ルール → 全 JAL特約店に適用される
import type { LoyaltyRule, Store, StoreRule } from "../domain/types";

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
  // JAL特約店 (JALカードSuicaで2%還元になる店舗群)
  { id: "eneos", name: "ENEOS", category: "JAL特約店" },
  { id: "idemitsu", name: "出光", category: "JAL特約店" },
  { id: "welcia", name: "ウエルシア", category: "JAL特約店" },
  { id: "matsukiyo", name: "マツモトキヨシ", category: "JAL特約店" },
  { id: "kinokuniya", name: "紀伊國屋書店", category: "JAL特約店" },
  { id: "aeon", name: "イオン", category: "JAL特約店" },
  { id: "daimaru-matsuzakaya", name: "大丸・松坂屋", category: "JAL特約店" },
  { id: "muji", name: "無印良品 (一部店舗)", category: "JAL特約店" },
  { id: "uniqlo", name: "ユニクロ (一部店舗)", category: "JAL特約店" },
  { id: "royal-host", name: "ロイヤルホスト", category: "JAL特約店" },
  { id: "tsuruha", name: "ツルハドラッグ", category: "JAL特約店" },
  // 百貨店・家電量販店・ドラッグストア (主にdポイント加盟)
  { id: "takashimaya", name: "高島屋", category: "百貨店" },
  { id: "nojima", name: "ノジマ", category: "家電量販店" },
  { id: "bic-camera", name: "ビックカメラ", category: "家電量販店" },
  { id: "cocokara", name: "ココカラファイン", category: "ドラッグストア" },
  { id: "seiyu", name: "西友", category: "スーパー" },
  // 汎用 (デフォルト選択用。基本還元率を確認したい時に使う)
  { id: "general", name: "一般店舗 (規定還元)", category: "汎用" },
];

// クレカ × 店舗 (or カテゴリ) の還元ルール。
// 優先順位: 直接ルール (storeId) > カテゴリルール (category) > カードの defaultRate
// paymentAppId 指定があれば、その決済方法選択時のみ適用される。
// validFrom / validTo はキャンペーン期間限定ルールで使用 (任意)。
export const SEED_STORE_RULES: StoreRule[] = [
  // 楽天カード × 楽天市場 (通常1% + SPU基本2% = 3%)
  {
    id: "rule-rakuten-ichiba",
    cardId: "rakuten-card",
    storeId: "rakuten-ichiba",
    rate: 0.03,
    currencyId: "rakuten-pt",
    notes: "通常+SPU基本分。SPU上乗せは別途",
  },
  // SMBC ゴールド(NL) 7% プログラムは 2023-04-03 にスマホタッチ決済 5%→7% で開始、
  // 以降継続中で終了未告知。validFrom を入れて「長期プログラム」と意味づけ、
  // UI で 📌 公式プログラム と表示。期限が明確な真キャンペーン (validTo 入り) との
  // 区別がつく。
  //
  // 三井住友ゴールド(NL) × タッチ決済対象コンビニ・飲食 (7%)
  // ファミマは7%対象外なので別の還元率
  {
    id: "rule-smbc-7eleven",
    cardId: "smbc-v",
    storeId: "conv-7eleven",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時(スマホタッチで+α)",
  },
  {
    id: "rule-smbc-lawson",
    cardId: "smbc-v",
    storeId: "conv-lawson",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-mcdonalds",
    cardId: "smbc-v",
    storeId: "mcdonalds",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-ministop",
    cardId: "smbc-v",
    storeId: "conv-ministop",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-sukiya",
    cardId: "smbc-v",
    storeId: "sukiya",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-saizeriya",
    cardId: "smbc-v",
    storeId: "saizeriya",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-gusto",
    cardId: "smbc-v",
    storeId: "gusto",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-doutor",
    cardId: "smbc-v",
    storeId: "doutor",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  // 注: rule-smbc-sushiro は 2026-05 時点で SMBC 公式の対象店舗一覧から外れたため削除。
  // 既に localStorage に保存されているユーザーには影響しない (mergeFromSeed が add-only のため)。
  {
    id: "rule-smbc-starbucks",
    cardId: "smbc-v",
    storeId: "starbucks",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済 or モバイルオーダー時 (2026 SMBC公式対象店舗)",
  },
  {
    id: "rule-smbc-mos-burger",
    cardId: "smbc-v",
    storeId: "mos-burger",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-kfc",
    cardId: "smbc-v",
    storeId: "kfc",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-yoshinoya",
    cardId: "smbc-v",
    storeId: "yoshinoya",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-bamiyan",
    cardId: "smbc-v",
    storeId: "bamiyan",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時 (すかいらーくグループ)",
  },
  {
    id: "rule-smbc-jonathan",
    cardId: "smbc-v",
    storeId: "jonathan",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時 (すかいらーくグループ)",
  },
  {
    id: "rule-smbc-yumetoan",
    cardId: "smbc-v",
    storeId: "yumetoan",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時 (すかいらーくグループ)",
  },
  {
    id: "rule-smbc-hamazushi",
    cardId: "smbc-v",
    storeId: "hamazushi",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-cocos",
    cardId: "smbc-v",
    storeId: "cocos",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時 (ゼンショーグループ)",
  },
  {
    id: "rule-smbc-excelsior-cafe",
    cardId: "smbc-v",
    storeId: "excelsior-cafe",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時 (ドトール系列)",
  },
  {
    id: "rule-smbc-kappa-sushi",
    cardId: "smbc-v",
    storeId: "kappa-sushi",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-shabuyo",
    cardId: "smbc-v",
    storeId: "shabuyo",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時 (すかいらーくグループ)",
  },
  {
    id: "rule-smbc-seicomart",
    cardId: "smbc-v",
    storeId: "seicomart",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  {
    id: "rule-smbc-poplar",
    cardId: "smbc-v",
    storeId: "poplar",
    paymentAppId: "pa-visa-touch",
    validFrom: "2023-04-03",
    rate: 0.07,
    currencyId: "v-pt",
    notes: "Visaタッチ決済時",
  },
  // JALカードSuica × Suicaチャージ: ビューカードでJRE POINT 1.5%
  {
    id: "rule-jal-suica-charge",
    cardId: "jal-suica",
    storeId: "suica-charge",
    rate: 0.015,
    currencyId: "jre",
    notes: "ビューカード機能でJRE POINT付与",
  },
  // JALカードSuica CLUB-Aゴールド × えきねっと: グレード別優遇
  // ※普通カードは別還元率なので、追加するなら別Cardとして登録してこのルールも別途
  {
    id: "rule-jal-suica-ekinet-shinkansen",
    cardId: "jal-suica",
    storeId: "ekinet-shinkansen",
    rate: 0.08,
    currencyId: "jre",
    notes: "ビューカード会員 新幹線eチケット 8%還元",
  },
  {
    id: "rule-jal-suica-ekinet-zairaisen",
    cardId: "jal-suica",
    storeId: "ekinet-zairaisen",
    rate: 0.05,
    currencyId: "jre",
    notes: "ビューカード会員 在来線チケットレス特急券 5%還元",
  },
  // JALカードSuica × カテゴリ「JAL特約店」: 100円=2マイル (2%)
  // ENEOS / 出光 / ウエルシア / 紀伊國屋 / イオン / 大丸松坂屋 / 無印 / ユニクロ / ロイヤルホスト
  {
    id: "rule-jal-suica-tokuyaku",
    cardId: "jal-suica",
    category: "JAL特約店",
    rate: 0.02,
    currencyId: "jal-mile",
    notes:
      "JAL CARD特約店 100円=2マイル (CLUB-Aゴールド・ショッピングマイルプレミアム込み)",
  },
  // JALカードSuica × ファミマ: 個別ルール (ファミマは category="コンビニ" のため上のカテゴリルールが当たらない)
  {
    id: "rule-jal-suica-familymart",
    cardId: "jal-suica",
    storeId: "conv-familymart",
    rate: 0.02,
    currencyId: "jal-mile",
    notes: "JAL CARD特約店 100円=2マイル (ファミマは特約店個別ルール)",
  },
  // JALカード (普通) も同じく特約店 2% / ファミマ 2% (ショッピングマイル・プレミアム加入時)。
  // Suica チャージ / えきねっと は jal-suica 特有 (ビューカード機能込み) なので複製しない。
  {
    id: "rule-jal-card-tokuyaku",
    cardId: "jal-card",
    category: "JAL特約店",
    rate: 0.02,
    currencyId: "jal-mile",
    notes: "JAL CARD特約店 100円=2マイル (ショッピングマイル・プレミアム加入時)",
  },
  {
    id: "rule-jal-card-familymart",
    cardId: "jal-card",
    storeId: "conv-familymart",
    rate: 0.02,
    currencyId: "jal-mile",
    notes: "JAL CARD特約店 100円=2マイル (ファミマは特約店個別ルール)",
  },
  // === 期間限定キャンペーン ===
  // d払い × dカード × ビックカメラ +5% (2026年5月のキャンペーン)
  // 詳細: NTTドコモ公式 https://service.smt.docomo.ne.jp/keitai_payment/campaign/dpay_biccamera_260507_7487/
  {
    id: "rule-dcard-bic-camera-d-pay-202605",
    cardId: "dcard",
    storeId: "bic-camera",
    paymentAppId: "pa-d-pay",
    rate: 0.06, // 通常 1% + キャンペーン 5%
    currencyId: "d-pt",
    validFrom: "2026-05-16", // ビックカメラ全店 (Select 那覇国際通り店のみ 5/7〜だが、簡略化)
    validTo: "2026-05-31",
    notes: "d払い+5% ビックカメラ限定キャンペーン (要エントリー、進呈上限 2000pt)",
  },
  // === 長期公式プログラム (recurringDays) ===
  // 楽天市場「5と0のつく日」: 毎月 5,10,15,20,25,30 日にエントリー & 楽天カード決済で +1%
  // 既存 rule-rakuten-ichiba (rate 0.03 = 1% + SPU 2%) との合算で実質 4%。
  // 同 storeId+cardId で複数 rule は resolveRate で最大値が採用される設計のため、
  // 5/0 のつく日のみ rate=0.04 がアクティブになり、それ以外の日は既存 0.03 ルールが採用される。
  {
    id: "rule-rakuten-ichiba-zero-five-day",
    cardId: "rakuten-card",
    storeId: "rakuten-ichiba",
    rate: 0.04,
    currencyId: "rakuten-pt",
    validFrom: "2020-01-01", // 「5/0 のつく日」プログラム自体は長く実施されている、概算
    recurringDays: [5, 10, 15, 20, 25, 30],
    notes:
      "5と0のつく日 (毎月 5/10/15/20/25/30) のみ、要エントリー。SPU 基本 +2% 込みで実質 +4% 還元。",
  },

  // === v20: ビューカード + メルカード 関連 rules ===

  // ビューカード × Suica チャージ: Suica オートチャージ/モバイルチャージで 1.5% JRE POINT
  // jal-suica の rule-jal-suica-charge と同じ構造、別カード版
  {
    id: "rule-viewcard-suica-charge",
    cardId: "viewcard",
    storeId: "suica-charge",
    rate: 0.015,
    currencyId: "jre",
    notes:
      "Suica オートチャージ または モバイル Suica チャージで 1.5% JRE POINT 還元 " +
      "(ビューカード機能標準特典)",
  },

  // メルカード × メルカリ内: 定常最大 4% (利用額連動)
  {
    id: "rule-mercard-mercari",
    cardId: "mercard",
    storeId: "mercari",
    rate: 0.04,
    currencyId: "mercari-pt",
    notes:
      "メルカリ内お買い物で最大 4% メルカリポイント還元 (利用額連動、定常最大)。" +
      "初期は 2% 上限、過去 6 ヶ月の利用実績で 4 月 1 日/10 月 1 日に判定。" +
      "還元上限 5,000pt/月。",
  },

  // メルカード × メルカリ × 毎月 8 日: 8% 還元 (recurringDays 2 つ目の使用例)
  {
    id: "rule-mercard-mercari-day8",
    cardId: "mercard",
    storeId: "mercari",
    rate: 0.08,
    currencyId: "mercari-pt",
    recurringDays: [8],
    notes:
      "メルカード毎月 8 日: メルカリ内お買い物で +8% 還元キャンペーン (常設)。" +
      "rule-mercard-mercari (4%) と同時 active な日は resolveRate の最大値選択で 8% が採用される。",
  },
];

// 店舗 × ポイントカードの提示還元 (二重取り用)。
// クレカ決済とは別軸で、店頭提示で貯まる分。calculator では「ポイントカード併用ボーナス」として表示。
export const SEED_LOYALTY_RULES: LoyaltyRule[] = [
  // ====== dポイントカード ======
  {
    id: "loy-d-lawson",
    storeId: "conv-lawson",
    pointCardId: "d-pointcard",
    rate: 0.005,
    notes: "200円ごとに1pt",
  },
  {
    id: "loy-d-familymart",
    storeId: "conv-familymart",
    pointCardId: "d-pointcard",
    rate: 0.005,
    notes: "200円ごとに1pt",
  },
  {
    id: "loy-d-mcdonalds",
    storeId: "mcdonalds",
    pointCardId: "d-pointcard",
    rate: 0.01,
    notes: "100円(税込)ごとに1pt",
  },
  {
    id: "loy-d-sukiya",
    storeId: "sukiya",
    pointCardId: "d-pointcard",
    rate: 0.005,
    notes: "200円ごとに1pt",
  },
  {
    id: "loy-d-eneos",
    storeId: "eneos",
    pointCardId: "d-pointcard",
    rate: 0.005,
    notes: "ENEOS給油等で 200円1pt",
  },
  {
    id: "loy-d-matsukiyo",
    storeId: "matsukiyo",
    pointCardId: "d-pointcard",
    rate: 0.01,
    notes: "100円(税抜)ごとに1pt",
  },
  {
    id: "loy-d-gusto",
    storeId: "gusto",
    pointCardId: "d-pointcard",
    rate: 0.005,
    notes: "200円ごとに1pt (すかいらーくグループ)",
  },
  {
    id: "loy-d-nojima",
    storeId: "nojima",
    pointCardId: "d-pointcard",
    rate: 0.01,
    notes: "100円ごとに1pt (家電購入時)",
  },
  {
    id: "loy-d-takashimaya",
    storeId: "takashimaya",
    pointCardId: "d-pointcard",
    rate: 0.005,
    notes: "200円(税抜)ごとに1pt",
  },
  {
    id: "loy-d-cocokara",
    storeId: "cocokara",
    pointCardId: "d-pointcard",
    rate: 0.01,
    notes: "100円(税抜)ごとに1pt",
  },

  // ====== 楽天ポイントカード ======
  {
    id: "loy-r-familymart",
    storeId: "conv-familymart",
    pointCardId: "rakuten-pointcard",
    rate: 0.005,
    notes: "200円ごとに1pt（提携状況は要確認）",
  },
  {
    id: "loy-r-mcdonalds",
    storeId: "mcdonalds",
    pointCardId: "rakuten-pointcard",
    rate: 0.01,
    notes: "100円(税込)ごとに1pt",
  },
  {
    id: "loy-r-doutor",
    storeId: "doutor",
    pointCardId: "rakuten-pointcard",
    rate: 0.01,
    notes: "100円(税込)ごとに1pt",
  },
  {
    id: "loy-r-gusto",
    storeId: "gusto",
    pointCardId: "rakuten-pointcard",
    rate: 0.005,
    notes: "200円ごとに1pt（すかいらーくグループ）",
  },
  {
    id: "loy-r-seiyu",
    storeId: "seiyu",
    pointCardId: "rakuten-pointcard",
    rate: 0.005,
    notes: "200円(税抜)ごとに1pt（毎週月・土はポイント増量日）",
  },
  {
    id: "loy-r-tsuruha",
    storeId: "tsuruha",
    pointCardId: "rakuten-pointcard",
    rate: 0.005,
    notes: "200円(税抜)ごとに1pt（ツルハグループ）",
  },

  // ====== Pontaカード ======
  {
    id: "loy-p-lawson",
    storeId: "conv-lawson",
    pointCardId: "ponta-card",
    rate: 0.005,
    notes: "200円ごとに1pt",
  },
  {
    id: "loy-p-sukiya",
    storeId: "sukiya",
    pointCardId: "ponta-card",
    rate: 0.005,
    notes: "200円ごとに1pt",
  },
  {
    id: "loy-p-idemitsu",
    storeId: "idemitsu",
    pointCardId: "ponta-card",
    rate: 0.005,
    notes: "200円ごとに1pt（旧昭和シェル系）",
  },

  // ====== nanacoカード ======
  {
    id: "loy-n-7eleven",
    storeId: "conv-7eleven",
    pointCardId: "nanaco-card",
    rate: 0.01,
    notes: "100円(税抜)ごとに1pt（電子マネーnanaco支払い時）",
  },

  // ====== WAONカード ======
  {
    id: "loy-w-aeon",
    storeId: "aeon",
    pointCardId: "waon-card",
    rate: 0.005,
    notes: "200円ごとに1pt（お客さま感謝デーは別途5%OFF）",
  },
  {
    id: "loy-w-ministop",
    storeId: "conv-ministop",
    pointCardId: "waon-card",
    rate: 0.005,
    notes: "200円ごとに1pt",
  },

  // ====== Vポイントカード（旧Tポイントカード） ======
  {
    id: "loy-v-familymart",
    storeId: "conv-familymart",
    pointCardId: "vpoint-card",
    rate: 0.005,
    notes: "200円ごとに1pt（旧Tポイント加盟店）",
  },
  {
    id: "loy-v-welcia",
    storeId: "welcia",
    pointCardId: "vpoint-card",
    rate: 0.005,
    notes: "200円ごとに1pt（毎月20日のお客様感謝デーはポイントで1.5倍購入可）",
  },
];
