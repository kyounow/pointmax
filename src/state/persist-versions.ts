// persist-versions.ts
//
// localStorage の schema 版管理を担当する。
// SEED_VERSION (seed.ts) とは独立した 2 本立て:
//
//   SEED_VERSION        : データ版 (新キャンペーン追加・rate 修正) → UpdateBanner で通知
//   PERSIST_SCHEMA_VERSION : localStorage の「形」の版 → V3UpgradeModal で移行案内
//
// schema が変わった時は PERSIST_SCHEMA_VERSION を bump し、
// SCHEMA_MIGRATIONS に旧バージョン番号 → 戦略 のエントリを追加する。

// 現在期待する persist schema のバージョン。
// v3 (PR 4) で 1 → 2 に bump。
export const PERSIST_SCHEMA_VERSION = 2;

/**
 * schema migration の戦略型。
 *
 * - passthrough : 互換あり、何もしない
 * - reset       : 全消去 + 新 seed で初期化 (ユーザに明示同意を求める)
 * - transform   : 個別変換関数を適用 (best-effort migration)
 */
export type SchemaMigrationStrategy =
  | { type: "passthrough" }
  | { type: "reset"; reason: string }
  | { type: "transform"; fn: (old: unknown) => unknown };

/**
 * 旧 version 番号 → migration 戦略 のマップ。
 *
 * キーは「旧バージョン番号」= fromVersion (= 旧 localStorage の version フィールド)。
 * 将来バージョンが増えたらここにエントリを追加するだけで対応できる。
 *
 * 例:
 *   3: { type: "transform", fn: (old) => ({ ...old, newField: "default" }) }
 */
export const SCHEMA_MIGRATIONS: Record<number, SchemaMigrationStrategy> = {
  1: {
    type: "reset",
    reason:
      "PointMax v3 で還元ルールのデータ構造が刷新されました (BenefitProgram モデル)。" +
      "既存設定は新しい形式と互換性がないため、公式マスタ + ユーザー選択で再初期化します。" +
      "手書き設定がなければ影響はほぼゼロです。JSON エクスポートで念のためバックアップを推奨します。",
  },
  // 将来の例:
  // 2: { type: "transform", fn: (old) => ({ ...(old as object), someNewField: [] }) },
};
