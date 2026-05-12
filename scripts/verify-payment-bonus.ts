// d払い × 各カードの組み合わせで、cardSpecificBonusRates が正しく
// 適用されているかを目視確認するためのスクリプト。
// 期待動作:
//   d払い × dcard          → app bonus 1.0%
//   d払い × 楽天/JAL/三井  → app bonus 0% (進呈なし)
//   楽天Pay × 楽天カード   → app bonus 1.5%
//   楽天Pay × 他           → app bonus 0%
//   PayPay × PayPayカード  → app bonus 0.5%
//   PayPay × 他            → app bonus 0%
//
// 使い方: npx tsx scripts/verify-payment-bonus.ts

import { seed } from "../src/state/seed";
import { evaluatePaymentApps } from "../src/domain/paymentApp";

const data = seed();
const amount = 10000;

const chargeApps = data.paymentApps.filter((a) =>
  ["pa-d-pay", "pa-rakuten-pay", "pa-paypay"].includes(a.id),
);

console.log(
  `[verify-payment-bonus] amount = ${amount}円、targetCurrency = アプリ通貨 (1:1)`,
);
console.log(
  "─".repeat(78),
);

for (const card of data.cards) {
  console.log(`\n■ ${card.name} (${card.id})  defaultRate=${(card.defaultRate * 100).toFixed(2)}% → ${card.defaultCurrencyId}`);
  for (const app of chargeApps) {
    const target = app.defaultBonusCurrencyId ?? "rakuten-pt";
    const results = evaluatePaymentApps(
      card,
      "general",
      amount,
      target,
      [app],
      [],
      data.stores,
      data.edges,
    );
    const r = results[0];
    if (!r) {
      console.log(`  × ${app.name}: 互換 PaymentApp 無し`);
      continue;
    }
    console.log(
      `  ${app.name.padEnd(12)} app=${(r.appBonusRate * 100).toFixed(2).padStart(5)}% (${r.appBonusEarnedAmount.toFixed(0).padStart(4)} ${r.appBonusEarnedCurrencyId ?? "-"})` +
      `  /  card=${(r.cardEarnedAmount/amount*100).toFixed(2)}% (${r.cardEarnedAmount.toFixed(0)} ${r.cardEarnedCurrencyId})` +
      `  /  total=${r.totalFinalAmount.toFixed(0)} ${target}`,
    );
  }
}
