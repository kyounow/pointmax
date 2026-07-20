// 財布まわりのデータ:
//   - SEED_CARDS         : クレジットカード本体 (defaultRate / defaultCurrencyId)
//   - SEED_POINT_CARDS   : 店頭提示するポイントカード
//   - SEED_PAYMENT_APPS  : 決済方法 (タッチ決済 / Pay 系 等)
//
// 編集時のガイド:
//   - currencyId / defaultCurrencyId は seed-data-currencies.ts に存在する id を参照
//   - PaymentApp.cardSpecificBonusRates の cardId は SEED_CARDS の id を参照
//   - 順序は表示順 (PointCards はユーザー優先順位)
import type { Card, PaymentApp, PointCard } from "../domain/types";

export const SEED_CARDS: Card[] = [
  {
    // ショッピングマイル・プレミアム自動付帯で1.0%。Suicaチャージはビューカードで1.5% JRE
    // family-jal-suica (exclusive)。普通版 jal-suica-normal と物理的に切替型なので、
    // このカードを「使う」ON にすると普通版が自動 OFF になる (store の排他 invariant)。
    id: "jal-suica",
    name: "JALカードSuica",
    grade: "CLUB-Aゴールド",
    defaultRate: 0.01,
    defaultCurrencyId: "jal-mile",
    familyId: "family-jal-suica",
    gradeLevel: 2,
  },
  {
    // JALカードSuica 普通カード。CLUB-Aゴールド (jal-suica) と違い JRE→マイルは
    // 1500pt→750マイル (0.5)。gate 用途。v7 は seed が enabled を出荷せず全カード OFF 起点。
    // 保有者が「使う」を ON にすると edge jre-to-jal-normal が解放される。
    // family-jal-suica (exclusive): 従来は「両カード保有時は bestPath がゴールド優先」を
    // 許容していたが、PR-1c で排他化。この普通版を ON にするとゴールド版 (jal-suica) が
    // 自動 OFF になる (両方 ON は不可能になった。同一ブランドの切替型のため意図的な挙動変更)。
    id: "jal-suica-normal",
    name: "JALカードSuica（普通）",
    grade: "普通",
    defaultRate: 0.01,
    defaultCurrencyId: "jal-mile",
    familyId: "family-jal-suica",
    gradeLevel: 1,
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
  // 以下、d払い/PayPay の特典構造を表現するための参考カード。
  // ※ v7 は seed が enabled を出荷せず全カード OFF 起点。保有する場合はカード画面の「使う」トグルで有効化して下さい
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

  // === v18: 発行枚数上位カードを master pool に追加 ===
  // 既存 4 枚 (jal-suica/rakuten-card/saison-amex/smbc-v) + 参照 2 枚 (dcard/paypay-card) に
  // 加えて、日本の発行枚数上位カードを master pool に導入 (v7 は全カード OFF 起点)。
  // ユーザは CardsScreen の「使う」トグルで個別に有効化する。
  {
    // JAL カード普通 (ショッピングマイル・プレミアム加入前提で 100円=1マイル = 1.0%)
    // JALカードSuica と違って Suica チャージ +1.5%/えきねっと +5%/+8% の優遇は受けられない
    // (それらはビューカード機能込みの jal-suica 特有)
    // 特約店 2% は同じ
    id: "jal-card",
    name: "JALカード",
    grade: "普通 (ショッピングマイル・プレミアム加入前提)",
    defaultRate: 0.01,
    defaultCurrencyId: "jal-mile",
  },
  {
    // イオンカード (一般)、200円=1WAON POINT = 0.5%
    // イオン店舗での 5% off (お客様感謝デー) は割引であり rate ではないので扱わない
    id: "aeon-card",
    name: "イオンカード",
    grade: "一般",
    defaultRate: 0.005,
    defaultCurrencyId: "waon-pt",
  },
  {
    // JMB JQ SUGOCA (JR九州 × JAL)。JQ CARD 系で JRキューポを貯める (基本 0.5%)。
    // 主な役割は「JALマイル ⇔ JRキューポ」相互交換の解放 (seed-data-edges の
    // jrkyupo-to-jal / jal-to-jrkyupo の requiredCardIds)。v7 は全カード OFF 起点、
    // 保有ユーザーが「使う」を ON にして利用する。
    id: "jmb-jq-sugoca",
    name: "JMB JQ SUGOCA",
    grade: "通常",
    defaultRate: 0.005,
    defaultCurrencyId: "jrkyupo",
  },
  {
    // JQ SUGOCA ANA (JR九州 × ANA)。JMB JQ SUGOCA の ANA 版。
    // 「ANAマイル ⇔ JRキューポ」相互交換を解放 (jrkyupo-to-ana / ana-to-jrkyupo)。
    id: "jq-sugoca-ana",
    name: "JQ SUGOCA ANA",
    grade: "通常",
    defaultRate: 0.005,
    defaultCurrencyId: "jrkyupo",
  },
  {
    // JCB CARD W (39 歳以下限定、Web 申込限定、2倍ポイント特典)
    // 200円=2 J-POINT = 1.0% (基本還元、J-POINT 1pt=1円相当)
    // 2026年1月の Oki Doki ポイント → J-POINT リニューアル後の還元体系
    // family-jcb (exclusive=false): ゴールドとは別カードとして併存保有できるため、
    // 「使う」ON にしても jcb-gold は自動 OFF にならない (排他しない)。
    id: "jcb-w",
    name: "JCB CARD W",
    grade: "通常 (39歳以下限定)",
    defaultRate: 0.01,
    defaultCurrencyId: "j-point",
    familyId: "family-jcb",
    gradeLevel: 1,
  },
  {
    // JCB ゴールド (年会費 11,000円、初年度無料)
    // 200円=1 J-POINT = 0.5% (基本還元)
    // 公式: 「優待店利用で最大20倍」「ポイント還元率は最大10%」(= 0.5% × 20倍 = スターバックス)
    // 「プレミアムでおトク」対象店 (高島屋 4倍 等) は Gold プレミアム条件で発動
    // V5-2 で J-POINT パートナー Gold 系列 program に対応
    // family-jcb (exclusive=false): W と併存保有できるため排他対象外。
    id: "jcb-gold",
    name: "JCB ゴールド",
    grade: "ゴールド",
    defaultRate: 0.005,
    defaultCurrencyId: "j-point",
    familyId: "family-jcb",
    gradeLevel: 2,
  },
  {
    // エポスカード (年会費永年無料)、200円=1エポスポイント = 0.5%
    // 丸井での 10% off 等の優遇は割引なので rate 計算では扱わない
    // 3グレード体制 (一般 / ゴールド / プラチナ) の一般。グレード差はマルイ2倍・
    // 選べるポイントアップ等の program で表現。ポイントアップサイト「たまるマーケット」
    // 経由の還元 (2/3/4倍) は 3 グレード共通で prog-epos-tamaru-* にモデル化。
    // family-epos (exclusive): 3 グレードは切替型。上位グレードを「使う」ON にすると
    // このカードは自動 OFF になる (store の排他 invariant)。
    id: "epos-card",
    name: "エポスカード",
    grade: "一般",
    defaultRate: 0.005,
    defaultCurrencyId: "epos",
    familyId: "family-epos",
    gradeLevel: 1,
  },
  {
    // エポスゴールド。年会費5,000円 (年間50万円利用 or インビテーション or
    // ファミリーゴールド経由で永年無料)。基本還元は一般と同じ 200円=1pt=0.5%。
    // グレード差は program で表現 (prog-epos-gp-marui / prog-epos-gp-selectable-pointup)。
    // 年間利用ボーナス (50万→2,500pt / 100万→10,000pt 上限) は利用額連動のため
    // rate 未反映 (JCB/SMBC ゴールドと同方針)。
    // family-epos (exclusive): このカードを「使う」ON にすると一般 (epos-card) /
    // プラチナ (epos-platinum) が自動 OFF になる (切替型のため同時保有しない)。
    id: "epos-gold",
    name: "エポスゴールド",
    grade: "ゴールド",
    defaultRate: 0.005,
    defaultCurrencyId: "epos",
    familyId: "family-epos",
    gradeLevel: 2,
  },
  {
    // エポスプラチナ。年会費30,000円 (インビ or 年間100万円利用で20,000円)。基本 0.5%。
    // 年間ボーナス (100万→20,000pt 〜 1,500万→100,000pt、50万未満0.3%/50-100万3,000pt
    // は2025-04新設) は利用額連動のため rate 未反映。
    // 誕生月ポイント2倍はユーザー固有月のため未モデル化。
    // family-epos (exclusive): このカードを「使う」ON にすると一般 (epos-card) /
    // ゴールド (epos-gold) が自動 OFF になる (切替型のため同時保有しない)。
    id: "epos-platinum",
    name: "エポスプラチナ",
    grade: "プラチナ",
    defaultRate: 0.005,
    defaultCurrencyId: "epos",
    familyId: "family-epos",
    gradeLevel: 3,
  },
  {
    // ANA VISA カード (一般)、通常 200円=1 Vポイント = 0.5%
    // 別途 ANA マイル変換可能: 10 マイルコース (年会費 6,600円) で 1pt=10マイル、
    // 5 マイルコース (無料) で 1pt=5マイル
    // defaultCurrencyId は v-pt にしておき、マイル換算は edge v-to-ana で行う
    id: "ana-visa",
    name: "ANA VISAカード",
    grade: "一般",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
  },

  // === v20: 主要決済・特殊カバー追加 ===

  {
    // ビューカード スタンダード (JR東日本)、通常 0.5% (1000円=2.5 JREポイント)
    // Suica オートチャージ/モバイルチャージ時 1.5% (rule-viewcard-suica-charge で別途定義)
    // JR東日本利用者の定番カード
    id: "viewcard",
    name: "ビューカード スタンダード",
    grade: "通常",
    defaultRate: 0.005,
    defaultCurrencyId: "jre",
  },
  {
    // メルカード (メルカリ系)、通常 1.0% (メルカリ外)
    // メルカリ内: 1.0%〜4.0% (利用額連動、定常最大 4%)
    // 毎月 8 日: +8% (メルカリ内、recurringDays で表現)
    id: "mercard",
    name: "メルカード",
    grade: "通常",
    defaultRate: 0.01,
    defaultCurrencyId: "mercari-pt",
  },
  {
    // Olive フレキシブルペイ (一般)、三井住友グループの統合金融カード
    // 通常 0.5% (200円=1 Vポイント)
    // コンビニ・飲食タッチ決済時 8% (smbc-v 7% + Olive 連携 +1%)
    // -> 21 rules 複製のスコープ大、本 commit はカード本体のみ。8% rules は将来追加。
    id: "olive",
    name: "Oliveフレキシブルペイ",
    grade: "一般 (フレキシブルペイ)",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
  },

  // === v24: 累積モデル対応 — au PAY / ファミペイ の cardSpecific 補完用 ===
  {
    // au PAY カード、1000円=10 Ponta = 1.0% (カード利用時の還元。これは存続)
    // 注: 残高チャージ加算 (+1%) は 2022-12-01 で廃止済 (四半期監査 2026-Q3、pa-au-pay 参照)
    id: "au-pay-card",
    name: "au PAYカード",
    grade: "一般",
    defaultRate: 0.01,
    defaultCurrencyId: "ponta-pt",
  },
  {
    // ファミマカード (2025/9 新)。クレカ単体は 200円=1 Vポイント = 0.5%。
    // (旧: ファミペイチャージ +0.5% 上乗せ → v4.0.1 でファミペイ廃止に伴い該当
    //  addOn program も削除。カード自体は v-pt 還元として存続)
    id: "famima-card",
    name: "ファミマカード",
    grade: "通常",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
  },
  // v4.0.0 ①: ルーティングテーブル拡充で追加した通貨に紐づくカード
  {
    // オリコカード THE POINT。100円=1オリコポイント = 1.0% (1pt=1円)。
    // オリコポイントは WAON 1:1 / Ponta・d 1200→1000 / ANA 1000→600 / JAL 1000→500
    // へ移行可能 (edges 参照)。
    id: "orico-card",
    name: "オリコカード THE POINT",
    grade: "通常",
    defaultRate: 0.01,
    defaultCurrencyId: "orico-pt",
  },
  {
    // 三菱UFJカード。1000円=1グローバルポイント なので defaultRate=0.001。
    // グローバルポイントは 1pt≈4〜5円の高価値 (Ponta/d 200→800、楽天/nanaco/WAON
    // 200→600、JAL 200→400)。raw 0.1% 表示だが edge ×2〜4 換算で実質 ~0.4%。
    // マイル系カードと同じく bestPath が価値を解決する。
    id: "mufg-card",
    name: "三菱UFJカード",
    grade: "通常",
    defaultRate: 0.001,
    defaultCurrencyId: "mufg-pt",
  },
];

// 店頭提示するポイントカード。
// 配列順 = ユーザー全体優先順位 (PointCardsScreen で↑↓ボタンで変更可)
// 1:楽天 / 2:V / 3:d / 4:Ponta / 5:nanaco / 6:WAON
export const SEED_POINT_CARDS: PointCard[] = [
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
    // nanaco / WAON はカード提示で貯まる loyalty と、電子マネー決済で貯まる
    // 支払いの 2 モードがある。本 PointCard モデルは loyalty (提示で貯まる) 用。
    // - nanaco loyalty 加盟店: セブン&アイグループ系 (セブン-イレブン / イトーヨーカドー /
    //   デニーズ / ヨークマート 等)。
    // - 吉野家・マクドナルド・ENEOS 等は nanaco 電子マネー決済は可能だが
    //   loyalty 加盟ではないので memberships に入れないこと。
    // - 電子マネー支払い側の還元 (支払うと自動で 1pt/100円) は将来 PaymentApp
    //   として nanaco を別途モデル化する別議題。
    id: "nanaco-card",
    name: "nanacoカード",
    currencyId: "nanaco-pt",
    notes: "loyalty (カード提示) 用。電子マネー決済での還元は別モデル予定",
  },
  {
    // WAON も nanaco と同じく loyalty / 電子マネー 2 モード。
    // - WAON loyalty 加盟店: イオングループ系 (イオン / ミニストップ / ウエルシア /
    //   マックスバリュ / ダイエー 等)。
    // - ファミマ・ローソン・吉野家・ガスト・ビックカメラ・コスモ石油 は WAON 電子マネー
    //   決済可能だが loyalty 加盟ではない。
    // - 電子マネー支払い側は将来 PaymentApp 化で対応。
    id: "waon-card",
    name: "WAONカード",
    currencyId: "waon-pt",
    notes: "loyalty (カード提示) 用。電子マネー決済での還元は別モデル予定",
  },
  {
    // JRE POINT カード (JR東日本)、駅ナカ加盟店で提示すると 200円=1pt = 0.5% 還元
    // 加盟店: NewDays / KIOSK / acure / エキュート / グランスタ / アトレ / ルミネ / ニュウマン 等
    // 加盟店 loyaltyRules の追加は別 commit (駅ナカ stores が未登録のため)
    id: "jre-pointcard",
    name: "JRE POINT カード",
    currencyId: "jre",
  },
];

// 支払アプリ／決済方法
// compatibleCardIds: 空 = どのカードでもOK / 非空 = リスト内のカードのみ
// defaultBonusRate: その支払アプリ自体の還元 (チャージ元カードの還元とは別軸)
// cardSpecificBonusRates: 特定カード紐付け時の特例還元
// chargeBased / paymentMode: 残高チャージ式か直接連携かを表現
export const SEED_PAYMENT_APPS: PaymentApp[] = [
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
  // 楽天Pay (チャージ式)、楽天キャッシュ/楽天カード/楽天銀行口座払い 1% (誰でも乗るベース還元)
  // 楽天カード経由で楽天キャッシュにチャージすると +0.5% 上乗せ = 合計 1.5%
  // v3 PR 2 で BenefitProgram に移行:
  //   prog-rakuten-pay-base (primary, 1%) + prog-rakuten-pay-rakuten-card-addon (addOn, 0.5%)
  {
    id: "pa-rakuten-pay",
    name: "楽天Pay",
    iconChar: "RP",
    iconColor: "#bf0000",
    chargeBased: true,
    paymentMode: "charge",
    // defaultBonusRate / defaultBonusCurrencyId / cardSpecificBonusRates 削除
    // → v3 で BenefitProgram (prog-rakuten-pay-base / prog-rakuten-pay-rakuten-card-addon) で表現
    notes:
      "ベース 1% (楽天Pay 利用、誰でも)。楽天カード経由チャージで +0.5% 上乗せ = 1.5%。" +
      "[v3 PR 2] BenefitProgram で評価: prog-rakuten-pay-base + prog-rakuten-pay-rakuten-card-addon",
  },
  // d払い (チャージ式 or 直接連携)、ベース 0.5% (200円1pt、誰でも)
  // dカード/GOLD/GOLD U/PLATINUM 連携時 +0.5% 上乗せ = 合計 1.0%
  // v3 PR 2 で BenefitProgram に移行:
  //   prog-d-pay-base (primary, 0.5%) + prog-d-pay-dcard-addon (addOn, 0.5%)
  {
    id: "pa-d-pay",
    name: "d払い",
    iconChar: "dP",
    iconColor: "#cc0033",
    chargeBased: true,
    paymentMode: "charge",
    // defaultBonusRate / defaultBonusCurrencyId / cardSpecificBonusRates 削除
    // → v3 で BenefitProgram (prog-d-pay-base / prog-d-pay-dcard-addon) で表現
    notes:
      "ベース 0.5% (d払い 利用、誰でも 200円1pt)。dカード設定で +0.5% 上乗せ = 1.0%。" +
      "街のお店は dポイントクラブ ランクで最大 4% (本モデルには未反映)。" +
      "[v3 PR 2] BenefitProgram で評価: prog-d-pay-base + prog-d-pay-dcard-addon",
  },
  // PayPay (チャージ式)、ベース 0.5% (残高払い、誰でも)
  // PayPayクレジット連携 (= PayPayカード設定) で +0.5% 上乗せ = 合計 1.0%
  // v3 PR 2 で BenefitProgram に移行:
  //   prog-paypay-base (primary, 0.5%) + prog-paypay-card-addon (addOn, 0.5%)
  {
    id: "pa-paypay",
    name: "PayPay",
    iconChar: "PP",
    iconColor: "#ff0033",
    chargeBased: true,
    paymentMode: "charge",
    // defaultBonusRate / defaultBonusCurrencyId / cardSpecificBonusRates 削除
    // → v3 で BenefitProgram (prog-paypay-base / prog-paypay-card-addon) で表現
    notes:
      "ベース 0.5% (PayPay 残高払い、誰でも)。PayPayクレジット連携で +0.5% 上乗せ = 1.0%。" +
      "PayPayステップ条件達成で最大 1.5% だが、本モデルは基本還元のみ反映。" +
      "[v3 PR 2] BenefitProgram で評価: prog-paypay-base + prog-paypay-card-addon",
  },
  // au PAY (チャージ式)、200円=1 Ponta = 0.5% (コード支払い基本還元)
  // 四半期監査 2026-Q3: 一般 au PAYカードの残高チャージ加算 (+1%) は 2022-12-01 利用分で
  //   廃止 (kddi-fs 告知 0262) → prog-au-pay-card-addon 削除。実質還元は base 0.5% のみ。
  // v3 PR 2 で BenefitProgram に移行: prog-au-pay-base (primary, 0.5%)
  {
    id: "pa-au-pay",
    name: "au PAY",
    iconChar: "au",
    iconColor: "#ff6600",
    chargeBased: true,
    paymentMode: "charge",
    // defaultBonusRate / defaultBonusCurrencyId / cardSpecificBonusRates 削除
    // → v3 で BenefitProgram (prog-au-pay-base) で表現
    notes:
      "au PAY コード支払いで 0.5% Ponta 還元 (実質これのみ)。" +
      "一般 au PAYカードの残高チャージ加算は 2022-12-01 利用分より廃止 (0%)。" +
      "au PAY ゴールドカードのみ チャージ 1%・月上限1,000pt が残る (seed 未登録)。" +
      "[v3 PR 2] BenefitProgram で評価: prog-au-pay-base",
  },

  // 【削除済 v4.0.1】pa-famipay (ファミペイ):
  // ファミペイのポイント付与は d/楽天/V から選ぶ方式で、PointMax の単一通貨
  // PaymentApp モデルでは正確に表現できない。ファミマでの d/楽天/V 還元は
  // 既に prog-{d,rakuten,vpoint}-pointcard × conv-familymart の loyalty membership
  // でカバー済のため、ファミペイ PaymentApp 自体を廃止。
  // prog-famipay-base / prog-famima-card-addon も削除 (seed-data-programs.ts)。

  // メルペイ (直接連携)、単体還元なし (0%)
  // メルカード経由のあと払い時のみ 1% (メルカードの還元率に準じる)
  // v3 PR 2 で BenefitProgram に移行:
  //   prog-merpay-mercard-addon (addOn, 1%) ※ defaultBonusRate=0 なので base program は不要
  {
    id: "pa-merpay",
    name: "メルペイ",
    iconChar: "MP",
    iconColor: "#ff0211",
    chargeBased: false,
    paymentMode: "direct",
    // defaultBonusRate / defaultBonusCurrencyId / cardSpecificBonusRates 削除
    // → v3 で BenefitProgram (prog-merpay-mercard-addon) で表現
    notes:
      "メルペイ単体は還元なし (0%)。メルカード連携時のみ 1% 還元。" +
      "メルカリ売上金は自動的にメルペイ残高にチャージされる。" +
      "[v3 PR 2] BenefitProgram で評価: prog-merpay-mercard-addon",
  },

  // nanaco 電子マネー (v3.6.0)
  // チャージ式、200円1pt = 0.5% (店舗・支払一律ベース)
  // セブン-イレブン等 loyalty 加盟店は nanaco-card (PointCard) 経路で還元されるため
  // ここでは「e-money 支払いで貯まる」非 loyalty 加盟店のみ membership 化:
  // 吉野家・マクドナルド・ツルハ・ENEOS・ビックカメラ等。
  // チャージ時還元はカード別 (例: セブンカード 0.5% / 他カード 0%) だが今版は未モデル化。
  {
    id: "pa-nanaco",
    name: "nanaco",
    iconChar: "n",
    iconColor: "#ffae00",
    chargeBased: true,
    paymentMode: "charge",
    notes:
      "nanaco 電子マネーで支払うと 200円1pt = 0.5% (店舗一律ベース)。" +
      "セブン-イレブン等は nanacoカード提示=支払いなので、loyalty 経路で計上 (二重取り回避)。" +
      "ENEOS の燃料油は 2L1pt の特殊レートだが今版は 0.5% 統一 (実態より若干高め)。" +
      "チャージ時のカード還元 (セブンカード 0.5% 等) は未モデル化。" +
      "[v3.6.0] BenefitProgram で評価: prog-pa-nanaco-base (addOn、cardCurrencyId 上書き回避)",
  },

  // WAON 電子マネー (v3.6.0)
  // チャージ式、200円1pt = 0.5% (店舗・支払一律ベース)
  // イオン系・ウエルシア・ツルハ・コスモ石油等 loyalty 加盟店は waon-card (PointCard) 経路で
  // 還元されるため、ここでは「e-money 支払いで貯まる」非 loyalty 加盟店のみ membership 化:
  // ファミマ・ローソン・ガスト・吉野家・マクドナルド・ビックカメラ等。
  // ※ ENEOS は WAON 給油非対応のため除外。
  {
    id: "pa-waon",
    name: "WAON",
    iconChar: "W",
    iconColor: "#ec1c24",
    chargeBased: true,
    paymentMode: "charge",
    notes:
      "WAON 電子マネーで支払うと 200円1pt = 0.5% (店舗一律ベース)。" +
      "イオン系等 loyalty 加盟店は waon-card 経路で計上 (二重取り回避)。" +
      "コスモ石油は提示のみで貯まる loyalty 経路、e-money では貯まらないため pa-waon 加盟ではない。" +
      "ENEOS は WAON 給油非対応のため対象外 (EV充電のみ可能)。" +
      "チャージ時のカード還元 (イオンカード 1% 等) は未モデル化。" +
      "[v3.6.0] BenefitProgram で評価: prog-pa-waon-base (addOn、cardCurrencyId 上書き回避)",
  },
];
