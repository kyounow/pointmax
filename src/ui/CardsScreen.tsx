import { useState } from "react";
import { useStore } from "../state/store";

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

      <table>
        <thead>
          <tr>
            <th>カード名</th>
            <th>グレード</th>
            <th>基本還元率</th>
            <th>貯まる通貨</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.id}>
              <td>
                <input
                  value={c.name}
                  onChange={(e) => updateCard(c.id, { name: e.target.value })}
                />
              </td>
              <td>
                <input
                  placeholder="(任意)"
                  value={c.grade ?? ""}
                  onChange={(e) =>
                    updateCard(c.id, { grade: e.target.value || undefined })
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={c.defaultRate}
                  onChange={(e) =>
                    updateCard(c.id, { defaultRate: Number(e.target.value) })
                  }
                />
              </td>
              <td>
                <select
                  value={c.defaultCurrencyId}
                  onChange={(e) =>
                    updateCard(c.id, { defaultCurrencyId: e.target.value })
                  }
                >
                  {currencies.map((cur) => (
                    <option key={cur.id} value={cur.id}>
                      {cur.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button className="danger" onClick={() => removeCard(c.id)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
          {cards.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">
                まだありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
