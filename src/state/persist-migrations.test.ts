import { describe, it, expect, vi } from "vitest";
import {
  PERSIST_SCHEMA_VERSION,
  SCHEMA_MIGRATIONS,
  type SchemaMigrationStrategy,
} from "./persist-versions";

// -----------------------------------------------------------------------
// ヘルパー: zustand の migrate callback をシミュレートする
// store.ts の migrate 関数と同じロジックを純粋関数として再現
// -----------------------------------------------------------------------

const emptyBaseState = {
  cards: [],
  currencies: [],
  stores: [],
  edges: [],
  pointCards: [],
  paymentApps: [],
  programs: [],
  memberships: [],
  lastSeedVersion: 0,
  syncUrl: "https://example.com/master.json",
  lastSyncAt: null,
};

function runMigrate(
  persistedState: unknown,
  fromVersion: number,
): {
  _pendingSchemaMigration?: SchemaMigrationStrategy;
  _legacyPersistedState?: unknown;
  [key: string]: unknown;
} {
  if (fromVersion === PERSIST_SCHEMA_VERSION) {
    return persistedState as ReturnType<typeof runMigrate>;
  }

  const strategy = SCHEMA_MIGRATIONS[fromVersion];
  if (!strategy) {
    return {
      ...emptyBaseState,
      _pendingSchemaMigration: {
        type: "reset" as const,
        reason: `不明な旧 schema (v${fromVersion}) を検出しました。V5 環境にリセットします。`,
      },
    };
  }

  if (strategy.type === "reset") {
    return {
      ...emptyBaseState,
      _pendingSchemaMigration: strategy,
      _legacyPersistedState: persistedState,
    };
  }

  if (strategy.type === "transform") {
    return strategy.fn(persistedState) as ReturnType<typeof runMigrate>;
  }

  return persistedState as ReturnType<typeof runMigrate>;
}

// -----------------------------------------------------------------------
// テスト
// -----------------------------------------------------------------------

describe("PERSIST_SCHEMA_VERSION", () => {
  it("現在のスキーマバージョンは 6 である (v6.0.0 scope 必須化の破壊的刷新、v5 を reset 化)", () => {
    expect(PERSIST_SCHEMA_VERSION).toBe(6);
  });
});

describe("schema migration: 新規 install (fromVersion = PERSIST_SCHEMA_VERSION)", () => {
  it("fromVersion が現在バージョンと一致する場合は state をそのまま通す", () => {
    const state = { ...emptyBaseState, lastSeedVersion: 5 };
    const result = runMigrate(state, PERSIST_SCHEMA_VERSION);
    expect(result).toEqual(state);
    expect(result._pendingSchemaMigration).toBeUndefined();
    expect(result._legacyPersistedState).toBeUndefined();
  });
});

describe("schema migration: 旧 v1 検出 (reset strategy)", () => {
  it("fromVersion=1 の場合は SCHEMA_MIGRATIONS[1] = reset strategy が適用される", () => {
    const legacyState = {
      cards: [{ id: "card-1", name: "旧カード" }],
      rules: [{ id: "rule-1", cardId: "card-1", storeId: "store-1", rate: 0.01 }],
    };
    const result = runMigrate(legacyState, 1);

    expect(result._pendingSchemaMigration).toBeDefined();
    expect(result._pendingSchemaMigration?.type).toBe("reset");
  });

  it("reset 時は _legacyPersistedState に旧 state が保存される", () => {
    const legacyState = {
      cards: [{ id: "card-1", name: "旧カード" }],
    };
    const result = runMigrate(legacyState, 1);

    expect(result._legacyPersistedState).toEqual(legacyState);
  });

  it("reset 時は データ配列が空の empty state に戻る", () => {
    const legacyState = {
      cards: [{ id: "card-1" }],
      stores: [{ id: "store-1" }],
    };
    const result = runMigrate(legacyState, 1);

    expect(result.cards).toEqual([]);
    expect(result.stores).toEqual([]);
    expect(result.programs).toEqual([]);
    expect(result.memberships).toEqual([]);
  });

  it("SCHEMA_MIGRATIONS[1].reason が _pendingSchemaMigration に含まれる", () => {
    const result = runMigrate({}, 1);
    const migration = result._pendingSchemaMigration;
    expect(migration?.type).toBe("reset");
    if (migration?.type === "reset") {
      expect(migration.reason.length).toBeGreaterThan(0);
      // v3 BenefitProgram についての説明が含まれること
      expect(migration.reason).toContain("v3");
    }
  });
});

describe("schema migration: 未知の旧バージョン (fallback reset)", () => {
  it("SCHEMA_MIGRATIONS に存在しないバージョン (例: v99) は fallback reset が走る", () => {
    const result = runMigrate({ cards: [] }, 99);

    expect(result._pendingSchemaMigration).toBeDefined();
    expect(result._pendingSchemaMigration?.type).toBe("reset");
    if (result._pendingSchemaMigration?.type === "reset") {
      expect(result._pendingSchemaMigration.reason).toContain("v99");
    }
  });
});

describe("schema migration: transform strategy", () => {
  it("transform strategy の fn が呼び出される", () => {
    const transformFn = vi.fn((old: unknown) => ({
      ...(old as object),
      newField: "added",
    }));

    // 動的に SCHEMA_MIGRATIONS に transform entry を追加してテスト
    // PERSIST_SCHEMA_VERSION や他のテスト (v99 fallback) と被らない番号を使う
    const TRANSFORM_TEST_VERSION = 100;
    const originalEntry = SCHEMA_MIGRATIONS[TRANSFORM_TEST_VERSION];
    SCHEMA_MIGRATIONS[TRANSFORM_TEST_VERSION] = { type: "transform", fn: transformFn };

    const inputState = { cards: [{ id: "c1" }] };
    const result = runMigrate(inputState, TRANSFORM_TEST_VERSION);

    expect(transformFn).toHaveBeenCalledWith(inputState);
    expect((result as { newField?: string }).newField).toBe("added");

    // テスト後はエントリを元に戻す (存在しなかった場合は削除)
    if (originalEntry === undefined) {
      delete SCHEMA_MIGRATIONS[TRANSFORM_TEST_VERSION];
    } else {
      SCHEMA_MIGRATIONS[TRANSFORM_TEST_VERSION] = originalEntry;
    }
  });
});

describe("SCHEMA_MIGRATIONS マップの整合性", () => {
  it("SCHEMA_MIGRATIONS[1] は type='reset' で reason が文字列", () => {
    const entry = SCHEMA_MIGRATIONS[1];
    expect(entry).toBeDefined();
    expect(entry.type).toBe("reset");
    if (entry.type === "reset") {
      expect(typeof entry.reason).toBe("string");
    }
  });

  it("PERSIST_SCHEMA_VERSION (5) のエントリは存在しない (自己移行は不要)", () => {
    // 現バージョン自身に対する migration エントリは不要・無意味
    expect(SCHEMA_MIGRATIONS[PERSIST_SCHEMA_VERSION]).toBeUndefined();
  });

  it("SCHEMA_MIGRATIONS[2] は type='reset' (v5.0.0 で V4 未満を強制アプデ化)", () => {
    const entry = SCHEMA_MIGRATIONS[2];
    expect(entry).toBeDefined();
    expect(entry.type).toBe("reset");
    if (entry.type === "reset") {
      expect(entry.reason).toContain("V5");
    }
  });

  it("SCHEMA_MIGRATIONS[3] は type='reset' (v5.0.0 で V4 未満を強制アプデ化)", () => {
    const entry = SCHEMA_MIGRATIONS[3];
    expect(entry).toBeDefined();
    expect(entry.type).toBe("reset");
    if (entry.type === "reset") {
      expect(entry.reason).toContain("V5");
    }
  });

  it("SCHEMA_MIGRATIONS[4] は type='passthrough' (v5.0.0 entryUrl 追加は schema 互換)", () => {
    const entry = SCHEMA_MIGRATIONS[4];
    expect(entry).toBeDefined();
    expect(entry.type).toBe("passthrough");
  });

  // V4 等で PERSIST_SCHEMA_VERSION を bump したとき、旧バージョンの migration
  // 登録忘れを CI で検出する smoke test。1..PERSIST_SCHEMA_VERSION-1 までの
  // 全てに entry が必要 (= 既存ユーザの localStorage 移行漏れを防ぐ)。
  it("1..PERSIST_SCHEMA_VERSION-1 の全 version に migration entry が登録されている", () => {
    for (let v = 1; v < PERSIST_SCHEMA_VERSION; v++) {
      expect(
        SCHEMA_MIGRATIONS[v],
        `SCHEMA_MIGRATIONS[${v}] が未登録: PERSIST_SCHEMA_VERSION=${PERSIST_SCHEMA_VERSION} にしたなら v=${v} の移行戦略 (passthrough / reset / transform) を必ず登録すること`,
      ).toBeDefined();
    }
  });
});
