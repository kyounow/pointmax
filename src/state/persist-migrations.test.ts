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
  rules: [],
  edges: [],
  pointCards: [],
  loyaltyRules: [],
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
        reason: `不明な旧 schema (v${fromVersion}) を検出しました。v3 にリセットします。`,
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
  it("現在のスキーマバージョンは 2 である", () => {
    expect(PERSIST_SCHEMA_VERSION).toBe(2);
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
      rules: [{ id: "rule-1" }],
    };
    const result = runMigrate(legacyState, 1);

    expect(result.cards).toEqual([]);
    expect((result as { rules?: unknown[] }).rules).toEqual([]);
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
    const originalEntry = SCHEMA_MIGRATIONS[3];
    SCHEMA_MIGRATIONS[3] = { type: "transform", fn: transformFn };

    const inputState = { cards: [{ id: "c1" }] };
    const result = runMigrate(inputState, 3);

    expect(transformFn).toHaveBeenCalledWith(inputState);
    expect((result as { newField?: string }).newField).toBe("added");

    // テスト後はエントリを元に戻す (存在しなかった場合は削除)
    if (originalEntry === undefined) {
      delete SCHEMA_MIGRATIONS[3];
    } else {
      SCHEMA_MIGRATIONS[3] = originalEntry;
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

  it("PERSIST_SCHEMA_VERSION (2) のエントリは存在しない (自己移行は不要)", () => {
    // 現バージョン自身に対する migration エントリは不要・無意味
    expect(SCHEMA_MIGRATIONS[PERSIST_SCHEMA_VERSION]).toBeUndefined();
  });
});
