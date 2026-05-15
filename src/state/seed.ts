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
  BenefitProgram,
  Card,
  ConversionEdge,
  Currency,
  LoyaltyRule,
  PaymentApp,
  PointCard,
  Store,
  StoreProgramMembership,
} from "../domain/types";
import {
  ADDED_CARDS,
  ADDED_LOYALTY_RULES,
  ADDED_MEMBERSHIPS,
  ADDED_PAYMENT_APPS,
  ADDED_PROGRAMS,
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
  SEED_STORES,
} from "./seed-data-stores";
import { SEED_EDGES } from "./seed-data-edges";
import {
  SEED_BENEFIT_PROGRAMS,
  SEED_STORE_PROGRAM_MEMBERSHIPS,
} from "./seed-data-programs";

// シードデータの版数。新しいカード/通貨/レートを追加した時に上げる。
// アプリは保存済の lastSeedVersion とこの値を比較してアップデート通知を出す。
// v0.8 リリースを起点として 1 から再開、v1.0 リリースで 9 に到達。
export const SEED_VERSION = 31;

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
  {
    version: 23,
    date: "2026-05-14",
    summary:
      "J-POINT 交換レート修正: v17 で追加した時、旧 Oki Doki 時代の値 (1pt=3マイル) を" +
      "誤って入れていた。JCB 公式 (https://www.jcb.co.jp/point/index.html#catalog) に基づき修正:" +
      "JAL/ANA マイル 0.6、楽天/d/Ponta/nanaco 各 0.7、MyJCB Pay 1.0 (現金相当)。" +
      "5倍換算後の J-POINT 単位として整合。新規 4 edges (j-point → rakuten / d / ponta / nanaco) も追加。",
  },
  {
    version: 24,
    date: "2026-05-14",
    summary:
      "paymentApp 計算モデルを「累積モデル」に修正 (重大バグ修正)。" +
      "chargeBased=true の paymentApp (楽天Pay/d払い/PayPay/au PAY/ファミペイ/メルペイ) で、" +
      "従来は card.defaultRate を別途加算していたが、これがチャージ時還元 0% の実態と乖離し、" +
      "Calculator が 1pp 程度過大評価していた (例: dカード × d払い = 現実 1.0% を 2.0% と計算)。" +
      "新モデル: chargeBased=true なら card.defaultRate は 0 扱い、" +
      "bonus = defaultBonusRate (ベース) + cardSpecific.rate (上乗せ) の累積で表現。" +
      "PaymentApp.cardSpecificBonusRates の意味を「上乗せ加算分」に確定 (doc 更新)。" +
      "新カード 2 枚 (au-pay-card / famima-card) を master pool に追加し、" +
      "pa-au-pay / pa-famipay の cardSpecific 補完。" +
      "既存 4 paymentApp (rakuten/d-pay/paypay/merpay) は defaultBonusRate=0 のため値は変わらず。",
  },
  {
    version: 25,
    date: "2026-05-14",
    summary:
      "Pay アプリのベース還元率 (defaultBonusRate) を実態に合わせて更新。" +
      "v24 でデフォルト 0 のままだった 楽天Pay / d払い / PayPay に正しい基本還元率を反映。" +
      "楽天Pay: 0 → 0.01 (1%、楽天Pay 利用は誰でも 1% / 楽天カード経由で +0.5% = 1.5%)。" +
      "d払い: 0 → 0.005 (0.5%、200円1pt 誰でも / dカード設定で +0.5% = 1.0%)。" +
      "PayPay: 0 → 0.005 (0.5%、残高払い誰でも / PayPayクレジット連携で +0.5% = 1.0%)。" +
      "cardSpecific.rate も上乗せ単独値に修正 (合計値は同じ、上乗せ式 + ベース で正しい累積)。" +
      "実利的影響: 「Pay アプリ × 紐付け以外のカード」シナリオが現実通り 0.5%〜1% 評価になり、" +
      "「自社カード以外を持つ人」にも適切な還元計算が出る。",
  },
  {
    version: 26,
    date: "2026-05-14",
    summary:
      "PaymentApp.enabled?: boolean を追加。Card と同じく「使う」OFF トグルで Calculator から除外可能に。" +
      "MASTER_PAYMENT_APP_IDS / isMasterPaymentApp ヘルパを追加 (Card master pool の PaymentApp 版)。" +
      "デフォルト OFF: pa-au-pay / pa-famipay / pa-merpay (特定ユーザ向け、auユーザ/ファミマユーザ/メルカリユーザ)。" +
      "PaymentAppsScreen に使う列 + 公式バッジ + master 削除ガード。" +
      "v17/18 で実装した Card.enabled パターンを PaymentApp に展開。",
  },
  {
    version: 27,
    date: "2026-05-14",
    summary:
      "PR #3 rakuten-point-partners から autoApplicable 194 件をフィルタ取り込み。" +
      "stores 81 件は skip (新規店舗マスタ拡大は別議題)。" +
      "loyaltyRules 113 件のうち storeId が既存マスタ (SEED_STORES + ADDED_STORES) にある 59 件を採用。" +
      "kfc/bamiyan/jonathan/gusto/sukiya/yoshinoya/shabuyo/cocos 等 既存店舗 × 楽天ポイントカード loyaltyRule の補完。",
  },
  {
    version: 31,
    date: "2026-05-14",
    summary:
      "PR 4 (Schema Migration Framework): localStorage の persist schema 版管理を本格導入。" +
      "src/state/persist-versions.ts で SCHEMA_MIGRATIONS マップを集中管理、" +
      "strategy 別 (passthrough / reset / transform) で旧 version への対応を declarative に。" +
      "PointMax v3 リリース時、既存 v2.x localStorage を持つユーザーは V3UpgradeModal で" +
      "JSON Export → Apply の手順を明示。" +
      "persist.version 1 → 2 に bump、SCHEMA_MIGRATIONS[1] = reset (= v3 で完全初期化)。" +
      "これで今後の v4, v5 でも同じ framework で schema 変更に対応可能。",
  },
  {
    version: 30,
    date: "2026-05-14",
    summary:
      "PR 3 (Cleanup): 旧型 (StoreRule / LoyaltyRule / PaymentApp deprecated fields) を完全廃止。" +
      "旧 evaluator (resolveRate / loyalty / paymentApp の旧ロジック) を削除し、programEvaluator が唯一の評価源に。" +
      "新画面 ProgramsScreen を追加 (Program 一覧 + 加盟店表示)。" +
      "RulesScreen を廃止 (ProgramsScreen に統合)。CampaignsScreen は Program ベースに改修。" +
      "ADDED_LOYALTY_RULES 62 件を Program memberships に吸収。" +
      "cron pipeline (auto-sync) も Program ベースに更新 (ADDED_MEMBERSHIPS / ADDED_PROGRAMS 等)。" +
      "SEED_VERSION 30 で型レベル schema 完全切替。次の PR 4 で localStorage migration framework + V3UpgradeModal。",
  },
  {
    version: 29,
    date: "2026-05-14",
    summary:
      "PR 2 (Migration): 旧 StoreRule / LoyaltyRule / PaymentApp.cardSpecificBonusRates の" +
      "全件を BenefitProgram に統合。Program 約 33 件 (SMBC 7% / Olive 8% / 楽天市場 / d払い × ビックカメラ / " +
      "メルカード × メルカリ / ビューカード Suica チャージ / JAL Suica えきねっと等 11 件、" +
      "Loyalty 系 10 件 (pointCard × rate group)、PaymentApp 系 11 件 (base + addOn))。" +
      "Memberships 約 200+ 件。Calculator は programEvaluator が主な評価源、旧 rule 配列は空。" +
      "PR 3 で旧型 (StoreRule / LoyaltyRule / cardSpecificBonusRates 等) と旧 evaluator を削除予定。",
  },
  {
    version: 28,
    date: "2026-05-14",
    summary:
      "PR 1 (Foundation): BenefitProgram モデル導入。" +
      "旧 StoreRule / LoyaltyRule / PaymentApp.cardSpecificBonusRates の 3 種の還元 rule を統合する上位概念 " +
      "BenefitProgram 型を新規定義 (id / cardIds / pointCardId / paymentAppId / rate / currencyId / " +
      "validFrom/validTo/recurringDays / bonusType / meta)。StoreProgramMembership で 店舗 × プログラム M2M。" +
      "programEvaluator.ts で統一評価エンジン (PR 1 期は JAL特約店 のみ Program 化、他は旧 rule 維持)。" +
      "JAL特約店 11 stores の category を業種別 (ガソリンスタンド/ドラッグストア/書店/百貨店/ファッション/" +
      "スーパー/飲食) に変更。prog-jal-tokuyaku program + 12 memberships を seed 追加。" +
      "旧 rule-jal-suica-tokuyaku / rule-jal-card-tokuyaku / rule-jal-suica-familymart / " +
      "rule-jal-card-familymart の 4 rules を削除。Calculator は旧 resolveRate + 新 programEvaluator " +
      "両方の rate を比較して最大採用で動作。",
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

// マスター由来 PaymentApp (SEED_PAYMENT_APPS + ADDED_PAYMENT_APPS) の id 集合。
// この集合に含まれる id を持つ PaymentApp は:
//   - removePaymentApp で削除されない (次回 mergeFromSeed で復活するだけなので)
//   - PaymentAppsScreen でマスターバッジ表示 + 削除ボタン非表示
// ユーザが addPaymentApp で追加した PaymentApp (UUID id) は集合に含まれない → 削除可能。
export const MASTER_PAYMENT_APP_IDS = new Set<string>([
  ...SEED_PAYMENT_APPS.map((p) => p.id),
  ...ADDED_PAYMENT_APPS.map((p) => p.id),
]);

export const isMasterPaymentApp = (id: string): boolean =>
  MASTER_PAYMENT_APP_IDS.has(id);

// マスター由来 BenefitProgram (SEED_BENEFIT_PROGRAMS) の id 集合。
// この集合に含まれる id を持つ Program は公式マスターバッジを表示する。
// ユーザーが追加したプログラム (UUID id) は含まれない。
export const MASTER_PROGRAM_IDS = new Set<string>(
  SEED_BENEFIT_PROGRAMS.map((p) => p.id),
);

export const isMasterProgram = (id: string): boolean =>
  MASTER_PROGRAM_IDS.has(id);

// 「公式値に戻す」機能用の seed lookup ヘルパー。
// 編集前の master 値を返す。userModifiedAt クリアと合わせて使う (src/state/userModified.ts)。
// 初回呼び出しで lazy にキャッシュ (seed-data-cards.ts / seed-additions.ts は
// import 時に static なので safe)。
let _seedCardLookup: Map<string, Card> | null = null;
export const getSeedCard = (id: string): Card | undefined => {
  if (!_seedCardLookup) {
    _seedCardLookup = new Map();
    for (const c of SEED_CARDS) _seedCardLookup.set(c.id, c);
    for (const c of ADDED_CARDS) {
      // 手書きが優先 (seed() と同じセマンティクス)
      if (!_seedCardLookup.has(c.id)) _seedCardLookup.set(c.id, c);
    }
  }
  return _seedCardLookup.get(id);
};

let _seedPaymentAppLookup: Map<string, PaymentApp> | null = null;
export const getSeedPaymentApp = (id: string): PaymentApp | undefined => {
  if (!_seedPaymentAppLookup) {
    _seedPaymentAppLookup = new Map();
    for (const p of SEED_PAYMENT_APPS) _seedPaymentAppLookup.set(p.id, p);
    for (const p of ADDED_PAYMENT_APPS) {
      if (!_seedPaymentAppLookup.has(p.id)) _seedPaymentAppLookup.set(p.id, p);
    }
  }
  return _seedPaymentAppLookup.get(id);
};

// seed() の戻り値の型。状態保存時の SeedShape と一致する。
type SeedReturn = {
  cards: Card[];
  currencies: Currency[];
  stores: Store[];
  edges: ConversionEdge[];
  pointCards: PointCard[];
  loyaltyRules: LoyaltyRule[];
  paymentApps: PaymentApp[];
  programs: BenefitProgram[];
  memberships: StoreProgramMembership[];
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
    programs: [
      ...SEED_BENEFIT_PROGRAMS,
      ...ADDED_PROGRAMS.filter(
        (p) => !SEED_BENEFIT_PROGRAMS.some((sp) => sp.id === p.id),
      ),
    ],
    memberships: [
      ...SEED_STORE_PROGRAM_MEMBERSHIPS,
      ...ADDED_MEMBERSHIPS.filter(
        (m) => !SEED_STORE_PROGRAM_MEMBERSHIPS.some(
          (sm) => sm.programId === m.programId && sm.storeId === m.storeId,
        ),
      ),
    ],
  };
};
