import { useState } from "react";
import { useStore } from "../state/store";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import type { Card } from "../domain/types";

export function CardsScreen() {
  const cards = useStore((s) => s.cards);
  const currencies = useStore((s) => s.currencies);
  const addCard = useStore((s) => s.addCard);
  const updateCard = useStore((s) => s.updateCard);
  const removeCard = useStore((s) => s.removeCard);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [rate, setRate] = useState("0.01");
  const [currencyId, setCurrencyId] = useState("");

  const currencyName = (id: string) =>
    currencies.find((c) => c.id === id)?.name ?? id;

  const columns: ColumnDef<Card>[] = [
    {
      key: "name",
      label: "カード名",
      view: (c) => c.name,
      edit: (c, set) => (
        <input
          value={c.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      ),
    },
    {
      key: "grade",
      label: "グレード",
      view: (c) => c.grade ?? "-",
      edit: (c, set) => (
        <input
          placeholder="(任意)"
          value={c.grade ?? ""}
          onChange={(e) => set({ grade: e.target.value || undefined })}
        />
      ),
    },
    {
      key: "rate",
      label: "基本還元率",
      view: (c) => `${(c.defaultRate * 100).toFixed(2)}%`,
      edit: (c, set) => (
        <input
          type="number"
          step="0.001"
          min="0"
          value={c.defaultRate}
          onChange={(e) => set({ defaultRate: Number(e.target.value) })}
        />
      ),
    },
    {
      key: "currency",
      label: "貯まる通貨",
      view: (c) => currencyName(c.defaultCurrencyId),
      edit: (c, set) => (
        <select
          value={c.defaultCurrencyId}
          onChange={(e) => set({ defaultCurrencyId: e.target.value })}
        >
          {currencies.map((cur) => (
            <option key={cur.id} value={cur.id}>
              {cur.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "enabled",
      label: "使う",
      width: 90,
      // view モードでも編集を挟まず即トグルできるようにする。
      // 単一 boolean は「編集→保存」より直接クリックの方が UX が良い。
      view: (c) => {
        const on = c.enabled !== false;
        return (
          <label
            className={`card-enabled-toggle ${on ? "is-on" : "is-off"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={(e) =>
                updateCard(c.id, {
                  enabled: e.target.checked ? undefined : false,
                })
              }
            />
            <span>{on ? "使う" : "OFF"}</span>
          </label>
        );
      },
      edit: (c, set) => {
        const on = c.enabled !== false;
        return (
          <label className={`card-enabled-toggle ${on ? "is-on" : "is-off"}`}>
            <input
              type="checkbox"
              checked={on}
              onChange={(e) =>
                set({ enabled: e.target.checked ? undefined : false })
              }
            />
            <span>{on ? "使う" : "OFF"}</span>
          </label>
        );
      },
    },
  ];

  return (
    <section>
      <h2>保有クレジットカード</h2>
      <p className="hint">
        通常時の還元率と貯まる通貨を登録します。同シリーズで還元率が違うグレード（普通／ゴールド／プラチナ等）はグレード欄に明記してください。店舗別の上書きはルール画面で設定します。
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !currencyId) return;
          addCard({
            name: name.trim(),
            grade: grade.trim() || undefined,
            defaultRate: Number(rate),
            defaultCurrencyId: currencyId,
          });
          setName("");
          setGrade("");
          setRate("0.01");
          setCurrencyId("");
        }}
      >
        <input
          placeholder="カード名 (例: JALカードSuica)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="グレード (例: CLUB-Aゴールド / 任意)"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
        <input
          type="number"
          step="0.001"
          min="0"
          placeholder="0.01 (=1%)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <select
          value={currencyId}
          onChange={(e) => setCurrencyId(e.target.value)}
        >
          <option value="">貯まる通貨を選択</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={cards}
        columns={columns}
        onSave={(id, patch) => updateCard(id, patch)}
        onDelete={removeCard}
        empty="まだありません"
      />
    </section>
  );
}
