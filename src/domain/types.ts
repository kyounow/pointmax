// 通貨／ポイント種別。例: "楽天ポイント", "ANAマイル", "Vポイント"
// kind は表示色分けに使用 (任意)
export type CurrencyKind = "point" | "mile" | "cashlike";

export type Currency = {
  id: string;
  name: string;
  kind?: CurrencyKind;
  iconChar?: string; // 円形アイコンに表示する文字 (例: "R", "JAL")
  iconColor?: string; // アイコン背景色 (例: "#bf0000")
  iconUrl?: string; // 任意の画像URL (指定時は文字より優先)
};

// クレジットカード。defaultCurrencyId に貯まる通貨を1つ持つ（仕様(b)）
// グレード（普通/ゴールド/プラチナ等）は同一ブランド内で還元率が変わるため、
// 任意フィールドで保持してUI上で区別表示する
// enabled: undefined または true = 有効（デフォルト。既存 localStorage データとの後方互換）
//          false = 無効（Calculator の順位付けから除外される）
export type Card = {
  id: string;
  name: string;
  grade?: string;
  defaultRate: number; // 0.01 = 1%
  defaultCurrencyId: string;
  enabled?: boolean;
};

// プルダウン用店舗マスタ
// maxLoyaltyStacks: ポイントカードを同時に複数提示できる数 (default 1)
//   例: 多くの店は1、紀伊國屋等で複数加盟ある場合は2以上
// preferredPointCardIds: この店舗で同点還元時に優先的に選ぶポイントカードID（順序付き）
//   例: ファミマで Vポイントを優先したい場合 ["vpoint-card"]
//   未指定の場合は PointCards 画面のユーザー優先順を使用
export type Store = {
  id: string;
  name: string;
  category?: string;
  maxLoyaltyStacks?: number;
  preferredPointCardIds?: string[];
};

// カード×店舗(直接) または カード×カテゴリ(間接) のルール
// storeId と category のいずれか一方を指定する。両方指定された場合は storeId が優先
// paymentAppId が指定されている場合、その PaymentApp で決済した時のみ適用される
//   未指定なら全ての (chargeBased=false) 支払方法で適用される汎用ルール
// monthlyCapAmountYen は情報表示用（年/月の上限が決まっている特約） — 計算には影響しない
//
// validFrom / validTo: キャンペーン期間 (ISO 日付 YYYY-MM-DD)
//   両方未指定 = 常時有効。validTo の日付の終わり (23:59:59) まで有効。
//   期間外のルールは resolveRate / paymentApp / loyalty で無視される。
//   同じ specificity (storeId / category) の active ルールが複数あれば
//   最高 rate のものが選ばれる (通常 1% + キャンペーン 5% → 5%)。
export type StoreRule = {
  id: string;
  cardId: string;
  storeId?: string;
  category?: string;
  paymentAppId?: string;
  rate: number;
  currencyId: string;
  monthlyCapAmountYen?: number;
  notes?: string;
  validFrom?: string;
  validTo?: string;
};

// ポイント交換エッジ。fromCurrencyId 1単位 → toCurrencyId rate単位
export type ConversionEdge = {
  id: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: number;
  notes?: string;
};

// ポイントカード（クレカ決済とは別軸の、店頭提示で貯まるカード）
// 例: dポイントカード, 楽天ポイントカード, Pontaカード
export type PointCard = {
  id: string;
  name: string;
  currencyId: string;
  notes?: string;
};

// 「店舗 × ポイントカード」の還元ルール。クレカ決済還元と二重取りで使う
// validFrom / validTo: StoreRule と同じくキャンペーン期間
export type LoyaltyRule = {
  id: string;
  storeId: string;
  pointCardId: string;
  rate: number;
  currencyId?: string; // 通常は PointCard.currencyId と同じ。差異がある時のみ上書き
  notes?: string;
  validFrom?: string;
  validTo?: string;
};

// 支払アプリ（楽天Pay/d払い/PayPay/Visaタッチ等）
// クレジットカードに紐づいた決済方法で、決済アプリ自体の還元（bonus）を持つ
// compatibleCardIds: このアプリで決済する際に使えるカード（チャージ/紐づけ元）
//   空配列 / undefined = どのクレカでもOK (Visaタッチ等の汎用)
//   要素あり = リスト内のカードのみ使用可能 (楽天Pay × 楽天カードなど)
// chargeBased: true なら「カードからアプリ残高にチャージして決済」型 (楽天Pay/d払い/PayPay)
//   false / undefined ならカードを直接使う型 (通常クレカ/Visaタッチ/QUICPay/iD)
//   表示でカードとアプリの主従関係を切り替える + 店舗ルール(JAL特約店2%等)を bypass
// paymentMode: チャージ式か直接連携かを明示 (UX 表示用)
//   "charge": 残高にチャージしてから決済 (chargeBased=true と等価表現)
//   "direct": カードを支払い元として紐付け (連携式)
//   "physical": 物理カード or タッチ決済 (default)
//   省略時は chargeBased から導出
// defaultBonusRate / defaultBonusCurrencyId: 紐付けカードによらず付与される還元 (デフォルト)
// cardSpecificBonusRates: 紐付けカード固有の還元 (cardId 一致時に default を上書き)
//   例 d払い: 「dカードのみ 1.0%、他は 0%」 → defaultBonusRate=0,
//        cardSpecificBonusRates=[{cardId:"dcard", rate:0.01}]
export type PaymentApp = {
  id: string;
  name: string;
  iconChar?: string;
  iconColor?: string;
  compatibleCardIds?: string[];
  defaultBonusRate?: number;
  defaultBonusCurrencyId?: string;
  chargeBased?: boolean;
  paymentMode?: "charge" | "direct" | "physical";
  cardSpecificBonusRates?: {
    cardId: string;
    rate: number;
    currencyId?: string; // 省略時は defaultBonusCurrencyId
    notes?: string;
  }[];
  notes?: string;
};
