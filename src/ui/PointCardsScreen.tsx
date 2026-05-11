import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { CurrencyIcon } from "./CurrencyIcon";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import type { LoyaltyRule, PointCard } from "../domain/types";
import { groupBy } from "../domain/groupBy";

export function PointCardsScreen() {
  const pointCards = useStore((s) => s.pointCards);
  const currencies = useStore((s) => s.currencies);
  const stores = useStore((s) => s.stores);
  const loyaltyRules = useStore((s) => s.loyaltyRules);
  const addPointCard = useStore((s) => s.addPointCard);
  const updatePointCard = useStore((s) => s.updatePointCard);
  const removePointCard = useStore((s) => s.removePointCard);
  const movePointCard = useStore((s) => s.movePointCard);
  const addLoyaltyRule = useStore((s) => s.addLoyaltyRule);
  const updateLoyaltyRule = useStore((s) => s.updateLoyaltyRule);
  const removeLoyaltyRule = useStore((s) => s.removeLoyaltyRule);

  const [pcName, setPcName] = useState("");
  const [pcCurrency, setPcCurrency] = useState("");

  const [lrPointCard, setLrPointCard] = useState("");
  const [lrStore, setLrStore] = useState("");
  const [lrRate, setLrRate] = useState("0.005");
  const [lrNotes, setLrNotes] = useState("");

  const currencyById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );
  const pointCardById = useMemo(
    () => new Map(pointCards.map((p) => [p.id, p])),
    [pointCards],
  );
  const storeById = useMemo(
    () => new Map(stores.map((s) => [s.id, s])),
    [stores],
  );
  const storesByCategory = useMemo(
    () => groupBy(stores, (s) => s.category ?? "その他"),
    [stores],
  );

  const pointCardColumns: ColumnDef<PointCard>[] = [
    {
      key: "icon",
      label: "アイコン",
      view: (p) => {
        const cur = currencyById.get(p.currencyId);
        return cur ? <CurrencyIcon currency={cur} size={28} /> : null;
      },
    },
    {
      key: "name",
      label: "名前",
      view: (p) => p.name,
      edit: (p, set) => (
        <input value={p.name} onChange={(e) => set({ name: e.target.value })} />
      ),
    },
    {
      key: "currency",
      label: "貯まる通貨",
      view: (p) => currencyById.get(p.currencyId)?.name ?? "?",
      edit: (p, set) => (
        <select
          value={p.currencyId}
          onChange={(e) => set({ currencyId: e.target.value })}
        >
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ),
    },
  ];

  const loyaltyColumns: ColumnDef<LoyaltyRule>[] = [
    {
      key: "pointCard",
      label: "ポイントカード",
      view: (r) => pointCardById.get(r.pointCardId)?.name ?? "?",
    },
    {
      key: "store",
      label: "店舗",
      view: (r) => storeById.get(r.storeId)?.name ?? "?",
    },
    {
      key: "rate",
      label: "還元率",
      view: (r) => `${(r.rate * 100).toFixed(2)}%`,
      edit: (r, set) => (
        <input
          type="number"
          step="0.001"
          min="0"
          value={r.rate}
          onChange={(e) => set({ rate: Number(e.target.value) })}
          style={{ width: 100 }}
        />
      ),
    },
    {
      key: "notes",
      label: "メモ",
      view: (r) => r.notes ?? "-",
      edit: (r, set) => (
        <input
          value={r.notes ?? ""}
          onChange={(e) => set({ notes: e.target.value || undefined })}
        />
      ),
    },
  ];

  return (
    <section>
      <h2>ポイントカード（二重取り用）</h2>
      <p className="hint">
        クレカ決済の還元と<strong>別軸</strong>で、店頭提示で貯まるポイントカード。計算画面で「ポイントカード併用ボーナス」として表示されます。
      </p>

      <h3 style={{ marginTop: 8 }}>保有しているポイントカード</h3>
      <p className="hint" style={{ marginBottom: 6 }}>
        並び順 = 優先順位（上ほど優先）。同点還元の店舗で複数カードが対象になった時、上のカードが採用されます。
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pcName.trim() || !pcCurrency) return;
          addPointCard({
            name: pcName.trim(),
            currencyId: pcCurrency,
          });
          setPcName("");
          setPcCurrency("");
        }}
      >
        <input
          placeholder="ポイントカード名 (例: dポイントカード)"
          value={pcName}
          onChange={(e) => setPcName(e.target.value)}
        />
        <select
          value={pcCurrency}
          onChange={(e) => setPcCurrency(e.target.value)}
        >
          <option value="">貯まる通貨</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={pointCards}
        columns={pointCardColumns}
        onSave={(id, patch) => updatePointCard(id, patch)}
        onDelete={removePointCard}
        extraActions={(p) => {
          const i = pointCards.findIndex((x) => x.id === p.id);
          return (
            <>
              <button
                onClick={() => movePointCard(p.id, "up")}
                disabled={i === 0}
                title="優先度を上げる"
              >
                ↑
              </button>
              <button
                onClick={() => movePointCard(p.id, "down")}
                disabled={i === pointCards.length - 1}
                title="優先度を下げる"
              >
                ↓
              </button>
            </>
          );
        }}
        testId="point-cards"
      />

      <h3 style={{ marginTop: 24 }}>店舗 × ポイントカード 提示還元ルール</h3>
      <p className="hint">
        例: ローソンでdポイントカード提示 → 200円ごとに1ptなど。クレカ決済とは別途加算されます。
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!lrPointCard || !lrStore) return;
          addLoyaltyRule({
            storeId: lrStore,
            pointCardId: lrPointCard,
            rate: Number(lrRate),
            notes: lrNotes.trim() || undefined,
          });
          setLrPointCard("");
          setLrStore("");
          setLrRate("0.005");
          setLrNotes("");
        }}
      >
        <select
          value={lrPointCard}
          onChange={(e) => setLrPointCard(e.target.value)}
        >
          <option value="">ポイントカード</option>
          {pointCards.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={lrStore} onChange={(e) => setLrStore(e.target.value)}>
          <option value="">店舗</option>
          {storesByCategory.map((g) => (
            <optgroup key={g.key} label={g.key}>
              {g.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <input
          type="number"
          step="0.001"
          min="0"
          placeholder="0.005 (=0.5%)"
          value={lrRate}
          onChange={(e) => setLrRate(e.target.value)}
        />
        <input
          placeholder="メモ (任意)"
          value={lrNotes}
          onChange={(e) => setLrNotes(e.target.value)}
        />
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={loyaltyRules}
        columns={loyaltyColumns}
        onSave={(id, patch) => updateLoyaltyRule(id, patch)}
        onDelete={removeLoyaltyRule}
        testId="loyalty-rules"
      />
    </section>
  );
}
