import type { SeedShape } from "./mergeSeed";

export type CollectionName =
  | "cards"
  | "currencies"
  | "stores"
  | "edges"
  | "pointCards"
  | "loyaltyRules"
  | "paymentApps"
  | "programs"
  | "memberships";

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

// 配列を ID で検索しレコードを返す共通ヘルパ。
// arr が undefined のケースを防御 (SeedShape の programs/memberships は optional、
// UpdateBanner の afterMerge 等で当該 collection が欠落しうる。
// 欠落 = そのレコードは存在しない、として扱う)。
type IdRecord = { id: string; [k: string]: unknown };
function findById(arr: unknown[] | undefined, id: string): IdRecord | undefined {
  if (!Array.isArray(arr)) return undefined;
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
  // collection が欠落 (undefined) のときは空配列扱い。
  // updateField → 対象なしで何もしない / delete → 既に無いので no-op。
  if (m.type === "updateField") {
    const arr = (state[m.collection] as IdRecord[] | undefined) ?? [];
    const next = arr.map((r) =>
      r.id === m.id ? { ...r, [m.field]: m.to } : r,
    );
    return { ...state, [m.collection]: next } as SeedShape;
  }
  if (m.type === "delete") {
    const arr = (state[m.collection] as IdRecord[] | undefined) ?? [];
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
// v0.8 リリースで履歴をリセット。v1.0 以降の差分を積み上げる予定
export const MIGRATIONS: VersionMigration[] = [
  {
    toVersion: 13,
    date: "2026-05-12",
    changes: [
      {
        type: "updateField",
        collection: "edges",
        id: "jre-to-jal",
        field: "requiredCardIds",
        from: undefined,
        to: ["jal-suica"],
        notes:
          "JRE→JAL マイル は JALカードSuica 会員特典 (公式仕様)。" +
          "v13 以前は制約なしで全ユーザーに表示していたが、実体に合わせる。",
      },
    ],
  },
  {
    toVersion: 34,
    date: "2026-05-15",
    changes: [
      {
        type: "delete",
        collection: "edges",
        id: "ponta-to-d",
        notes:
          "dポイント ⇄ Pontaポイント 相互交換は 2020/9 にサービス終了済。" +
          "架空ルートになるため既存ユーザの localStorage からも削除。",
      },
      {
        type: "delete",
        collection: "edges",
        id: "d-to-ponta",
        notes:
          "同上 (d → Ponta 方向)。2020/9 終了済の相互交換。",
      },
    ],
  },
  {
    toVersion: 35,
    date: "2026-05-15",
    changes: [
      {
        type: "delete",
        collection: "paymentApps",
        id: "pa-famipay",
        notes:
          "ファミペイ廃止 (v4.0.1)。ポイント付与が d/楽天/V 選択式で単一通貨" +
          "PaymentApp モデルに馴染まないため。ファミマでの d/楽天/V 還元は" +
          "pointCard loyalty membership でカバー済。",
      },
      {
        type: "delete",
        collection: "programs",
        id: "prog-famipay-base",
        notes: "ファミペイ廃止に伴う関連 BenefitProgram 削除 (base)。",
      },
      {
        type: "delete",
        collection: "programs",
        id: "prog-famima-card-addon",
        notes: "ファミペイ廃止に伴う関連 BenefitProgram 削除 (addOn)。",
      },
    ],
  },
  {
    toVersion: 37,
    date: "2026-05-20",
    changes: [
      {
        type: "delete",
        collection: "programs",
        id: "prog-jcb-jpoint-4x",
        notes:
          "V5-2 で JCB J-POINT パートナーをカードグレード別 (W 用 / Gold 用) に再構成。" +
          "「4倍」は Gold プレミアム視点の倍率で W 用には不適切だったため廃止。" +
          "高島屋は W では 2倍 (prog-jcb-jpoint-2x) に移管、" +
          "Gold プレミアム 4倍は prog-jcb-jpoint-gold-4x で表現 (実効 2%)。",
      },
    ],
  },
];
