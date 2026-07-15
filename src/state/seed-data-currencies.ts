// PointMax の通貨マスタ。クレカ還元・ポイントカード提示・交換先などで使う通貨を一覧化。
//
// 編集時のガイド:
//   - kind は表示の色分け用 (mile / point / cashlike)
//   - iconChar / iconColor は短い識別子。長い名前のときは略号を入れる
//   - 新しい通貨を追加したら src/state/seed-data-edges.ts (交換ルート) も
//     セットで更新する場合が多い
//
// yenValue (DB-2): 1 単位 ≒ 円の目安値。円換算タブと edge レート validator に使う。
//   基準は「1pt=1円」の共通ポイント/現金相当を 1 とし、そこからの相対価値で置く。
//   価値が使い方で大きく変わる通貨 (AMEX MR / Marriott / Accor 等) は根拠が薄いため
//   **あえて undefined** にして円換算比較から外す (誤った目安で誘導しないため)。
//   付与した値は seed-data-edges.ts の全 edge が rate × yenValue(to)/yenValue(from) ∈
//   [1/2.5, 2.5] を満たすよう調整済み (seed.test.ts の「円価値目安と乖離」契約でガード)。
import type { Currency } from "../domain/types";

export const SEED_CURRENCIES: Currency[] = [
  // === 保有カードで貯まる通貨 ===
  {
    id: "jal-mile",
    name: "JALマイル",
    kind: "mile",
    iconChar: "JAL",
    iconColor: "#cc0000",
    // マイルは 1.5〜2円が通説。円換算目安は保守的に 1.5 で置く (edge の正規化基準)。
    yenValue: 1.5,
  },
  {
    id: "rakuten-pt",
    name: "楽天ポイント",
    kind: "point",
    iconChar: "R",
    iconColor: "#bf0000",
    yenValue: 1, // 1pt=1円 (共通ポイント基準)
  },
  {
    id: "eikyu",
    name: "永久不滅ポイント",
    kind: "point",
    iconChar: "永",
    iconColor: "#1a4f8a",
    // 200pt=1000円分Amazonギフト等 (eikyu-to-amazon rate 5) より 1pt≒5円相当。
    yenValue: 5,
  },
  {
    id: "v-pt",
    name: "Vポイント",
    kind: "point",
    iconChar: "V",
    iconColor: "#0a4d8c",
    yenValue: 1, // 1pt=1円 (VポイントPay/SBI積立等)
  },

  // === 直接は紐づかないが交換先として実在 ===
  {
    id: "ana-mile",
    name: "ANAマイル",
    kind: "mile",
    iconChar: "ANA",
    iconColor: "#0d3a8d",
    yenValue: 1.5, // マイル保守値 (jal-mile と同基準)
  },
  {
    id: "d-pt",
    name: "dポイント",
    kind: "point",
    iconChar: "d",
    iconColor: "#cc0033",
    yenValue: 1, // 1pt=1円
  },
  {
    id: "amazon-pt",
    name: "Amazonギフト",
    kind: "cashlike",
    iconChar: "a",
    iconColor: "#ff9900",
    yenValue: 1, // 現金相当 1:1
  },
  {
    id: "jre",
    name: "JRE POINT",
    kind: "point",
    iconChar: "JRE",
    iconColor: "#00ac46",
    yenValue: 1, // Suicaチャージ 1pt=1円相当
  },
  {
    id: "edy",
    name: "楽天Edy",
    kind: "cashlike",
    iconChar: "Edy",
    iconColor: "#0066b3",
    yenValue: 1, // 電子マネー現金相当 1:1
  },
  {
    id: "paypay",
    name: "PayPayポイント",
    kind: "cashlike",
    iconChar: "PP",
    iconColor: "#ff0033",
    yenValue: 1, // 現金相当 1:1
  },

  // === 提示型ポイントカードで貯まる通貨 ===
  {
    id: "ponta-pt",
    name: "Pontaポイント",
    kind: "point",
    iconChar: "P",
    iconColor: "#e8470a",
    yenValue: 1, // 1pt=1円
  },
  {
    id: "nanaco-pt",
    name: "nanacoポイント",
    kind: "point",
    iconChar: "n",
    iconColor: "#f9a825",
    yenValue: 1, // 電子マネーnanaco 1pt=1円分
  },
  {
    id: "waon-pt",
    name: "WAONポイント",
    kind: "point",
    iconChar: "W",
    iconColor: "#e60012",
    yenValue: 1, // WAON電子マネー 1pt=1円分
  },

  // === クレカ・ホテル系プログラム (現在保有カードでは貯まらないが交換ハブとして実在) ===
  {
    id: "j-point",
    name: "J-POINT",
    kind: "point",
    iconChar: "J",
    iconColor: "#003a80",  // JCB 公式青
    yenValue: 1, // MyJCB Pay/カード支払い充当で 1pt=1円 (公式最高レート)
  },
  {
    id: "epos",
    name: "エポスポイント",
    kind: "point",
    iconChar: "EP",
    iconColor: "#0066cc",
    yenValue: 1, // 1pt=1円 (マルイ/プリペイドチャージ等)
  },
  {
    // 円換算目安は付けない: MR ポイントは移行先・使い方で価値が 0.3〜1 円超と大きく振れ、
    // 単一の目安値が誤誘導になる (円換算タブ・validator から除外)。
    id: "amex-mr",
    name: "AMEXメンバーシップ・リワード",
    kind: "point",
    iconChar: "MR",
    iconColor: "#006fcf",
  },
  {
    // ホテルポイントは宿泊時価値が高く、マイル移行 (3:1) だと大きく目減りする。
    // 単一目安値では表せないため付けない (円換算タブ・validator から除外)。
    id: "marriott",
    name: "Marriott Bonvoy",
    kind: "point",
    iconChar: "MB",
    iconColor: "#a51e36",
  },
  {
    // Accor も宿泊利用が主で価値が使い方依存。目安値は付けない (除外)。
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
    yenValue: 1, // Vポイント等と 1:1 交換の共通ポイント相当
  },
  {
    id: "mercari-pt",
    name: "メルカリポイント",
    kind: "point",
    iconChar: "M",
    iconColor: "#ff0211",  // メルカリブランド赤
    yenValue: 1, // メルカリ内/メルペイ残高で 1pt=1円相当
  },
  // v4.0.0 ①: ルーティングテーブル拡充
  {
    // オリコポイント。1pt=1円相当。オリコカード THE POINT 等で貯まる。
    id: "orico-pt",
    name: "オリコポイント",
    kind: "point",
    iconChar: "Or",
    iconColor: "#e60012", // オリコブランド赤
    yenValue: 1, // 1pt=1円相当
  },
  {
    // 三菱UFJ グローバルポイント。1pt ≈ 4〜5円相当の高価値設計
    // (共通ポイントへ 200pt→600〜800pt、JALマイル 200pt→400)。
    // 三菱UFJカードは 1000円=1pt なので defaultRate=0.001、価値は edge で換算。
    id: "mufg-pt",
    name: "三菱UFJグローバルポイント",
    kind: "point",
    iconChar: "UFJ",
    iconColor: "#d4001a", // 三菱UFJニコス赤
    // 1pt≈4〜5円の高価値設計 (200pt→800 共通ポイント等)。保守的に 4 で置く。
    yenValue: 4,
  },
];
