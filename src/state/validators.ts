// importJson / syncFromUrl で外部 JSON を State に流し込む前の構造検証。
//
// 従来は「cards/currencies/stores/edges が配列か」だけのキー存在チェックで、個々の
// フィールド型・値域 (rate が文字列 / NaN / 負値、id 欠落 等) は未検証だった。不正値が
// そのまま State に入ると計算 (rankCards / bestPath) が壊れるため、各エンティティの
// identity (id 等の必須文字列) と計算クリティカルな数値 (rate ≥ 0) を最小限検証する。
//
// 網羅的スキーマ検証ではない (cosmetic / 任意フィールドは素通し)。zod / ajv は bundle 増
// (ajv は scripts 専用 devDep) のため不採用、依存ゼロの手書きガードで実装。

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

export type ImportData = {
  cards: Card[];
  currencies: Currency[];
  stores: Store[];
  edges: ConversionEdge[];
  pointCards?: PointCard[];
  loyaltyRules?: LoyaltyRule[];
  paymentApps?: PaymentApp[];
  programs?: BenefitProgram[];
  memberships?: StoreProgramMembership[];
};

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isNonNegNum(v: unknown): v is number {
  return isNum(v) && v >= 0;
}

type FieldCheck = { key: string; check: (v: unknown) => boolean; kind: string };
const STR = (key: string): FieldCheck => ({ key, check: isStr, kind: "文字列" });
// rate / 交換レートは 0 以上の有限数 (負値・NaN・文字列を弾く)
const RATE = (key: string): FieldCheck => ({
  key,
  check: isNonNegNum,
  kind: "0以上の有限数",
});

function checkItem(
  item: unknown,
  fields: FieldCheck[],
  label: string,
): string | null {
  if (!isObject(item)) return `${label} がオブジェクトではありません`;
  for (const f of fields) {
    if (!f.check(item[f.key])) return `${label}.${f.key} が${f.kind}ではありません`;
  }
  return null;
}

function checkArray(
  arr: unknown,
  name: string,
  fields: FieldCheck[],
  required: boolean,
): string | null {
  if (arr === undefined) return required ? `"${name}" がありません` : null;
  if (!Array.isArray(arr)) return `"${name}" が配列ではありません`;
  for (let i = 0; i < arr.length; i++) {
    const err = checkItem(arr[i], fields, `${name}[${i}]`);
    if (err) return err;
  }
  return null;
}

// 外部 JSON を ImportData として検証。最初に見つかったエラーを返す。
export function validateImportData(data: unknown): Validated<ImportData> {
  if (!isObject(data)) return { ok: false, error: "JSONが不正です" };

  const errors = [
    checkArray(
      data.cards,
      "cards",
      [STR("id"), STR("name"), RATE("defaultRate"), STR("defaultCurrencyId")],
      true,
    ),
    checkArray(data.currencies, "currencies", [STR("id"), STR("name")], true),
    checkArray(data.stores, "stores", [STR("id"), STR("name")], true),
    checkArray(
      data.edges,
      "edges",
      [STR("id"), STR("fromCurrencyId"), STR("toCurrencyId"), RATE("rate")],
      true,
    ),
    checkArray(
      data.pointCards,
      "pointCards",
      [STR("id"), STR("name"), STR("currencyId")],
      false,
    ),
    checkArray(
      data.loyaltyRules,
      "loyaltyRules",
      [STR("id"), STR("storeId"), STR("pointCardId"), RATE("rate")],
      false,
    ),
    checkArray(data.paymentApps, "paymentApps", [STR("id"), STR("name")], false),
    checkArray(
      data.programs,
      "programs",
      [STR("id"), STR("name"), RATE("rate"), STR("currencyId")],
      false,
    ),
    checkArray(
      data.memberships,
      "memberships",
      [STR("programId"), STR("storeId")],
      false,
    ),
  ];

  for (const err of errors) {
    if (err !== null) return { ok: false, error: err };
  }
  return { ok: true, value: data as unknown as ImportData };
}
