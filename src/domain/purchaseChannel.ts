// 購入チャネル (店頭 / ネット・アプリ経由) の判定 (PR-0a-2a)。
//
// 背景: たまるマーケット (サイト経由のネット購入限定) の倍率が、ビックカメラ・ユニクロ等の
//   物理店の店頭計算に採用されて過大表示になっていた (エポス × ビックカメラ 2.0% と出るが店頭の
//   実際は 0.5%)。program / membership に channel を持たせ、評価の既定チャネルを店舗から導出する。
//
// 既定チャネルの導出 (defaultChannelForStore):
//   - 純 EC 店 (isOnlineOnlyStore) = カテゴリ「ネット通販」∪ ONLINE_ONLY_STORE_IDS → "online"
//     (楽天市場 / Yahoo!ショッピング / じゃらん / HMV&BOOKS online 等。ネットでしか買えない店で
//      ネット限定 program を落とすと逆に過小表示になるため)
//   - それ以外 → "in-store" (DEFAULT_CHANNEL)
//
// UI の切替 (ネット購入モード) は未実装で、rankCards / UI は店舗由来の既定だけを使う。
//
// ⚠ scripts/ (tsx / Node) からも import されうるため、DOM API や import.meta.env を使わないこと。

import type {
  BenefitProgram,
  PurchaseChannel,
  Store,
  StoreProgramMembership,
} from "./types";

/** channel の値域 (validators の OPT_ENUM / seed 契約で使う)。 */
export const PURCHASE_CHANNELS = [
  "in-store",
  "online",
] as const satisfies readonly PurchaseChannel[];

/** 店舗から導出できないときの既定チャネル (店頭)。 */
export const DEFAULT_CHANNEL: PurchaseChannel = "in-store";

/**
 * 純 EC 店のカテゴリ。この店舗で買う = ネット購入なので既定チャネルを "online" にする。
 * (カテゴリ語彙の整理 (seed-category-aliases 側への移管) は後続で検討)
 */
export const ONLINE_ONLY_CATEGORIES: ReadonlySet<string> = new Set(["ネット通販"]);

/**
 * カテゴリが「ネット通販」ではないが実体は純 EC の店舗 id。
 *   - jalannet: じゃらん net (カテゴリは旅行代理店)
 *   - hmv-books-online: HMV&BOOKS online (カテゴリは音楽・映像)
 * ここに無い EC 専用店にネット限定 program の membership が付くと、ネット購入モード
 * (未実装) が入るまで計算に出ない。追加時は README の購入チャネル節も更新する。
 */
export const ONLINE_ONLY_STORE_IDS: ReadonlySet<string> = new Set([
  "jalannet",
  "hmv-books-online",
]);

/** 純 EC 店 (ネットでしか買えない店) か。 */
export function isOnlineOnlyStore(store: Pick<Store, "id" | "category">): boolean {
  if (ONLINE_ONLY_STORE_IDS.has(store.id)) return true;
  return store.category !== undefined && ONLINE_ONLY_CATEGORIES.has(store.category);
}

/** 評価時の既定チャネル。純 EC 店は "online"、それ以外は "in-store"。 */
export function defaultChannelForStore(
  store: Pick<Store, "id" | "category">,
): PurchaseChannel {
  return isOnlineOnlyStore(store) ? "online" : DEFAULT_CHANNEL;
}

/**
 * program × membership の有効チャネル。membership.channel が program.channel より優先。
 * undefined = 両チャネルで有効。
 */
export function effectiveChannel(
  p: Pick<BenefitProgram, "channel">,
  m?: Pick<StoreProgramMembership, "channel">,
): PurchaseChannel | undefined {
  return m?.channel ?? p.channel;
}

/** 評価チャネル ch で program (× membership) が発動するか。有効チャネル未指定なら常に true。 */
export function isChannelMatch(
  p: Pick<BenefitProgram, "channel">,
  m: Pick<StoreProgramMembership, "channel"> | undefined,
  ch: PurchaseChannel,
): boolean {
  const eff = effectiveChannel(p, m);
  return eff === undefined || eff === ch;
}
