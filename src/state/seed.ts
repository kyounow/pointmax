import type {
  Card,
  ConversionEdge,
  Currency,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreRule,
} from "../domain/types";
import {
  ADDED_CARDS,
  ADDED_LOYALTY_RULES,
  ADDED_PAYMENT_APPS,
  ADDED_RULES,
  ADDED_STORES,
} from "./seed-additions";
import { BLOCKED_STORE_IDS } from "./seed-blocklist";
import { resolveCategory } from "./seed-category-aliases";

// シードデータの版数。新しいカード/通貨/レートを追加した時に上げる。
// アプリは保存済の lastSeedVersion とこの値を比較してアップデート通知を出す。
// v0.8 リリースを起点として 1 から再開。v1.0 までに各バージョンの差分を積み上げる。
export const SEED_VERSION = 6;

// デプロイされた公式マスタJSONのURL。
// scripts/generate-master.ts でビルド時に public/master.json として出力され、
// GitHub Pages 経由でこのURLから配信される。
// ユーザーが設定で空欄に戻したらこのURLが使われる。
export const DEFAULT_SYNC_URL =
  "https://kyounow.github.io/pointmax/master.json";

// 各バージョンで追加された主な内容（差分通知に使用）
export const SEED_CHANGELOG: {
  version: number;
  date: string;
  summary: string;
}[] = [
  {
    version: 1,
    date: "2026-05-11",
    summary:
      "PointMax v0.8 リリース。クレカ＋ポイントカードの二重取り計算、支払方法(PaymentApp)の自動最適選択、JAL/ANA等の交換ルート、PWA対応、公式マスタの自動同期を提供",
  },
];

// 保有4枚に最適化したサンプルデータ。
// レートは公式情報に基づく概算値です。キャンペーンや会員ステータスでの上乗せは反映していません。
// 実利用前には公式の最新条件で確認してください。
export const seed = (): {
  cards: Card[];
  currencies: Currency[];
  stores: Store[];
  rules: StoreRule[];
  edges: ConversionEdge[];
  pointCards: PointCard[];
  loyaltyRules: LoyaltyRule[];
  paymentApps: PaymentApp[];
} => {
  const currencies: Currency[] = [
    // 保有カードで貯まる通貨
    {
      id: "jal-mile",
      name: "JALマイル",
      kind: "mile",
      iconChar: "JAL",
      iconColor: "#cc0000",
    },
    {
      id: "rakuten-pt",
      name: "楽天ポイント",
      kind: "point",
      iconChar: "R",
      iconColor: "#bf0000",
    },
    {
      id: "eikyu",
      name: "永久不滅ポイント",
      kind: "point",
      iconChar: "永",
      iconColor: "#1a4f8a",
    },
    {
      id: "v-pt",
      name: "Vポイント",
      kind: "point",
      iconChar: "V",
      iconColor: "#0a4d8c",
    },
    // 直接は紐づかないが交換先として実在
    {
      id: "ana-mile",
      name: "ANAマイル",
      kind: "mile",
      iconChar: "ANA",
      iconColor: "#0d3a8d",
    },
    {
      id: "d-pt",
      name: "dポイント",
      kind: "point",
      iconChar: "d",
      iconColor: "#cc0033",
    },
    {
      id: "amazon-pt",
      name: "Amazonギフト",
      kind: "cashlike",
      iconChar: "a",
      iconColor: "#ff9900",
    },
    {
      id: "jre",
      name: "JRE POINT",
      kind: "point",
      iconChar: "JRE",
      iconColor: "#00ac46",
    },
    {
      id: "edy",
      name: "楽天Edy",
      kind: "cashlike",
      iconChar: "Edy",
      iconColor: "#0066b3",
    },
    {
      id: "paypay",
      name: "PayPayポイント",
      kind: "cashlike",
      iconChar: "PP",
      iconColor: "#ff0033",
    },
    // 提示型ポイントカードで貯まる通貨
    {
      id: "ponta-pt",
      name: "Pontaポイント",
      kind: "point",
      iconChar: "P",
      iconColor: "#e8470a",
    },
    {
      id: "nanaco-pt",
      name: "nanacoポイント",
      kind: "point",
      iconChar: "n",
      iconColor: "#f9a825",
    },
    {
      id: "waon-pt",
      name: "WAONポイント",
      kind: "point",
      iconChar: "W",
      iconColor: "#e60012",
    },
    // クレカ・ホテル系プログラム (現在保有カードでは貯まらないが交換ハブとして実在)
    {
      id: "epos",
      name: "エポスポイント",
      kind: "point",
      iconChar: "EP",
      iconColor: "#0066cc",
    },
    {
      id: "amex-mr",
      name: "AMEXメンバーシップ・リワード",
      kind: "point",
      iconChar: "MR",
      iconColor: "#006fcf",
    },
    {
      id: "marriott",
      name: "Marriott Bonvoy",
      kind: "point",
      iconChar: "MB",
      iconColor: "#a51e36",
    },
    {
      id: "accor",
      name: "ALL Accor",
      kind: "point",
      iconChar: "ACC",
      iconColor: "#0e1b3d",
    },
    {
      id: "jrkyupo",
      name: "JRキューポ",
      kind: "point",
      iconChar: "九",
      iconColor: "#cb0d2a",
    },
  ];

  const cards: Card[] = [
    {
      // ショッピングマイル・プレミアム自動付帯で1.0%。Suicaチャージはビューカードで1.5% JRE
      id: "jal-suica",
      name: "JALカードSuica",
      grade: "CLUB-Aゴールド",
      defaultRate: 0.01,
      defaultCurrencyId: "jal-mile",
    },
    {
      id: "rakuten-card",
      name: "楽天カード",
      grade: "通常",
      defaultRate: 0.01,
      defaultCurrencyId: "rakuten-pt",
    },
    {
      // 国内 1,000円=1永久不滅 (0.1pt/円 → 1pt=5円相当の交換で実質0.5%還元)
      // 海外利用は2倍だが店舗(海外)は別途登録してください
      id: "saison-amex",
      name: "セゾン・アメックス",
      grade: "ゴールド",
      defaultRate: 0.001,
      defaultCurrencyId: "eikyu",
    },
    {
      // 200円=1Vポイント (0.5%)。コンビニ等のタッチ決済で7%還元
      id: "smbc-v",
      name: "三井住友カード",
      grade: "ゴールド (NL)",
      defaultRate: 0.005,
      defaultCurrencyId: "v-pt",
    },
    // 以下、現在ユーザーが保有していない参考カード (d払い/PayPay の特典構造を表現するため必要)
    // ※ v2 でカード有効化機能が実装されるまでは、利用しない場合は保有カードから外して下さい
    {
      // 100円=1ポイント (1.0%)、dカード GOLD なら 1%
      id: "dcard",
      name: "dカード",
      grade: "通常",
      defaultRate: 0.01,
      defaultCurrencyId: "d-pt",
    },
    {
      // 200円=2 PayPayポイント (1.0%)、PayPayカードゴールドなら 1.5%
      id: "paypay-card",
      name: "PayPayカード",
      grade: "通常",
      defaultRate: 0.01,
      defaultCurrencyId: "paypay",
    },
  ];

  const stores: Store[] = [
    // ネット通販
    { id: "rakuten-ichiba", name: "楽天市場", category: "ネット通販" },
    { id: "amazon", name: "Amazon", category: "ネット通販" },
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
    // 飲食 (三井住友ゴールド7%対象が多め)
    { id: "mcdonalds", name: "マクドナルド", category: "飲食" },
    { id: "sukiya", name: "すき家", category: "飲食" },
    { id: "saizeriya", name: "サイゼリヤ", category: "飲食" },
    { id: "gusto", name: "ガスト", category: "飲食" },
    { id: "doutor", name: "ドトール", category: "飲食" },
    { id: "sushiro", name: "スシロー", category: "飲食" },
    { id: "starbucks", name: "スターバックス", category: "飲食" },
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
    {
      id: "daimaru-matsuzakaya",
      name: "大丸・松坂屋",
      category: "JAL特約店",
    },
    {
      id: "muji",
      name: "無印良品 (一部店舗)",
      category: "JAL特約店",
    },
    {
      id: "uniqlo",
      name: "ユニクロ (一部店舗)",
      category: "JAL特約店",
    },
    { id: "royal-host", name: "ロイヤルホスト", category: "JAL特約店" },
    { id: "tsuruha", name: "ツルハドラッグ", category: "JAL特約店" },
    // 百貨店・家電量販店・ドラッグストア (主にdポイント加盟)
    { id: "takashimaya", name: "高島屋", category: "百貨店" },
    { id: "nojima", name: "ノジマ", category: "家電量販店" },
    { id: "cocokara", name: "ココカラファイン", category: "ドラッグストア" },
    { id: "seiyu", name: "西友", category: "スーパー" },
    // 汎用 (デフォルト選択用。基本還元率を確認したい時に使う)
    { id: "general", name: "一般店舗 (規定還元)", category: "汎用" },
  ];

  const rules: StoreRule[] = [
    // 楽天カード × 楽天市場 (通常1% + SPU基本2% = 3%)
    {
      id: "rule-rakuten-ichiba",
      cardId: "rakuten-card",
      storeId: "rakuten-ichiba",
      rate: 0.03,
      currencyId: "rakuten-pt",
      notes: "通常+SPU基本分。SPU上乗せは別途",
    },
    // 三井住友ゴールド(NL) × タッチ決済対象コンビニ・飲食 (7%)
    // ファミマは7%対象外なので別の還元率
    {
      id: "rule-smbc-7eleven",
      cardId: "smbc-v",
      storeId: "conv-7eleven",
      paymentAppId: "pa-visa-touch",
      rate: 0.07,
      currencyId: "v-pt",
      notes: "Visaタッチ決済時(スマホタッチで+α)",
    },
    {
      id: "rule-smbc-lawson",
      cardId: "smbc-v",
      storeId: "conv-lawson",
      rate: 0.07,
      currencyId: "v-pt",
      paymentAppId: "pa-visa-touch",
      notes: "Visaタッチ決済時",
    },
    {
      id: "rule-smbc-mcdonalds",
      cardId: "smbc-v",
      storeId: "mcdonalds",
      rate: 0.07,
      currencyId: "v-pt",
      paymentAppId: "pa-visa-touch",
      notes: "Visaタッチ決済時",
    },
    {
      id: "rule-smbc-ministop",
      cardId: "smbc-v",
      storeId: "conv-ministop",
      rate: 0.07,
      currencyId: "v-pt",
      paymentAppId: "pa-visa-touch",
      notes: "Visaタッチ決済時",
    },
    {
      id: "rule-smbc-sukiya",
      cardId: "smbc-v",
      storeId: "sukiya",
      rate: 0.07,
      currencyId: "v-pt",
      paymentAppId: "pa-visa-touch",
      notes: "Visaタッチ決済時",
    },
    {
      id: "rule-smbc-saizeriya",
      cardId: "smbc-v",
      storeId: "saizeriya",
      rate: 0.07,
      currencyId: "v-pt",
      paymentAppId: "pa-visa-touch",
      notes: "Visaタッチ決済時",
    },
    {
      id: "rule-smbc-gusto",
      cardId: "smbc-v",
      storeId: "gusto",
      rate: 0.07,
      currencyId: "v-pt",
      paymentAppId: "pa-visa-touch",
      notes: "Visaタッチ決済時",
    },
    {
      id: "rule-smbc-doutor",
      cardId: "smbc-v",
      storeId: "doutor",
      rate: 0.07,
      currencyId: "v-pt",
      paymentAppId: "pa-visa-touch",
      notes: "Visaタッチ決済時",
    },
    {
      id: "rule-smbc-sushiro",
      cardId: "smbc-v",
      storeId: "sushiro",
      rate: 0.07,
      currencyId: "v-pt",
      paymentAppId: "pa-visa-touch",
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
      notes: "JAL CARD特約店 100円=2マイル (CLUB-Aゴールド・ショッピングマイルプレミアム込み)",
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
  ];

  // 1単位あたりのレート (例: 楽天pt 1 → ANAマイル 0.5)
  // 実在の公開コースのみ登録
  const edges: ConversionEdge[] = [
    // ============ 楽天ポイント ============
    {
      id: "rakuten-to-ana",
      fromCurrencyId: "rakuten-pt",
      toCurrencyId: "ana-mile",
      rate: 0.5,
      notes: "2pt → 1マイル",
    },
    {
      id: "rakuten-to-edy",
      fromCurrencyId: "rakuten-pt",
      toCurrencyId: "edy",
      rate: 1,
      notes: "1pt → 1円分のEdy",
    },
    {
      id: "rakuten-to-jal",
      fromCurrencyId: "rakuten-pt",
      toCurrencyId: "jal-mile",
      rate: 0.5,
      notes: "2pt → 1マイル (50pt以上、月20,000pt上限)",
    },

    // ============ Vポイント ============
    {
      id: "v-to-ana",
      fromCurrencyId: "v-pt",
      toCurrencyId: "ana-mile",
      rate: 0.5,
      notes: "2pt → 1マイル",
    },
    {
      id: "v-to-edy",
      fromCurrencyId: "v-pt",
      toCurrencyId: "edy",
      rate: 1,
      notes: "VポイントPay/SBI証券積立/iDキャッシュバック等で 1pt=1円相当",
    },
    {
      id: "v-to-waon",
      fromCurrencyId: "v-pt",
      toCurrencyId: "waon-pt",
      rate: 1,
      notes: "1Vポイント = 1WAON POINT (等価交換)。Vポイント→JALマイルへの実用ルート",
    },
    {
      id: "v-to-jrkyupo",
      fromCurrencyId: "v-pt",
      toCurrencyId: "jrkyupo",
      rate: 1,
      notes: "500Vポイント → 500JRキューポ (双方向, 500pt単位)",
    },
    {
      id: "jrkyupo-to-v",
      fromCurrencyId: "jrkyupo",
      toCurrencyId: "v-pt",
      rate: 1,
      notes: "500JRキューポ → 500Vポイント (双方向, 500pt単位)",
    },

    // ============ 永久不滅ポイント (セゾン) ============
    {
      id: "eikyu-to-ana",
      fromCurrencyId: "eikyu",
      toCurrencyId: "ana-mile",
      rate: 3,
      notes: "200pt → 600マイル",
    },
    {
      id: "eikyu-to-jal",
      fromCurrencyId: "eikyu",
      toCurrencyId: "jal-mile",
      rate: 2.5,
      notes: "200pt → 500マイル",
    },
    {
      id: "eikyu-to-d",
      fromCurrencyId: "eikyu",
      toCurrencyId: "d-pt",
      rate: 5,
      notes: "200pt → 1000dポイント",
    },
    {
      id: "eikyu-to-rakuten",
      fromCurrencyId: "eikyu",
      toCurrencyId: "rakuten-pt",
      rate: 4.5,
      notes: "200pt → 900楽天ポイント",
    },
    {
      id: "eikyu-to-amazon",
      fromCurrencyId: "eikyu",
      toCurrencyId: "amazon-pt",
      rate: 5,
      notes: "200pt → 1000円分Amazonギフト券",
    },
    {
      id: "eikyu-to-edy",
      fromCurrencyId: "eikyu",
      toCurrencyId: "edy",
      rate: 4.5,
      notes: "永久不滅ウォレット 100pt=450円相当",
    },

    // ============ dポイント ============
    {
      id: "d-to-jal",
      fromCurrencyId: "d-pt",
      toCurrencyId: "jal-mile",
      rate: 0.5,
      notes: "5000pt → 2500マイル",
    },
    {
      id: "d-to-edy",
      fromCurrencyId: "d-pt",
      toCurrencyId: "edy",
      rate: 1,
      notes: "d払い・店頭利用で 1pt=1円相当",
    },

    // ============ JRE POINT ============
    {
      id: "jre-to-jal",
      fromCurrencyId: "jre",
      toCurrencyId: "jal-mile",
      rate: 0.5,
      notes: "1500pt → 750マイル",
    },
    {
      id: "jre-to-edy",
      fromCurrencyId: "jre",
      toCurrencyId: "edy",
      rate: 1,
      notes: "Suicaチャージ 1pt=1円相当 (Edyと同等の現金相当として登録)",
    },

    // ============ WAON POINT → JALマイル ============
    {
      id: "waon-to-jal",
      fromCurrencyId: "waon-pt",
      toCurrencyId: "jal-mile",
      rate: 0.5,
      notes: "2WAON = 1マイル (50%還元)",
    },

    // ============ クレカ・ホテル系プログラム ============
    // エポスポイント (エポスカードで貯まる)
    {
      id: "epos-to-jal",
      fromCurrencyId: "epos",
      toCurrencyId: "jal-mile",
      rate: 0.5,
      notes: "1,000pt = 500マイル (500pt単位)",
    },
    {
      id: "epos-to-ana",
      fromCurrencyId: "epos",
      toCurrencyId: "ana-mile",
      rate: 0.5,
      notes: "1,000pt = 500マイル",
    },

    // AMEXメンバーシップ・リワード (AMEXプロパーカードで貯まる)
    {
      id: "amex-to-jal",
      fromCurrencyId: "amex-mr",
      toCurrencyId: "jal-mile",
      rate: 0.4,
      notes: "メンバーシップ・リワード・プラス加入時 2,500pt = 1,000マイル (通常 3,000:1,000)",
    },
    {
      id: "amex-to-ana",
      fromCurrencyId: "amex-mr",
      toCurrencyId: "ana-mile",
      rate: 0.8,
      notes: "MRプラス + ANAコース加入時 1,250pt = 1,000マイル",
    },

    // Marriott Bonvoy (Marriott系ホテル・SPGアメックス等で貯まる)
    {
      id: "marriott-to-jal",
      fromCurrencyId: "marriott",
      toCurrencyId: "jal-mile",
      rate: 0.333,
      notes: "3pt = 1マイル。60,000pt一括で +5,000ボーナス (実質 60k:25k)",
    },
    {
      id: "marriott-to-ana",
      fromCurrencyId: "marriott",
      toCurrencyId: "ana-mile",
      rate: 0.333,
      notes: "3pt = 1マイル。60,000pt一括で +5,000ボーナス",
    },

    // ALL Accor (Accor系ホテルで貯まる)
    {
      id: "accor-to-jal",
      fromCurrencyId: "accor",
      toCurrencyId: "jal-mile",
      rate: 0.5,
      notes: "4,000pt = 2,000マイル (2:1)",
    },
    {
      id: "jal-to-accor",
      fromCurrencyId: "jal-mile",
      toCurrencyId: "accor",
      rate: 0.4,
      notes: "10,000マイル = 4,000pt (5,000マイル単位 = 1,000pt も可)",
    },

    // ============ JALマイル / ANAマイル → ポイント・現金相当 ============
    // マイル消費の選択肢として現金/ポイントへ流せる経路
    {
      id: "jal-to-d",
      fromCurrencyId: "jal-mile",
      toCurrencyId: "d-pt",
      rate: 1,
      notes: "10,000マイル → 10,000dポイント",
    },
    {
      id: "jal-to-edy",
      fromCurrencyId: "jal-mile",
      toCurrencyId: "edy",
      rate: 1.5,
      notes: "eJALポイント等のまとめ交換で 1マイル≒1.5円相当",
    },
    {
      id: "ana-to-v",
      fromCurrencyId: "ana-mile",
      toCurrencyId: "v-pt",
      rate: 1,
      notes: "10,000マイル → 10,000Vポイント (旧Tポイント提携)",
    },
    {
      id: "ana-to-edy",
      fromCurrencyId: "ana-mile",
      toCurrencyId: "edy",
      rate: 1,
      notes: "ANA SKYコインで 1マイル=1円相当",
    },

    // ============ Pontaポイント ============
    {
      id: "ponta-to-jal",
      fromCurrencyId: "ponta-pt",
      toCurrencyId: "jal-mile",
      rate: 0.5,
      notes: "2pt → 1マイル",
    },
    {
      id: "ponta-to-d",
      fromCurrencyId: "ponta-pt",
      toCurrencyId: "d-pt",
      rate: 1,
      notes: "Pontaポイント ⇄ dポイント 1:1 相互交換",
    },
    {
      id: "d-to-ponta",
      fromCurrencyId: "d-pt",
      toCurrencyId: "ponta-pt",
      rate: 1,
      notes: "dポイント ⇄ Pontaポイント 1:1 相互交換",
    },
    {
      id: "ponta-to-edy",
      fromCurrencyId: "ponta-pt",
      toCurrencyId: "edy",
      rate: 1,
      notes: "ローソン店頭利用等で 1pt=1円相当",
    },

    // ============ WAONポイント ============
    {
      id: "waon-to-edy",
      fromCurrencyId: "waon-pt",
      toCurrencyId: "edy",
      rate: 1,
      notes: "WAON電子マネーへのチャージ 1pt=1円分 (Edyと同等の現金相当として登録)",
    },

    // ============ nanacoポイント ============
    // nanaco POINT は基本セブン&iグループ内消費。
    // 1pt = 1円分の電子マネーnanacoへ交換可能なので、現金相当として edy に同質マッピング
    {
      id: "nanaco-to-edy",
      fromCurrencyId: "nanaco-pt",
      toCurrencyId: "edy",
      rate: 1,
      notes: "電子マネーnanacoへのチャージ 1pt=1円分 (Edyと同等の現金相当として登録)",
    },
  ];

  // ポイントカード（クレカ決済とは別軸の店頭提示で貯めるカード）
  // 配列順 = ユーザー全体優先順位 (PointCardsScreen で↑↓ボタンで変更可)
  // 1:楽天 / 2:V / 3:d / 4:Ponta / 5:nanaco / 6:WAON
  const pointCards: PointCard[] = [
    {
      id: "rakuten-pointcard",
      name: "楽天ポイントカード",
      currencyId: "rakuten-pt",
    },
    {
      id: "vpoint-card",
      name: "Vポイントカード(旧Tカード)",
      currencyId: "v-pt",
    },
    {
      id: "d-pointcard",
      name: "dポイントカード",
      currencyId: "d-pt",
    },
    {
      id: "ponta-card",
      name: "Pontaカード",
      currencyId: "ponta-pt",
    },
    {
      id: "nanaco-card",
      name: "nanacoカード",
      currencyId: "nanaco-pt",
    },
    {
      id: "waon-card",
      name: "WAONカード",
      currencyId: "waon-pt",
    },
  ];

  // 店舗 × ポイントカードの提示還元 (二重取り用)
  const loyaltyRules: LoyaltyRule[] = [
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

  // 支払アプリ／決済方法
  // compatibleCardIds: 空 = どのカードでもOK / 非空 = リスト内のカードのみ
  // defaultBonusRate: その支払アプリ自体の還元 (チャージ元カードの還元とは別軸)
  const paymentApps: PaymentApp[] = [
    {
      id: "pa-default",
      name: "通常クレカ決済",
      iconChar: "CC",
      iconColor: "#6b7280",
      paymentMode: "physical",
      notes: "クレジットカードをそのまま提示・暗証番号 / サインで支払い",
    },
    {
      id: "pa-visa-touch",
      name: "Visaタッチ",
      iconChar: "V",
      iconColor: "#1a3a8c",
      paymentMode: "physical",
      notes: "三井住友など Visaタッチ対応カード (非接触決済)",
    },
    {
      id: "pa-quickpay",
      name: "QUICPay",
      iconChar: "QP",
      iconColor: "#ff6600",
      paymentMode: "physical",
      notes: "JCB系の非接触決済",
    },
    {
      id: "pa-id",
      name: "iD",
      iconChar: "iD",
      iconColor: "#ec1c24",
      paymentMode: "physical",
      notes: "ドコモ系の非接触決済",
    },
    // 楽天Pay (チャージ式)。楽天カード経由のみ還元、他社カードは 0% 進呈なし
    {
      id: "pa-rakuten-pay",
      name: "楽天Pay",
      iconChar: "RP",
      iconColor: "#bf0000",
      defaultBonusRate: 0,
      defaultBonusCurrencyId: "rakuten-pt",
      chargeBased: true,
      paymentMode: "charge",
      cardSpecificBonusRates: [
        {
          cardId: "rakuten-card",
          rate: 0.015,
          notes:
            "楽天カードから楽天キャッシュへチャージ 0.5% + 楽天Pay 利用 1.0% = 1.5%",
        },
      ],
      notes:
        "楽天カードからチャージで 1.5%、他社カードからのチャージ/連携は 0% (進呈なし)",
    },
    // d払い (チャージ式 or 直接連携)。dカード連携時のみ還元、他社カードは 0% 進呈なし
    // 公式: https://service.smt.docomo.ne.jp/keitai_payment/guide/wallet/payment.html
    {
      id: "pa-d-pay",
      name: "d払い",
      iconChar: "dP",
      iconColor: "#cc0033",
      defaultBonusRate: 0,
      defaultBonusCurrencyId: "d-pt",
      chargeBased: true,
      paymentMode: "charge",
      cardSpecificBonusRates: [
        {
          cardId: "dcard",
          rate: 0.01,
          notes: "d払い基本還元率 0.5% + dカード支払い特典 0.5% = 1.0%",
        },
      ],
      notes:
        "dカード連携で 1.0%、dカード以外のクレジットカードでは d払い還元は 進呈なし (0%)",
    },
    // PayPay (チャージ式)。PayPayカード連携時のみ還元、他社カードは 0%
    {
      id: "pa-paypay",
      name: "PayPay",
      iconChar: "PP",
      iconColor: "#ff0033",
      defaultBonusRate: 0,
      defaultBonusCurrencyId: "paypay",
      chargeBased: true,
      paymentMode: "charge",
      cardSpecificBonusRates: [
        {
          cardId: "paypay-card",
          rate: 0.005,
          notes: "PayPayカードからチャージ + PayPay 利用で 0.5%",
        },
      ],
      notes:
        "PayPayカード連携で 0.5%、他社カードからのチャージは 2025/8 以降 還元対象外",
    },
  ];

  // 自動同期 (scripts/sync/apply-proposals.ts) が seed-additions.ts に書き込んだ
  // 追加分を concat する。手書きの定義が常に前、追加分が後。
  // id が重複した場合は handwritten が勝つ (filter で排除)。
  // BLOCKED_STORE_IDS にある store と、それを参照する rules/loyaltyRules は除外。
  const addedStoreIds = new Set(stores.map((s) => s.id));
  const addedCardIds = new Set(cards.map((c) => c.id));
  const addedPaymentAppIds = new Set(paymentApps.map((p) => p.id));

  return {
    currencies,
    cards: [...cards, ...ADDED_CARDS.filter((c) => !addedCardIds.has(c.id))],
    stores: [
      ...stores,
      ...ADDED_STORES.filter(
        (s) => !addedStoreIds.has(s.id) && !BLOCKED_STORE_IDS.has(s.id),
      ).map((s) => ({
        ...s,
        category: resolveCategory(s.category),
      })),
    ],
    rules: [
      ...rules,
      ...ADDED_RULES.filter(
        (r) => !r.storeId || !BLOCKED_STORE_IDS.has(r.storeId),
      ),
    ],
    edges,
    pointCards,
    loyaltyRules: [
      ...loyaltyRules,
      ...ADDED_LOYALTY_RULES.filter((r) => !BLOCKED_STORE_IDS.has(r.storeId)),
    ],
    paymentApps: [
      ...paymentApps,
      ...ADDED_PAYMENT_APPS.filter((p) => !addedPaymentAppIds.has(p.id)),
    ],
  };
};
