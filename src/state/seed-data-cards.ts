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
    enabled: false,
  },
  {
    // 200円=2 PayPayポイント (1.0%)、PayPayカードゴールドなら 1.5%
    id: "paypay-card",
    name: "PayPayカード",
    grade: "通常",
    defaultRate: 0.01,
    defaultCurrencyId: "paypay",
    enabled: false,
  },

  // === v18: 発行枚数上位カードを master pool に追加 ===
  // 既存 4 枚 (jal-suica/rakuten-card/saison-amex/smbc-v) + 参照 2 枚 (dcard/paypay-card) に
  // 加えて、日本の発行枚数上位カードを enabled: false で導入。
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
    enabled: false,
  },
  {
    // イオンカード (一般)、200円=1WAON POINT = 0.5%
    // イオン店舗での 5% off (お客様感謝デー) は割引であり rate ではないので扱わない
    id: "aeon-card",
    name: "イオンカード",
    grade: "一般",
    defaultRate: 0.005,
    defaultCurrencyId: "waon-pt",
    enabled: false,
  },
  {
    // JCB CARD W (39 歳以下限定、Web 申込限定、2倍ポイント特典)
    // 200円=2 J-POINT = 1.0% (基本還元、J-POINT 1pt=1円相当)
    // 2026年1月の Oki Doki ポイント → J-POINT リニューアル後の還元体系
    id: "jcb-w",
    name: "JCB CARD W",
    grade: "通常 (39歳以下限定)",
    defaultRate: 0.01,
    defaultCurrencyId: "j-point",
    enabled: false,
  },
  {
    // エポスカード (年会費永年無料)、200円=1エポスポイント = 0.5%
    // 丸井での 10% off 等の優遇は割引なので rate 計算では扱わない
    id: "epos-card",
    name: "エポスカード",
    grade: "一般",
    defaultRate: 0.005,
    defaultCurrencyId: "epos",
    enabled: false,
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
    enabled: false,
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
    enabled: false,
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
    enabled: false,
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
    enabled: false,
  },

  // === v24: 累積モデル対応 — au PAY / ファミペイ の cardSpecific 補完用 ===
  {
    // au PAY カード、1000円=10 Ponta = 1.0% (利用時)
    // au PAY 残高にチャージで pa-au-pay の cardSpecific に上乗せ +1.0% 含む
    id: "au-pay-card",
    name: "au PAYカード",
    grade: "一般",
    defaultRate: 0.01,
    defaultCurrencyId: "ponta-pt",
    enabled: false,
  },
  {
    // ファミマカード (2025/9 新)、ファミペイチャージで +0.5% 上乗せ
    // ファミマ店舗で 5% 割引 (PointMax モデル外、notes に記載のみ)
    id: "famima-card",
    name: "ファミマカード",
    grade: "通常",
    defaultRate: 0.005,
    defaultCurrencyId: "v-pt",
    enabled: false,
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
    id: "nanaco-card",
    name: "nanacoカード",
    currencyId: "nanaco-pt",
  },
  {
    id: "waon-card",
    name: "WAONカード",
    currencyId: "waon-pt",
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
          "楽天Pay 利用 (defaultBonusRate=0) + 楽天カードチャージ +1.5% 上乗せ = 合計 1.5%",
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
        notes: "d払い利用 (defaultBonusRate=0) + dカード支払い特典 +1.0% 上乗せ = 合計 1.0%",
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
        notes: "PayPay 利用 (defaultBonusRate=0) + PayPayカード経由 +0.5% 上乗せ = 合計 0.5%",
      },
    ],
    notes:
      "PayPayカード連携で 0.5%、他社カードからのチャージは 2025/8 以降 還元対象外",
  },
  // au PAY (チャージ式)、200円=1 Ponta = 0.5% (コード支払い基本還元)
  // au PAY カード連携で +1% 上乗せ (合計 1.5%) — v24 で au-pay-card 追加により cardSpecific 補完
  {
    id: "pa-au-pay",
    name: "au PAY",
    iconChar: "au",
    iconColor: "#ff6600",
    defaultBonusRate: 0.005,
    defaultBonusCurrencyId: "ponta-pt",
    chargeBased: true,
    paymentMode: "charge",
    cardSpecificBonusRates: [
      {
        cardId: "au-pay-card",
        rate: 0.01, // 上乗せ 1% (チャージ +1% Ponta)
        currencyId: "ponta-pt",
        notes: "au PAY カードからチャージで +1% Ponta (au PAY 利用 0.5% に上乗せ = 合計 1.5%)",
      },
    ],
    notes:
      "au PAY コード支払いで 0.5% Ponta 還元 (defaultBonusRate)。" +
      "au PAY カード経由チャージで +1.0% 上乗せ (合計 1.5%)。" +
      "au PAY ゴールド (年会費 11,000円) なら更に上振れ可能だが seed 未登録。",
  },

  // ファミペイ (チャージ式)、200円=1 FamiPayボーナス = 0.5%
  // FamiPay ボーナス専用通貨は未登録、edy (現金相当) で代用
  // ファミマカード連携で +0.5% 上乗せ (合計 1.0%) — v24 で famima-card 追加により cardSpecific 補完
  {
    id: "pa-famipay",
    name: "ファミペイ",
    iconChar: "FP",
    iconColor: "#0072ce",
    defaultBonusRate: 0.005,
    defaultBonusCurrencyId: "edy",
    chargeBased: true,
    paymentMode: "charge",
    cardSpecificBonusRates: [
      {
        cardId: "famima-card",
        rate: 0.005, // 上乗せ 0.5% (ファミマカードチャージ 0.5%)
        currencyId: "edy",
        notes: "ファミマカード経由チャージで +0.5% ファミマポイント (ファミペイ利用 0.5% に上乗せ = 合計 1.0%)",
      },
    ],
    notes:
      "ファミペイ支払いで 0.5% FamiPay ボーナス還元 (defaultBonusRate)。" +
      "ファミマカード経由チャージで +0.5% 上乗せ (合計 1.0%)。" +
      "ファミマ店舗での 5% 割引はキャッシュバック式で PointMax の rate モデル外。" +
      "FamiPay ボーナス専用通貨は未登録、現状 edy (現金相当) で代用。",
  },

  // メルペイ (直接連携)、単体還元なし (0%)
  // メルカード経由のあと払い時のみ 1% (メルカードの還元率に準じる)
  {
    id: "pa-merpay",
    name: "メルペイ",
    iconChar: "MP",
    iconColor: "#ff0211",
    defaultBonusRate: 0,
    defaultBonusCurrencyId: "mercari-pt",
    chargeBased: false,
    paymentMode: "direct",
    cardSpecificBonusRates: [
      {
        cardId: "mercard",
        rate: 0.01,
        currencyId: "mercari-pt",
        notes:
          "メルペイ単独 0% + メルカード経由 +1.0% 上乗せ = 合計 1.0% (メルカリ内 4% や毎月8日 8% は別途 storeRule で表現)",
      },
    ],
    notes:
      "メルペイ単体は還元なし (0%)。メルカード連携時のみ 1% 還元。" +
      "メルカリ売上金は自動的にメルペイ残高にチャージされる。",
  },
];
