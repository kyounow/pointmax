import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import type { PaymentApp } from "../domain/types";
import { cardLabel } from "../domain/cardLabel";
import { useNameResolvers } from "./hooks/useNameResolvers";

export function PaymentAppsScreen() {
  const cards = useStore((s) => s.cards);
  const currencies = useStore((s) => s.currencies);
  const paymentApps = useStore((s) => s.paymentApps);
  const addPaymentApp = useStore((s) => s.addPaymentApp);
  const updatePaymentApp = useStore((s) => s.updatePaymentApp);
  const removePaymentApp = useStore((s) => s.removePaymentApp);

  const [name, setName] = useState("");
  const [iconChar, setIconChar] = useState("");
  const [iconColor, setIconColor] = useState("#6b7280");
  const [bonusRate, setBonusRate] = useState("");
  const [bonusCurrencyId, setBonusCurrencyId] = useState("");

  const cardLabelById = (id: string) => {
    const c = cards.find((c) => c.id === id);
    return c ? cardLabel(c) : "?";
  };
  const { currencyName } = useNameResolvers();

  const columns: ColumnDef<PaymentApp>[] = useMemo(
    () => [
      {
        key: "icon",
        label: "アイコン",
        view: (p) => (
          <span
            className="payment-app-icon"
            style={{ background: p.iconColor ?? "#6b7280" }}
          >
            {p.iconChar ?? p.name.charAt(0)}
          </span>
        ),
      },
      {
        key: "name",
        label: "名前",
        view: (p) => p.name,
        edit: (p, set) => (
          <input
            value={p.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        ),
      },
      {
        key: "iconChar",
        label: "アイコン文字",
        view: (p) => p.iconChar ?? "-",
        edit: (p, set) => (
          <input
            value={p.iconChar ?? ""}
            placeholder={p.name.charAt(0)}
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
        view: (p) => (
          <span
            style={{
              display: "inline-block",
              width: 22,
              height: 22,
              borderRadius: 4,
              background: p.iconColor ?? "transparent",
              border: "1px solid var(--border)",
            }}
          />
        ),
        edit: (p, set) => (
          <input
            type="color"
            value={p.iconColor ?? "#6b7280"}
            onChange={(e) => set({ iconColor: e.target.value })}
            style={{ width: 50, padding: 2 }}
          />
        ),
      },
      {
        key: "bonusRate",
        label: "アプリ自体の還元率",
        view: (p) =>
          p.defaultBonusRate
            ? `${(p.defaultBonusRate * 100).toFixed(2)}%`
            : "-",
        edit: (p, set) => (
          <input
            type="number"
            step="0.001"
            min="0"
            placeholder="0.01 (=1%)"
            value={p.defaultBonusRate ?? ""}
            onChange={(e) =>
              set({
                defaultBonusRate: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            style={{ width: 90 }}
          />
        ),
      },
      {
        key: "bonusCurrency",
        label: "還元通貨",
        view: (p) =>
          p.defaultBonusCurrencyId
            ? currencyName(p.defaultBonusCurrencyId)
            : "-",
        edit: (p, set) => (
          <select
            value={p.defaultBonusCurrencyId ?? ""}
            onChange={(e) =>
              set({
                defaultBonusCurrencyId: e.target.value || undefined,
              })
            }
          >
            <option value="">なし</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "paymentMode",
        label: "決済形態",
        view: (p) => {
          const modeLabel = {
            charge: "チャージ式",
            direct: "直接連携",
            physical: "物理/タッチ",
          };
          if (p.paymentMode) return modeLabel[p.paymentMode];
          return p.chargeBased ? "チャージ式" : "-";
        },
        edit: (p, set) => (
          <select
            value={p.paymentMode ?? ""}
            onChange={(e) => {
              const v = e.target.value as
                | ""
                | "charge"
                | "direct"
                | "physical";
              // paymentMode と chargeBased を整合させる
              if (v === "charge") {
                set({ paymentMode: "charge", chargeBased: true });
              } else if (v === "direct" || v === "physical") {
                set({ paymentMode: v, chargeBased: undefined });
              } else {
                set({ paymentMode: undefined });
              }
            }}
          >
            <option value="">未設定</option>
            <option value="charge">チャージ式 (残高にチャージしてから決済)</option>
            <option value="direct">直接連携 (カードを支払い元に紐付け)</option>
            <option value="physical">物理/タッチ (カードそのまま提示・タッチ)</option>
          </select>
        ),
      },
      {
        key: "cardSpecific",
        label: "カード別還元",
        view: (p) => {
          const list = p.cardSpecificBonusRates ?? [];
          if (list.length === 0) return "-";
          return list
            .map((b) => `${cardLabelById(b.cardId)}: ${(b.rate * 100).toFixed(2)}%`)
            .join(" / ");
        },
        edit: (p, set) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {cards.map((c) => {
              const entry = p.cardSpecificBonusRates?.find(
                (b) => b.cardId === c.id,
              );
              const enabled = !!entry;
              return (
                <label
                  key={c.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => {
                      const list = p.cardSpecificBonusRates ?? [];
                      const filtered = list.filter((b) => b.cardId !== c.id);
                      const next = e.target.checked
                        ? [
                            ...filtered,
                            {
                              cardId: c.id,
                              rate: entry?.rate ?? 0.01,
                            },
                          ]
                        : filtered;
                      set({
                        cardSpecificBonusRates:
                          next.length > 0 ? next : undefined,
                      });
                    }}
                  />
                  <span style={{ minWidth: 130 }}>{cardLabel(c)}:</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.01 = 1%"
                    value={entry?.rate ?? ""}
                    disabled={!enabled}
                    onChange={(e) => {
                      const list = p.cardSpecificBonusRates ?? [];
                      const filtered = list.filter((b) => b.cardId !== c.id);
                      const rate = e.target.value
                        ? Number(e.target.value)
                        : 0;
                      set({
                        cardSpecificBonusRates: [
                          ...filtered,
                          { cardId: c.id, rate },
                        ],
                      });
                    }}
                    style={{ width: 90 }}
                  />
                </label>
              );
            })}
            <small className="hint" style={{ fontSize: 11 }}>
              チェック有りのカードを紐付け時、そのカード固有の還元率を使用
              (例: d払い × dカード = 1%、他は 0%)
            </small>
          </div>
        ),
      },
      {
        key: "compatibleCards",
        label: "対応カード",
        view: (p) =>
          p.compatibleCardIds && p.compatibleCardIds.length > 0
            ? p.compatibleCardIds.map(cardLabelById).join(", ")
            : "全て",
        edit: (p, set) => (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cards.map((c) => {
              const list = p.compatibleCardIds ?? [];
              const checked = list.includes(c.id);
              return (
                <label
                  key={c.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...list, c.id]
                        : list.filter((id) => id !== c.id);
                      set({
                        compatibleCardIds: next.length > 0 ? next : undefined,
                      });
                    }}
                  />
                  {cardLabel(c)}
                </label>
              );
            })}
            <small className="hint">
              全部チェックしない or 全部チェック = 全カード対応
            </small>
          </div>
        ),
      },
      {
        key: "notes",
        label: "メモ",
        view: (p) => p.notes ?? "-",
        edit: (p, set) => (
          <input
            value={p.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value || undefined })}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, currencies],
  );

  return (
    <section>
      <h2>支払方法</h2>
      <p className="hint">
        Visaタッチ・QUICPay・楽天Pay・d払い等の決済方法を登録します。計算画面では各カードについて
        自動で最良の支払方法が選ばれます。
        <br />
        「対応カード」を指定すると、その支払方法はそのカードでのみ使われます（楽天Payは楽天カードチャージ必須など）。
        「アプリ自体の還元率」は決済アプリ自身の還元（楽天Payの1%等）。
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addPaymentApp({
            name: name.trim(),
            iconChar: iconChar.trim() || undefined,
            iconColor: iconColor || undefined,
            defaultBonusRate: bonusRate ? Number(bonusRate) : undefined,
            defaultBonusCurrencyId: bonusCurrencyId || undefined,
          });
          setName("");
          setIconChar("");
          setIconColor("#6b7280");
          setBonusRate("");
          setBonusCurrencyId("");
        }}
      >
        <input
          placeholder="名前 (例: 楽天Pay)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="アイコン文字"
          value={iconChar}
          onChange={(e) => setIconChar(e.target.value)}
          style={{ width: 90 }}
        />
        <input
          type="color"
          value={iconColor}
          onChange={(e) => setIconColor(e.target.value)}
          style={{ width: 40, padding: 2 }}
        />
        <input
          type="number"
          step="0.001"
          min="0"
          placeholder="bonus率 (任意)"
          value={bonusRate}
          onChange={(e) => setBonusRate(e.target.value)}
          style={{ width: 110 }}
        />
        <select
          value={bonusCurrencyId}
          onChange={(e) => setBonusCurrencyId(e.target.value)}
        >
          <option value="">bonus通貨なし</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={paymentApps}
        columns={columns}
        onSave={(id, patch) => updatePaymentApp(id, patch)}
        onDelete={removePaymentApp}
      />
    </section>
  );
}
