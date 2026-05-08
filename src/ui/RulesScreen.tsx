import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { cardLabel } from "../domain/cardLabel";

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
  const [rate, setRate] = useState("0.02");
  const [currencyId, setCurrencyId] = useState("");
  const [notes, setNotes] = useState("");

  const cardName = (id: string) => {
    const c = cards.find((c) => c.id === id);
    return c ? cardLabel(c) : "?";
  };
  const storeName = (id: string) =>
    stores.find((s) => s.id === id)?.name ?? "?";
  const currencyName = (id: string) =>
    currencies.find((c) => c.id === id)?.name ?? "?";

  // 既存の店舗カテゴリ一覧
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) if (s.category) set.add(s.category);
    return Array.from(set).sort();
  }, [stores]);

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
          if (ruleType === "store") {
            if (!storeId) return;
            addRule({
              cardId,
              storeId,
              rate: Number(rate),
              currencyId,
              notes: notes.trim() || undefined,
            });
          } else {
            if (!category.trim()) return;
            addRule({
              cardId,
              category: category.trim(),
              rate: Number(rate),
              currencyId,
              notes: notes.trim() || undefined,
            });
          }
          setCardId("");
          setStoreId("");
          setCategory("");
          setRate("0.02");
          setCurrencyId("");
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
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
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
          placeholder="メモ (任意)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit">追加</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>種別</th>
            <th>カード</th>
            <th>対象</th>
            <th>還元率</th>
            <th>貯まる通貨</th>
            <th>メモ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => {
            const isCat = !r.storeId && !!r.category;
            return (
              <tr key={r.id}>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: isCat ? "#7c3aed" : "#3a86ff",
                    }}
                  >
                    {isCat ? "カテゴリ" : "店舗"}
                  </span>
                </td>
                <td>{cardName(r.cardId)}</td>
                <td>
                  {isCat ? (
                    <input
                      list="rules-category-list-edit"
                      value={r.category ?? ""}
                      onChange={(e) =>
                        updateRule(r.id, { category: e.target.value })
                      }
                    />
                  ) : (
                    storeName(r.storeId ?? "")
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={r.rate}
                    onChange={(e) =>
                      updateRule(r.id, { rate: Number(e.target.value) })
                    }
                  />
                </td>
                <td>
                  <select
                    value={r.currencyId}
                    onChange={(e) =>
                      updateRule(r.id, { currencyId: e.target.value })
                    }
                  >
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    value={r.notes ?? ""}
                    onChange={(e) =>
                      updateRule(r.id, { notes: e.target.value || undefined })
                    }
                  />
                </td>
                <td>
                  <button className="danger" onClick={() => removeRule(r.id)}>
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
          {rules.length === 0 && (
            <tr>
              <td colSpan={7} className="empty">
                まだありません（無いカード×店舗はカードのデフォルトが使われます）
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
                    <td>{cardLabel(c)}</td>
                    <td>{s.name}</td>
                    <td>
                      {((applied?.rate ?? c.defaultRate) * 100).toFixed(2)}%
                    </td>
                    <td>
                      {currencyName(applied?.currencyId ?? c.defaultCurrencyId)}
                    </td>
                    <td>{source}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </details>
    </section>
  );
}
