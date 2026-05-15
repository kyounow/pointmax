import { describe, it, expect } from "vitest";
import {
  planMigrations,
  applyMigration,
  applyMigrationsByKey,
  autoApplicableKeys,
  MIGRATIONS,
  type Migration,
  type VersionMigration,
} from "./migrations";
import type { SeedShape } from "./mergeSeed";

const emptyState = (): SeedShape => ({
  cards: [],
  currencies: [],
  stores: [],
  edges: [],
  pointCards: [],
  loyaltyRules: [],
  paymentApps: [],
});

describe("planMigrations - updateField", () => {
  it("現在値が from と一致する場合は applicable", () => {
    const state: SeedShape = {
      ...emptyState(),
      loyaltyRules: [
        { id: "x", storeId: "s", pointCardId: "p", rate: 0.005 },
      ],
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          {
            type: "updateField",
            collection: "loyaltyRules",
            id: "x",
            field: "rate",
            from: 0.005,
            to: 0.01,
          },
        ],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    expect(plan).toHaveLength(1);
    expect(plan[0].status).toBe("applicable");
  });

  it("現在値が to と一致する場合は alreadyApplied", () => {
    const state: SeedShape = {
      ...emptyState(),
      loyaltyRules: [
        { id: "x", storeId: "s", pointCardId: "p", rate: 0.01 },
      ],
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          {
            type: "updateField",
            collection: "loyaltyRules",
            id: "x",
            field: "rate",
            from: 0.005,
            to: 0.01,
          },
        ],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    expect(plan[0].status).toBe("alreadyApplied");
  });

  it("現在値が from とも to とも異なる場合は conflict (ユーザー編集)", () => {
    const state: SeedShape = {
      ...emptyState(),
      loyaltyRules: [
        { id: "x", storeId: "s", pointCardId: "p", rate: 0.007 },
      ],
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          {
            type: "updateField",
            collection: "loyaltyRules",
            id: "x",
            field: "rate",
            from: 0.005,
            to: 0.01,
          },
        ],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    expect(plan[0].status).toBe("conflict");
    if (plan[0].status === "conflict") {
      expect(plan[0].currentValue).toBe(0.007);
    }
  });

  it("対象IDが存在しない場合は notFound", () => {
    const state = emptyState();
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          {
            type: "updateField",
            collection: "loyaltyRules",
            id: "missing",
            field: "rate",
            from: 0.005,
            to: 0.01,
          },
        ],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    expect(plan[0].status).toBe("notFound");
  });
});

describe("planMigrations - delete", () => {
  it("対象レコードが存在する場合は applicable", () => {
    const state: SeedShape = {
      ...emptyState(),
      edges: [
        { id: "e1", fromCurrencyId: "a", toCurrencyId: "b", rate: 1 },
      ],
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          { type: "delete", collection: "edges", id: "e1" },
        ],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    expect(plan[0].status).toBe("applicable");
  });

  it("対象レコードが既に無い場合は alreadyApplied", () => {
    const state = emptyState();
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          { type: "delete", collection: "edges", id: "e1" },
        ],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    expect(plan[0].status).toBe("alreadyApplied");
  });
});

describe("planMigrations - 範囲", () => {
  it("fromVersion 以下のマイグレーションは含まれない", () => {
    const state = emptyState();
    const migrations: VersionMigration[] = [
      {
        toVersion: 5,
        date: "old",
        changes: [{ type: "delete", collection: "edges", id: "e1" }],
      },
      {
        toVersion: 6,
        date: "new",
        changes: [{ type: "delete", collection: "edges", id: "e2" }],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    expect(plan).toHaveLength(1);
    expect(plan[0].migration.type).toBe("delete");
    if (plan[0].migration.type === "delete") {
      expect(plan[0].migration.id).toBe("e2");
    }
  });

  it("toVersion を超えるマイグレーションは含まれない", () => {
    const state = emptyState();
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "now",
        changes: [{ type: "delete", collection: "edges", id: "e1" }],
      },
      {
        toVersion: 7,
        date: "future",
        changes: [{ type: "delete", collection: "edges", id: "e2" }],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    expect(plan).toHaveLength(1);
  });
});

describe("applyMigration", () => {
  it("updateField はその field を to に書き換える", () => {
    const state: SeedShape = {
      ...emptyState(),
      loyaltyRules: [
        { id: "x", storeId: "s", pointCardId: "p", rate: 0.005 },
      ],
    };
    const m: Migration = {
      type: "updateField",
      collection: "loyaltyRules",
      id: "x",
      field: "rate",
      from: 0.005,
      to: 0.01,
    };
    const next = applyMigration(state, m);
    expect(next.loyaltyRules[0].rate).toBe(0.01);
  });

  it("delete はレコードを除去する", () => {
    const state: SeedShape = {
      ...emptyState(),
      edges: [
        { id: "e1", fromCurrencyId: "a", toCurrencyId: "b", rate: 1 },
        { id: "e2", fromCurrencyId: "c", toCurrencyId: "d", rate: 2 },
      ],
    };
    const m: Migration = { type: "delete", collection: "edges", id: "e1" };
    const next = applyMigration(state, m);
    expect(next.edges.map((e) => e.id)).toEqual(["e2"]);
  });

  it("元のstateは変更されない (immutable)", () => {
    const state: SeedShape = {
      ...emptyState(),
      loyaltyRules: [
        { id: "x", storeId: "s", pointCardId: "p", rate: 0.005 },
      ],
    };
    const m: Migration = {
      type: "updateField",
      collection: "loyaltyRules",
      id: "x",
      field: "rate",
      from: 0.005,
      to: 0.01,
    };
    applyMigration(state, m);
    expect(state.loyaltyRules[0].rate).toBe(0.005);
  });
});

describe("applyMigrationsByKey", () => {
  it("選択されたキーのマイグレーションのみ適用される", () => {
    const state: SeedShape = {
      ...emptyState(),
      loyaltyRules: [
        { id: "a", storeId: "s", pointCardId: "p", rate: 0.005 },
        { id: "b", storeId: "s", pointCardId: "p", rate: 0.005 },
      ],
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "x",
        changes: [
          {
            type: "updateField",
            collection: "loyaltyRules",
            id: "a",
            field: "rate",
            from: 0.005,
            to: 0.01,
          },
          {
            type: "updateField",
            collection: "loyaltyRules",
            id: "b",
            field: "rate",
            from: 0.005,
            to: 0.02,
          },
        ],
      },
    ];
    const plan = planMigrations(state, 5, 6, migrations);
    // 1つ目だけ適用
    const next = applyMigrationsByKey(state, plan, [plan[0].key]);
    const a = next.loyaltyRules.find((r) => r.id === "a");
    const b = next.loyaltyRules.find((r) => r.id === "b");
    expect(a?.rate).toBe(0.01);
    expect(b?.rate).toBe(0.005);
  });
});

describe("MIGRATIONS v13", () => {
  it("v13: jre-to-jal に requiredCardIds: ['jal-suica'] を追加する", () => {
    const state: SeedShape = {
      cards: [],
      currencies: [],
      stores: [],
      edges: [
        {
          id: "jre-to-jal",
          fromCurrencyId: "jre",
          toCurrencyId: "jal-mile",
          rate: 0.5,
        },
      ],
      pointCards: [],
      loyaltyRules: [],
      paymentApps: [],
    };
    const plan = planMigrations(state, 12, 13, MIGRATIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].status).toBe("applicable");
    const applied = applyMigrationsByKey(state, plan, autoApplicableKeys(plan));
    const edge = applied.edges.find((e) => e.id === "jre-to-jal");
    expect(edge?.requiredCardIds).toEqual(["jal-suica"]);
  });

  it("v13: 既に requiredCardIds が設定されているケースは conflict (配列同士 === 比較は false)", () => {
    const state: SeedShape = {
      cards: [],
      currencies: [],
      stores: [],
      edges: [
        {
          id: "jre-to-jal",
          fromCurrencyId: "jre",
          toCurrencyId: "jal-mile",
          rate: 0.5,
          requiredCardIds: ["jal-suica"],
        },
      ],
      pointCards: [],
      loyaltyRules: [],
      paymentApps: [],
    };
    const plan = planMigrations(state, 12, 13, MIGRATIONS);
    expect(plan).toHaveLength(1);
    // migration の to は ["jal-suica"] (配列インスタンス)、現在値も ["jal-suica"] (別インスタンス)。
    // planMigrations は cur === m.to のプリミティブ比較で評価するため、
    // 配列同士は object identity が異なり === false → conflict 扱いになる。
    // これは実装上許容される制限: ユーザーには「現在値はこうだが上書きしてよいか」と確認が入る形。
    expect(plan[0].status).toBe("conflict");
    expect(plan[0].currentValue).toEqual(["jal-suica"]);
  });
});

describe("MIGRATIONS v34 (ponta⇄d 相互交換廃止)", () => {
  it("v34: ponta-to-d / d-to-ponta が既存ユーザの edges から削除される", () => {
    const state: SeedShape = {
      cards: [],
      currencies: [],
      stores: [],
      edges: [
        { id: "ponta-to-d", fromCurrencyId: "ponta-pt", toCurrencyId: "d-pt", rate: 1 },
        { id: "d-to-ponta", fromCurrencyId: "d-pt", toCurrencyId: "ponta-pt", rate: 1 },
        { id: "ponta-to-jal", fromCurrencyId: "ponta-pt", toCurrencyId: "jal-mile", rate: 0.5 },
      ],
      pointCards: [],
      loyaltyRules: [],
      paymentApps: [],
    };
    // v33 → v34 で v34 の delete migration が適用対象になる
    const plan = planMigrations(state, 33, 34, MIGRATIONS);
    const deletePlan = plan.filter((p) => p.migration.type === "delete");
    expect(deletePlan).toHaveLength(2);
    expect(deletePlan.every((p) => p.status === "applicable")).toBe(true);

    const applied = applyMigrationsByKey(state, plan, autoApplicableKeys(plan));
    const ids = applied.edges.map((e) => e.id);
    expect(ids).not.toContain("ponta-to-d");
    expect(ids).not.toContain("d-to-ponta");
    // 無関係 edge は残る
    expect(ids).toContain("ponta-to-jal");
  });

  it("v34: 既に該当 edge が無いユーザは alreadyApplied (no-op)", () => {
    const state: SeedShape = {
      cards: [],
      currencies: [],
      stores: [],
      edges: [
        { id: "ponta-to-jal", fromCurrencyId: "ponta-pt", toCurrencyId: "jal-mile", rate: 0.5 },
      ],
      pointCards: [],
      loyaltyRules: [],
      paymentApps: [],
    };
    const plan = planMigrations(state, 33, 34, MIGRATIONS);
    const deletePlan = plan.filter((p) => p.migration.type === "delete");
    // delete 対象が既に無い → alreadyApplied (planMigrations - delete の仕様)
    expect(deletePlan.every((p) => p.status === "alreadyApplied")).toBe(true);
    // 適用しても ponta-to-jal は残る
    const applied = applyMigrationsByKey(state, plan, autoApplicableKeys(plan));
    expect(applied.edges.map((e) => e.id)).toEqual(["ponta-to-jal"]);
  });
});

describe("MIGRATIONS v35 (ファミペイ廃止)", () => {
  it("v35: pa-famipay / prog-famipay-base / prog-famima-card-addon が削除される", () => {
    const state: SeedShape = {
      cards: [],
      currencies: [],
      stores: [],
      edges: [],
      pointCards: [],
      loyaltyRules: [],
      paymentApps: [
        { id: "pa-famipay", name: "ファミペイ" },
        { id: "pa-rakuten-pay", name: "楽天Pay" },
      ],
      programs: [
        { id: "prog-famipay-base", name: "x", rate: 0.005, currencyId: "edy" },
        {
          id: "prog-famima-card-addon",
          name: "y",
          rate: 0.005,
          currencyId: "edy",
        },
        { id: "prog-keep", name: "z", rate: 0.01, currencyId: "rakuten-pt" },
      ],
    };
    const plan = planMigrations(state, 34, 35, MIGRATIONS);
    const deletePlan = plan.filter((p) => p.migration.type === "delete");
    expect(deletePlan).toHaveLength(3);
    expect(deletePlan.every((p) => p.status === "applicable")).toBe(true);

    const applied = applyMigrationsByKey(state, plan, autoApplicableKeys(plan));
    expect(applied.paymentApps.map((p) => p.id)).toEqual(["pa-rakuten-pay"]);
    expect((applied.programs ?? []).map((p) => p.id)).toEqual(["prog-keep"]);
  });

  it("v35: 既に無いユーザは alreadyApplied (no-op)", () => {
    const state: SeedShape = {
      cards: [],
      currencies: [],
      stores: [],
      edges: [],
      pointCards: [],
      loyaltyRules: [],
      paymentApps: [{ id: "pa-rakuten-pay", name: "楽天Pay" }],
      programs: [
        { id: "prog-keep", name: "z", rate: 0.01, currencyId: "rakuten-pt" },
      ],
    };
    const plan = planMigrations(state, 34, 35, MIGRATIONS);
    const deletePlan = plan.filter((p) => p.migration.type === "delete");
    expect(deletePlan.every((p) => p.status === "alreadyApplied")).toBe(true);
  });
});
