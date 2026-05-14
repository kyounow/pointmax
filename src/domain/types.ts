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
  // 月内の特定日にのみ有効になる繰り返しパターン (任意)。
  // 値の範囲は 1〜31 (日付)。例: 楽天「5と0のつく日」→ [5, 10, 15, 20, 25, 30]。
  // undefined / 空配列 = 日付制限なし (常時有効、既存挙動)。
  // 1 件以上 = 「今日 (now.getDate())」がリスト内にある時のみアクティブ。
  // validFrom/validTo の範囲チェックと **AND** で結合される (期間内かつ recurring 日付一致)。
  recurringDays?: number[];
};

// ポイント交換エッジ。fromCurrencyId 1単位 → toCurrencyId rate単位
export type ConversionEdge = {
  id: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: number;
  // この交換ルートを利用するために保有が必要なクレジットカードIDのリスト (任意)。
  // undefined / 空配列 = 制約なし (誰でも利用可能)。
  // 1件以上 = リスト内のいずれか1枚を「保有 (enabled !== false)」している場合のみ利用可 (OR semantics)。
  // 例: JRE → JAL マイル の交換は JALカードSuica 保有者特典 → requiredCardIds: ["jal-suica"]
  // 参照する id は Card.id (PointCard.id ではない)。
  requiredCardIds?: string[];
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
  // 月内の特定日にのみ有効になる繰り返しパターン (任意)。
  // 値の範囲は 1〜31 (日付)。例: 楽天「5と0のつく日」→ [5, 10, 15, 20, 25, 30]。
  // undefined / 空配列 = 日付制限なし (常時有効、既存挙動)。
  // 1 件以上 = 「今日 (now.getDate())」がリスト内にある時のみアクティブ。
  // validFrom/validTo の範囲チェックと **AND** で結合される (期間内かつ recurring 日付一致)。
  recurringDays?: number[];
};

// PointMax v3: 還元プログラム
// 「(発動者 × 場所 × 還元率)」を統一表現。
// 旧 StoreRule / LoyaltyRule / PaymentApp.cardSpecificBonusRates の上位概念。
//
// 発動条件は cardIds / pointCardId / paymentAppId のいずれか or 組合せで指定。
// 該当しない program はその場面で無視される。
//
// store への加盟関係は StoreProgramMembership (M2M) で別管理。
// membership が一件も無い program は「全 store に適用」と解釈 (= PaymentApp の上乗せ系で使う)。
export type BenefitProgram = {
  id: string;                      // 例: "prog-jal-tokuyaku"
  name: string;                    // 例: "JALカード特約店"

  // ─── 発動要件 ───
  cardIds?: string[];              // クレカ保有者 (OR セマンティクス)
  pointCardId?: string;            // 提示するポイントカード (loyalty 系)
  paymentAppId?: string;           // 特定 paymentApp 経由限定

  // ─── 還元内容 ───
  rate: number;
  currencyId: string;

  // bonusType: 加算方式
  //   "primary" (default): 候補同士で最大 rate を選んで採用 (排他的)
  //   "addOn":             既存還元の上に上乗せ加算
  bonusType?: "primary" | "addOn";

  // ─── 期間 ───
  validFrom?: string;
  validTo?: string;
  recurringDays?: number[];

  // ─── Meta ───
  description?: string;
  officialUrl?: string;
  conditions?: string;             // 「ショッピングマイル・プレミアム加入時」等
  monthlyCapAmountYen?: number;
  notes?: string;
};

// 店舗 × プログラム M2M
// program.id (= BenefitProgram.id) と store.id を結ぶ。
// override は店舗ごとの個別 rate/currency 上書き (例: 同 program で大半 0.5% だが
// 一部店舗だけ 1% の override が必要なケース)。
export type StoreProgramMembership = {
  programId: string;
  storeId: string;
  overrideRate?: number;
  overrideCurrencyId?: string;
  notes?: string;
};

// 支払アプリ（楽天Pay/d払い/PayPay/Visaタッチ等）
// クレジットカードに紐づいた決済方法で、決済アプリ自体の還元（bonus）を持つ
// compatibleCardIds: このアプリで決済する際に使えるカード（チャージ/紐づけ元）
//   空配列 / undefined = どのクレカでもOK (Visaタッチ等の汎用)
//   要素あり = リスト内のカードのみ使用可能 (楽天Pay × 楽天カードなど)
// chargeBased: true なら「カードからアプリ残高にチャージして決済」型 (楽天Pay/d払い/PayPay)
//   false / undefined ならカードを直接使う型 (通常クレカ/Visaタッチ/QUICPay/iD)
//   chargeBased=true の場合、カード自身の還元 (card.defaultRate) は加算しない。
//   チャージ時の還元は通常ゼロ (例: 楽天カード→d払い残高チャージは還元対象外)。
//   表示でカードとアプリの主従関係を切り替える + 店舗ルール(JAL特約店2%等)を bypass
// paymentMode: チャージ式か直接連携かを明示 (UX 表示用)
//   "charge": 残高にチャージしてから決済 (chargeBased=true と等価表現)
//   "direct": カードを支払い元として紐付け (連携式)
//   "physical": 物理カード or タッチ決済 (default)
//   省略時は chargeBased から導出
// defaultBonusRate: ベース還元 (全カード共通の最低値)。
//   chargeBased=true の場合、これが実質的なアプリ利用時の基本還元率となる。
// defaultBonusCurrencyId: defaultBonusRate で貯まる通貨 (省略時は null)
// cardSpecificBonusRates: defaultBonusRate に対する上乗せ加算分 (差分)。
//   「特定カードを paymentApp で使った時の追加 bonus」を表現。
//   例 d払い: defaultBonusRate=0、cardSpecific=[{cardId:"dcard", rate:0.01}]
//     → 楽天カード × d払い = 0 (default) + 0 (該当 cardSpecific なし) = 0%
//     → dカード × d払い   = 0 (default) + 0.01 (cardSpecific) = 1.0%
//   例 au PAY: defaultBonusRate=0.005、cardSpecific=[{cardId:"au-pay-card", rate:0.01}]
//     → 楽天カード × au PAY = 0.005 + 0 = 0.5%
//     → au PAY カード × au PAY = 0.005 + 0.01 = 1.5%
export type PaymentApp = {
  id: string;
  name: string;
  iconChar?: string;
  iconColor?: string;
  compatibleCardIds?: string[];
  // ベース還元 (全カード共通の最低値)。chargeBased=true ではアプリ利用時の基本還元率。
  defaultBonusRate?: number;
  defaultBonusCurrencyId?: string;
  chargeBased?: boolean;
  paymentMode?: "charge" | "direct" | "physical";
  // PaymentApp のベース bonus (defaultBonusRate) に対する **上乗せ加算分**。
  // 「特定カードを paymentApp で使った時の追加 bonus」を表現。
  // 例: d払い defaultBonusRate=0、cardSpecific=[{cardId:"dcard", rate:0.01}]
  //     → 楽天カード × d払い = 0 (default) + 0 (該当 cardSpecific なし) = 0%
  //     → dカード × d払い = 0 (default) + 0.01 (cardSpecific) = 1.0%
  // 例: au PAY defaultBonusRate=0.005、cardSpecific=[{cardId:"au-pay-card", rate:0.01}]
  //     → 楽天カード × au PAY = 0.005 + 0 = 0.5%
  //     → au PAY カード × au PAY = 0.005 + 0.01 = 1.5%
  //
  // validFrom/validTo は entry の有効期間 (任意)。期限切れ entry は無視される。
  //   両方なし → 常時有効。validFrom のみ → 公式プログラム。両方 → 期間限定。
  //   解釈ルールは StoreRule.validFrom/validTo と同一。
  cardSpecificBonusRates?: {
    cardId: string;
    rate: number;
    currencyId?: string; // 省略時は defaultBonusCurrencyId
    notes?: string;
    validFrom?: string;
    validTo?: string;
  }[];
  // enabled: undefined または true = 有効 (デフォルト。既存 localStorage との後方互換)
  //          false = 無効 (Calculator の順位付けから除外される)
  // 「使ってない決済アプリを表示から消す」用途。Card.enabled と同じセマンティクス。
  enabled?: boolean;
  notes?: string;
};
