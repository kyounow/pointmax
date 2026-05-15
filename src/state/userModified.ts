// ユーザ編集トラッキング (= 「公式」バッジ剥がしロジック) の純粋関数群。
//
// 設計意図:
//   - 「公式」バッジは『seed (= 公式ソース) から手を加えていない』ことの主張。
//     substantive フィールド (= データ的意味のあるフィールド) をユーザが書き換えた瞬間に
//     userModifiedAt をスタンプし、badge 表示の AND 条件で false にする。
//   - cosmetic / preference 変更 (iconChar / iconColor / enabled) は対象外。
//   - リセット (`resetCardToSeed` 等) で userModifiedAt をクリアして badge 復帰。
//
// store.ts (zustand 全体) を持ち込まずユニットテスト可能にするため、純関数として分離。

import type { Card, PaymentApp } from "../domain/types";

// ─── substantive フィールド集合 ───
//
// 「データそのもの」を構成するフィールド。これらが書き換わったら「公式」が崩れる。
// 反対に enabled / iconChar / iconColor 等の preference・visual は対象外。
export const SUBSTANTIVE_CARD_FIELDS = [
  "name",
  "grade",
  "defaultRate",
  "defaultCurrencyId",
] as const satisfies ReadonlyArray<keyof Card>;

export const SUBSTANTIVE_PAYMENT_APP_FIELDS = [
  "name",
  "paymentMode",
  "chargeBased",
  "compatibleCardIds",
  "notes",
] as const satisfies ReadonlyArray<keyof PaymentApp>;

// patch が substantive な変更を含むか判定。
// 値の同一性は呼び出し側 (ResponsiveTable.saveEdit) が既に diff を取った上で
// 渡してくるので、ここでは patch のキー存在のみを見る。
export function isSubstantiveCardPatch(
  patch: Partial<Card>,
): boolean {
  const fields = SUBSTANTIVE_CARD_FIELDS as readonly string[];
  return Object.keys(patch).some((k) => fields.includes(k));
}

export function isSubstantivePaymentAppPatch(
  patch: Partial<PaymentApp>,
): boolean {
  const fields = SUBSTANTIVE_PAYMENT_APP_FIELDS as readonly string[];
  return Object.keys(patch).some((k) => fields.includes(k));
}

// store の updateCard 等から呼ぶ「patch + 必要なら userModifiedAt 付与」関数。
// substantive ならスタンプを追加、そうでなければ既存の userModifiedAt を維持。
export function applyCardPatch(
  card: Card,
  patch: Partial<Card>,
  now: Date,
): Card {
  const next: Card = { ...card, ...patch };
  if (isSubstantiveCardPatch(patch)) {
    next.userModifiedAt = now.toISOString();
  }
  return next;
}

export function applyPaymentAppPatch(
  app: PaymentApp,
  patch: Partial<PaymentApp>,
  now: Date,
): PaymentApp {
  const next: PaymentApp = { ...app, ...patch };
  if (isSubstantivePaymentAppPatch(patch)) {
    next.userModifiedAt = now.toISOString();
  }
  return next;
}

// 「公式値に戻す」: original (seed 由来の値) で current を置き換え、
// enabled (preference) のみ current から保持。userModifiedAt はクリア。
export function resetCardToSeedValues(
  current: Card,
  original: Card,
): Card {
  return {
    ...original,
    enabled: current.enabled,
    userModifiedAt: undefined,
  };
}

export function resetPaymentAppToSeedValues(
  current: PaymentApp,
  original: PaymentApp,
): PaymentApp {
  return {
    ...original,
    enabled: current.enabled,
    userModifiedAt: undefined,
  };
}
