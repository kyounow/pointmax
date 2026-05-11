import type { SeedShape } from "./mergeSeed";

export type CollectionName =
  | "cards"
  | "currencies"
  | "stores"
  | "rules"
  | "edges"
  | "pointCards"
  | "loyaltyRules"
  | "paymentApps";

// 既存レコードの特定フィールドを from → to に更新
// 現在値が from と一致する時のみ自動適用、それ以外は衝突として個別確認
export type FieldUpdateMigration = {
  type: "updateField";
  collection: CollectionName;
  id: string;
  field: string;
  from: unknown;
  to: unknown;
  notes?: string;
};

// 既存レコードを削除（公式から提携終了等）
export type RecordDeleteMigration = {
  type: "delete";
  collection: CollectionName;
  id: string;
  notes?: string;
};

export type Migration = FieldUpdateMigration | RecordDeleteMigration;

export type VersionMigration = {
  toVersion: number;
  date: string;
  changes: Migration[];
};

export type PlanStatus =
  | "applicable"
  | "conflict"
  | "alreadyApplied"
  | "notFound";

export type PlanItem = {
  key: string; // 識別用 (UI選択キー)
  migration: Migration;
  status: PlanStatus;
  currentValue?: unknown; // updateField衝突時の現在値
};

function migrationKey(version: number, index: number): string {
  return `v${version}-${index}`;
}

// 配列を ID で検索しレコードを返す共通ヘルパ
type IdRecord = { id: string; [k: string]: unknown };
function findById(arr: unknown[], id: string): IdRecord | undefined {
  return (arr as IdRecord[]).find((x) => x.id === id);
}

export function planMigrations(
  state: SeedShape,
  fromVersion: number,
  toVersion: number,
  migrations: VersionMigration[],
): PlanItem[] {
  const items: PlanItem[] = [];
  const relevant = migrations
    .filter((vm) => vm.toVersion > fromVersion && vm.toVersion <= toVersion)
    .sort((a, b) => a.toVersion - b.toVersion);

  for (const vm of relevant) {
    vm.changes.forEach((m, i) => {
      const key = migrationKey(vm.toVersion, i);
      if (m.type === "updateField") {
        const record = findById(state[m.collection] as unknown[], m.id);
        if (!record) {
          items.push({ key, migration: m, status: "notFound" });
          return;
        }
        const cur = record[m.field];
        if (cur === m.from) {
          items.push({ key, migration: m, status: "applicable" });
        } else if (cur === m.to) {
          items.push({ key, migration: m, status: "alreadyApplied" });
        } else {
          items.push({
            key,
            migration: m,
            status: "conflict",
            currentValue: cur,
          });
        }
      } else if (m.type === "delete") {
        const record = findById(state[m.collection] as unknown[], m.id);
        if (record) {
          items.push({ key, migration: m, status: "applicable" });
        } else {
          items.push({ key, migration: m, status: "alreadyApplied" });
        }
      }
    });
  }
  return items;
}

export function applyMigration(state: SeedShape, m: Migration): SeedShape {
  if (m.type === "updateField") {
    const arr = state[m.collection] as IdRecord[];
    const next = arr.map((r) =>
      r.id === m.id ? { ...r, [m.field]: m.to } : r,
    );
    return { ...state, [m.collection]: next } as SeedShape;
  }
  if (m.type === "delete") {
    const arr = state[m.collection] as IdRecord[];
    const next = arr.filter((r) => r.id !== m.id);
    return { ...state, [m.collection]: next } as SeedShape;
  }
  return state;
}

// プラン項目から、指定キーに対応するマイグレーションを順次適用
export function applyMigrationsByKey(
  state: SeedShape,
  plan: PlanItem[],
  keys: Iterable<string>,
): SeedShape {
  const keySet = new Set(keys);
  let next = state;
  for (const item of plan) {
    if (keySet.has(item.key)) {
      next = applyMigration(next, item.migration);
    }
  }
  return next;
}

// 自動適用するべき項目のキー一覧 (applicable のみ。conflict/alreadyApplied/notFound は除外)
export function autoApplicableKeys(plan: PlanItem[]): string[] {
  return plan.filter((p) => p.status === "applicable").map((p) => p.key);
}

// 衝突項目のみ抽出
export function conflictItems(
  plan: PlanItem[],
): (PlanItem & { migration: FieldUpdateMigration })[] {
  return plan.filter(
    (p): p is PlanItem & { migration: FieldUpdateMigration } =>
      p.status === "conflict" && p.migration.type === "updateField",
  );
}

// プロジェクトのマイグレーション履歴。新しいバージョンを追加する時はここに append + SEED_VERSION++
// 自動収集スクリプトもこの配列にエントリを追加することで連携可能
export const MIGRATIONS: VersionMigration[] = [
  // 例 (未使用、参考):
  // {
  //   toVersion: 6,
  //   date: "2026-05-15",
  //   changes: [
  //     {
  //       type: "updateField",
  //       collection: "loyaltyRules",
  //       id: "loy-d-lawson",
  //       field: "rate",
  //       from: 0.005,
  //       to: 0.01,
  //       notes: "2026年4月公式レート変更",
  //     },
  //   ],
  // },
];
