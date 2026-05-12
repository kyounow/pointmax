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
