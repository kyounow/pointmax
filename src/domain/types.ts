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
export type Card = {
  id: string;
  name: string;
  grade?: string;
  defaultRate: number; // 0.01 = 1%
  defaultCurrencyId: string;
};

// プルダウン用店舗マスタ
// maxLoyaltyStacks: ポイントカードを同時に複数提示できる数 (default 1)
//   例: 多くの店は1、紀伊國屋等で複数加盟ある場合は2以上
export type Store = {
  id: string;
  name: string;
  category?: string;
  maxLoyaltyStacks?: number;
};

// カード×店舗(直接) または カード×カテゴリ(間接) のルール
// storeId と category のいずれか一方を指定する。両方指定された場合は storeId が優先
// paymentMethod / paymentAppId があれば、計算時に同じ支払い方法を選んだ場合のみ適用される
//   - paymentAppId は新方式 (PaymentApp.id 参照)
//   - paymentMethod は旧方式 (任意文字列)。後方互換性のため残す
// monthlyCapAmountYen は情報表示用（年/月の上限が決まっている特約） — 計算には影響しない
export type StoreRule = {
  id: string;
  cardId: string;
  storeId?: string;
  category?: string;
  paymentMethod?: string;
  paymentAppId?: string;
  rate: number;
  currencyId: string;
  monthlyCapAmountYen?: number;
  notes?: string;
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
export type LoyaltyRule = {
  id: string;
  storeId: string;
  pointCardId: string;
  rate: number;
  currencyId?: string; // 通常は PointCard.currencyId と同じ。差異がある時のみ上書き
  notes?: string;
};

// 支払アプリ（楽天Pay/d払い/PayPay/Visaタッチ等）
// クレジットカードに紐づいた決済方法で、決済アプリ自体の還元（bonus）を持つ
// compatibleCardIds: このアプリで決済する際に使えるカード（チャージ/紐づけ元）
//   空配列 / undefined = どのクレカでもOK (Visaタッチ等の汎用)
//   要素あり = リスト内のカードのみ使用可能 (楽天Pay × 楽天カードなど)
export type PaymentApp = {
  id: string;
  name: string;
  iconChar?: string;
  iconColor?: string;
  compatibleCardIds?: string[];
  defaultBonusRate?: number;
  defaultBonusCurrencyId?: string;
  notes?: string;
};
