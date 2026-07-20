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
  // yenValue: 1 単位 ≒ 円の公式目安値 (DB-2)。円換算タブの仮想ターゲットと、edge レートの
  //   妥当性 validator (seed 契約) に使う。**目安**であり、path が存在する通貨間は edge の
  //   rate 積が正 (= rate × yenValue(to) / yenValue(from) が概ね 1 付近、README 規約を参照)。
  //   根拠が薄い通貨 (価値が使い方で大きく変わるマイル/ホテル系等) は付けず undefined のまま
  //   にする (= 円換算比較から除外)。
  //   ユーザー上書きは store.yenValueOverrides に保持する (Currency 行そのものは編集不可 —
  //   syncFromUrl の全置換で消えるため。override は user-owned な永続キーで sync に耐える)。
  yenValue?: number;
};

// クレジットカード。defaultCurrencyId に貯まる通貨を1つ持つ（仕様(b)）
// グレード（普通/ゴールド/プラチナ等）は同一ブランド内で還元率が変わるため、
// 任意フィールドで保持してUI上で区別表示する
// enabled: v7 で判定を反転。**enabled === true のみ有効**（Calculator の順位付けに載る）。
//          undefined（未記述）/ false = 無効。seed / master は enabled を出荷しない
//          （全カード OFF 起点。ユーザーが「使う」を ON にして保有カードを選ぶ = R1 規約）。
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
  // 1件以上 = リスト内のいずれか1枚を「保有 (v7: enabled === true)」している場合のみ利用可 (OR semantics)。
  // 例: JRE → JAL マイル の交換は JALカードSuica 保有者特典 → requiredCardIds: ["jal-suica"]
  // 参照する id は Card.id (PointCard.id ではない)。
  requiredCardIds?: string[];
  // 最低交換単位 (from 通貨の単位数)。例: 「1,000pt 以上 500pt 単位」なら 1000。
  //
  // ⚠ 経路選択 (bestPath / pathCache) には一切使わない — **事後 (post-hoc) 注記専用**。
  //   pathCache は「rate 積は amount に対し線形」という前提で (from,to) の product を 1 度だけ
  //   計算して amount 倍で使い回す (pathCache.ts 参照)。最低単位を経路探索に持ち込むと
  //   「この量では通れない」という amount 依存の非線形ゲートが混入し、線形前提が壊れて
  //   キャッシュが無効化される。よって計算モデルは従来どおり「レート積どおり交換できる」ものと
  //   し、少額で最低単位に満たないケースだけを path 確定後に検出して UI 注記する
  //   (rankCards.detectMinUnitAnnotations)。値が満たされれば (貯めてから交換すれば) レート積は正しい。
  //   validators では正の数チェックのみ (optional)。
  minFromUnits?: number;
  notes?: string;
  // REM-#2: このレートを公式ページで最後に人手確認した月 ("YYYY-MM" 月精度)。
  //   日次の鮮度は不要なので月精度で十分。**未記入 (undefined) = 未検証扱い**で、
  //   Calculator / EdgesScreen とも stale バッジは出さない (未検証を「古い」と誤警告しない)。
  //   bestPath に実際に乗る主要 edge のみ手記入し、残りは四半期棚卸し (SESSION_LOG の
  //   「四半期ごと手動確認チェックリスト」) で漸進的に埋める。stale 判定 (最終確認が
  //   6ヶ月超で ⚠) は純関数 src/domain/edgeFreshness.ts に集約。passthrough フィールドの
  //   ため PERSIST_SCHEMA_VERSION の bump は不要 (未知フィールドはそのまま carry-over)。
  lastVerifiedAt?: string;
};

// ポイントカード（クレカ決済とは別軸の、店頭提示で貯まるカード）
// 例: dポイントカード, 楽天ポイントカード, Pontaカード
// enabled: v7 で判定反転。**enabled === true のみ「使う」**。undefined（未記述）/ false = 使わない。
//          seed / master は enabled を出荷しない (Card.enabled と同セマンティクス、R1 規約)。
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

// PointMax v3: 還元プログラム
// 「(発動者 × 場所 × 還元率)」を統一表現。
// 旧 StoreRule / 提示還元ルール / PaymentApp.cardSpecificBonusRates の上位概念。
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
  recurringDays?: number[];     // 毎月の日にち限定 (1-31)。ruleActiveAt (now.getDate()) と同義
  recurringWeekdays?: number[]; // 曜日限定 (0=日..6=土)。ruleActiveAt (now.getDay()) と同義 (C-6)

  // ─── opt-in / 誕生月ゲート (v6 PR-1d、R1 規約) ───
  // optIn: true = 登録/選択制の特典 (Olive 選べる特典・エポス選べるポイントアップ等)。
  //   既定 OFF 出荷。**seed / master は optIn:true のみ出荷し enabled は書かない**
  //   (enabled はユーザー所有キー。R1: seed/master は per-user preference キーを出荷しない)。
  //   評価では「optIn===true かつ enabled!==true」の program は不発 = ユーザーが明示的に
  //   「使う」(enabled:true) を選ぶまで還元計算に載らない。
  optIn?: boolean;
  // birthdayMonthOnly: true = ユーザーの誕生月のみ有効 (settings.birthMonth 参照)。
  //   評価時刻 now の月 (1-12) が RankInput.userBirthMonth と一致する時のみ発火。
  //   userBirthMonth 未設定なら常に不発 (安全側)。誕生月クーポン系の表現用。
  birthdayMonthOnly?: boolean;
  // enabled: **ユーザー所有キー** (R1: seed / master には書かない)。
  //   undefined = 既定 (optIn でない program は有効 / optIn:true の program は未選択で無効)。
  //   true  = ユーザーが「使う」を選択 (opt-in 特典の有効化)。
  //   false = ユーザーが明示的に「使わない」= 常に不発。
  //   preference 変更なので userModifiedAt はスタンプしない (SUBSTANTIVE 対象外)。
  //   全置換取込 (syncFromUrl / importJson) / 更新伝播 (mergeSeed) では id マッチで
  //   ローカル値を carry-over し、公式更新で巻き戻らないよう保護する (preference 保護 2 経路)。
  enabled?: boolean;

  // ─── Meta ───
  description?: string;
  officialUrl?: string;            // 情報源 URL (詳細・解説ページ)
  // エントリー / 参加サイトの URL (任意)。officialUrl と分離する理由:
  //   - officialUrl は「制度を説明する公式ページ」(例: JAL カード特約店一覧)
  //   - entryUrl は「ユーザーが踏む先」(例: キャンペーンエントリーページ、提携店検索)
  // entryUrl がセットされている program は UI で「エントリー」リンクを露出。
  // 「キャンペーンサイトのトップページ」レベルでも構わない (深いリンクで切れる懸念回避)。
  entryUrl?: string;
  // requiresEntry: エントリー / 登録が必要なキャンペーン (楽天「5と0のつく日」・
  //   J-POINT パートナー登録等)。true の program が結果に採用 (primary/addOn/loyalty)
  //   されたとき、CalcResultCard 展開ビューに「⚠ 要エントリー」バッジを出し、
  //   entryUrl があればタップで別タブ起動する (無ければバッジのみ)。
  //   ⚠ optIn とは別軸: optIn は「既定 OFF・ユーザーが『使う』を選ぶまで計算に載らない」
  //   (事前選択・ロックのある特典)。requiresEntry は「計算には常時載るが、毎回の
  //   エントリー/登録をユーザーに促す」(無料・誰でも同率の都度エントリー系。
  //   README の optIn 付与基準参照)。「エントリー済み」トグルは条件付き案件で未実装
  //   (現状はバッジ表示 + entryUrl 起動のみ)。
  requiresEntry?: boolean;
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
  // enabled: v7 で判定反転。**enabled === true のみ有効**。undefined（未記述）/ false = 無効。
  //          seed / master は enabled を出荷しない (Card.enabled と同セマンティクス、R1 規約)。
  // 「使う決済アプリだけ表示する」用途。
  enabled?: boolean;
  notes?: string;
  // ユーザ編集トラッキング。Card.userModifiedAt と同じセマンティクス。
  // 対象 substantive フィールド: name / paymentMode / chargeBased / compatibleCardIds / notes。
  // iconChar / iconColor / enabled は cosmetic or preference 扱いで対象外。
  userModifiedAt?: string;
};

// PR-2: 店舗 × 決済手段ペアのユーザー除外レコード (user-owned)。
// 「この店ではこの決済 (paymentApp) が使えなかった」をレジで踏んだユーザーがワンタップ
// 記録し、rankCards が該当 store でその paymentApp を候補から外す (= 他決済で最良を再計算)。
// スコープを (店舗 × 決済) ペアにするのは、グローバル除外だと 1 店の事故でその決済が
// 全店から消えるため。除外は結果から隠さず「除外済 (タップで戻す)」として可視化し、
// 誤タップの 1 タップ復帰と、店側が対応を始めた時の自己修復を両立する。
// excludedAt = 記録時刻 (ISO 8601、将来の棚卸し表示用)。
export type ExcludedStorePayment = {
  storeId: string;
  paymentAppId: string;
  excludedAt: string;
};
