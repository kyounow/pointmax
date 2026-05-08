import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Card,
  ConversionEdge,
  Currency,
  LoyaltyRule,
  PointCard,
  Store,
  StoreRule,
} from "../domain/types";
import { seed, SEED_VERSION, DEFAULT_SYNC_URL } from "./seed";
import { mergeSeed as mergeSeedFn } from "../domain/mergeSeed";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

type State = {
  cards: Card[];
  currencies: Currency[];
  stores: Store[];
  rules: StoreRule[];
  edges: ConversionEdge[];
  pointCards: PointCard[];
  loyaltyRules: LoyaltyRule[];
  lastSeedVersion: number;
  syncUrl: string;
  lastSyncAt: string | null;
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

  addRule: (r: Omit<StoreRule, "id">) => void;
  updateRule: (id: string, patch: Partial<Omit<StoreRule, "id">>) => void;
  removeRule: (id: string) => void;

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

  loadSeed: () => void;
  clearAll: () => void;
  mergeFromSeed: () => void;
  dismissSeedUpdate: () => void;
  exportJson: () => string;
  importJson: (json: string) => { ok: true } | { ok: false; error: string };
  setSyncUrl: (url: string) => void;
  syncFromUrl: (
    mode: "merge" | "overwrite",
  ) => Promise<
    | { ok: true; added?: number; mode: "merge" | "overwrite" }
    | { ok: false; error: string }
  >;
};

const empty: State = {
  cards: [],
  currencies: [],
  stores: [],
  rules: [],
  edges: [],
  pointCards: [],
  loyaltyRules: [],
  lastSeedVersion: 0,
  // 初期値はビルトインの公式マスタURL。ユーザーが空に戻すと再びデフォルトを参照する想定
  syncUrl: DEFAULT_SYNC_URL,
  lastSyncAt: null,
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
      removeCard: (id) =>
        set((s) => ({
          cards: s.cards.filter((c) => c.id !== id),
          rules: s.rules.filter((r) => r.cardId !== id),
        })),

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
          rules: s.rules.filter((r) => r.storeId !== id),
          loyaltyRules: s.loyaltyRules.filter((r) => r.storeId !== id),
        })),

      addRule: (r) =>
        set((s) => ({ rules: [...s.rules, { ...r, id: newId() }] })),
      updateRule: (id, patch) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      removeRule: (id) =>
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

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

      loadSeed: () => set(() => ({ ...seed(), lastSeedVersion: SEED_VERSION })),
      clearAll: () => set(() => empty),
      mergeFromSeed: () =>
        set((s) => {
          const result = mergeSeedFn(
            {
              cards: s.cards,
              currencies: s.currencies,
              stores: s.stores,
              rules: s.rules,
              edges: s.edges,
              pointCards: s.pointCards,
              loyaltyRules: s.loyaltyRules,
            },
            seed(),
          );
          return {
            cards: result.cards,
            currencies: result.currencies,
            stores: result.stores,
            rules: result.rules,
            edges: result.edges,
            pointCards: result.pointCards,
            loyaltyRules: result.loyaltyRules,
            lastSeedVersion: SEED_VERSION,
          };
        }),
      dismissSeedUpdate: () =>
        set(() => ({ lastSeedVersion: SEED_VERSION })),

      setSyncUrl: (url) => set(() => ({ syncUrl: url.trim() })),

      syncFromUrl: async (mode) => {
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
            "rules",
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
            rules: data.rules,
            edges: data.edges,
            pointCards: Array.isArray(data.pointCards) ? data.pointCards : [],
            loyaltyRules: Array.isArray(data.loyaltyRules)
              ? data.loyaltyRules
              : [],
          };
          if (mode === "overwrite") {
            set(() => ({
              ...remote,
              lastSyncAt: new Date().toISOString(),
            }));
            return { ok: true, mode };
          }
          // merge
          const s = get();
          const result = mergeSeedFn(
            {
              cards: s.cards,
              currencies: s.currencies,
              stores: s.stores,
              rules: s.rules,
              edges: s.edges,
              pointCards: s.pointCards,
              loyaltyRules: s.loyaltyRules,
            },
            remote,
          );
          const addedCount =
            result.diff.cards.length +
            result.diff.currencies.length +
            result.diff.stores.length +
            result.diff.rules.length +
            result.diff.edges.length +
            result.diff.pointCards.length +
            result.diff.loyaltyRules.length;
          set(() => ({
            cards: result.cards,
            currencies: result.currencies,
            stores: result.stores,
            rules: result.rules,
            edges: result.edges,
            pointCards: result.pointCards,
            loyaltyRules: result.loyaltyRules,
            lastSyncAt: new Date().toISOString(),
          }));
          return { ok: true, added: addedCount, mode };
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
            version: 2,
            exportedAt: new Date().toISOString(),
            cards: s.cards,
            currencies: s.currencies,
            stores: s.stores,
            rules: s.rules,
            edges: s.edges,
            pointCards: s.pointCards,
            loyaltyRules: s.loyaltyRules,
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
          const required = ["cards", "currencies", "stores", "rules", "edges"];
          for (const key of required) {
            if (!Array.isArray(data[key]))
              return { ok: false, error: `"${key}" が配列ではありません` };
          }
          // pointCards / loyaltyRules は v1 export には無いので任意
          set(() => ({
            cards: data.cards,
            currencies: data.currencies,
            stores: data.stores,
            rules: data.rules,
            edges: data.edges,
            pointCards: Array.isArray(data.pointCards) ? data.pointCards : [],
            loyaltyRules: Array.isArray(data.loyaltyRules)
              ? data.loyaltyRules
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
      name: "pointmax-store",
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persistedState) => {
        // 旧バージョンからの移行: 不足フィールドにデフォルトを補う
        const s = (persistedState ?? {}) as Partial<State>;
        return {
          ...empty,
          ...s,
          pointCards: s.pointCards ?? [],
          loyaltyRules: s.loyaltyRules ?? [],
          lastSeedVersion: s.lastSeedVersion ?? 0,
          // 既存ユーザーのsyncUrlが空ならデフォルトに戻す
          syncUrl: s.syncUrl ? s.syncUrl : DEFAULT_SYNC_URL,
          lastSyncAt: s.lastSyncAt ?? null,
        } as State;
      },
    },
  ),
);
