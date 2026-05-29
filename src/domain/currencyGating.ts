// PointMax v6.0.0: 交換ルートの「使わないポイント通貨」ゲーティング helper。
//
// 背景:
//   ポイントカードに enabled (使う/使わない) を追加した。ユーザーが「使わない」を選んだ
//   ポイントカードの通貨は、交換ルート (bestPath) の起点・経由として使えないようにする
//   = 「そのポイントを使っていなければ交換できない」というユーザー確定のモデル。
//
//   ただし「どの pointCard にも紐づかない純粋な経由通貨」(例: 交換専用の中間ポイント) は
//   ユーザーが取捨選択した対象ではないのでブロックしない。よって allow-list ではなく
//   deny-list (opted-out した通貨のみブロック) で実装する。
//
// blocked 判定:
//   通貨 C が blocked ⇔
//     (enabled===false な pointCard で currencyId===C のものがある)
//     かつ (C を貯められる有効資産が他に無い:
//           enabled pointCard / enabled card default / enabled card の program 通貨)
//   = ユーザーが明示的に「使わない」とし、かつ他経路でも貯まらない通貨だけを塞ぐ。
//
// deny-list は 2 種類ある:
//   - computeBlockedCurrencyIds (通常): Calculator (rankCards) 用。有効クレカの
//     defaultCurrency / 有効カードの program 通貨でも救済する (= 保有資産で取得できる
//     通貨はルートに使う、という最適化前提)。
//   - computeStrictBlockedCurrencyIds (強い): EdgesScreen (交換ルート探索) 用。OFF にした
//     pointCard の通貨は「有効な別 pointCard が同通貨を持つ」場合のみ救済し、有効クレカが
//     貯めても block する。「このポイントは交換に使いたくない」というユーザー明示の除外を尊重。

import type { BenefitProgram, Card, PointCard } from "./types";

/** enabled な資産 (card default + card program + pointCard) で貯まる通貨集合。 */
function enabledCurrencyIds(
  cards: Card[],
  pointCards: PointCard[],
  programs: BenefitProgram[],
): Set<string> {
  const enabled = new Set<string>();
  const enabledCardIds = new Set<string>();
  for (const c of cards) {
    if (c.enabled === false) continue;
    enabledCardIds.add(c.id);
    enabled.add(c.defaultCurrencyId);
  }
  for (const p of pointCards) {
    if (p.enabled === false) continue;
    enabled.add(p.currencyId);
  }
  for (const prog of programs) {
    if (prog.pointCardId) continue; // loyalty 系は別軸
    if (!prog.cardIds?.length) continue;
    if (prog.cardIds.some((id) => enabledCardIds.has(id))) {
      enabled.add(prog.currencyId);
    }
  }
  return enabled;
}

/**
 * ユーザーが「使わない」選択をしたポイント通貨の集合 (deny-list)。
 * bestPath / makePathCache の blockedCurrencyIds に渡す。
 * disabled pointCard が 1 枚も無ければ空集合。
 */
export function computeBlockedCurrencyIds(
  cards: Card[],
  pointCards: PointCard[],
  programs: BenefitProgram[] = [],
): Set<string> {
  const enabled = enabledCurrencyIds(cards, pointCards, programs);
  const blocked = new Set<string>();
  for (const p of pointCards) {
    if (p.enabled === false && !enabled.has(p.currencyId)) {
      blocked.add(p.currencyId);
    }
  }
  return blocked;
}

/**
 * EdgesScreen (交換ルート探索) 用の「強い」 deny-list。
 * OFF にした pointCard の通貨は、有効な別 pointCard が同通貨を持つ場合のみ救済し、
 * それ以外は有効クレカが貯めても block する (= 「このポイントは交換に使わない」を強く尊重)。
 * Calculator は computeBlockedCurrencyIds を使い続けること (有効クレカ通貨を消すと
 * そのカードが他 target に到達不能化しランキングが崩れるため)。
 */
export function computeStrictBlockedCurrencyIds(
  pointCards: PointCard[],
): Set<string> {
  const enabledPointCurrencies = new Set(
    pointCards.filter((p) => p.enabled !== false).map((p) => p.currencyId),
  );
  const blocked = new Set<string>();
  for (const p of pointCards) {
    if (p.enabled === false && !enabledPointCurrencies.has(p.currencyId)) {
      blocked.add(p.currencyId);
    }
  }
  return blocked;
}
