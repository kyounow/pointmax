import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { KIND_OPTIONS, styleOf } from "../domain/currencyKind";
import { formatNum } from "../domain/formatNum";
import { effectiveYenValue } from "../domain/yenValue";
import type { Currency, CurrencyKind } from "../domain/types";
import { CurrencyIcon } from "./CurrencyIcon";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";

// PR-5a: 円換算目安の上書き編集セル。ローカル入力 state を持ち、確定値を store へ即時反映する
// (空欄 = 上書き解除で seed 目安値に戻す)。ResponsiveTable の 保存/キャンセル とは独立した
// user-owned な設定なので、編集モード中でも即反映する (行の他フィールドとは別ライフサイクル)。
function YenOverrideEditor({
  seedYen,
  override,
  onSet,
}: {
  seedYen?: number;
  override?: number;
  onSet: (value?: number) => void;
}) {
  const [text, setText] = useState(override != null ? String(override) : "");
  const commit = (raw: string) => {
    setText(raw);
    const t = raw.trim();
    if (t === "") {
      onSet(undefined); // 空欄 = 上書き解除 (seed 目安値に戻す)
      return;
    }
    const n = Number(t);
    if (Number.isFinite(n) && n > 0) onSet(n);
    // 入力途中 (非数値等) は commit しない (テキストは保持)
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      ≈{" "}
      <input
        type="text"
        inputMode="decimal"
        aria-label="円換算の目安値 (自分の値)"
        value={text}
        placeholder={seedYen != null ? String(seedYen) : "未設定"}
        onChange={(e) => commit(e.target.value)}
        style={{ width: 72 }}
      />{" "}
      円
      <small className="hint" style={{ marginLeft: 4 }}>
        空欄で目安値に戻す
      </small>
    </span>
  );
}

export function CurrenciesScreen() {
  // Wave 5 B-1: 8 個別 subscribe → 単一 useShallow に集約
  const {
    currencies,
    addCurrency,
    updateCurrency,
    removeCurrency,
    preferredCurrencyIds,
    addPreferredCurrency,
    removePreferredCurrency,
    movePreferredCurrency,
    yenValueOverrides,
    setYenValueOverride,
  } = useStore(
    useShallow((s) => ({
      currencies: s.currencies,
      addCurrency: s.addCurrency,
      updateCurrency: s.updateCurrency,
      removeCurrency: s.removeCurrency,
      preferredCurrencyIds: s.preferredCurrencyIds,
      addPreferredCurrency: s.addPreferredCurrency,
      removePreferredCurrency: s.removePreferredCurrency,
      movePreferredCurrency: s.movePreferredCurrency,
      yenValueOverrides: s.yenValueOverrides,
      setYenValueOverride: s.setYenValueOverride,
    })),
  );
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CurrencyKind | "">("point");
  const [iconChar, setIconChar] = useState("");
  const [iconColor, setIconColor] = useState("#4ea1ff");

  const currencyById = new Map(currencies.map((c) => [c.id, c]));
  // 優先リストに入っている通貨 (順序保持)
  const preferred = preferredCurrencyIds
    .map((id) => currencyById.get(id))
    .filter((c): c is Currency => c != null);
  // まだ優先リストに無い通貨 (追加 select 用)
  const notPreferred = currencies.filter(
    (c) => !preferredCurrencyIds.includes(c.id),
  );

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
      // PR-5a: 円換算目安 (1 単位 ≒ 円)。seed 値 + ユーザー上書き。編集で override を設定/クリア。
      key: "yenValue",
      label: "1pt≒円 (目安)",
      view: (c) => {
        const ov = yenValueOverrides[c.id];
        const eff = effectiveYenValue(c.id, currencyById, yenValueOverrides);
        if (eff === undefined) {
          return (
            <span className="hint" title="円換算の目安値が未設定です">
              —
            </span>
          );
        }
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            ≈ {formatNum(eff)} 円
            {ov != null && (
              <small className="hint" title="あなたが設定した円換算値です">
                (自分の値)
              </small>
            )}
          </span>
        );
      },
      edit: (c) => (
        <YenOverrideEditor
          seedYen={c.yenValue}
          override={yenValueOverrides[c.id]}
          onSet={(v) => setYenValueOverride(c.id, v)}
        />
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
      <p className="hint" style={{ marginTop: 0 }}>
        「1pt≒円 (目安)」は計算の<strong>円換算タブ</strong>で使う 1 単位あたりの目安価値です。
        マイル等の価値は使い方で変わります。編集で<strong>自分の換算値</strong>を設定すると
        円換算タブに反映されます (空欄で目安値に戻ります)。
      </p>

      {/* ─── v4.0.0 ②: 優先通貨リスト ───
          ここで設定した順序が Calculator の通貨タブ並び順になる。 */}
      <div className="preferred-currencies" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 6 }}>⭐ 優先通貨 (計算結果の表示順)</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          普段「最終的に貯めたい通貨」を選んで並べると、計算画面でこの順に
          タブ表示されます。上位ほど優先 (先頭タブが既定)。
        </p>

        {preferred.length === 0 ? (
          <p className="hint" style={{ fontSize: 13 }}>
            まだ優先通貨が未設定です。下から追加してください。
            (未設定の場合、計算画面では通貨を都度選びます)
          </p>
        ) : (
          <ol className="preferred-currency-list" style={{ paddingLeft: 0, listStyle: "none", margin: "8px 0" }}>
            {preferred.map((c, i) => (
              <li
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    width: 22,
                    textAlign: "right",
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  {i + 1}.
                </span>
                <CurrencyIcon currency={c} size={26} />
                <span style={{ flex: 1 }}>{c.name}</span>
                <button
                  onClick={() => movePreferredCurrency(c.id, "up")}
                  disabled={i === 0}
                  title="優先度を上げる"
                  style={{ fontSize: 12 }}
                >
                  ↑
                </button>
                <button
                  onClick={() => movePreferredCurrency(c.id, "down")}
                  disabled={i === preferred.length - 1}
                  title="優先度を下げる"
                  style={{ fontSize: 12 }}
                >
                  ↓
                </button>
                <button
                  className="danger"
                  onClick={() => removePreferredCurrency(c.id)}
                  title="優先通貨から外す"
                  style={{ fontSize: 12 }}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}

        {notPreferred.length > 0 && (
          <label style={{ fontSize: 13, color: "var(--muted)" }}>
            追加:{" "}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) addPreferredCurrency(e.target.value);
              }}
            >
              <option value="">通貨を選択して追加</option>
              {notPreferred.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

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
