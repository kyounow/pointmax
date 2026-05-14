// PointMax の通貨マスタ。クレカ還元・ポイントカード提示・交換先などで使う通貨を一覧化。
//
// 編集時のガイド:
//   - kind は表示の色分け用 (mile / point / cashlike)
//   - iconChar / iconColor は短い識別子。長い名前のときは略号を入れる
//   - 新しい通貨を追加したら src/state/seed-data-edges.ts (交換ルート) も
//     セットで更新する場合が多い
import type { Currency } from "../domain/types";

export const SEED_CURRENCIES: Currency[] = [
  // === 保有カードで貯まる通貨 ===
  {
    id: "jal-mile",
    name: "JALマイル",
    kind: "mile",
    iconChar: "JAL",
    iconColor: "#cc0000",
  },
  {
    id: "rakuten-pt",
    name: "楽天ポイント",
    kind: "point",
    iconChar: "R",
    iconColor: "#bf0000",
  },
  {
    id: "eikyu",
    name: "永久不滅ポイント",
    kind: "point",
    iconChar: "永",
    iconColor: "#1a4f8a",
  },
  {
    id: "v-pt",
    name: "Vポイント",
    kind: "point",
    iconChar: "V",
    iconColor: "#0a4d8c",
  },

  // === 直接は紐づかないが交換先として実在 ===
  {
    id: "ana-mile",
    name: "ANAマイル",
    kind: "mile",
    iconChar: "ANA",
    iconColor: "#0d3a8d",
  },
  {
    id: "d-pt",
    name: "dポイント",
    kind: "point",
    iconChar: "d",
    iconColor: "#cc0033",
  },
  {
    id: "amazon-pt",
    name: "Amazonギフト",
    kind: "cashlike",
    iconChar: "a",
    iconColor: "#ff9900",
  },
  {
    id: "jre",
    name: "JRE POINT",
    kind: "point",
    iconChar: "JRE",
    iconColor: "#00ac46",
  },
  {
    id: "edy",
    name: "楽天Edy",
    kind: "cashlike",
    iconChar: "Edy",
    iconColor: "#0066b3",
  },
  {
    id: "paypay",
    name: "PayPayポイント",
    kind: "cashlike",
    iconChar: "PP",
    iconColor: "#ff0033",
  },

  // === 提示型ポイントカードで貯まる通貨 ===
  {
    id: "ponta-pt",
    name: "Pontaポイント",
    kind: "point",
    iconChar: "P",
    iconColor: "#e8470a",
  },
  {
    id: "nanaco-pt",
    name: "nanacoポイント",
    kind: "point",
    iconChar: "n",
    iconColor: "#f9a825",
  },
  {
    id: "waon-pt",
    name: "WAONポイント",
    kind: "point",
    iconChar: "W",
    iconColor: "#e60012",
  },

  // === クレカ・ホテル系プログラム (現在保有カードでは貯まらないが交換ハブとして実在) ===
  {
    id: "j-point",
    name: "J-POINT",
    kind: "point",
    iconChar: "J",
    iconColor: "#003a80",  // JCB 公式青
  },
  {
    id: "epos",
    name: "エポスポイント",
    kind: "point",
    iconChar: "EP",
    iconColor: "#0066cc",
  },
  {
    id: "amex-mr",
    name: "AMEXメンバーシップ・リワード",
    kind: "point",
    iconChar: "MR",
    iconColor: "#006fcf",
  },
  {
    id: "marriott",
    name: "Marriott Bonvoy",
    kind: "point",
    iconChar: "MB",
    iconColor: "#a51e36",
  },
  {
    id: "accor",
    name: "ALL Accor",
    kind: "point",
    iconChar: "ACC",
    iconColor: "#0e1b3d",
  },
  {
    id: "jrkyupo",
    name: "JRキューポ",
    kind: "point",
    iconChar: "九",
    iconColor: "#cb0d2a",
  },
];
