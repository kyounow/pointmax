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
// v3.3 で 2 → 3 に bump (state.rules / addRule 系の物理削除)。
// v4.0.0 で 3 → 4 に bump (preferredCurrencyIds 新設)。
// v5.0.0 で 4 → 5 に bump (V4 未満を一括 reset 化、V5 環境への引き上げ)。
// v6.0.0 で 5 → 6 に bump (schema v6 破壊的刷新の起点。scope 必須化 +
//   以降のトレイン PR で membership id / familyId / optIn / LoyaltyRule 削除)。
export const PERSIST_SCHEMA_VERSION = 6;

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
  // v5.0.0 で v2/v3 も reset 化 (旧 passthrough 維持を廃止)。
  // 理由: V4 で preferredCurrencyIds が新設され、V5 で BenefitProgram.entryUrl
  // + JCB J-POINT パートナー programs が追加された。v2 / v3 で長期休眠している
  // localStorage はその間の SEED_VERSION bump 30+ 回ぶんの追加分を取りこぼした
  // 「実質ゴーストデータ」になっており、公式マスタ再初期化したほうが安全。
  // 上書き前に _legacyPersistedState で旧 state を保存し SchemaUpgradeModal が
  // 同意を求める動作はそのまま (突然消えるわけではない)。
  2: {
    type: "reset",
    reason:
      "V5 にアップデートします。V4 未満で長期休眠していた localStorage を" +
      "公式マスタ (最新 SEED_VERSION) で再初期化します。" +
      "途中の自動同期で追加された各種カード・店舗・キャンペーン情報を" +
      "まとめて反映するため、整合性確保の観点で reset しています。" +
      "JSON エクスポートで念のためバックアップを推奨します。" +
      "(編集していなければユーザーカスタムの上書きは無いため影響は最小)",
  },
  3: {
    type: "reset",
    reason:
      "V5 にアップデートします。V4 未満で長期休眠していた localStorage を" +
      "公式マスタ (最新 SEED_VERSION) で再初期化します。" +
      "途中の自動同期で追加された各種カード・店舗・キャンペーン情報を" +
      "まとめて反映するため、整合性確保の観点で reset しています。" +
      "JSON エクスポートで念のためバックアップを推奨します。" +
      "(編集していなければユーザーカスタムの上書きは無いため影響は最小)",
  },
  // v5.0.0 で BenefitProgram.entryUrl + JCB J-POINT パートナー programs を追加。
  // entryUrl は任意フィールドの純加算で旧 v4 localStorage は無問題 → passthrough。
  // 新規 programs/memberships は SyncUpdateModal の差分検知 + UpdateBanner 経由で反映。
  4: { type: "passthrough" },
  // v6.0.0 で schema を破壊的に刷新。BenefitProgram.scope を必須化し
  // (membership 行数からの適用範囲推論を廃止)、以降のトレイン PR で
  // membership id 必須化 / Card.familyId / BenefitProgram.optIn / LoyaltyRule 物理削除
  // を積む。旧 v5 localStorage は新構造と互換性が無いため公式マスタで再初期化する。
  // reset は本トレインで 1 回のみ (v6→7 の enabled 反転は transform で行う)。
  5: {
    type: "reset",
    reason:
      "PointMax v6 にアップデートします。還元プログラムのデータ構造を刷新しました " +
      "(適用範囲 scope の必須化ほか)。旧バージョンの設定は新形式と互換性が無いため、" +
      "公式マスタ (最新 SEED_VERSION) で再初期化します。" +
      "手書き設定がなければ影響はほぼゼロです。" +
      "念のため下の「エクスポートしてから続行」で JSON バックアップを保存できます。",
  },
};
