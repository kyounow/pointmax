// 自動同期で extracted/*.json には載るが、PointMax 用途と合わないため
// 最終 seed には含めない storeId のリスト。
//
// 動作:
//   - src/state/seed.ts: ADDED_STORES / ADDED_LOYALTY_RULES / ADDED_RULES から
//     ここに列挙された storeId を持つ records を filter
//   - scripts/sync/diff-and-propose.ts: 新規 store の addRecord 提案を
//     reviewReason="userBlocked" に格下げ (再追加されないように)
//
// 追加方針:
//   PointMax は「店舗での支払いでクレカ・ポイント還元」を最適化するアプリ。
//   以下のような id はここに入れる:
//     - 店舗ではない組織 (出版社、コーポレート)
//     - 一般人がカード提示しない業態 (車ディーラー、葬儀)
//     - デジタルサービスのみ (動画配信、電子書籍サブスク)
//     - ニッチすぎる (NFT マーケット、ゴルフ場予約)
//
// 削除タイミング: 再評価して "やっぱり残したい" になったらここから削除

export const BLOCKED_STORE_IDS = new Set<string>([
  // === A: 店舗ではない (会社・組織・出版社) ===
  "ana", // 航空会社本体、店頭でカード提示の対象じゃない
  "jal-mileage-bank", // マイレージ会員プログラム自体
  "kamei", // エネルギーコーポレート
  "diamond-sha", // 出版社
  "president-sha", // 出版社

  // === B: ニッチすぎる業態 ===
  "hyundai-mobility-japan", // 韓国車ディーラー
  "mercedes-benz", // 高級車ディーラー
  "rakuten-gora", // ゴルフ場予約サイト
  "princess-cruises", // クルーズ船予約
  "sbinft-market", // NFT マーケット
  "vip-liner", // 高速バス予約

  // === C: デジタルサービス (店頭提示不可) ===
  "telasa", // 動画配信サブスク
  "au-bookpass", // 電子書籍サブスク
  "denki-hikaku-insweb", // 電力比較サイト
  "17live", // ライブ配信プラットフォーム
  "tone-mobile", // MVNO 通信契約

  // === D: 微妙ライン (今回 user 判断で除外) ===
  "airbnb", // 民泊予約、店頭提示じゃない
  "oishix", // 食材宅配
  "aquaclara", // 水宅配
  "premium-water", // 同上
  "auto-info", // 車情報サイト
  "enewan", // サイサン系電力 (地域限定)
  "gasone", // サイサン系ガス
  "waterone", // サイサン系水
  "shaddy-salada-kan", // ギフト専門店
]);

// ===========================================================
// PSEUDO_STORE_IDS
// ===========================================================
// BLOCKED_STORE_IDS とは意味論が異なる: BLOCKED は「PointMax の用途に合わず
// seed から除外したい実店舗系 id」。こちらは「実店舗ではなく、Calculator の
// 規定還元率確認用に seed に必須のダミー store」。
//
// 例: "general" (src/state/seed-data-stores.ts) = 「一般店舗 (規定還元)」。
// Calculator のデフォルト選択店で、店舗未選択時の規定還元率を表示するための
// プレースホルダ。実在店舗ではないため、ここに実 program の membership /
// loyaltyRule が紐づくと「一般店舗を選んだのに特定キャンペーンの倍率が乗る」
// という誤表示になる。
//
// 背景 (#103 incident): jcb-jpoint extractor が「クレカ乗車 ポイント20倍」
// 「海外でのお買い物 ポイント2倍」のような店舗特定不能な項目を、プロンプト
// INJECT で見えていた既存 store "general" の受け皿として誤って割り当てた。
// confidence が閾値を超え、"general" が既存 store のため missingStoreBody
// ガードも発動せず auto-merge されてしまった (7/02 本番配信、seed-additions.ts
// の REMOVED_MEMBERSHIP_KEYS で除去済み)。
//
// 再発防止として:
//   - scripts/sync/propose-helpers.ts: memberships / loyaltyRules の storeId が
//     ここに含まれる場合、reviewReason="pseudoStoreTarget" で必ず needsReview に降格
//   - scripts/sync/inject-prompt.ts: このリストの store を INJECT 一覧から除外
//     (Gemini がそもそも受け皿候補として見れないようにする)
export const PSEUDO_STORE_IDS = new Set<string>([
  "general", // 一般店舗 (規定還元確認用ダミー、実店舗ではない)
]);

// ===========================================================
// PSEUDO_PAYMENT_APP_IDS
// ===========================================================
// PSEUDO_STORE_IDS と同様の意味論: 実在の決済アプリではなく「カード直接払い」を
// 表す基本モード。特定不能な決済手段の受け皿にされると Calculator の最頻モード
// (支払方法未選択時のデフォルト) で誤発火するため、sync の auto 対象にしない。
//
// 例: "pa-default" (src/state/seed-data-cards.ts) = 「通常クレカ決済」。
// PSEUDO_STORE_IDS の "general" と構造上同型のリスクを持つため、同じガード方式
// (propose-helpers.ts で参照時 reviewReason="pseudoStoreTarget" に降格、
// inject-prompt.ts の INJECT からも除外) を適用する。
export const PSEUDO_PAYMENT_APP_IDS = new Set<string>([
  "pa-default", // 通常クレカ決済 (基本モード、実在の決済アプリではない)
]);

// ===========================================================
// REMOVED_MEMBERSHIP_KEYS (membership 単体 tombstone)
// ===========================================================
// 公式 seed から誤配信された membership を、既存ユーザーの localStorage から
// も除去するためのキーリスト。mergeSeed の removedMembershipKeys オプション
// (useSeedMerge 経由) が消費する。キー形式: "programId|storeId"
// (mergeSeed.mergeMemberships の複合キーと同形式)。
//
// ★ このファイル (手書き) に置く理由: seed-additions.ts は AUTO-GENERATED で
//   cron の apply-proposals (buildSeedAdditionsContent) がファイル全体を
//   再生成するため、codegen が emit しない定数をそこに置くと次回 cron で
//   消えて import が壊れる。REMOVED_PROGRAM_IDS と違いこちらは codegen
//   非対応 (手動事故対応専用) なので、再生成対象外の本ファイルに置く。
//
// #103 incident: jcb-jpoint extractor が店舗特定不能な項目 (「クレカ乗車
// ポイント20倍」「海外でのお買い物 ポイント2倍」) をダミー store "general"
// への membership として混入させた 4 件。confidence 0.9025 ≥ 0.9 で
// autoApplicable を通過し、7/02 に本番配信済み。既存ユーザーの localStorage
// にも mergeSeed (add-only) で入っているため tombstone で除去する。
export const REMOVED_MEMBERSHIP_KEYS: string[] = [
  "prog-jcb-jpoint-20x|general",
  "prog-jcb-jpoint-gold-20x|general",
  "prog-jcb-jpoint-2x|general",
  "prog-jcb-jpoint-gold-2x|general",
];
