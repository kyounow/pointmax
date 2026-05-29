import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { isMasterCard } from "../state/seed";
import { isSubstantiveCardPatch } from "../state/userModified";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import type { Card } from "../domain/types";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { useDialog } from "./dialog/useDialog";

export function CardsScreen() {
  // Wave 5 B-1: 6 個別 subscribe → 単一 useShallow に集約
  const { cards, currencies, addCard, updateCard, removeCard, resetCardToSeed } =
    useStore(
      useShallow((s) => ({
        cards: s.cards,
        currencies: s.currencies,
        addCard: s.addCard,
        updateCard: s.updateCard,
        removeCard: s.removeCard,
        resetCardToSeed: s.resetCardToSeed,
      })),
    );
  const { confirm } = useDialog();

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [rate, setRate] = useState("0.01");
  const [currencyId, setCurrencyId] = useState("");

  const { currencyName } = useNameResolvers();

  const columns: ColumnDef<Card>[] = [
    {
      key: "name",
      label: "カード名",
      view: (c) =>
        isMasterCard(c.id) && !c.userModifiedAt ? (
          <span className="card-name-with-badge">
            <span className="card-master-badge" title="公式マスター由来">公式</span>
            {c.name}
          </span>
        ) : (
          c.name
        ),
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
        onBeforeSave={async (id, patch) => {
          const card = cards.find((c) => c.id === id);
          if (!card) return true;
          // 「公式」が外れる契機 = master かつ未編集 かつ substantive 変更
          if (!isMasterCard(id)) return true;
          if (card.userModifiedAt) return true;
          if (!isSubstantiveCardPatch(patch)) return true;
          return await confirm({
            title: "「公式」表示が外れます",
            message:
              `${card.name} を保存すると、編集後の値はあなたのカスタム値になり、` +
              `「公式」バッジが外れます。後で「公式に戻す」ボタンで復帰できます。`,
            okText: "保存する",
            cancelText: "キャンセル",
          });
        }}
        onDelete={removeCard}
        canDelete={(c) => !isMasterCard(c.id)}
        extraActions={(c) =>
          isMasterCard(c.id) && c.userModifiedAt ? (
            <button
              className="reset-to-official-btn"
              title="公式マスターの値に戻す (使う設定は保持されます)"
              onClick={async () => {
                const ok = await confirm({
                  title: `${c.name} を公式の値に戻しますか？`,
                  message:
                    "編集した「カード名・グレード・基本還元率・貯まる通貨」が公式マスターの値に置き換わります。「使う」設定はそのまま保持されます。",
                  okText: "公式に戻す",
                  cancelText: "キャンセル",
                  danger: true,
                });
                if (ok) resetCardToSeed(c.id);
              }}
            >
              公式に戻す
            </button>
          ) : null
        }
        empty="まだありません"
      />
    </section>
  );
}
