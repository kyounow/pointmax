import { useState } from "react";
import { useStore } from "../state/store";

export function StoresScreen() {
  const stores = useStore((s) => s.stores);
  const addStore = useStore((s) => s.addStore);
  const updateStore = useStore((s) => s.updateStore);
  const removeStore = useStore((s) => s.removeStore);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

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

      <table>
        <thead>
          <tr>
            <th>店舗名</th>
            <th>カテゴリ</th>
            <th>同時提示数</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id}>
              <td>
                <input
                  value={s.name}
                  onChange={(e) => updateStore(s.id, { name: e.target.value })}
                />
              </td>
              <td>
                <input
                  value={s.category ?? ""}
                  onChange={(e) =>
                    updateStore(s.id, {
                      category: e.target.value || undefined,
                    })
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="1"
                  placeholder="1"
                  value={s.maxLoyaltyStacks ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateStore(s.id, {
                      maxLoyaltyStacks:
                        v === "" ? undefined : Math.max(0, Number(v)),
                    });
                  }}
                  style={{ width: 70 }}
                  title="ポイントカードを同時提示できる枚数（空欄=1）"
                />
              </td>
              <td>
                <button className="danger" onClick={() => removeStore(s.id)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
          {stores.length === 0 && (
            <tr>
              <td colSpan={4} className="empty">
                まだありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
