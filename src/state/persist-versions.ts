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
// v7.0.0 で 6 → 7 に bump (enabled デフォルト反転: v6 まで「enabled !== false = 有効」
//   だったのを v7 で「enabled === true のみ有効」へ。seed は enabled を出荷せず全 OFF 起点。
//   reset ではなく transform migration で旧 v6 データの有効状態を明示化してから反転する
//   (mid-train セマンティクスの保存。SCHEMA_MIGRATIONS[6] 参照))。
export const PERSIST_SCHEMA_VERSION = 7;

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
  // v7.0.0 で enabled デフォルトを反転。v6 まで「enabled !== false = 有効」
  // (undefined/true = ON、false = OFF) だった判定を v7 で「enabled === true のみ有効」
  // (undefined/false = OFF) に変える。reset だと mid-train でユーザーの「使う」設定が
  // 全部消えてしまうため、transform で **意味を保存**する:
  //   - 反転前に各行へ現在の有効状態を enabled = (enabled !== false) として明示的に
  //     書き込む。これにより「v6 で undefined = ON」だったカードが v7 で誤って OFF 化
  //     せず、ユーザーが実際に「使う」にしていた資産の状態が引き継がれる。
  //   - programs の enabled 意味は v7 でも変わらない (PR-1d: optIn 前提)。ただし enabled は
  //     ユーザー所有キー (R1) で undefined = 既定 のため、enabled === true (ユーザーが明示的に
  //     ON にした opt-in 選択) のみ残し、それ以外の enabled キーは削除して既定に委ねる
  //     (opt-in の既定 OFF / 通常 program の既定有効はどちらも undefined で正しく表現される。
  //      現行 UI は opt-in program のみトグルを露出するので実データ上の enabled は
  //      opt-in の true/false に限られ、false 削除は既定 OFF と同義で安全)。
  // transform は SchemaUpgradeModal を経ず無告知適用される (reset のみ同意モーダル)。
  6: {
    type: "transform",
    fn: (old: unknown): unknown => {
      if (typeof old !== "object" || old === null) return old;
      const s = old as Record<string, unknown>;
      // cards / pointCards / paymentApps: 反転前に現在の有効状態を明示化。
      const explicitEnable = (rows: unknown): unknown =>
        Array.isArray(rows)
          ? rows.map((r) =>
              typeof r === "object" && r !== null
                ? {
                    ...(r as Record<string, unknown>),
                    enabled:
                      (r as Record<string, unknown>).enabled !== false,
                  }
                : r,
            )
          : rows;
      // programs: enabled === true (opt-in ON) のみ残し、他は削除して既定へ委ねる。
      const normalizePrograms = (rows: unknown): unknown =>
        Array.isArray(rows)
          ? rows.map((r) => {
              if (typeof r !== "object" || r === null) return r;
              const p = { ...(r as Record<string, unknown>) };
              if (p.enabled !== true) delete p.enabled;
              return p;
            })
          : rows;
      return {
        ...s,
        cards: explicitEnable(s.cards),
        pointCards: explicitEnable(s.pointCards),
        paymentApps: explicitEnable(s.paymentApps),
        programs: normalizePrograms(s.programs),
      };
    },
  },
};
