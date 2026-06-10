import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
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
import { validateImportData } from "./validators";
import {
  seed,
  SEED_VERSION,
  DEFAULT_SYNC_URL,
  isMasterCard,
  isMasterPaymentApp,
  getSeedCard,
  getSeedPaymentApp,
} from "./seed";
import {
  applyCardPatch,
  applyPaymentAppPatch,
  resetCardToSeedValues,
  resetPaymentAppToSeedValues,
} from "./userModified";
import { mergeSeed as mergeSeedFn } from "../domain/mergeSeed";
import { REMOVED_PROGRAM_IDS } from "./seed-additions";
import { preservePreferences } from "./preferenceMerge";
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
  // v4.0.0 ②: ユーザが「普段使う通貨」を順序付きで保持。
  // 先頭ほど優先 (Calculator のタブ並び順 = この配列順)。
  // 空配列なら Calculator は通貨未選択状態 (ユーザに選択を促す)。
  // PointCard preferredOrder と同じ「順序あり配列」パターン。
  preferredCurrencyIds: string[];
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
  // master 由来カードのデータ部分 (name/grade/defaultRate/defaultCurrencyId) を
  // seed 値に戻し、userModifiedAt をクリアして「公式」バッジを復活させる。
  // enabled は preference として保持。non-master id (= UUID) は no-op。
  resetCardToSeed: (id: string) => void;

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

  // v4.0.0 ②: 優先通貨リスト操作。重複追加は無視、順序保持。
  addPreferredCurrency: (currencyId: string) => void;
  removePreferredCurrency: (currencyId: string) => void;
  movePreferredCurrency: (
    currencyId: string,
    direction: "up" | "down",
  ) => void;

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
  // master 由来 PaymentApp のデータ部分を seed 値に戻し、userModifiedAt をクリア。
  // enabled は保持。non-master id は no-op。
  resetPaymentAppToSeed: (id: string) => void;

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
  preferredCurrencyIds: [],
  // _pendingSchemaMigration / _legacyPersistedState は undefined で初期化
};

// Wave 5 A-4 audit-fix: zustand/immer middleware で構造共有を有効化。
// 1 件更新時に他要素の object reference を保持 → useShallow(B-1) と組み合わせ
// 再 render 範囲を局所化。set 関数の callback は draft をミューテートする (return しない)。
export const useStore = create<State & Actions>()(
  persist(
    immer((set, get) => ({
      ...empty,

      addCard: (c) =>
        set((state) => {
          state.cards.push({ ...c, id: newId() });
        }),
      updateCard: (id, patch) =>
        set((state) => {
          const idx = state.cards.findIndex((c) => c.id === id);
          if (idx >= 0) {
            state.cards[idx] = applyCardPatch(
              state.cards[idx],
              patch,
              new Date(),
            );
          }
        }),
      removeCard: (id) => {
        // マスター由来カードは削除不可 (mergeFromSeed で復活するため意味がない)。
        // UI 側で削除ボタンも隠すが、ここでも防御する。
        if (isMasterCard(id)) return;
        set((state) => {
          const idx = state.cards.findIndex((c) => c.id === id);
          if (idx >= 0) state.cards.splice(idx, 1);
        });
      },
      resetCardToSeed: (id) => {
        // non-master (UUID 由来) は seed lookup できないので no-op
        const original = getSeedCard(id);
        if (!original) return;
        set((state) => {
          const idx = state.cards.findIndex((c) => c.id === id);
          if (idx >= 0) {
            state.cards[idx] = resetCardToSeedValues(state.cards[idx], original);
          }
        });
      },

      addCurrency: (c) =>
        set((state) => {
          state.currencies.push({ ...c, id: newId() });
        }),
      updateCurrency: (id, patch) =>
        set((state) => {
          const idx = state.currencies.findIndex((c) => c.id === id);
          if (idx >= 0) Object.assign(state.currencies[idx], patch);
        }),
      removeCurrency: (id) =>
        set((state) => {
          state.currencies = state.currencies.filter((c) => c.id !== id);
          state.edges = state.edges.filter(
            (e) => e.fromCurrencyId !== id && e.toCurrencyId !== id,
          );
          // v4.0.0 ②: 削除された通貨が優先リストに残ると dangling になるので除外
          state.preferredCurrencyIds = state.preferredCurrencyIds.filter(
            (cid) => cid !== id,
          );
        }),

      addStore: (st) =>
        set((state) => {
          state.stores.push({ ...st, id: newId() });
        }),
      updateStore: (id, patch) =>
        set((state) => {
          const idx = state.stores.findIndex((s) => s.id === id);
          if (idx >= 0) Object.assign(state.stores[idx], patch);
        }),
      removeStore: (id) =>
        set((state) => {
          state.stores = state.stores.filter((st) => st.id !== id);
          state.loyaltyRules = state.loyaltyRules.filter(
            (r) => r.storeId !== id,
          );
        }),

      addEdge: (e) =>
        set((state) => {
          state.edges.push({ ...e, id: newId() });
        }),
      updateEdge: (id, patch) =>
        set((state) => {
          const idx = state.edges.findIndex((e) => e.id === id);
          if (idx >= 0) Object.assign(state.edges[idx], patch);
        }),
      removeEdge: (id) =>
        set((state) => {
          state.edges = state.edges.filter((e) => e.id !== id);
        }),

      addPointCard: (p) =>
        set((state) => {
          state.pointCards.push({ ...p, id: newId() });
        }),
      updatePointCard: (id, patch) =>
        set((state) => {
          const idx = state.pointCards.findIndex((p) => p.id === id);
          if (idx >= 0) Object.assign(state.pointCards[idx], patch);
        }),
      removePointCard: (id) =>
        set((state) => {
          state.pointCards = state.pointCards.filter((p) => p.id !== id);
          state.loyaltyRules = state.loyaltyRules.filter(
            (r) => r.pointCardId !== id,
          );
        }),
      movePointCard: (id, direction) =>
        set((state) => {
          const idx = state.pointCards.findIndex((p) => p.id === id);
          if (idx < 0) return;
          const next = direction === "up" ? idx - 1 : idx + 1;
          if (next < 0 || next >= state.pointCards.length) return;
          [state.pointCards[idx], state.pointCards[next]] = [
            state.pointCards[next],
            state.pointCards[idx],
          ];
        }),

      // v4.0.0 ②: 優先通貨リスト操作 (movePointCard と同じ並べ替えパターン)
      addPreferredCurrency: (currencyId) =>
        set((state) => {
          if (!state.preferredCurrencyIds.includes(currencyId)) {
            state.preferredCurrencyIds.push(currencyId);
          }
        }),
      removePreferredCurrency: (currencyId) =>
        set((state) => {
          state.preferredCurrencyIds = state.preferredCurrencyIds.filter(
            (id) => id !== currencyId,
          );
        }),
      movePreferredCurrency: (currencyId, direction) =>
        set((state) => {
          const idx = state.preferredCurrencyIds.indexOf(currencyId);
          if (idx < 0) return;
          const next = direction === "up" ? idx - 1 : idx + 1;
          if (next < 0 || next >= state.preferredCurrencyIds.length) return;
          [
            state.preferredCurrencyIds[idx],
            state.preferredCurrencyIds[next],
          ] = [
            state.preferredCurrencyIds[next],
            state.preferredCurrencyIds[idx],
          ];
        }),

      addLoyaltyRule: (r) =>
        set((state) => {
          state.loyaltyRules.push({ ...r, id: newId() });
        }),
      updateLoyaltyRule: (id, patch) =>
        set((state) => {
          const idx = state.loyaltyRules.findIndex((r) => r.id === id);
          if (idx >= 0) Object.assign(state.loyaltyRules[idx], patch);
        }),
      removeLoyaltyRule: (id) =>
        set((state) => {
          state.loyaltyRules = state.loyaltyRules.filter((r) => r.id !== id);
        }),

      addPaymentApp: (p) =>
        set((state) => {
          state.paymentApps.push({ ...p, id: newId() });
        }),
      updatePaymentApp: (id, patch) =>
        set((state) => {
          const idx = state.paymentApps.findIndex((p) => p.id === id);
          if (idx >= 0) {
            state.paymentApps[idx] = applyPaymentAppPatch(
              state.paymentApps[idx],
              patch,
              new Date(),
            );
          }
        }),
      removePaymentApp: (id) => {
        // マスター由来 PaymentApp は削除不可 (mergeFromSeed で復活するため意味がない)。
        // UI 側で削除ボタンも隠すが、ここでも防御する。
        if (isMasterPaymentApp(id)) return;
        set((state) => {
          state.paymentApps = state.paymentApps.filter((p) => p.id !== id);
        });
      },
      resetPaymentAppToSeed: (id) => {
        const original = getSeedPaymentApp(id);
        if (!original) return;
        set((state) => {
          const idx = state.paymentApps.findIndex((p) => p.id === id);
          if (idx >= 0) {
            state.paymentApps[idx] = resetPaymentAppToSeedValues(
              state.paymentApps[idx],
              original,
            );
          }
        });
      },

      clearAll: () =>
        set((state) => {
          Object.assign(state, empty);
        }),
      mergeFromSeed: () =>
        set((state) => {
          const result = mergeSeedFn(
            {
              cards: state.cards,
              currencies: state.currencies,
              stores: state.stores,
              edges: state.edges,
              pointCards: state.pointCards,
              loyaltyRules: state.loyaltyRules,
              paymentApps: state.paymentApps,
              programs: state.programs,
              memberships: state.memberships,
            },
            seed(),
          );
          state.cards = result.cards;
          state.currencies = result.currencies;
          state.stores = result.stores;
          state.edges = result.edges;
          state.pointCards = result.pointCards;
          state.loyaltyRules = result.loyaltyRules;
          state.paymentApps = result.paymentApps;
          state.programs = result.programs ?? [];
          state.memberships = result.memberships ?? [];
          state.lastSeedVersion = SEED_VERSION;
        }),
      applySeedUpdate: (overrideKeys) =>
        set((state) => {
          const currentShape = {
            cards: state.cards,
            currencies: state.currencies,
            stores: state.stores,
            edges: state.edges,
            pointCards: state.pointCards,
            loyaltyRules: state.loyaltyRules,
            paymentApps: state.paymentApps,
            programs: state.programs,
            memberships: state.memberships,
          };
          // 1. seed マージ: 追加 (add-only) + 公式由来・未編集 program の
          //    内容更新伝播 + tombstone (REMOVED_PROGRAM_IDS) 削除 (Phase 5)
          const merged = mergeSeedFn(currentShape, seed(), {
            removedProgramIds: REMOVED_PROGRAM_IDS,
          });

          // 2. マイグレーション計画 (現在の state + 追加後で再計算)
          const plan = planMigrations(
            merged,
            state.lastSeedVersion,
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

          state.cards = finalState.cards;
          state.currencies = finalState.currencies;
          state.stores = finalState.stores;
          state.edges = finalState.edges;
          state.pointCards = finalState.pointCards;
          state.loyaltyRules = finalState.loyaltyRules;
          state.paymentApps = finalState.paymentApps;
          state.programs = merged.programs ?? [];
          state.memberships = merged.memberships ?? [];
          state.lastSeedVersion = SEED_VERSION;
        }),
      dismissSeedUpdate: () =>
        set((state) => {
          state.lastSeedVersion = SEED_VERSION;
        }),

      applySchemaMigration: () =>
        set((state) => {
          Object.assign(state, empty, seed());
          state.lastSeedVersion = SEED_VERSION;
          state._pendingSchemaMigration = undefined;
          state._legacyPersistedState = undefined;
        }),

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

      setSyncUrl: (url) =>
        set((state) => {
          state.syncUrl = url.trim();
        }),

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
          const parsed = JSON.parse(text);
          const result = validateImportData(parsed);
          if (!result.ok) return { ok: false, error: result.error };
          const data = result.value;
          set((state) => {
            // v6.0.1: 全置換だが「使う/使わない」(enabled) と userModifiedAt は id マッチで
            // ローカル保持 (取込側がキーを持たない＝公式 master のときのみ)。
            state.cards = preservePreferences(data.cards, state.cards, [
              "enabled",
              "userModifiedAt",
            ]);
            state.currencies = data.currencies;
            state.stores = data.stores;
            state.edges = data.edges;
            state.pointCards = preservePreferences(
              data.pointCards ?? [],
              state.pointCards,
              ["enabled"],
            );
            state.loyaltyRules = data.loyaltyRules ?? [];
            state.paymentApps = preservePreferences(
              data.paymentApps ?? [],
              state.paymentApps,
              ["enabled", "userModifiedAt"],
            );
            // 公式 master は全置換 (欠落欄は空配列)。
            state.programs = data.programs ?? [];
            state.memberships = data.memberships ?? [];
            state.lastSyncAt = new Date().toISOString();
          });
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
            // v6.x: 以前は programs / memberships を含めず、export→import で
            // カスタム / 同期済みプログラムが復元されなかった。全データのスナップショットにする。
            programs: s.programs,
            memberships: s.memberships,
          },
          null,
          2,
        );
      },
      importJson: (json) => {
        try {
          const parsed = JSON.parse(json);
          const result = validateImportData(parsed);
          if (!result.ok) return { ok: false, error: result.error };
          const data = result.value;
          set((state) => {
            // v6.0.1: syncFromUrl と同じく enabled / userModifiedAt を id マッチで保持
            state.cards = preservePreferences(data.cards, state.cards, [
              "enabled",
              "userModifiedAt",
            ]);
            state.currencies = data.currencies;
            state.stores = data.stores;
            state.edges = data.edges;
            state.pointCards = preservePreferences(
              data.pointCards ?? [],
              state.pointCards,
              ["enabled"],
            );
            state.loyaltyRules = data.loyaltyRules ?? [];
            state.paymentApps = preservePreferences(
              data.paymentApps ?? [],
              state.paymentApps,
              ["enabled", "userModifiedAt"],
            );
            // programs / memberships は preserve-on-missing (旧フォーマット import で
            // 同期済みデータを消さない。syncFromUrl は公式 master 全置換なので [] 既定)。
            if (data.programs) state.programs = data.programs;
            if (data.memberships) state.memberships = data.memberships;
          });
          return { ok: true };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "解析エラー",
          };
        }
      },
    })),
    {
      // v0.8 で世代交代。旧キー "pointmax-store" は無視 (孤児は起動時に削除)
      name: "pointmax-v08-store",
      storage: createJSONStorage(() => localStorage),
      version: PERSIST_SCHEMA_VERSION,  // 4 → 5 (v5.0.0 で V4 未満を reset 化 + entryUrl 追加)
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
              reason: `不明な旧 schema (v${fromVersion}) を検出しました。V5 環境にリセットします。`,
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
