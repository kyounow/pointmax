import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { CurrencyIcon } from "./CurrencyIcon";

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

      <table>
        <thead>
          <tr>
            <th style={{ width: 70 }}>優先順</th>
            <th style={{ width: 44 }}></th>
            <th>名前</th>
            <th>貯まる通貨</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pointCards.map((p, i) => {
            const cur = currencyById.get(p.currencyId);
            return (
              <tr key={p.id}>
                <td>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span
                      style={{
                        color: "var(--muted)",
                        width: 16,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {i + 1}
                    </span>
                    <button
                      onClick={() => movePointCard(p.id, "up")}
                      disabled={i === 0}
                      title="優先度を上げる"
                      style={{ padding: "2px 6px" }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => movePointCard(p.id, "down")}
                      disabled={i === pointCards.length - 1}
                      title="優先度を下げる"
                      style={{ padding: "2px 6px" }}
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td>{cur && <CurrencyIcon currency={cur} size={28} />}</td>
                <td>
                  <input
                    value={p.name}
                    onChange={(e) =>
                      updatePointCard(p.id, { name: e.target.value })
                    }
                  />
                </td>
                <td>
                  <select
                    value={p.currencyId}
                    onChange={(e) =>
                      updatePointCard(p.id, { currencyId: e.target.value })
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
                  <button
                    className="danger"
                    onClick={() => removePointCard(p.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
          {pointCards.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">
                まだありません
              </td>
            </tr>
          )}
        </tbody>
      </table>

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
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
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

      <table>
        <thead>
          <tr>
            <th>ポイントカード</th>
            <th>店舗</th>
            <th>還元率</th>
            <th>メモ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loyaltyRules.map((r) => {
            const pc = pointCardById.get(r.pointCardId);
            const st = storeById.get(r.storeId);
            return (
              <tr key={r.id}>
                <td>{pc?.name ?? "?"}</td>
                <td>{st?.name ?? "?"}</td>
                <td>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={r.rate}
                    onChange={(e) =>
                      updateLoyaltyRule(r.id, {
                        rate: Number(e.target.value),
                      })
                    }
                    style={{ width: 100 }}
                  />
                </td>
                <td>
                  <input
                    value={r.notes ?? ""}
                    onChange={(e) =>
                      updateLoyaltyRule(r.id, {
                        notes: e.target.value || undefined,
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    className="danger"
                    onClick={() => removeLoyaltyRule(r.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
          {loyaltyRules.length === 0 && (
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
