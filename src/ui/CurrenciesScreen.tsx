import { useState } from "react";
import { useStore } from "../state/store";
import { KIND_OPTIONS, styleOf } from "../domain/currencyKind";
import type { CurrencyKind } from "../domain/types";
import { CurrencyIcon } from "./CurrencyIcon";

export function CurrenciesScreen() {
  const currencies = useStore((s) => s.currencies);
  const addCurrency = useStore((s) => s.addCurrency);
  const updateCurrency = useStore((s) => s.updateCurrency);
  const removeCurrency = useStore((s) => s.removeCurrency);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CurrencyKind | "">("point");
  const [iconChar, setIconChar] = useState("");
  const [iconColor, setIconColor] = useState("#4ea1ff");

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

      <table>
        <thead>
          <tr>
            <th style={{ width: 44 }}></th>
            <th>名前</th>
            <th>種別</th>
            <th>アイコン文字</th>
            <th>色</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((c) => {
            const style = styleOf(c.kind);
            return (
              <tr key={c.id}>
                <td>
                  <CurrencyIcon currency={c} size={32} />
                </td>
                <td>
                  <input
                    value={c.name}
                    onChange={(e) =>
                      updateCurrency(c.id, { name: e.target.value })
                    }
                  />
                </td>
                <td>
                  <select
                    value={c.kind ?? ""}
                    onChange={(e) =>
                      updateCurrency(c.id, {
                        kind:
                          (e.target.value as CurrencyKind | "") || undefined,
                      })
                    }
                    style={{
                      borderLeft: `4px solid ${style.border}`,
                    }}
                  >
                    <option value="">種別なし</option>
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    value={c.iconChar ?? ""}
                    placeholder={c.name.charAt(0)}
                    onChange={(e) =>
                      updateCurrency(c.id, {
                        iconChar: e.target.value || undefined,
                      })
                    }
                    style={{ width: 80 }}
                  />
                </td>
                <td>
                  <input
                    type="color"
                    value={c.iconColor ?? "#4ea1ff"}
                    onChange={(e) =>
                      updateCurrency(c.id, { iconColor: e.target.value })
                    }
                    style={{ width: 40, padding: 2 }}
                  />
                </td>
                <td>
                  <button
                    className="danger"
                    onClick={() => removeCurrency(c.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
          {currencies.length === 0 && (
            <tr>
              <td colSpan={6} className="empty">
                まだありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
