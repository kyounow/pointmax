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
  paymentApps: [],
});

// v6 PR-1e: LoyaltyRule 廃止に伴い、汎用マイグレーション engine のサンプル collection は
// programs (rate フィールドを持つ) を使う。engine は collection 非依存なので挙動は不変。
const prog = (id: string, rate: number): SeedShape["programs"] => [
  {
    id,
    name: id,
    scope: "member-stores",
    pointCardId: "p",
    rate,
    currencyId: "c",
    bonusType: "primary",
  },
];

describe("planMigrations - updateField", () => {
  it("現在値が from と一致する場合は applicable", () => {
    const state: SeedShape = {
      ...emptyState(),
      programs: prog("x", 0.005),
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          {
            type: "updateField",
            collection: "programs",
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
      programs: prog("x", 0.01),
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          {
            type: "updateField",
            collection: "programs",
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
      programs: prog("x", 0.007),
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "2026-05-15",
        changes: [
          {
            type: "updateField",
            collection: "programs",
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
            collection: "programs",
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
      programs: prog("x", 0.005),
    };
    const m: Migration = {
      type: "updateField",
      collection: "programs",
      id: "x",
      field: "rate",
      from: 0.005,
      to: 0.01,
    };
    const next = applyMigration(state, m);
    expect(next.programs![0].rate).toBe(0.01);
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
      programs: prog("x", 0.005),
    };
    const m: Migration = {
      type: "updateField",
      collection: "programs",
      id: "x",
      field: "rate",
      from: 0.005,
      to: 0.01,
    };
    applyMigration(state, m);
    expect(state.programs![0].rate).toBe(0.005);
  });
});

describe("applyMigrationsByKey", () => {
  it("選択されたキーのマイグレーションのみ適用される", () => {
    const state: SeedShape = {
      ...emptyState(),
      programs: [...prog("a", 0.005)!, ...prog("b", 0.005)!],
    };
    const migrations: VersionMigration[] = [
      {
        toVersion: 6,
        date: "x",
        changes: [
          {
            type: "updateField",
            collection: "programs",
            id: "a",
            field: "rate",
            from: 0.005,
            to: 0.01,
          },
          {
            type: "updateField",
            collection: "programs",
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
    const a = next.programs!.find((r) => r.id === "a");
    const b = next.programs!.find((r) => r.id === "b");
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

describe("MIGRATIONS v41 (WAON→JAL を aeon-card ゲート化)", () => {
  const mkState = (requiredCardIds?: string[]): SeedShape => ({
    cards: [],
    currencies: [],
    stores: [],
    edges: [
      {
        id: "waon-to-jal",
        fromCurrencyId: "waon-pt",
        toCurrencyId: "jal-mile",
        rate: 0.5,
        ...(requiredCardIds ? { requiredCardIds } : {}),
      },
    ],
    pointCards: [],
    paymentApps: [],
  });

  it("v41: 既存ユーザ (requiredCardIds 無し) の waon-to-jal に ['aeon-card'] を付与", () => {
    const state = mkState();
    const plan = planMigrations(state, 40, 41, MIGRATIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].status).toBe("applicable");
    const applied = applyMigrationsByKey(state, plan, autoApplicableKeys(plan));
    const edge = applied.edges.find((e) => e.id === "waon-to-jal");
    expect(edge?.requiredCardIds).toEqual(["aeon-card"]);
  });

  it("v41: 既に requiredCardIds 設定済は conflict (配列 identity 比較、v13 と同制限)", () => {
    const state = mkState(["aeon-card"]);
    const plan = planMigrations(state, 40, 41, MIGRATIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].status).toBe("conflict");
  });

  it("v41: SEED_VERSION 41 まで上げると v13 と v41 の両方は範囲に応じて選ばれる", () => {
    // fromVersion 40 → 41 では v41 のみ (v13 は範囲外)
    const state = mkState();
    const plan = planMigrations(state, 40, 41, MIGRATIONS);
    expect(plan.every((p) => p.migration.id === "waon-to-jal")).toBe(true);
  });
});

describe("MIGRATIONS v42 (jre-to-jal を CLUB-Aゴールド 0.6667 に修正)", () => {
  const mkState = (rate: number): SeedShape => ({
    cards: [],
    currencies: [],
    stores: [],
    edges: [
      {
        id: "jre-to-jal",
        fromCurrencyId: "jre",
        toCurrencyId: "jal-mile",
        rate,
        requiredCardIds: ["jal-suica"],
      },
    ],
    pointCards: [],
    paymentApps: [],
  });

  it("v42: rate 0.5 の既存ユーザは applicable、適用後 0.6667 になる", () => {
    const state = mkState(0.5);
    const plan = planMigrations(state, 41, 42, MIGRATIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].status).toBe("applicable");
    const applied = applyMigrationsByKey(state, plan, autoApplicableKeys(plan));
    const edge = applied.edges.find((e) => e.id === "jre-to-jal");
    expect(edge?.rate).toBe(0.6667);
  });

  it("v42: 既に 0.6667 のユーザは alreadyApplied (no-op)", () => {
    const state = mkState(0.6667);
    const plan = planMigrations(state, 41, 42, MIGRATIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].status).toBe("alreadyApplied");
  });

  it("v42: rate を手編集済 (例 0.55) は conflict", () => {
    const state = mkState(0.55);
    const plan = planMigrations(state, 41, 42, MIGRATIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].status).toBe("conflict");
    if (plan[0].status === "conflict") {
      expect(plan[0].currentValue).toBe(0.55);
    }
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
      paymentApps: [
        { id: "pa-famipay", name: "ファミペイ" },
        { id: "pa-rakuten-pay", name: "楽天Pay" },
      ],
      programs: [
        { id: "prog-famipay-base", name: "x", scope: "all-stores", rate: 0.005, currencyId: "edy" },
        {
          id: "prog-famima-card-addon",
          name: "y",
          scope: "all-stores",
          rate: 0.005,
          currencyId: "edy",
        },
        { id: "prog-keep", name: "z", scope: "all-stores", rate: 0.01, currencyId: "rakuten-pt" },
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
      paymentApps: [{ id: "pa-rakuten-pay", name: "楽天Pay" }],
      programs: [
        { id: "prog-keep", name: "z", scope: "all-stores", rate: 0.01, currencyId: "rakuten-pt" },
      ],
    };
    const plan = planMigrations(state, 34, 35, MIGRATIONS);
    const deletePlan = plan.filter((p) => p.migration.type === "delete");
    expect(deletePlan.every((p) => p.status === "alreadyApplied")).toBe(true);
  });
});

// v4.0.1 回帰テスト:
// v35 ファミペイ migration が collection: "programs"/"paymentApps" を
// delete 対象にした際、state にその collection が無い (undefined) と
// findById / applyMigration がクラッシュした (UpdateBanner で localhost 不能)。
// 「実 MIGRATIONS の全 change を、optional collection 欠落 state に対して
// plan/apply してもクラッシュしない」を恒久保証する。
// → 将来どの collection を触る migration を足しても、この穴で再発しない。
describe("MIGRATIONS 全件 × optional collection 欠落 state 耐性 (回帰)", () => {
  // programs / memberships を意図的に持たない最小 state (旧 localStorage や
  // UpdateBanner の afterMerge が欠落しうるケースを模す)
  const stateWithoutOptional = (): SeedShape =>
    ({
      cards: [],
      currencies: [],
      stores: [],
      edges: [],
      pointCards: [],
      paymentApps: [],
      // programs / memberships は敢えて未定義
    }) as SeedShape;

  // MIGRATIONS が触る最大 toVersion (fromVersion=0 で全件対象にする)
  const maxToVersion = Math.max(...MIGRATIONS.map((m) => m.toVersion));

  it("planMigrations を全 migration に対し欠落 state で実行してもクラッシュしない", () => {
    expect(() => {
      planMigrations(stateWithoutOptional(), 0, maxToVersion, MIGRATIONS);
    }).not.toThrow();
  });

  it("applyMigrationsByKey で全 migration を欠落 state に適用してもクラッシュしない", () => {
    const state = stateWithoutOptional();
    const plan = planMigrations(state, 0, maxToVersion, MIGRATIONS);
    expect(() => {
      applyMigrationsByKey(state, plan, autoApplicableKeys(plan));
    }).not.toThrow();
  });

  it("applyMigration 単体: programs 欠落 state への delete は no-op (例外なし)", () => {
    const state = stateWithoutOptional();
    const m: Migration = {
      type: "delete",
      collection: "programs",
      id: "prog-famipay-base",
    };
    let next: SeedShape | undefined;
    expect(() => {
      next = applyMigration(state, m);
    }).not.toThrow();
    // 欠落 collection は [] 扱いで返る
    expect(next?.programs).toEqual([]);
  });

  it("applyMigration 単体: paymentApps 欠落 state への updateField も例外なし", () => {
    const state = stateWithoutOptional();
    const m: Migration = {
      type: "updateField",
      collection: "paymentApps",
      id: "pa-x",
      field: "enabled",
      from: true,
      to: false,
    };
    expect(() => applyMigration(state, m)).not.toThrow();
  });

  it("findById 経由: delete plan の status が欠落 state で alreadyApplied になる", () => {
    // v35 (programs/paymentApps delete) を欠落 state で plan → 全て alreadyApplied
    const plan = planMigrations(stateWithoutOptional(), 34, 35, MIGRATIONS);
    const deletePlan = plan.filter((p) => p.migration.type === "delete");
    expect(deletePlan.length).toBeGreaterThan(0);
    expect(deletePlan.every((p) => p.status === "alreadyApplied")).toBe(true);
  });
});
