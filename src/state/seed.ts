// PointMax のシード (初期マスタ) を一元管理。
//
// データ本体は src/state/seed-data-*.ts に分割:
//   seed-data-currencies.ts : 通貨マスタ (Currency[])
//   seed-data-cards.ts      : クレカ / ポイントカード / 決済アプリ
//   seed-data-stores.ts     : 店舗 / クレカ還元ルール / ポイントカード提示ルール
//   seed-data-edges.ts      : 通貨間の交換レート
//
// この seed.ts は:
//   - SEED_VERSION / SEED_CHANGELOG / DEFAULT_SYNC_URL の運用メタを保持
//   - seed() 関数で 4 つのデータ + 自動同期 (seed-additions) を合成して返す
//   - BLOCKED_STORE_IDS や CATEGORY_ALIASES の最終 filter / remap を適用
//
// 自動同期 (scripts/sync/apply-proposals.ts) は seed-additions.ts に書き込む。
// この seed.ts や seed-data-*.ts を直接書き換えるのは「手書きで永続化する」時のみ。
import type {
  Card,
  ConversionEdge,
  Currency,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreRule,
} from "../domain/types";
import {
  ADDED_CARDS,
  ADDED_LOYALTY_RULES,
  ADDED_PAYMENT_APPS,
  ADDED_RULES,
  ADDED_STORES,
} from "./seed-additions";
import { BLOCKED_STORE_IDS } from "./seed-blocklist";
import { resolveCategory } from "./seed-category-aliases";
import { SEED_CURRENCIES } from "./seed-data-currencies";
import {
  SEED_CARDS,
  SEED_PAYMENT_APPS,
  SEED_POINT_CARDS,
} from "./seed-data-cards";
import {
  SEED_LOYALTY_RULES,
  SEED_STORE_RULES,
  SEED_STORES,
} from "./seed-data-stores";
import { SEED_EDGES } from "./seed-data-edges";

// シードデータの版数。新しいカード/通貨/レートを追加した時に上げる。
// アプリは保存済の lastSeedVersion とこの値を比較してアップデート通知を出す。
// v0.8 リリースを起点として 1 から再開、v1.0 リリースで 9 に到達。
export const SEED_VERSION = 22;

// デプロイされた公式マスタJSONのURL。
// scripts/generate-master.ts でビルド時に public/master.json として出力され、
// GitHub Pages 経由でこのURLから配信される。
// ユーザーが設定で空欄に戻したらこのURLが使われる。
export const DEFAULT_SYNC_URL =
  "https://kyounow.github.io/pointmax/master.json";

// 各バージョンで追加された主な内容（差分通知に使用）
// 個別の auto-sync 適用や微修正のためのバージョン bump は記録しない (CHANGELOG はリリース粒度)。
export const SEED_CHANGELOG: {
  version: number;
  date: string;
  summary: string;
}[] = [
  {
    version: 1,
    date: "2026-05-11",
    summary:
      "PointMax v0.8 リリース。クレカ＋ポイントカードの二重取り計算、支払方法(PaymentApp)の自動最適選択、JAL/ANA等の交換ルート、PWA対応、公式マスタの自動同期を提供",
  },
  {
    version: 9,
    date: "2026-05-12",
    summary:
      "PointMax v1.0 リリース。① 支払方法のカード別還元 (d払い×dカード 1% 等) を表現する cardSpecificBonusRates、② キャンペーン期間限定ルール (validFrom/validTo) と専用画面、③ 自動同期パイプラインで楽天/d/Vポイント/Ponta から計 148 加盟店を取り込み済み。後方互換ポリシー発効。",
  },
  {
    version: 10,
    date: "2026-05-12",
    summary:
      "v2 step 1: カード有効化トグル (Card.enabled) を追加。dカード・PayPayカードをデフォルト無効化し Calculator 順位付けから除外。CardsScreen に「使う」列を追加。",
  },
  {
    version: 11,
    date: "2026-05-12",
    summary:
      "v2 step 2: マスター由来カードプール。SEED_CARDS / ADDED_CARDS の id を MASTER_CARD_IDS として export し、これらの id を持つカードは removeCard で削除不可 (mergeFromSeed 復活するため)。CardsScreen に「公式」バッジを表示し、master カードの削除ボタンを非表示。ResponsiveTable に汎用 canDelete prop を追加。",
  },
  {
    version: 12,
    date: "2026-05-12",
    summary:
      "三井住友カード ゴールド(NL) 7% 還元対象店舗を公式マスタから取り込み。新規 12 店舗 (セイコーマート/ポプラ/モスバーガー/ケンタッキーフライドチキン/吉野家/バーミヤン/ジョナサン/夢庵/はま寿司/ココス/エクセルシオール カフェ/かっぱ寿司) と 13 SMBC rules を追加。スシローは公式対象外となったため rule-smbc-sushiro を削除。",
  },
  {
    version: 13,
    date: "2026-05-12",
    summary:
      "ConversionEdge.requiredCardIds を追加。特定クレジットカード保有者のみ利用可能な交換ルートを表現できる。JRE → JALマイル (1500pt → 750マイル) を jal-suica 必須に設定 (一般 JRE 保有者には非表示)。bestPath / paymentApp / loyalty で availableCardIds による OR フィルタリング。EdgesScreen に「要 X」バッジと編集 UI (マルチ checkbox) を追加。",
  },
  {
    version: 14,
    date: "2026-05-13",
    summary:
      "「長期公式プログラム」を validFrom のみで表現する規約を導入。SMBC 7% タッチ決済 21 ルールに validFrom: 2023-04-03 を付与。CalculatorScreen / CampaignsScreen の badge 表示を 2 段階に分け、validTo あり = 🎯 キャンペーン中 (期限色)、validFrom のみ = 📌 公式プログラム (情報色)。共通コンポネ RuleStatusBadge を追加。既存 localStorage ユーザは add-only mergeFromSeed の制約により validFrom が反映されない (= 既存挙動維持)。新規 install / 再 import で新表示。",
  },
  {
    version: 15,
    date: "2026-05-13",
    summary:
      "PaymentApp.cardSpecificBonusRates[] に validFrom/validTo を追加。d払い×dカード 1% 等の per-bonus 還元に有効期間を持たせ、期限切れ bonus は paymentApp 評価で自動除外。payment-app extractor を v1.1 化、card/point-partner と同等の hallucination ガード (detectUnsupportedDateClaim) を適用。スコープ外: PaymentApp top-level の validFrom/validTo、UI badge での期間表示は将来課題。",
  },
  {
    version: 16,
    date: "2026-05-13",
    summary:
      "PR #1 の review item 消化。しゃぶ葉 (すかいらーくグループ) を新規 store として追加 + SMBC 7% rule を追加 (validFrom 付き)。aliases.json に yumean→yumetoan / kappazushi→kappa-sushi 追加で次回 cron は既存と統合される予定。残 4 件 (11% 上振せ条件付き、lowson typo は alias 済、ファミマ・デイリーヤマザキ誤抽出) はスキップ。",
  },
  {
    version: 17,
    date: "2026-05-14",
    summary:
      "(a) 初の期間限定キャンペーン rule-dcard-bic-camera-d-pay-202605 を追加 (2026/5/16〜5/31)。" +
      "(b) StoreRule / LoyaltyRule に optional recurringDays?: number[] を追加。" +
      "月内の特定日にのみ有効な rule を表現可能に。isRuleActiveAt が validFrom/validTo と" +
      "AND 結合で日付チェック。楽天市場「5と0のつく日」+1% rule を [5,10,15,20,25,30] で登録 (1 件目の使用例)。" +
      "(c) Calculator に「今日 YYYY/MM/DD 時点の還元率」インジケーター追加で日付依存を明示。" +
      "(d) RulesScreen / PaymentAppsScreen に期間/recurring 列を追加し、" +
      "アクティブ/非アクティブを視覚化。",
  },
  {
    version: 18,
    date: "2026-05-14",
    summary:
      "発行枚数上位カバー: master card pool に 5 枚追加 (全て enabled: false、ユーザは「使う」トグルで有効化)。" +
      "jal-card (普通)、aeon-card、jcb-w、epos-card、ana-visa。" +
      "JCB CARD W 用に新通貨 j-point (J-POINT、2026/1 Oki Doki リニューアル後) を追加。" +
      "J-POINT → JAL/ANA マイル / MyJCB Pay の交換 edges 3 件、JAL カード普通版用の特約店/ファミマ rules 2 件も追加。" +
      "これで日本の発行枚数上位 9 ブランド (楽天/三井住友/JAL/AEON/JCB/d/PayPay/エポス/ANA) ほぼカバー。",
  },
  {
    version: 19,
    date: "2026-05-14",
    summary:
      "PR #2 (週次 cron review queue) Step 1 消化: stores 34 件を seed-additions.ts に取り込み " +
      "(牛角・くら寿司・ドラッグユタカ・samsonite 等、v/d/ponta 加盟店リストより)。" +
      "propose pipeline に rate=0 ガード追加 (Gemini 抽出失敗時の意味のない rule が auto 適用される事故を防止)。" +
      "新 review reason 'zeroOrInvalidRate' を導入。aliases.json に sourceId hallucination 対策で " +
      "smbc-v-gold-7percent → smbc-v エイリアスを追加 (次回 cron で 22 件の hallucinated rules が " +
      "正しく既存 smbc-v に正規化される予定)。",
  },
  {
    version: 21,
    date: "2026-05-14",
    summary:
      "v2.1.0 で deferred したカバー範囲を実装。" +
      "(1) Olive フレキシブルペイのコンビニ・飲食 8% rules を 22 件追加 " +
      "(smbc-v 7% rules を Olive 用に複製、+1% 上乗せ、validFrom 2023-04-03 で長期公式プログラム扱い)。" +
      "(2) JRE POINT カード × 駅ナカ加盟店 8 件 (NewDays/KIOSK/acure/エキュート/グランスタ/" +
      "アトレ/ルミネ/ニュウマン) + 対応 loyaltyRules 8 件を追加。新カテゴリ「駅ナカ」を導入。" +
      "JR東日本利用者の駅ナカ支出が正確に PointMax で評価できるようになる。",
  },
  {
    version: 20,
    date: "2026-05-14",
    summary:
      "主要決済・特殊カード・JRE ポイント追加でカバー範囲を大幅拡張。" +
      "Cards 3 (viewcard / mercard / olive)、PaymentApps 3 (au PAY / ファミペイ / メルペイ)、" +
      "PointCard 1 (jre-pointcard)、通貨 1 (mercari-pt)、store 1 (mercari)、" +
      "storeRules 3 (ビューカード × Suica チャージ 1.5% / メルカード × メルカリ 4% / " +
      "メルカード × メルカリ 毎月8日 8% = recurringDays 2 つ目の使用例)、edge 1。" +
      "Olive コンビニ・飲食 8% rules は smbc-v 21 rules 複製のため将来別 commit。",
  },
  {
    version: 22,
    date: "2026-05-14",
    summary:
      "バグ修正 + UI 改善: " +
      "(1) ADDED_LOYALTY_RULES (Ponta) が参照していた 5 件の dangling store (jalannet / hotpepper-beauty / hotpepper-gourmet / jalan-golf / jal-rentacar) を seed に手書き追加して日本語 name + 正しい category を提供。apollo-station の name も「apollostation (アポロステーション)」に日本語化。" +
      "(2) CampaignsScreen の classifyCampaign が recurringDays 外を expired 誤判定するバグを修正 (validTo 過去のみが expired、recurringDays 外は ongoing 維持)。" +
      "(3) Calculator の順位ソートを 3 段 tie-break に拡張: 一次 totalFinalAmount 降順 / 二次 支払単独 (card+appBonus) 多い順 / 三次 構成要素少ない順。同 totalFinalAmount は同 rank 表示 (#1, #1, #3 ...) で表示も整合。",
  },
];

// マスター由来カード (seed-data-cards.ts + auto-sync) の id 集合。
// この集合に含まれる id を持つカードは:
//   - removeCard で削除されない (次回 mergeFromSeed で復活するだけなので)
//   - CardsScreen でマスターバッジ表示 + 削除ボタン非表示
// ユーザーが addCard で追加したカード (UUID id) は集合に含まれない → 削除可能。
export const MASTER_CARD_IDS = new Set<string>([
  ...SEED_CARDS.map((c) => c.id),
  ...ADDED_CARDS.map((c) => c.id),
]);

export const isMasterCard = (id: string): boolean => MASTER_CARD_IDS.has(id);

// seed() の戻り値の型。状態保存時の SeedShape と一致する。
type SeedReturn = {
  cards: Card[];
  currencies: Currency[];
  stores: Store[];
  rules: StoreRule[];
  edges: ConversionEdge[];
  pointCards: PointCard[];
  loyaltyRules: LoyaltyRule[];
  paymentApps: PaymentApp[];
};

/**
 * 手書きシード (seed-data-*.ts) と自動同期で追加されたデータ
 * (seed-additions.ts) を合成して返す。
 *
 * 合成ルール:
 *  - 手書きが常に前、追加分が後 (UI の並びはこの順)
 *  - id が重複した場合は手書きが勝つ (filter で排除)
 *  - BLOCKED_STORE_IDS に含まれる store と、それを参照する rules/loyaltyRules は除外
 *  - 追加 store の category は CATEGORY_ALIASES で正規化 (旧名 → 新名)
 */
export const seed = (): SeedReturn => {
  const currencies = SEED_CURRENCIES;
  const cards = SEED_CARDS;
  const pointCards = SEED_POINT_CARDS;
  const paymentApps = SEED_PAYMENT_APPS;
  const stores = SEED_STORES;
  const rules = SEED_STORE_RULES;
  const loyaltyRules = SEED_LOYALTY_RULES;
  const edges = SEED_EDGES;

  // 手書きで定義済みの id 集合 (自動同期分が衝突したら捨てるため)
  const handwrittenStoreIds = new Set(stores.map((s) => s.id));
  const handwrittenCardIds = new Set(cards.map((c) => c.id));
  const handwrittenPaymentAppIds = new Set(paymentApps.map((p) => p.id));

  return {
    currencies,
    cards: [
      ...cards,
      ...ADDED_CARDS.filter((c) => !handwrittenCardIds.has(c.id)),
    ],
    stores: [
      ...stores,
      ...ADDED_STORES.filter(
        (s) => !handwrittenStoreIds.has(s.id) && !BLOCKED_STORE_IDS.has(s.id),
      ).map((s) => ({
        ...s,
        category: resolveCategory(s.category),
      })),
    ],
    rules: [
      ...rules,
      ...ADDED_RULES.filter(
        (r) => !r.storeId || !BLOCKED_STORE_IDS.has(r.storeId),
      ),
    ],
    edges,
    pointCards,
    loyaltyRules: [
      ...loyaltyRules,
      ...ADDED_LOYALTY_RULES.filter((r) => !BLOCKED_STORE_IDS.has(r.storeId)),
    ],
    paymentApps: [
      ...paymentApps,
      ...ADDED_PAYMENT_APPS.filter((p) => !handwrittenPaymentAppIds.has(p.id)),
    ],
  };
};
