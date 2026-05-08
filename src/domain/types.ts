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
export type Store = {
  id: string;
  name: string;
  category?: string;
};

// カード×店舗(直接) または カード×カテゴリ(間接) のルール
// storeId と category のいずれか一方を指定する。両方指定された場合は storeId が優先
export type StoreRule = {
  id: string;
  cardId: string;
  storeId?: string;
  category?: string;
  rate: number;
  currencyId: string;
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
