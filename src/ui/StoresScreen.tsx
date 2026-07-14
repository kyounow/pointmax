import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import type { Store } from "../domain/types";

export function StoresScreen() {
  // Wave 5 B-1: 5 個別 subscribe → 単一 useShallow
  const { stores, pointCards, addStore, updateStore, removeStore } = useStore(
    useShallow((s) => ({
      stores: s.stores,
      pointCards: s.pointCards,
      addStore: s.addStore,
      updateStore: s.updateStore,
      removeStore: s.removeStore,
    })),
  );

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(""); // "" = 全カテゴリ

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stores) {
      const c = s.category ?? "(未分類)";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [stores]);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter((s) => {
      if (categoryFilter) {
        const cat = s.category ?? "(未分類)";
        if (cat !== categoryFilter) return false;
      }
      if (q) {
        const inName = s.name.toLowerCase().includes(q);
        const inCat = (s.category ?? "").toLowerCase().includes(q);
        if (!inName && !inCat) return false;
      }
      return true;
    });
  }, [stores, search, categoryFilter]);

  const columns: ColumnDef<Store>[] = [
    {
      key: "name",
      label: "店舗名",
      view: (s) => s.name,
      edit: (s, set) => (
        <input value={s.name} onChange={(e) => set({ name: e.target.value })} />
      ),
    },
    {
      key: "category",
      label: "カテゴリ",
      view: (s) => s.category ?? "-",
      edit: (s, set) => (
        <input
          value={s.category ?? ""}
          onChange={(e) => set({ category: e.target.value || undefined })}
        />
      ),
    },
    {
      key: "preferred",
      label: "優先提示カード",
      view: (s) => {
        const ids = s.preferredPointCardIds ?? [];
        if (ids.length === 0) return "-";
        return ids
          .map((id) => pointCards.find((p) => p.id === id)?.name ?? id)
          .join(", ");
      },
      edit: (s, set) => (
        <select
          value={(s.preferredPointCardIds ?? [])[0] ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            set({
              preferredPointCardIds: v ? [v] : undefined,
            });
          }}
        >
          <option value="">指定なし</option>
          {pointCards.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "stacks",
      label: "同時提示数",
      view: (s) => s.maxLoyaltyStacks ?? 1,
      edit: (s, set) => (
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="5"
          step="1"
          placeholder="1"
          value={s.maxLoyaltyStacks ?? ""}
          onChange={(e) =>
            set({
              maxLoyaltyStacks:
                e.target.value === ""
                  ? undefined
                  : Math.max(0, Number(e.target.value)),
            })
          }
          style={{ width: 80 }}
        />
      ),
    },
  ];

  return (
    <section>
      <h2>店舗</h2>
      <p className="hint">
        計算画面のプルダウンに出る店舗一覧です。「(その他)」を1つ用意しておくと自由入力的に使えます。
        ポイントカード提示が複数枚できる店舗（紀伊國屋等）は「同時提示数」を2以上に設定。
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addStore({
            name: name.trim(),
            category: category.trim() || undefined,
          });
          setName("");
          setCategory("");
        }}
      >
        <input
          placeholder="店舗名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="カテゴリ (任意)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <button type="submit">追加</button>
      </form>

      <div className="row" style={{ marginTop: 8 }}>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="カテゴリで絞り込み"
          title="カテゴリで絞り込み"
        >
          <option value="">全カテゴリ ({stores.length})</option>
          {categoryOptions.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="店舗を絞り込み (名前/カテゴリ)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
          aria-label="店舗を絞り込み検索"
        />
        {(search || categoryFilter) && (
          <small className="hint" style={{ alignSelf: "center" }}>
            {filteredStores.length} / {stores.length} 件
          </small>
        )}
      </div>

      <ResponsiveTable
        rows={filteredStores}
        columns={columns}
        onSave={(id, patch) => updateStore(id, patch)}
        onDelete={removeStore}
      />
    </section>
  );
}
