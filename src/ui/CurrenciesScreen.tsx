import { useState } from "react";
import { useStore } from "../state/store";
import { KIND_OPTIONS, styleOf } from "../domain/currencyKind";
import type { Currency, CurrencyKind } from "../domain/types";
import { CurrencyIcon } from "./CurrencyIcon";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";

export function CurrenciesScreen() {
  const currencies = useStore((s) => s.currencies);
  const addCurrency = useStore((s) => s.addCurrency);
  const updateCurrency = useStore((s) => s.updateCurrency);
  const removeCurrency = useStore((s) => s.removeCurrency);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CurrencyKind | "">("point");
  const [iconChar, setIconChar] = useState("");
  const [iconColor, setIconColor] = useState("#4ea1ff");

  const columns: ColumnDef<Currency>[] = [
    {
      key: "icon",
      label: "アイコン",
      view: (c) => <CurrencyIcon currency={c} size={32} />,
    },
    {
      key: "name",
      label: "名前",
      view: (c) => c.name,
      edit: (c, set) => (
        <input value={c.name} onChange={(e) => set({ name: e.target.value })} />
      ),
    },
    {
      key: "kind",
      label: "種別",
      view: (c) => {
        const style = styleOf(c.kind);
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: style.border,
                display: "inline-block",
              }}
            />
            {style.label}
          </span>
        );
      },
      edit: (c, set) => (
        <select
          value={c.kind ?? ""}
          onChange={(e) =>
            set({ kind: (e.target.value as CurrencyKind | "") || undefined })
          }
        >
          <option value="">種別なし</option>
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "iconChar",
      label: "アイコン文字",
      view: (c) => c.iconChar ?? c.name.charAt(0),
      edit: (c, set) => (
        <input
          value={c.iconChar ?? ""}
          placeholder={c.name.charAt(0)}
          onChange={(e) =>
            set({ iconChar: e.target.value || undefined })
          }
          style={{ width: 100 }}
        />
      ),
    },
    {
      key: "iconColor",
      label: "色",
      view: (c) => (
        <span
          style={{
            display: "inline-block",
            width: 22,
            height: 22,
            borderRadius: 4,
            background: c.iconColor ?? "transparent",
            border: "1px solid var(--border)",
          }}
        />
      ),
      edit: (c, set) => (
        <input
          type="color"
          value={c.iconColor ?? "#4ea1ff"}
          onChange={(e) => set({ iconColor: e.target.value })}
          style={{ width: 50, padding: 2 }}
        />
      ),
    },
  ];

  return (
    <section>
      <h2>通貨／ポイント種別</h2>
      <p className="hint">
        貯まるポイントの種類とマイルを登録します。「種別」は色分け用、「アイコン文字／色」はノード表示用です。
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addCurrency({
            name: name.trim(),
            kind: kind || undefined,
            iconChar: iconChar.trim() || undefined,
            iconColor: iconColor || undefined,
          });
          setName("");
          setKind("point");
          setIconChar("");
          setIconColor("#4ea1ff");
        }}
      >
        <input
          placeholder="通貨名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CurrencyKind | "")}
        >
          <option value="">種別なし</option>
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          placeholder="アイコン文字 (例: R)"
          value={iconChar}
          onChange={(e) => setIconChar(e.target.value)}
          style={{ width: 110 }}
        />
        <input
          type="color"
          value={iconColor}
          onChange={(e) => setIconColor(e.target.value)}
          style={{ width: 40, padding: 2 }}
          title="アイコン背景色"
        />
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={currencies}
        columns={columns}
        onSave={(id, patch) => updateCurrency(id, patch)}
        onDelete={removeCurrency}
      />
    </section>
  );
}
