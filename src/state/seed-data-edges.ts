// 通貨間の交換レート (1 単位あたり)。
// 計算: bestPath.ts が Bellman-Ford 派生アルゴリズムで最大積パスを探索する。
// 実在の公開コースのみ登録 (各社公式情報・JAL/ANA 公式パートナーリスト 等)。
//
// 編集時のガイド:
//   - fromCurrencyId / toCurrencyId は seed-data-currencies.ts に存在する id
//   - rate: from 1 単位 → to 何単位か (例: 2pt → 1マイル なら rate=0.5)
//   - 双方向交換は 2 件のエッジ (例: v-to-jrkyupo + jrkyupo-to-v)
//   - 最低交換単位や上限は計算 (経路選択) には反映していない。上限は notes 記載のみ。
//     最低交換単位は notes に加えて minFromUnits (from 通貨の単位数) にも構造化して持たせ、
//     少額試算時に「◯◯ を △△ 貯めてから交換」を UI 注記する (DB-8)。経路選択には不使用
//     (ConversionEdge.minFromUnits の JSDoc 参照 = pathCache の線形前提を壊さない)。
//   - lastVerifiedAt ("YYYY-MM"、REM-#2): レートを公式ページで最後に人手確認した月。
//     **bestPath に実際に乗る主要 edge のみ**手記入し (未記入 = 未検証扱いで stale バッジ
//     非表示)、値は git log / seed コメントから確認月が特定できるものだけ入れる (でっち上げ
//     禁止)。各記入行に確認根拠を短くコメントする。最終確認が 6ヶ月超になると Calculator の
//     結果行 / EdgesScreen に「⚠ 要確認」が出る (判定は src/domain/edgeFreshness.ts)。
//     未記入分の漸進記入・棚卸しは SESSION_LOG「四半期ごと手動確認チェックリスト」で回す。
import type { ConversionEdge } from "../domain/types";

export const SEED_EDGES: ConversionEdge[] = [
  // ============ 楽天ポイント ============
  {
    id: "rakuten-to-ana",
    fromCurrencyId: "rakuten-pt",
    toCurrencyId: "ana-mile",
    rate: 0.5,
    notes: "2pt → 1マイル",
  },
  {
    id: "rakuten-to-edy",
    fromCurrencyId: "rakuten-pt",
    toCurrencyId: "edy",
    rate: 1,
    notes: "1pt → 1円分のEdy",
  },
  {
    id: "rakuten-to-jal",
    fromCurrencyId: "rakuten-pt",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    minFromUnits: 50, // 50pt以上
    notes: "2pt → 1マイル (50pt以上、月20,000pt上限)",
  },

  // ============ Vポイント ============
  {
    id: "v-to-ana",
    fromCurrencyId: "v-pt",
    toCurrencyId: "ana-mile",
    rate: 0.5,
    notes: "2pt → 1マイル",
  },
  {
    id: "v-to-edy",
    fromCurrencyId: "v-pt",
    toCurrencyId: "edy",
    rate: 1,
    notes: "VポイントPay/SBI証券積立/iDキャッシュバック等で 1pt=1円相当",
  },
  {
    id: "v-to-waon",
    fromCurrencyId: "v-pt",
    toCurrencyId: "waon-pt",
    rate: 1,
    notes:
      "1Vポイント = 1WAON POINT (等価交換)。Vポイント→JALマイルへの実用ルート",
  },
  {
    id: "v-to-jrkyupo",
    fromCurrencyId: "v-pt",
    toCurrencyId: "jrkyupo",
    rate: 1,
    minFromUnits: 500, // 500pt単位
    notes: "500Vポイント → 500JRキューポ (双方向, 500pt単位)",
  },
  {
    id: "jrkyupo-to-v",
    fromCurrencyId: "jrkyupo",
    toCurrencyId: "v-pt",
    rate: 1,
    minFromUnits: 500, // 500pt単位
    notes: "500JRキューポ → 500Vポイント (双方向, 500pt単位)",
  },

  // ============ 永久不滅ポイント (セゾン) ============
  {
    id: "eikyu-to-ana",
    fromCurrencyId: "eikyu",
    toCurrencyId: "ana-mile",
    rate: 3,
    notes: "200pt → 600マイル",
  },
  {
    id: "eikyu-to-jal",
    fromCurrencyId: "eikyu",
    toCurrencyId: "jal-mile",
    rate: 2.5,
    notes: "200pt → 500マイル",
  },
  {
    id: "eikyu-to-d",
    fromCurrencyId: "eikyu",
    toCurrencyId: "d-pt",
    rate: 5,
    notes: "200pt → 1000dポイント",
  },
  {
    id: "eikyu-to-rakuten",
    fromCurrencyId: "eikyu",
    toCurrencyId: "rakuten-pt",
    rate: 4.5,
    notes: "200pt → 900楽天ポイント",
  },
  {
    id: "eikyu-to-amazon",
    fromCurrencyId: "eikyu",
    toCurrencyId: "amazon-pt",
    rate: 5,
    notes: "200pt → 1000円分Amazonギフト券",
  },
  {
    id: "eikyu-to-edy",
    fromCurrencyId: "eikyu",
    toCurrencyId: "edy",
    rate: 4.5,
    notes: "永久不滅ウォレット 100pt=450円相当",
  },

  // ============ dポイント ============
  {
    id: "d-to-jal",
    fromCurrencyId: "d-pt",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    notes: "5000pt → 2500マイル",
  },
  {
    id: "d-to-edy",
    fromCurrencyId: "d-pt",
    toCurrencyId: "edy",
    rate: 1,
    notes: "d払い・店頭利用で 1pt=1円相当",
  },

  // ============ JRE POINT ============
  {
    id: "jre-to-jal",
    fromCurrencyId: "jre",
    toCurrencyId: "jal-mile",
    rate: 0.6667, // 1500pt → 1000マイル (= 1000/1500)。CLUB-Aゴールド 優遇
    requiredCardIds: ["jal-suica"],
    notes: "1500pt → 1000マイル (JALカードSuica CLUB-Aゴールド 会員特典)",
    lastVerifiedAt: "2026-06", // v6.4.0 (afc74b1, 2026-06-20) で grade 別レートを公式確認
  },
  {
    // 普通カード版。ゴールド (jre-to-jal, 0.6667) より低レート。
    // 両カード保有時は bestPath が max-product でゴールド経路を自動選択する。
    id: "jre-to-jal-normal",
    fromCurrencyId: "jre",
    toCurrencyId: "jal-mile",
    rate: 0.5, // 1500pt → 750マイル。JALカードSuica 普通カード
    requiredCardIds: ["jal-suica-normal"],
    notes: "1500pt → 750マイル (JALカードSuica 普通カード 会員特典)",
    lastVerifiedAt: "2026-06", // v6.4.0 (afc74b1, 2026-06-20) で普通カード版を新設・公式確認
  },
  {
    id: "jre-to-edy",
    fromCurrencyId: "jre",
    toCurrencyId: "edy",
    rate: 1,
    notes: "Suicaチャージ 1pt=1円相当 (Edyと同等の現金相当として登録)",
  },

  // ============ WAON POINT → JALマイル ============
  {
    id: "waon-to-jal",
    fromCurrencyId: "waon-pt",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    requiredCardIds: ["aeon-card"],
    notes:
      "2WAON = 1マイル (50%還元)。イオンカード会員 + JMB 会員の特典 (公式 FAQ)。" +
      "本人名義と JMB お得意様番号の名義が一致している必要あり。",
    lastVerifiedAt: "2026-05", // v6.1.0 (381cba4, 2026-05-29) で公式 FAQ を確認しゲート追加
  },

  // ============ JRキューポ ⇔ JAL/ANA マイル (JQ SUGOCA カード保有特典) ============
  // JRキューポ (JR九州、旧 JQ POINT)。JMB JQ SUGOCA / JQ SUGOCA ANA カード保有で
  // マイルと相互交換できる。マイル→ポイントは等価、ポイント→マイルは 2:1 (50%)。
  {
    id: "jrkyupo-to-jal",
    fromCurrencyId: "jrkyupo",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    requiredCardIds: ["jmb-jq-sugoca"],
    notes:
      "1000JRキューポ → 500マイル。JMB JQ SUGOCA 会員特典 " +
      "(JMB×おまとめ登録SUGOCA 紐付け、1日1回)。",
    lastVerifiedAt: "2026-05", // v6.1.0 (381cba4, 2026-05-29) で新設・公式確認
  },
  {
    id: "jal-to-jrkyupo",
    fromCurrencyId: "jal-mile",
    toCurrencyId: "jrkyupo",
    rate: 1,
    requiredCardIds: ["jmb-jq-sugoca"],
    notes:
      "10000マイル → 10000JRキューポ (等価交換)。JMB JQ SUGOCA 会員特典 " +
      "(年度内2回・20000マイルまで)。",
    lastVerifiedAt: "2026-05", // v6.1.0 (381cba4, 2026-05-29) で新設・公式確認
  },
  {
    id: "jrkyupo-to-ana",
    fromCurrencyId: "jrkyupo",
    toCurrencyId: "ana-mile",
    rate: 0.5,
    requiredCardIds: ["jq-sugoca-ana"],
    notes: "1000JRキューポ → 500マイル。JQ SUGOCA ANA 会員特典。",
    lastVerifiedAt: "2026-05", // v6.1.0 (381cba4, 2026-05-29) で新設・公式確認
  },
  {
    id: "ana-to-jrkyupo",
    fromCurrencyId: "ana-mile",
    toCurrencyId: "jrkyupo",
    rate: 1,
    requiredCardIds: ["jq-sugoca-ana"],
    notes: "10000マイル → 10000JRキューポ (等価交換)。JQ SUGOCA ANA 会員特典。",
    lastVerifiedAt: "2026-05", // v6.1.0 (381cba4, 2026-05-29) で新設・公式確認
  },

  // ============ クレカ・ホテル系プログラム ============
  // エポスポイント (エポスカードで貯まる)
  {
    id: "epos-to-jal",
    fromCurrencyId: "epos",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    minFromUnits: 500, // 500pt単位
    notes: "1,000pt = 500マイル (500pt単位)",
    lastVerifiedAt: "2026-07", // 本セッション (エポス3グレード化) で公式レートを確認
  },
  {
    id: "epos-to-ana",
    fromCurrencyId: "epos",
    toCurrencyId: "ana-mile",
    rate: 0.5,
    notes:
      "1,000pt = 500マイル。ゴールド/プラチナの優遇 (1pt=0.6マイル) は" +
      "2026-03-31で終了済み — 復活させない",
    lastVerifiedAt: "2026-07", // 本セッションで優遇終了 (2026-03-31) を含め公式確認
  },
  {
    id: "epos-to-d",
    fromCurrencyId: "epos",
    toCurrencyId: "d-pt",
    rate: 1,
    minFromUnits: 1000, // 1,000pt以上
    notes: "1pt = 1dポイント (1,000pt以上500pt単位、交換約1〜2か月)",
    lastVerifiedAt: "2026-07", // 本セッション (エポス→dポイント等価交換) で公式確認
  },
  // エポス→Ponta 1:1 は au/UQ/povo1.0 回線契約者限定のため意図的に未登録
  // (ライフスタイル条件)。マルイ商品券への交換は 2025-09-30 で終了済み。

  // AMEXメンバーシップ・リワード (AMEXプロパーカードで貯まる)
  {
    id: "amex-to-jal",
    fromCurrencyId: "amex-mr",
    toCurrencyId: "jal-mile",
    rate: 0.4,
    notes:
      "メンバーシップ・リワード・プラス加入時 2,500pt = 1,000マイル (通常 3,000:1,000)",
  },
  {
    id: "amex-to-ana",
    fromCurrencyId: "amex-mr",
    toCurrencyId: "ana-mile",
    rate: 0.8,
    notes: "MRプラス + ANAコース加入時 1,250pt = 1,000マイル",
  },

  // Marriott Bonvoy (Marriott系ホテル・SPGアメックス等で貯まる)
  {
    id: "marriott-to-jal",
    fromCurrencyId: "marriott",
    toCurrencyId: "jal-mile",
    rate: 0.333,
    notes: "3pt = 1マイル。60,000pt一括で +5,000ボーナス (実質 60k:25k)",
  },
  {
    id: "marriott-to-ana",
    fromCurrencyId: "marriott",
    toCurrencyId: "ana-mile",
    rate: 0.333,
    notes: "3pt = 1マイル。60,000pt一括で +5,000ボーナス",
  },

  // ALL Accor (Accor系ホテルで貯まる)
  {
    id: "accor-to-jal",
    fromCurrencyId: "accor",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    notes: "4,000pt = 2,000マイル (2:1)",
  },
  {
    id: "jal-to-accor",
    fromCurrencyId: "jal-mile",
    toCurrencyId: "accor",
    rate: 0.4,
    minFromUnits: 5000, // 5,000マイル単位 (最小交換)
    notes: "10,000マイル = 4,000pt (5,000マイル単位 = 1,000pt も可)",
  },

  // ============ JALマイル / ANAマイル → ポイント・現金相当 ============
  // マイル消費の選択肢として現金/ポイントへ流せる経路
  {
    id: "jal-to-d",
    fromCurrencyId: "jal-mile",
    toCurrencyId: "d-pt",
    rate: 1,
    notes: "10,000マイル → 10,000dポイント",
  },
  {
    id: "jal-to-edy",
    fromCurrencyId: "jal-mile",
    toCurrencyId: "edy",
    rate: 1.5,
    notes: "eJALポイント等のまとめ交換で 1マイル≒1.5円相当",
  },
  {
    id: "ana-to-v",
    fromCurrencyId: "ana-mile",
    toCurrencyId: "v-pt",
    rate: 1,
    notes: "10,000マイル → 10,000Vポイント (旧Tポイント提携)",
  },
  {
    id: "ana-to-edy",
    fromCurrencyId: "ana-mile",
    toCurrencyId: "edy",
    rate: 1,
    notes: "ANA SKYコインで 1マイル=1円相当",
  },

  // ============ Pontaポイント ============
  {
    id: "ponta-to-jal",
    fromCurrencyId: "ponta-pt",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    notes: "2pt → 1マイル",
  },
  // 【削除済 v4.0.0 ①】ponta-to-d / d-to-ponta:
  // dポイント ⇄ Pontaポイント の相互交換は 2020/9 にサービス終了済。
  // 架空ルートになるため削除 (公式裏取り: ponta.jp / 各種ポイント解説)。
  {
    id: "ponta-to-edy",
    fromCurrencyId: "ponta-pt",
    toCurrencyId: "edy",
    rate: 1,
    notes: "ローソン店頭利用等で 1pt=1円相当",
  },

  // ============ WAONポイント ============
  {
    id: "waon-to-edy",
    fromCurrencyId: "waon-pt",
    toCurrencyId: "edy",
    rate: 1,
    notes:
      "WAON電子マネーへのチャージ 1pt=1円分 (Edyと同等の現金相当として登録)",
  },

  // ============ nanacoポイント ============
  // nanaco POINT は基本セブン&iグループ内消費。
  // 1pt = 1円分の電子マネーnanacoへ交換可能なので、現金相当として edy に同質マッピング
  {
    id: "nanaco-to-edy",
    fromCurrencyId: "nanaco-pt",
    toCurrencyId: "edy",
    rate: 1,
    notes:
      "電子マネーnanacoへのチャージ 1pt=1円分 (Edyと同等の現金相当として登録)",
  },

  // ============ J-POINT (旧 Oki Doki、2026/1 リニューアル後) ============
  // JCB CARD W や ANA JCB ワイド等の JCB プロパー系で貯まる
  // 公式 FAQ: https://j-faq.jcb.co.jp/
  // 2026-05-14 修正: 旧 seed は Oki Doki 時代 (1pt=3マイル) の値を誤って入れていた。
  // J-POINT は 5倍換算後の単位で、JCB 公式 (https://www.jcb.co.jp/point/index.html#catalog)
  // に基づき再設定。
  {
    id: "j-point-to-jal",
    fromCurrencyId: "j-point",
    toCurrencyId: "jal-mile",
    rate: 0.6,
    notes: "1 J-POINT → 0.6 JAL マイル (JCB 公式レート、5倍換算後 J-POINT 単位)",
    lastVerifiedAt: "2026-05", // 3d22ee8 (2026-05-14) で JCB 公式 (2026 リニューアル後) を確認
  },
  {
    id: "j-point-to-ana",
    fromCurrencyId: "j-point",
    toCurrencyId: "ana-mile",
    rate: 0.6,
    notes: "1 J-POINT → 0.6 ANA マイル / スカイコイン (JCB 公式)",
    lastVerifiedAt: "2026-05", // 3d22ee8 (2026-05-14) で JCB 公式を確認
  },
  {
    id: "j-point-to-edy",
    fromCurrencyId: "j-point",
    toCurrencyId: "edy",
    rate: 1,
    notes:
      "MyJCB Pay で 1 J-POINT=1円 (現金相当として edy に登録)。" +
      "JCB ギフトカード/カード支払い充当 も 1pt=1円 (公式最高レート)",
    lastVerifiedAt: "2026-05", // 3d22ee8 (2026-05-14) で JCB 公式を確認
  },
  {
    id: "j-point-to-rakuten",
    fromCurrencyId: "j-point",
    toCurrencyId: "rakuten-pt",
    rate: 0.7,
    notes: "1 J-POINT → 0.7 楽天ポイント (JCB 公式)",
    lastVerifiedAt: "2026-05", // 3d22ee8 (2026-05-14) で JCB 公式を確認
  },
  {
    id: "j-point-to-d",
    fromCurrencyId: "j-point",
    toCurrencyId: "d-pt",
    rate: 0.7,
    notes: "1 J-POINT → 0.7 dポイント (JCB 公式)",
    lastVerifiedAt: "2026-05", // 3d22ee8 (2026-05-14) で JCB 公式を確認
  },
  {
    id: "j-point-to-ponta",
    fromCurrencyId: "j-point",
    toCurrencyId: "ponta-pt",
    rate: 0.7,
    notes: "1 J-POINT → 0.7 Ponta ポイント (JCB 公式、au Ponta 経路)",
    lastVerifiedAt: "2026-05", // 3d22ee8 (2026-05-14) で JCB 公式を確認
  },
  {
    id: "j-point-to-nanaco",
    fromCurrencyId: "j-point",
    toCurrencyId: "nanaco-pt",
    rate: 0.7,
    notes: "1 J-POINT → 0.7 nanaco ポイント (JCB 公式)",
    lastVerifiedAt: "2026-05", // 3d22ee8 (2026-05-14) で JCB 公式を確認
  },

  // ============ メルカリポイント ============
  // メルペイ残高/メルカリ内で 1pt=1円相当として利用可能
  {
    id: "mercari-pt-to-edy",
    fromCurrencyId: "mercari-pt",
    toCurrencyId: "edy",
    rate: 1,
    notes:
      "メルカリポイント 1pt=1円相当 (メルカリ内ショッピング / メルペイ残高での街使い等。" +
      "Edy 等の現金相当として登録)",
  },

  // ============ オリコポイント (v4.0.0 ①) ============
  // 公式: https://www.orico.co.jp/creditcard/pointservice/pointlist/
  // オリコポイントは 1pt=1円相当。下記は公式「ポイント移行」掲載分のみ。
  // 楽天/V/Suica/Edy/nanaco は公式ポイント移行に無いため未登録 (架空回避)。
  {
    id: "orico-to-waon",
    fromCurrencyId: "orico-pt",
    toCurrencyId: "waon-pt",
    rate: 1,
    minFromUnits: 1000, // 最低1,000P
    notes: "1,000オリコP → 1,000 WAON POINT (公式ポイント移行、最低1,000P)",
  },
  {
    id: "orico-to-ponta",
    fromCurrencyId: "orico-pt",
    toCurrencyId: "ponta-pt",
    rate: 0.8333,
    minFromUnits: 1200, // 最低1,200P
    notes: "1,200オリコP → 1,000 Pontaポイント (公式、最低1,200P)",
  },
  {
    id: "orico-to-d",
    fromCurrencyId: "orico-pt",
    toCurrencyId: "d-pt",
    rate: 0.8333,
    minFromUnits: 1200, // 最低1,200P
    notes: "1,200オリコP → 1,000 dポイント (公式、最低1,200P)",
  },
  {
    id: "orico-to-ana",
    fromCurrencyId: "orico-pt",
    toCurrencyId: "ana-mile",
    rate: 0.6,
    minFromUnits: 1000, // 最低1,000P
    notes: "1,000オリコP → 600 ANAマイル (公式、最低1,000P)",
  },
  {
    id: "orico-to-jal",
    fromCurrencyId: "orico-pt",
    toCurrencyId: "jal-mile",
    rate: 0.5,
    minFromUnits: 1000, // 最低1,000P
    notes: "1,000オリコP → 500 JALマイル (公式、最低1,000P)",
  },

  // ============ 三菱UFJ グローバルポイント (v4.0.0 ①) ============
  // 公式: https://www.cr.mufg.jp/mufgcard/point/shift/index.html
  // グローバルポイントは 1pt≈4〜5円の高価値設計。下記は公式「ポイント移行」掲載分のみ。
  // V/Amazon/Edy/Suica/ANA は公式ページに無いため未登録 (架空回避)。
  {
    id: "mufg-to-ponta",
    fromCurrencyId: "mufg-pt",
    toCurrencyId: "ponta-pt",
    rate: 4,
    minFromUnits: 200, // 200P以上
    notes: "200グローバルP → 800 Pontaポイント (公式、200P以上100P単位)",
  },
  {
    id: "mufg-to-d",
    fromCurrencyId: "mufg-pt",
    toCurrencyId: "d-pt",
    rate: 4,
    minFromUnits: 200, // 200P以上
    notes: "200グローバルP → 800 dポイント (公式、200P以上100P単位)",
  },
  {
    id: "mufg-to-rakuten",
    fromCurrencyId: "mufg-pt",
    toCurrencyId: "rakuten-pt",
    rate: 3,
    minFromUnits: 200, // 200P以上
    notes: "200グローバルP → 600 楽天ポイント (公式、200P以上100P単位)",
  },
  {
    id: "mufg-to-nanaco",
    fromCurrencyId: "mufg-pt",
    toCurrencyId: "nanaco-pt",
    rate: 3,
    minFromUnits: 200, // 200P以上
    notes: "200グローバルP → 600 nanacoポイント (公式、200P以上100P単位)",
  },
  {
    id: "mufg-to-waon",
    fromCurrencyId: "mufg-pt",
    toCurrencyId: "waon-pt",
    rate: 3,
    minFromUnits: 200, // 200P以上
    notes: "200グローバルP → 600 WAON POINT (公式、200P以上100P単位)",
  },
  {
    id: "mufg-to-jal",
    fromCurrencyId: "mufg-pt",
    toCurrencyId: "jal-mile",
    rate: 2,
    minFromUnits: 200, // 200P以上
    notes: "200グローバルP → 400 JALマイル (公式、200P以上100P単位)",
  },
];
