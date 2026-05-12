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
