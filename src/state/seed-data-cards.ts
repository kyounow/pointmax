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
