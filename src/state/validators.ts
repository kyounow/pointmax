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
import { PERSIST_SCHEMA_VERSION } from "./persist-versions";
import { membershipId } from "./defineMemberships";

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
// enum フィールド (許容値のいずれか)。v6: BenefitProgram.scope の必須 + 値域検証に使う。
const ENUM = (key: string, allowed: readonly string[]): FieldCheck => ({
  key,
  check: (v) => typeof v === "string" && allowed.includes(v),
  kind: `${allowed.join(" / ")} のいずれか`,
});
const PROGRAM_SCOPES = ["all-stores", "member-stores"] as const;

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

// validateImportData のオプション。
// requireSchemaVersion: ユーザー JSON import 経路 (importJson) のみ true にする。
//   export JSON には schemaVersion が埋め込まれるため、旧バージョンのファイルを弾ける。
//   一方 syncFromUrl が読む公式 master.json (generate-master 生成) は schemaVersion を
//   持たないので、この経路では false のまま (seed() 由来データの検証も同様に通す)。
export type ValidateImportOptions = {
  requireSchemaVersion?: boolean;
};

// 外部 JSON を ImportData として検証。最初に見つかったエラーを返す。
export function validateImportData(
  data: unknown,
  opts: ValidateImportOptions = {},
): Validated<ImportData> {
  if (!isObject(data)) return { ok: false, error: "JSONが不正です" };

  // import 経路のバージョンガード (欠落含めて現行 schema と不一致なら拒否)。
  // master.json 経路 (requireSchemaVersion 未指定) はガードしない。
  if (opts.requireSchemaVersion && data.schemaVersion !== PERSIST_SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        `このファイルは旧バージョンの形式です (v${PERSIST_SCHEMA_VERSION} 未満)。` +
        "現在のアプリで再エクスポートしたファイルを取り込んでください。",
    };
  }

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
      // v6: scope を必須 + enum 検証 (all-stores / member-stores)。
      [
        STR("id"),
        STR("name"),
        RATE("rate"),
        STR("currencyId"),
        ENUM("scope", PROGRAM_SCOPES),
      ],
      false,
    ),
    checkArray(
      data.memberships,
      "memberships",
      // v6: id を必須化 (programId/storeId は従来どおり必須)。
      [STR("id"), STR("programId"), STR("storeId")],
      false,
    ),
  ];

  for (const err of errors) {
    if (err !== null) return { ok: false, error: err };
  }

  // v6: membership.id の規約整合 (`m-{programId}-{storeId}`) + 一意性。
  const membershipIdError = checkMembershipIds(data);
  if (membershipIdError !== null) return { ok: false, error: membershipIdError };

  // v6: scope 整合性のクロスチェック。
  //   「all-stores なのに membership を持つ」program は矛盾 (全店適用 program は
  //   membership を持ってはいけない) → import ではエラーにする。
  //   「member-stores なのに membership 0 件」はユーザー作成の過渡状態を許容するため
  //   ここでは弾かない (seed 契約としては seed.test.ts の assert が担保)。
  const scopeError = checkProgramScopeConsistency(data);
  if (scopeError !== null) return { ok: false, error: scopeError };

  return { ok: true, value: data as unknown as ImportData };
}

// membership.id が規約 (`m-{programId}-{storeId}`) と一致し、かつ一意であることを
// 検証する。checkArray で id/programId/storeId が文字列であることは保証済み。
function checkMembershipIds(data: Record<string, unknown>): string | null {
  if (!Array.isArray(data.memberships)) return null;
  const seen = new Set<string>();
  for (let i = 0; i < data.memberships.length; i++) {
    const m = data.memberships[i];
    if (!isObject(m) || !isStr(m.id) || !isStr(m.programId) || !isStr(m.storeId)) {
      continue; // checkArray 側で既に弾かれている想定
    }
    const expected = membershipId(m.programId, m.storeId);
    if (m.id !== expected) {
      return `memberships[${i}].id が規約 (${expected}) と一致しません`;
    }
    if (seen.has(m.id)) {
      return `membership id "${m.id}" が重複しています`;
    }
    seen.add(m.id);
  }
  return null;
}

// all-stores program が membership を持っていないかを検証する。
// programs / memberships のどちらかが無ければ検証不要 (null)。
function checkProgramScopeConsistency(
  data: Record<string, unknown>,
): string | null {
  if (!Array.isArray(data.programs) || !Array.isArray(data.memberships)) {
    return null;
  }
  const allStoresIds = new Set<string>();
  for (const p of data.programs) {
    if (isObject(p) && p.scope === "all-stores" && isStr(p.id)) {
      allStoresIds.add(p.id);
    }
  }
  if (allStoresIds.size === 0) return null;
  for (const m of data.memberships) {
    if (isObject(m) && isStr(m.programId) && allStoresIds.has(m.programId)) {
      return `program "${m.programId}" は scope=all-stores ですが membership を持っています (全店適用 program は membership 不可)`;
    }
  }
  return null;
}
