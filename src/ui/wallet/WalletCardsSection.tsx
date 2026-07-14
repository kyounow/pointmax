import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../../state/store";
import { isMasterCard } from "../../state/seed";
import { isSubstantiveCardPatch } from "../../state/userModified";
import { CARD_FAMILIES } from "../../state/seed-data-card-families";
import { ResponsiveTable, type ColumnDef } from "../ResponsiveTable";
import type { Card } from "../../domain/types";
import { useNameResolvers } from "../hooks/useNameResolvers";
import { useDialog } from "../dialog/useDialog";
import { buildCardGroups } from "./cardGroups";

type Props = {
  // ?highlight=<cardId|familyId> の対象 id (後続 PR の導線用)。
  highlightId?: string;
};

// CardsScreen (旧 #cards) の内容を移植したウォレットのクレカセクション。
// 機能等価 (追加フォーム / 編集モード / 公式バッジ / 公式に戻す / 「使う」トグルと
// exclusive 自動 OFF 通知) を維持しつつ、family グルーピング表示と highlight を追加。
export function WalletCardsSection({ highlightId }: Props) {
  const {
    cards,
    currencies,
    addCard,
    updateCard,
    setCardEnabled,
    removeCard,
    resetCardToSeed,
  } = useStore(
    useShallow((s) => ({
      cards: s.cards,
      currencies: s.currencies,
      addCard: s.addCard,
      updateCard: s.updateCard,
      setCardEnabled: s.setCardEnabled,
      removeCard: s.removeCard,
      resetCardToSeed: s.resetCardToSeed,
    })),
  );
  const { confirm, alert } = useDialog();

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [rate, setRate] = useState("0.01");
  const [currencyId, setCurrencyId] = useState("");

  const { currencyName } = useNameResolvers();

  // family グループ見出しの highlight (familyId 指定時)。行単位 (cardId) は
  // ResponsiveTable の highlightId が担当するので、ここでは family 見出しへ
  // scrollIntoView するだけ。CSS アニメ (wallet-highlight) は class 付与で 1 回再生。
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!highlightId) return;
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-family-id="${highlightId}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, cards]);

  const columns: ColumnDef<Card>[] = [
    {
      key: "name",
      label: "カード名",
      view: (c) =>
        isMasterCard(c.id) && !c.userModifiedAt ? (
          <span className="card-name-with-badge">
            <span className="card-master-badge" title="公式マスター由来">
              公式
            </span>
            {c.name}
          </span>
        ) : (
          c.name
        ),
      edit: (c, set) => (
        <input value={c.name} onChange={(e) => set({ name: e.target.value })} />
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
          inputMode="decimal"
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
        const on = c.enabled === true; // v7: enabled === true のみ「使う」
        return (
          <label
            className={`card-enabled-toggle ${on ? "is-on" : "is-off"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => {
                // setCardEnabled は exclusive family なら兄弟カードを自動 OFF にし、
                // その名前配列を返す。空でなければ「無言で切り替えない」ため通知する。
                const disabled = setCardEnabled(c.id, e.target.checked);
                if (disabled.length > 0) {
                  void alert({
                    title: `${disabled.join("、")} を OFF にしました`,
                    message:
                      "同シリーズ（グレード違い）のカードは同時に1枚のみ有効化できます。",
                    level: "info",
                  });
                }
              }}
            />
            <span>{on ? "使う" : "OFF"}</span>
          </label>
        );
      },
      edit: (c, set) => {
        const on = c.enabled === true; // v7: enabled === true のみ「使う」
        return (
          <label className={`card-enabled-toggle ${on ? "is-on" : "is-off"}`}>
            <input
              type="checkbox"
              checked={on}
              onChange={(e) =>
                // v7: ON = enabled:true (明示値、preservePreferences の carry-over に載せる) / OFF = false
                set({ enabled: e.target.checked ? true : false })
              }
            />
            <span>{on ? "使う" : "OFF"}</span>
          </label>
        );
      },
    },
  ];

  // 全ブロック共通の ResponsiveTable props (家族テーブルと単独テーブルで挙動を揃える)。
  const tableProps = {
    columns,
    onSave: (id: string, patch: Partial<Card>) => updateCard(id, patch),
    onBeforeSave: async (id: string, patch: Partial<Card>) => {
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
    },
    onDelete: removeCard,
    canDelete: (c: Card) => !isMasterCard(c.id),
    extraActions: (c: Card) =>
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
      ) : null,
  };

  const blocks = buildCardGroups(cards, CARD_FAMILIES);

  return (
    <div ref={rootRef}>
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
          inputMode="decimal"
          step="0.001"
          min="0"
          placeholder="0.01 (=1%)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <select value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
          <option value="">貯まる通貨を選択</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">追加</button>
      </form>

      {cards.length === 0 ? (
        <ResponsiveTable rows={[]} {...tableProps} empty="まだありません" />
      ) : (
        blocks.map((block, i) => {
          if (block.kind === "family") {
            const isHighlighted = highlightId === block.familyId;
            return (
              <div
                key={block.familyId}
                className={`wallet-card-group${
                  isHighlighted ? " wallet-highlight" : ""
                }`}
                data-family-id={block.familyId}
              >
                <div className="wallet-card-group-head">
                  <h3>{block.family.name}</h3>
                  {block.family.exclusive && (
                    <span
                      className="wallet-exclusive-note"
                      title="同シリーズ（グレード違い）は物理的に切替型のため、同時に1枚のみ有効化できます"
                    >
                      同時に1枚のみ有効
                    </span>
                  )}
                </div>
                <ResponsiveTable
                  rows={block.cards}
                  {...tableProps}
                  highlightId={highlightId}
                  testId={`cards-${block.familyId}`}
                />
              </div>
            );
          }
          return (
            <ResponsiveTable
              key={`singles-${i}`}
              rows={block.cards}
              {...tableProps}
              highlightId={highlightId}
              testId="cards-singles"
            />
          );
        })
      )}
    </div>
  );
}
