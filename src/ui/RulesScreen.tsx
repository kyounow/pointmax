import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { cardLabel } from "../domain/cardLabel";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import type { StoreRule } from "../domain/types";

type RuleType = "store" | "category";

export function RulesScreen() {
  const cards = useStore((s) => s.cards);
  const stores = useStore((s) => s.stores);
  const currencies = useStore((s) => s.currencies);
  const rules = useStore((s) => s.rules);
  const addRule = useStore((s) => s.addRule);
  const updateRule = useStore((s) => s.updateRule);
  const removeRule = useStore((s) => s.removeRule);

  const [ruleType, setRuleType] = useState<RuleType>("store");
  const [cardId, setCardId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [rate, setRate] = useState("0.02");
  const [currencyId, setCurrencyId] = useState("");
  const [monthlyCap, setMonthlyCap] = useState("");
  const [notes, setNotes] = useState("");

  const cardName = (id: string) => {
    const c = cards.find((c) => c.id === id);
    return c ? cardLabel(c) : "?";
  };
  const storeName = (id: string) =>
    stores.find((s) => s.id === id)?.name ?? "?";
  const currencyName = (id: string) =>
    currencies.find((c) => c.id === id)?.name ?? "?";

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) if (s.category) set.add(s.category);
    return Array.from(set).sort();
  }, [stores]);

  const paymentMethodOptions = useMemo(() => {
    const set = new Set<string>([
      "Visaタッチ",
      "QUICPay",
      "iD",
      "スマホタッチ",
      "楽天ペイ",
      "PayPay",
      "d払い",
    ]);
    for (const r of rules) if (r.paymentMethod) set.add(r.paymentMethod);
    return Array.from(set).sort();
  }, [rules]);

  const ruleColumns: ColumnDef<StoreRule>[] = [
    {
      key: "type",
      label: "種別",
      view: (r) => {
        const isCat = !r.storeId && !!r.category;
        return (
          <span
            className="badge"
            style={{ background: isCat ? "#7c3aed" : "#3a86ff" }}
          >
            {isCat ? "カテゴリ" : "店舗"}
          </span>
        );
      },
    },
    {
      key: "card",
      label: "カード",
      view: (r) => cardName(r.cardId),
    },
    {
      key: "target",
      label: "対象",
      view: (r) => {
        const isCat = !r.storeId && !!r.category;
        return isCat ? `[カテゴリ] ${r.category}` : storeName(r.storeId ?? "");
      },
      edit: (r, set) => {
        const isCat = !r.storeId && !!r.category;
        return isCat ? (
          <input
            list="rules-category-list-edit"
            value={r.category ?? ""}
            onChange={(e) => set({ category: e.target.value })}
          />
        ) : (
          <span>{storeName(r.storeId ?? "")}</span>
        );
      },
    },
    {
      key: "paymentMethod",
      label: "支払方法",
      view: (r) => r.paymentMethod ?? "-",
      edit: (r, set) => (
        <input
          list="rules-payment-methods"
          value={r.paymentMethod ?? ""}
          placeholder="-"
          onChange={(e) =>
            set({ paymentMethod: e.target.value || undefined })
          }
          style={{ width: 110 }}
        />
      ),
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
        />
      ),
    },
    {
      key: "currency",
      label: "貯まる通貨",
      view: (r) => currencyName(r.currencyId),
      edit: (r, set) => (
        <select
          value={r.currencyId}
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
    {
      key: "cap",
      label: "月上限",
      view: (r) =>
        r.monthlyCapAmountYen
          ? `${r.monthlyCapAmountYen.toLocaleString()}円`
          : "-",
      edit: (r, set) => (
        <input
          type="number"
          min="0"
          step="10000"
          placeholder="-"
          value={r.monthlyCapAmountYen ?? ""}
          onChange={(e) =>
            set({
              monthlyCapAmountYen: e.target.value
                ? Math.max(0, Number(e.target.value))
                : undefined,
            })
          }
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
      <h2>店舗ルール</h2>
      <p className="hint">
        特定の店舗・カテゴリで還元率や貯まる通貨が変わる場合に登録します。
        <br />
        優先順位: <strong>直接ルール（店舗指定）</strong> ＞{" "}
        <strong>カテゴリルール</strong> ＞ カードのデフォルト還元率
      </p>

      <div
        className="row"
        style={{ alignItems: "center", marginBottom: 4, gap: 12 }}
      >
        <label style={{ display: "inline-flex", gap: 4 }}>
          <input
            type="radio"
            name="ruleType"
            checked={ruleType === "store"}
            onChange={() => setRuleType("store")}
          />
          店舗指定
        </label>
        <label style={{ display: "inline-flex", gap: 4 }}>
          <input
            type="radio"
            name="ruleType"
            checked={ruleType === "category"}
            onChange={() => setRuleType("category")}
          />
          カテゴリ指定
        </label>
      </div>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!cardId || !currencyId) return;
          const pm = paymentMethod.trim();
          const cap = monthlyCap.trim()
            ? Math.max(0, Number(monthlyCap))
            : undefined;
          const common = {
            cardId,
            rate: Number(rate),
            currencyId,
            notes: notes.trim() || undefined,
            paymentMethod: pm || undefined,
            monthlyCapAmountYen: cap,
          };
          if (ruleType === "store") {
            if (!storeId) return;
            addRule({ ...common, storeId });
          } else {
            if (!category.trim()) return;
            addRule({ ...common, category: category.trim() });
          }
          setCardId("");
          setStoreId("");
          setCategory("");
          setPaymentMethod("");
          setRate("0.02");
          setCurrencyId("");
          setMonthlyCap("");
          setNotes("");
        }}
      >
        <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
          <option value="">カード</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {cardLabel(c)}
            </option>
          ))}
        </select>
        {ruleType === "store" ? (
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">店舗</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            list="rules-category-list"
            placeholder="カテゴリ (例: コンビニ)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        )}
        <datalist id="rules-category-list">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          type="number"
          step="0.001"
          min="0"
          placeholder="0.02"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <select
          value={currencyId}
          onChange={(e) => setCurrencyId(e.target.value)}
        >
          <option value="">貯まる通貨</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          list="rules-payment-methods"
          placeholder="支払い方法 (任意)"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={{ width: 130 }}
        />
        <datalist id="rules-payment-methods">
          {paymentMethodOptions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <input
          type="number"
          min="0"
          step="10000"
          placeholder="月上限円 (任意)"
          value={monthlyCap}
          onChange={(e) => setMonthlyCap(e.target.value)}
          style={{ width: 120 }}
          title="月間/年間の上限金額（情報表示のみ）"
        />
        <input
          placeholder="メモ (任意)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={rules}
        columns={ruleColumns}
        onSave={(id, patch) => updateRule(id, patch)}
        onDelete={removeRule}
        empty="まだありません（無いカード×店舗はカードのデフォルトが使われます）"
      />
      <datalist id="rules-category-list-edit">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <details>
        <summary>適用ルールの確認（カード×店舗）</summary>
        <p className="hint">
          現在登録されている全カード × 全店舗の組合せで、何が適用されるかをプレビュー：
        </p>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>カード</th>
                <th>店舗</th>
                <th>還元率</th>
                <th>貯まる通貨</th>
                <th>由来</th>
              </tr>
            </thead>
            <tbody>
              {cards.flatMap((c) =>
                stores.map((s) => {
                  const direct = rules.find(
                    (r) => r.cardId === c.id && r.storeId === s.id,
                  );
                  const cat =
                    !direct && s.category
                      ? rules.find(
                          (r) =>
                            r.cardId === c.id && r.category === s.category,
                        )
                      : undefined;
                  const applied = direct ?? cat;
                  const source = direct
                    ? "ルール"
                    : cat
                      ? `カテゴリ(${s.category})`
                      : "デフォルト";
                  return (
                    <tr key={`${c.id}-${s.id}`}>
                      <td data-label="カード">{cardLabel(c)}</td>
                      <td data-label="店舗">{s.name}</td>
                      <td data-label="還元率">
                        {((applied?.rate ?? c.defaultRate) * 100).toFixed(2)}%
                      </td>
                      <td data-label="貯まる通貨">
                        {currencyName(
                          applied?.currencyId ?? c.defaultCurrencyId,
                        )}
                      </td>
                      <td data-label="由来">{source}</td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
