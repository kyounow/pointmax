import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
import { seed, SEED_VERSION, DEFAULT_SYNC_URL, isMasterCard, isMasterPaymentApp } from "./seed";
import { mergeSeed as mergeSeedFn } from "../domain/mergeSeed";
import {
  MIGRATIONS,
  applyMigrationsByKey,
  planMigrations,
  autoApplicableKeys,
} from "../domain/migrations";
import {
  PERSIST_SCHEMA_VERSION,
  SCHEMA_MIGRATIONS,
  type SchemaMigrationStrategy,
} from "./persist-versions";

// v0.8 リリース時に persist 階層を世代交代した。旧 v0.x キーは一度きりクリーンアップ。
// （次回 v1.0 以降は migrate / mergeFromSeed で吸収する）
const LEGACY_STORE_KEY = "pointmax-store";
if (typeof localStorage !== "undefined") {
  try {
    localStorage.removeItem(LEGACY_STORE_KEY);
  } catch {
    // localStorage 無効環境では無視
  }
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

type State = {
  cards: Card[];
  currencies: Currency[];
  stores: Store[];
  edges: ConversionEdge[];
  pointCards: PointCard[];
  loyaltyRules: LoyaltyRule[];
  paymentApps: PaymentApp[];
  programs: BenefitProgram[];
  memberships: StoreProgramMembership[];
  lastSeedVersion: number;
  syncUrl: string;
  lastSyncAt: string | null;
  // schema migration 中フラグ。旧 version 検出時に migrate callback がセットし、
  // SchemaUpgradeModal で Apply 後にクリアされる。
  _pendingSchemaMigration?: SchemaMigrationStrategy;
  // Apply 前のバックアップ用 (Export ボタンで JSON 出力する)
  _legacyPersistedState?: unknown;
};

type Actions = {
  addCard: (c: Omit<Card, "id">) => void;
  updateCard: (id: string, patch: Partial<Omit<Card, "id">>) => void;
  removeCard: (id: string) => void;

  addCurrency: (c: Omit<Currency, "id">) => void;
  updateCurrency: (id: string, patch: Partial<Omit<Currency, "id">>) => void;
  removeCurrency: (id: string) => void;

  addStore: (s: Omit<Store, "id">) => void;
  updateStore: (id: string, patch: Partial<Omit<Store, "id">>) => void;
  removeStore: (id: string) => void;

  addEdge: (e: Omit<ConversionEdge, "id">) => void;
  updateEdge: (id: string, patch: Partial<Omit<ConversionEdge, "id">>) => void;
  removeEdge: (id: string) => void;

  addPointCard: (p: Omit<PointCard, "id">) => void;
  updatePointCard: (
    id: string,
    patch: Partial<Omit<PointCard, "id">>,
  ) => void;
  removePointCard: (id: string) => void;
  movePointCard: (id: string, direction: "up" | "down") => void;

  addLoyaltyRule: (r: Omit<LoyaltyRule, "id">) => void;
  updateLoyaltyRule: (
    id: string,
    patch: Partial<Omit<LoyaltyRule, "id">>,
  ) => void;
  removeLoyaltyRule: (id: string) => void;

  addPaymentApp: (p: Omit<PaymentApp, "id">) => void;
  updatePaymentApp: (
    id: string,
    patch: Partial<Omit<PaymentApp, "id">>,
  ) => void;
  removePaymentApp: (id: string) => void;

  clearAll: () => void;
  mergeFromSeed: () => void;
  // 追加 + 自動適用可能なマイグレーション + ユーザー選択した衝突上書きをまとめて適用
  applySeedUpdate: (overrideKeys: string[]) => void;
  dismissSeedUpdate: () => void;
  exportJson: () => string;
  importJson: (json: string) => { ok: true } | { ok: false; error: string };
  setSyncUrl: (url: string) => void;
  // schema migration actions (SchemaUpgradeModal から呼ばれる)
  applySchemaMigration: () => void;
  exportLegacyState: () => string;
  syncFromUrl: () => Promise<
    { ok: true } | { ok: false; error: string }
  >;
};

const empty: State = {
  cards: [],
  currencies: [],
  stores: [],
  edges: [],
  pointCards: [],
  loyaltyRules: [],
  paymentApps: [],
  programs: [],
  memberships: [],
  lastSeedVersion: 0,
  // 初期値はビルトインの公式マスタURL。ユーザーが空に戻すと再びデフォルトを参照する想定
  syncUrl: DEFAULT_SYNC_URL,
  lastSyncAt: null,
  // _pendingSchemaMigration / _legacyPersistedState は undefined で初期化
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...empty,

      addCard: (c) =>
        set((s) => ({ cards: [...s.cards, { ...c, id: newId() }] })),
      updateCard: (id, patch) =>
        set((s) => ({
          cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCard: (id) => {
        // マスター由来カードは削除不可 (mergeFromSeed で復活するため意味がない)。
        // UI 側で削除ボタンも隠すが、ここでも防御する。
        if (isMasterCard(id)) return;
        set((s) => ({
          cards: s.cards.filter((c) => c.id !== id),
        }));
      },

      addCurrency: (c) =>
        set((s) => ({ currencies: [...s.currencies, { ...c, id: newId() }] })),
      updateCurrency: (id, patch) =>
        set((s) => ({
          currencies: s.currencies.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),
      removeCurrency: (id) =>
        set((s) => ({
          currencies: s.currencies.filter((c) => c.id !== id),
          edges: s.edges.filter(
            (e) => e.fromCurrencyId !== id && e.toCurrencyId !== id,
          ),
        })),

      addStore: (st) =>
        set((s) => ({ stores: [...s.stores, { ...st, id: newId() }] })),
      updateStore: (id, patch) =>
        set((s) => ({
          stores: s.stores.map((st) =>
            st.id === id ? { ...st, ...patch } : st,
          ),
        })),
      removeStore: (id) =>
        set((s) => ({
          stores: s.stores.filter((st) => st.id !== id),
          loyaltyRules: s.loyaltyRules.filter((r) => r.storeId !== id),
        })),

      addEdge: (e) =>
        set((s) => ({ edges: [...s.edges, { ...e, id: newId() }] })),
      updateEdge: (id, patch) =>
        set((s) => ({
          edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeEdge: (id) =>
        set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),

      addPointCard: (p) =>
        set((s) => ({
          pointCards: [...s.pointCards, { ...p, id: newId() }],
        })),
      updatePointCard: (id, patch) =>
        set((s) => ({
          pointCards: s.pointCards.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),
      removePointCard: (id) =>
        set((s) => ({
          pointCards: s.pointCards.filter((p) => p.id !== id),
          loyaltyRules: s.loyaltyRules.filter((r) => r.pointCardId !== id),
        })),
      movePointCard: (id, direction) =>
        set((s) => {
          const idx = s.pointCards.findIndex((p) => p.id === id);
          if (idx < 0) return s;
          const next = direction === "up" ? idx - 1 : idx + 1;
          if (next < 0 || next >= s.pointCards.length) return s;
          const arr = [...s.pointCards];
          [arr[idx], arr[next]] = [arr[next], arr[idx]];
          return { pointCards: arr };
        }),

      addLoyaltyRule: (r) =>
        set((s) => ({
          loyaltyRules: [...s.loyaltyRules, { ...r, id: newId() }],
        })),
      updateLoyaltyRule: (id, patch) =>
        set((s) => ({
          loyaltyRules: s.loyaltyRules.map((r) =>
            r.id === id ? { ...r, ...patch } : r,
          ),
        })),
      removeLoyaltyRule: (id) =>
        set((s) => ({
          loyaltyRules: s.loyaltyRules.filter((r) => r.id !== id),
        })),

      addPaymentApp: (p) =>
        set((s) => ({
          paymentApps: [...s.paymentApps, { ...p, id: newId() }],
        })),
      updatePaymentApp: (id, patch) =>
        set((s) => ({
          paymentApps: s.paymentApps.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),
      removePaymentApp: (id) => {
        // マスター由来 PaymentApp は削除不可 (mergeFromSeed で復活するため意味がない)。
        // UI 側で削除ボタンも隠すが、ここでも防御する。
        if (isMasterPaymentApp(id)) return;
        set((s) => ({
          paymentApps: s.paymentApps.filter((p) => p.id !== id),
        }));
      },

      clearAll: () => set(() => empty),
      mergeFromSeed: () =>
        set((s) => {
          const result = mergeSeedFn(
            {
              cards: s.cards,
              currencies: s.currencies,
              stores: s.stores,
              edges: s.edges,
              pointCards: s.pointCards,
              loyaltyRules: s.loyaltyRules,
              paymentApps: s.paymentApps,
              programs: s.programs,
              memberships: s.memberships,
            },
            seed(),
          );
          return {
            cards: result.cards,
            currencies: result.currencies,
            stores: result.stores,
            edges: result.edges,
            pointCards: result.pointCards,
            loyaltyRules: result.loyaltyRules,
            paymentApps: result.paymentApps,
            programs: result.programs ?? [],
            memberships: result.memberships ?? [],
            lastSeedVersion: SEED_VERSION,
          };
        }),
      applySeedUpdate: (overrideKeys) =>
        set((s) => {
          const currentShape = {
            cards: s.cards,
            currencies: s.currencies,
            stores: s.stores,
            edges: s.edges,
            pointCards: s.pointCards,
            loyaltyRules: s.loyaltyRules,
            paymentApps: s.paymentApps,
            programs: s.programs,
            memberships: s.memberships,
          };
          // 1. 追加分マージ (mergeSeed; add-only)
          const merged = mergeSeedFn(currentShape, seed());

          // 2. マイグレーション計画 (現在の state + 追加後で再計算)
          const plan = planMigrations(
            merged,
            s.lastSeedVersion,
            SEED_VERSION,
            MIGRATIONS,
          );

          // 3. 自動適用キー + ユーザー上書き選択
          const keysToApply = new Set<string>([
            ...autoApplicableKeys(plan),
            ...overrideKeys,
          ]);
          const finalState = applyMigrationsByKey(
            {
              cards: merged.cards,
              currencies: merged.currencies,
              stores: merged.stores,
              edges: merged.edges,
              pointCards: merged.pointCards,
              loyaltyRules: merged.loyaltyRules,
              paymentApps: merged.paymentApps,
            },
            plan,
            keysToApply,
          );

          return {
            cards: finalState.cards,
            currencies: finalState.currencies,
            stores: finalState.stores,
            edges: finalState.edges,
            pointCards: finalState.pointCards,
            loyaltyRules: finalState.loyaltyRules,
            paymentApps: finalState.paymentApps,
            programs: merged.programs ?? [],
            memberships: merged.memberships ?? [],
            lastSeedVersion: SEED_VERSION,
          };
        }),
      dismissSeedUpdate: () =>
        set(() => ({ lastSeedVersion: SEED_VERSION })),

      applySchemaMigration: () =>
        set(() => ({
          ...empty,
          ...seed(),
          lastSeedVersion: SEED_VERSION,
          _pendingSchemaMigration: undefined,
          _legacyPersistedState: undefined,
        })),

      exportLegacyState: () => {
        const s = get();
        return JSON.stringify(
          {
            version: "v2.x (legacy)",
            exportedAt: new Date().toISOString(),
            note: "PointMax v3 リリース直前の localStorage 全データ。手動復元には parser が必要。",
            data: s._legacyPersistedState ?? s,
          },
          null,
          2,
        );
      },

      setSyncUrl: (url) => set(() => ({ syncUrl: url.trim() })),

      syncFromUrl: async () => {
        const url = get().syncUrl;
        if (!url) {
          return { ok: false, error: "同期URLが未設定です" };
        }
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            return {
              ok: false,
              error: `HTTP ${res.status}: ${res.statusText}`,
            };
          }
          const text = await res.text();
          const data = JSON.parse(text);
          if (typeof data !== "object" || data == null) {
            return { ok: false, error: "JSONが不正です" };
          }
          const required = [
            "cards",
            "currencies",
            "stores",
            "edges",
          ];
          for (const key of required) {
            if (!Array.isArray(data[key])) {
              return {
                ok: false,
                error: `"${key}" が配列ではありません`,
              };
            }
          }
          const remote = {
            cards: data.cards,
            currencies: data.currencies,
            stores: data.stores,
            edges: data.edges,
            pointCards: Array.isArray(data.pointCards) ? data.pointCards : [],
            loyaltyRules: Array.isArray(data.loyaltyRules)
              ? data.loyaltyRules
              : [],
            paymentApps: Array.isArray(data.paymentApps)
              ? data.paymentApps
              : [],
            programs: Array.isArray(data.programs) ? data.programs : [],
            memberships: Array.isArray(data.memberships) ? data.memberships : [],
          };
          set(() => ({
            ...remote,
            lastSyncAt: new Date().toISOString(),
          }));
          return { ok: true };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      },

      exportJson: () => {
        const s = get();
        return JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            cards: s.cards,
            currencies: s.currencies,
            stores: s.stores,
            edges: s.edges,
            pointCards: s.pointCards,
            loyaltyRules: s.loyaltyRules,
            paymentApps: s.paymentApps,
          },
          null,
          2,
        );
      },
      importJson: (json) => {
        try {
          const data = JSON.parse(json);
          if (typeof data !== "object" || data == null)
            return { ok: false, error: "JSONが不正です" };
          const required = ["cards", "currencies", "stores", "edges"];
          for (const key of required) {
            if (!Array.isArray(data[key]))
              return { ok: false, error: `"${key}" が配列ではありません` };
          }
          // 手書き JSON で省略されているケースのため、欠けてれば空配列で防御
          set(() => ({
            cards: data.cards,
            currencies: data.currencies,
            stores: data.stores,
            edges: data.edges,
            pointCards: Array.isArray(data.pointCards) ? data.pointCards : [],
            loyaltyRules: Array.isArray(data.loyaltyRules)
              ? data.loyaltyRules
              : [],
            paymentApps: Array.isArray(data.paymentApps)
              ? data.paymentApps
              : [],
          }));
          return { ok: true };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "解析エラー",
          };
        }
      },
    }),
    {
      // v0.8 で世代交代。旧キー "pointmax-store" は無視 (孤児は起動時に削除)
      name: "pointmax-v08-store",
      storage: createJSONStorage(() => localStorage),
      version: PERSIST_SCHEMA_VERSION,  // 2 → 3 (v3.3 で bump)
      migrate: (persistedState: unknown, fromVersion: number) => {
        // 新規 install (version フィールドが無い = fromVersion が undefined 扱い)
        // → そのまま通す (既存の empty+seed 初期化フローへ)
        if (fromVersion === PERSIST_SCHEMA_VERSION) {
          return persistedState;
        }

        // 旧 version 検出 → SCHEMA_MIGRATIONS で strategy を引く
        const strategy = SCHEMA_MIGRATIONS[fromVersion];
        if (!strategy) {
          // 想定外の旧 version → 安全側として reset 扱い
          return {
            ...empty,
            _pendingSchemaMigration: {
              type: "reset" as const,
              reason: `不明な旧 schema (v${fromVersion}) を検出しました。v3 にリセットします。`,
            },
          };
        }

        if (strategy.type === "reset") {
          // ユーザーに明示同意を求めるため、empty + pending flag + legacy backup をセット
          // 実際の reset は SchemaUpgradeModal で Apply ボタンを押した後
          return {
            ...empty,
            _pendingSchemaMigration: strategy,
            _legacyPersistedState: persistedState,
          };
        }

        if (strategy.type === "transform") {
          return strategy.fn(persistedState);
        }

        // passthrough
        return persistedState;
      },
    },
  ),
);
