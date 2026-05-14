// ResolvedRate: カード × 店舗評価の戻り型。
// v3 で resolveRate 関数本体は programEvaluator に統合され削除。
// 型のみ残し paymentApp.ts / rankCards.ts 等から共有されている。
//
// 'rule' / 'category' source は旧 StoreRule 系の名残。
// 現状は paymentApp.ts (programEvaluator 経由) で program ID を ruleId として詰める用途で使われる。
export type ResolvedRate =
  | { rate: number; currencyId: string; source: "default" }
  | { rate: number; currencyId: string; source: "charge" }
  | {
      rate: number;
      currencyId: string;
      source: "rule";
      ruleId: string;
      validFrom?: string;
      validTo?: string;
      notes?: string;
    }
  | {
      rate: number;
      currencyId: string;
      source: "category";
      ruleId: string;
      validFrom?: string;
      validTo?: string;
      notes?: string;
    };
