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
                <button className="danger" onClick={() => removeStore(s.id)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
          {stores.length === 0 && (
            <tr>
              <td colSpan={3} className="empty">
                まだありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
