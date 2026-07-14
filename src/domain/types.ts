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
// userModifiedAt: ユーザが substantive フィールド (name/grade/defaultRate/defaultCurrencyId)
//   を編集した日時 (ISO 8601)。セットされていると master であっても「公式」バッジが外れる。
//   定義は SUBSTANTIVE_CARD_FIELDS (src/state/userModified.ts) を参照。
//   undefined = 編集されていない (=「公式」表記そのまま) / 文字列 = 編集済み。
//   enabled トグル等の preference 変更は substantive ではないので変化なし。
export type Card = {
  id: string;
  name: string;
  grade?: string;
  defaultRate: number; // 0.01 = 1%
  defaultCurrencyId: string;
  enabled?: boolean;
  userModifiedAt?: string;
  // familyId: 同一ブランドのグレード系列を束ねる family の id (CARD_FAMILIES を参照)。
  //   例: epos-card / epos-gold / epos-platinum は同じ "family-epos" に属する。
  //   family が exclusive (CardFamily.exclusive=true) の場合、store の enabled トグルで
  //   「同 family の 1 枚だけ有効」という排他 invariant が適用される (物理的に切替型のカード)。
  //   undefined = family に属さない単独カード (排他対象外)。
  //   参照先の実在性は src/state/validators.ts が import 検証、seed 契約は seed.test.ts が担保。
  familyId?: string;
  // gradeLevel: family 内での並び順専用 (1=一般 / 2=ゴールド / 3=プラチナ 等)。
  //   **計算には一切使用しない** (還元率やゲートに影響しない、純粋に表示順のヒント)。
  //   family 内で重複しないこと (seed.test.ts で担保)。undefined = 単独カード。
  gradeLevel?: number;
};

// カードの family (同一ブランドのグレード系列)。Card.familyId が参照する静的マスタ。
// CARD_FAMILIES (src/state/seed-data-card-families.ts) が唯一の定義源で、
// seed() の戻り値には含めず (SeedShape 不変)、UI / domain / validators から直接 import する。
//
// exclusive=true : 「物理的に同時保有しない切替型」。同 family のカードは同時に 1 枚しか
//   有効化できず、あるカードを ON にすると兄弟カードが自動 OFF になる (store の排他 invariant)。
//   例: EPOS の 3 グレード (一般/ゴールド/プラチナ)、JALカードSuica の 普通/ゴールド。
// exclusive=false: 併存保有可。同 family でも複数枚を同時に有効化できる (排他しない)。
//   例: JCB CARD W と JCB ゴールドは別カードとして両方保有・利用できる。
//
// YAGNI (PR-1c 設計判断): family 全体を参照する派生 (requiredCardFamilyIds /
//   cardFamilyIds の静的展開) は本 PR では実装しない。現 seed は明示 cardIds で動いており
//   family を参照する消費者が不在のため。導入条件は「family 全体を参照する edge/program が
//   実際に必要になった時」で、その際は seed() 内・applyProgramOverrides の後に展開を置く。
export type CardFamily = {
  id: string;
  name: string;
  exclusive: boolean;
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
// enabled: undefined または true = 使う（デフォルト。既存 localStorage データとの後方互換）
//          false = 使わない。v6.0.0 で追加。Card.enabled と同セマンティクス。
//   効果は 2 つ:
//   (1) loyalty (店頭提示の二重取り) 候補から除外される
//   (2) このポイントカードの通貨が交換ルート (bestPath) の起点・経由から除外される。
//       除外の強さは画面で異なる (src/domain/currencyGating.ts):
//         - Calculator: computeBlockedCurrencyIds (通常)。有効クレカ等が同通貨を貯めるなら維持。
//         - EdgesScreen: computeStrictBlockedCurrencyIds (強い)。有効な別 pointCard が同通貨を
//           持つ場合のみ維持し、有効クレカが貯めても除外する (探索ツールとして OFF 意図を尊重)。
export type PointCard = {
  id: string;
  name: string;
  currencyId: string;
  enabled?: boolean;
  notes?: string;
};

// 「店舗 × ポイントカード」の還元ルール。クレカ決済還元と二重取りで使う
// validFrom / validTo: StoreRule と同じくキャンペーン期間
//
// @deprecated v3 PR 3: BenefitProgram (pointCardId フィールド) に統合。
// ユーザーカスタムルール (UI 経由追加) には引き続き使用可。
// seed データは programs/memberships に移行済み。master.json は loyaltyRules: [] で出力。
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
  // 特定曜日にのみ有効になる繰り返しパターン (任意、改善計画 C-6)。
  // 値の範囲は 0〜6 (0=日曜 .. 6=土曜)。例: 「毎週日曜 +N%」→ [0]。
  // undefined / 空配列 = 曜日制限なし。1 件以上 = 「今日 (now.getDay())」が
  // リスト内にある時のみアクティブ。validFrom/validTo/recurringDays と **AND** 結合。
  recurringWeekdays?: number[];
};

// PointMax v3: 還元プログラム
// 「(発動者 × 場所 × 還元率)」を統一表現。
// 旧 StoreRule / LoyaltyRule / PaymentApp.cardSpecificBonusRates の上位概念。
//
// 発動条件は cardIds / pointCardId / paymentAppId のいずれか or 組合せで指定。
// 該当しない program はその場面で無視される。
//
// store への加盟関係は StoreProgramMembership (M2M) で別管理。
export type BenefitProgram = {
  id: string;                      // 例: "prog-jal-tokuyaku"
  name: string;                    // 例: "JALカード特約店"

  // 適用範囲 (v6 で必須化)。membership 行数からの推論 (旧挙動: membership が
  // 一件も無い program = 全 store 適用) は廃止し、明示フィールドで表す。
  //   "all-stores"    : 全 store に適用 (= PaymentApp のベース/上乗せ系)。
  //                     membership を持ってはいけない (validators で矛盾検出)。
  //   "member-stores" : membership のある store のみに適用 (loyalty / 特約店系)。
  scope: "all-stores" | "member-stores";

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
  recurringDays?: number[];     // 毎月の日にち限定 (1-31)。LoyaltyRule と同セマンティクス
  recurringWeekdays?: number[]; // 曜日限定 (0=日..6=土)。LoyaltyRule と同セマンティクス (C-6)

  // ─── Meta ───
  description?: string;
  officialUrl?: string;            // 情報源 URL (詳細・解説ページ)
  // エントリー / 参加サイトの URL (任意)。officialUrl と分離する理由:
  //   - officialUrl は「制度を説明する公式ページ」(例: JAL カード特約店一覧)
  //   - entryUrl は「ユーザーが踏む先」(例: キャンペーンエントリーページ、提携店検索)
  // entryUrl がセットされている program は UI で「エントリー」リンクを露出。
  // 「キャンペーンサイトのトップページ」レベルでも構わない (深いリンクで切れる懸念回避)。
  entryUrl?: string;
  conditions?: string;             // 「ショッピングマイル・プレミアム加入時」等
  monthlyCapAmountYen?: number;
  notes?: string;
  // ユーザ編集トラッキング (Card.userModifiedAt と同じセマンティクス)。
  // ProgramsScreen は現状 read-only なので将来の編集動線追加に備えた future-proof フィールド。
  userModifiedAt?: string;
};

// 店舗 × プログラム M2M
// program.id (= BenefitProgram.id) と store.id を結ぶ。
// override は店舗ごとの個別 rate/currency 上書き (例: 同 program で大半 0.5% だが
// 一部店舗だけ 1% の override が必要なケース)。
//
// id: v6 で必須化。規約は `m-{programId}-{storeId}` (program × store は一意)。
//   生成は src/state/defineMemberships.ts の membershipId() が唯一の源で、
//   直書きせず必ず同関数 (or defineMemberships DSL) を経由する。
//   v6 以前の (programId, storeId) 複合キー運用 (mergeSeed の `:` / `|` 区切り
//   キー) は廃止し、他エンティティと同じ id ベースの merge / tombstone に統一。
// userModifiedAt: ユーザが overrideRate/overrideCurrencyId/notes を編集した日時
//   (ISO 8601)。Card.userModifiedAt と同セマンティクス。id ベースの add-only
//   merge では既存 id は上書きされないため、編集済み membership は構造的に保護
//   される (公式 override 更新は既存 id には伝播しない = 現行挙動維持)。
export type StoreProgramMembership = {
  id: string;
  programId: string;
  storeId: string;
  overrideRate?: number;
  overrideCurrencyId?: string;
  notes?: string;
  userModifiedAt?: string;
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
//
// @deprecated v3 PR 3: defaultBonusRate / defaultBonusCurrencyId / cardSpecificBonusRates は
// BenefitProgram (prog-*-base / prog-*-addon) に移行済み。
// 後方互換のためフィールドは残すが、programEvaluator が評価源。
export type PaymentApp = {
  id: string;
  name: string;
  iconChar?: string;
  iconColor?: string;
  compatibleCardIds?: string[];
  chargeBased?: boolean;
  paymentMode?: "charge" | "direct" | "physical";
  // enabled: undefined または true = 有効 (デフォルト。既存 localStorage との後方互換)
  //          false = 無効 (Calculator の順位付けから除外される)
  // 「使ってない決済アプリを表示から消す」用途。Card.enabled と同じセマンティクス。
  enabled?: boolean;
  notes?: string;
  // ユーザ編集トラッキング。Card.userModifiedAt と同じセマンティクス。
  // 対象 substantive フィールド: name / paymentMode / chargeBased / compatibleCardIds / notes。
  // iconChar / iconColor / enabled は cosmetic or preference 扱いで対象外。
  userModifiedAt?: string;
};
