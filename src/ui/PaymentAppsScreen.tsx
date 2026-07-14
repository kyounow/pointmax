import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { isMasterPaymentApp } from "../state/seed";
import { isSubstantivePaymentAppPatch } from "../state/userModified";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import type { PaymentApp } from "../domain/types";
import { cardLabel } from "../domain/cardLabel";
import { sanitizeNoteForDisplay } from "../domain/noteParser";
import { useDialog } from "./dialog/useDialog";

export function PaymentAppsScreen() {
  // Wave 5 B-1: 6 個別 subscribe → 単一 useShallow に集約
  const {
    cards,
    paymentApps,
    addPaymentApp,
    updatePaymentApp,
    removePaymentApp,
    resetPaymentAppToSeed,
  } = useStore(
    useShallow((s) => ({
      cards: s.cards,
      paymentApps: s.paymentApps,
      addPaymentApp: s.addPaymentApp,
      updatePaymentApp: s.updatePaymentApp,
      removePaymentApp: s.removePaymentApp,
      resetPaymentAppToSeed: s.resetPaymentAppToSeed,
    })),
  );
  const { confirm } = useDialog();

  const [name, setName] = useState("");
  const [iconChar, setIconChar] = useState("");
  const [iconColor, setIconColor] = useState("#6b7280");

  const cardLabelById = (id: string) => {
    const c = cards.find((c) => c.id === id);
    return c ? cardLabel(c) : "?";
  };

  const columns: ColumnDef<PaymentApp>[] = useMemo(
    () => [
      {
        key: "app",
        label: "支払方法",
        view: (p) => (
          <span className="payment-app-row-label">
            <span
              className="payment-app-icon"
              style={{ background: p.iconColor ?? "#6b7280" }}
            >
              {p.iconChar ?? p.name.charAt(0)}
            </span>
            {isMasterPaymentApp(p.id) && !p.userModifiedAt ? (
              <span className="card-name-with-badge">
                <span
                  className="card-master-badge"
                  title="公式マスター由来"
                >
                  公式
                </span>
                {p.name}
              </span>
            ) : (
              <span>{p.name}</span>
            )}
          </span>
        ),
        edit: (p, set) => (
          <span className="payment-app-edit-cluster">
            <span
              className="payment-app-icon"
              style={{ background: p.iconColor ?? "#6b7280" }}
              title="プレビュー"
            >
              {p.iconChar ?? p.name.charAt(0)}
            </span>
            <input
              value={p.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="名前"
              style={{ flex: 1, minWidth: 120 }}
            />
            <input
              value={p.iconChar ?? ""}
              placeholder={p.name.charAt(0)}
              onChange={(e) =>
                set({ iconChar: e.target.value || undefined })
              }
              style={{ width: 60 }}
              title="アイコン文字"
              aria-label="アイコン文字"
            />
            <input
              type="color"
              value={p.iconColor ?? "#6b7280"}
              onChange={(e) => set({ iconColor: e.target.value })}
              style={{ width: 40, padding: 2 }}
              title="アイコン色"
              aria-label="アイコン色"
            />
          </span>
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
        view: (p) => sanitizeNoteForDisplay(p.notes) ?? "-",
        edit: (p, set) => (
          <input
            value={p.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value || undefined })}
          />
        ),
      },
      {
        key: "enabled",
        label: "使う",
        width: 90,
        view: (p) => {
          const on = p.enabled === true; // v7: enabled === true のみ「使う」
          return (
            <label
              className={`card-enabled-toggle ${on ? "is-on" : "is-off"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) =>
                  updatePaymentApp(p.id, {
                    // v7: ON = enabled:true (明示値) / OFF = false
                    enabled: e.target.checked ? true : false,
                  })
                }
              />
              <span>{on ? "使う" : "OFF"}</span>
            </label>
          );
        },
        edit: (p, set) => {
          const on = p.enabled === true; // v7: enabled === true のみ「使う」
          return (
            <label className={`card-enabled-toggle ${on ? "is-on" : "is-off"}`}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) =>
                  // v7: ON = enabled:true (明示値) / OFF = false
                  set({ enabled: e.target.checked ? true : false })
                }
              />
              <span>{on ? "使う" : "OFF"}</span>
            </label>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards],
  );

  return (
    <section>
      <h2>支払方法</h2>
      <p className="hint">
        Visaタッチ・QUICPay・楽天Pay・d払い等の決済方法を登録します。計算画面では各カードについて
        自動で最良の支払方法が選ばれます。
        <br />
        「対応カード」を指定すると、その支払方法はそのカードでのみ使われます（楽天Payは楽天カードチャージ必須など）。
        還元率は「プログラム」タブで BenefitProgram として管理されています。
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
          });
          setName("");
          setIconChar("");
          setIconColor("#6b7280");
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
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={paymentApps}
        columns={columns}
        onSave={(id, patch) => updatePaymentApp(id, patch)}
        onBeforeSave={async (id, patch) => {
          const app = paymentApps.find((p) => p.id === id);
          if (!app) return true;
          if (!isMasterPaymentApp(id)) return true;
          if (app.userModifiedAt) return true;
          if (!isSubstantivePaymentAppPatch(patch)) return true;
          return await confirm({
            title: "「公式」表示が外れます",
            message:
              `${app.name} を保存すると、編集後の値はあなたのカスタム値になり、` +
              `「公式」バッジが外れます。後で「公式に戻す」ボタンで復帰できます。`,
            okText: "保存する",
            cancelText: "キャンセル",
          });
        }}
        onDelete={removePaymentApp}
        canDelete={(p) => !isMasterPaymentApp(p.id)}
        extraActions={(p) =>
          isMasterPaymentApp(p.id) && p.userModifiedAt ? (
            <button
              className="reset-to-official-btn"
              title="公式マスターの値に戻す (使う設定は保持されます)"
              onClick={async () => {
                const ok = await confirm({
                  title: `${p.name} を公式の値に戻しますか？`,
                  message:
                    "編集した「名前・決済形態・対応カード・メモ」が公式マスターの値に置き換わります。アイコンと「使う」設定はそのまま保持されます。",
                  okText: "公式に戻す",
                  cancelText: "キャンセル",
                  danger: true,
                });
                if (ok) resetPaymentAppToSeed(p.id);
              }}
            >
              公式に戻す
            </button>
          ) : null
        }
      />
    </section>
  );
}
