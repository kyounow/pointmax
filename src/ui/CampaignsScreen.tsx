import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { cardLabel } from "../domain/cardLabel";
import { isRuleActiveAt } from "../domain/ruleActiveAt";
import type { LoyaltyRule, StoreRule } from "../domain/types";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import { MultiStorePicker } from "./MultiStorePicker";
import { useNameResolvers } from "./hooks/useNameResolvers";

type CampaignStatus = "active" | "expired" | "future";

function classifyCampaign(rule: {
  validFrom?: string;
  validTo?: string;
}): CampaignStatus {
  const now = new Date();
  if (rule.validFrom) {
    const from = new Date(rule.validFrom);
    if (!Number.isNaN(from.getTime()) && now.getTime() < from.getTime()) {
      return "future";
    }
  }
  if (!isRuleActiveAt(rule, now)) {
    // validFrom 未来 (上で拾い済み) でなければ validTo 過去
    return "expired";
  }
  return "active";
}

function statusBadge(s: CampaignStatus) {
  switch (s) {
    case "active":
      return (
        <span
          className="campaign-status active"
          title="現在キャンペーン期間内"
        >
          🟢 有効中
        </span>
      );
    case "expired":
      return (
        <span className="campaign-status expired" title="期間終了">
          ⌛ 期限切れ
        </span>
      );
    case "future":
      return (
        <span className="campaign-status future" title="開始前">
          🕒 未来開始
        </span>
      );
  }
}

export function CampaignsScreen() {
  const cards = useStore((s) => s.cards);
  const stores = useStore((s) => s.stores);
  const currencies = useStore((s) => s.currencies);
  const pointCards = useStore((s) => s.pointCards);
  const rules = useStore((s) => s.rules);
  const loyaltyRules = useStore((s) => s.loyaltyRules);
  const paymentApps = useStore((s) => s.paymentApps);
  const addRule = useStore((s) => s.addRule);
  const updateRule = useStore((s) => s.updateRule);
  const removeRule = useStore((s) => s.removeRule);
  const addLoyaltyRule = useStore((s) => s.addLoyaltyRule);
  const updateLoyaltyRule = useStore((s) => s.updateLoyaltyRule);
  const removeLoyaltyRule = useStore((s) => s.removeLoyaltyRule);

  const cardName = (id: string) => {
    const c = cards.find((c) => c.id === id);
    return c ? cardLabel(c) : id;
  };
  const pointCardName = (id: string) =>
    pointCards.find((p) => p.id === id)?.name ?? id;
  const { currencyName, storeName } = useNameResolvers();
  const paymentAppById = useMemo(
    () => new Map(paymentApps.map((p) => [p.id, p])),
    [paymentApps],
  );

  // ─── キャンペーン抽出 (validFrom or validTo が入っているもの) ───
  const campaignStoreRules = useMemo(
    () => rules.filter((r) => !!(r.validFrom || r.validTo)),
    [rules],
  );
  const campaignLoyaltyRules = useMemo(
    () => loyaltyRules.filter((r) => !!(r.validFrom || r.validTo)),
    [loyaltyRules],
  );

  // ─── StoreRule キャンペーン追加フォーム ───
  const [srCardId, setSrCardId] = useState("");
  const [srStoreIds, setSrStoreIds] = useState<Set<string>>(new Set());
  const [srPaymentAppId, setSrPaymentAppId] = useState("");
  const [srRate, setSrRate] = useState("0.05");
  const [srCurrencyId, setSrCurrencyId] = useState("");
  const [srValidFrom, setSrValidFrom] = useState("");
  const [srValidTo, setSrValidTo] = useState("");
  const [srNotes, setSrNotes] = useState("");

  // ─── LoyaltyRule キャンペーン追加フォーム ───
  const [lrPointCardId, setLrPointCardId] = useState("");
  const [lrStoreIds, setLrStoreIds] = useState<Set<string>>(new Set());
  const [lrRate, setLrRate] = useState("0.02");
  const [lrValidFrom, setLrValidFrom] = useState("");
  const [lrValidTo, setLrValidTo] = useState("");
  const [lrNotes, setLrNotes] = useState("");

  // ─── 列定義: StoreRule ───
  const storeRuleColumns: ColumnDef<StoreRule>[] = [
    {
      key: "status",
      label: "状態",
      view: (r) => statusBadge(classifyCampaign(r)),
    },
    {
      key: "card",
      label: "カード",
      view: (r) => cardName(r.cardId),
    },
    {
      key: "target",
      label: "対象",
      view: (r) =>
        r.storeId
          ? storeName(r.storeId)
          : r.category
            ? `[カテゴリ] ${r.category}`
            : "-",
    },
    {
      key: "paymentApp",
      label: "支払方法",
      view: (r) =>
        r.paymentAppId
          ? (paymentAppById.get(r.paymentAppId)?.name ?? r.paymentAppId)
          : "全方法",
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
          style={{ width: 90 }}
        />
      ),
    },
    {
      key: "currency",
      label: "貯まる通貨",
      view: (r) => currencyName(r.currencyId),
    },
    {
      key: "validFrom",
      label: "開始日",
      view: (r) => r.validFrom ?? "-",
      edit: (r, set) => (
        <input
          type="date"
          value={r.validFrom ?? ""}
          onChange={(e) => set({ validFrom: e.target.value || undefined })}
          style={{ width: 140 }}
        />
      ),
    },
    {
      key: "validTo",
      label: "終了日",
      view: (r) => r.validTo ?? "-",
      edit: (r, set) => (
        <input
          type="date"
          value={r.validTo ?? ""}
          onChange={(e) => set({ validTo: e.target.value || undefined })}
          style={{ width: 140 }}
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

  // ─── 列定義: LoyaltyRule ───
  const loyaltyRuleColumns: ColumnDef<LoyaltyRule>[] = [
    {
      key: "status",
      label: "状態",
      view: (r) => statusBadge(classifyCampaign(r)),
    },
    {
      key: "pointCard",
      label: "ポイントカード",
      view: (r) => pointCardName(r.pointCardId),
    },
    {
      key: "store",
      label: "店舗",
      view: (r) => storeName(r.storeId),
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
          style={{ width: 90 }}
        />
      ),
    },
    {
      key: "validFrom",
      label: "開始日",
      view: (r) => r.validFrom ?? "-",
      edit: (r, set) => (
        <input
          type="date"
          value={r.validFrom ?? ""}
          onChange={(e) => set({ validFrom: e.target.value || undefined })}
          style={{ width: 140 }}
        />
      ),
    },
    {
      key: "validTo",
      label: "終了日",
      view: (r) => r.validTo ?? "-",
      edit: (r, set) => (
        <input
          type="date"
          value={r.validTo ?? ""}
          onChange={(e) => set({ validTo: e.target.value || undefined })}
          style={{ width: 140 }}
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
      <h2>キャンペーン</h2>
      <p className="hint">
        期間限定の還元率キャンペーンを登録します。
        通常ルールと共存し、期間中は<strong>最高 rate</strong>が採用されます。
        期間外は通常ルール / カードのデフォルトに戻ります。
        <br />
        <small>
          開始日/終了日は両方とも省略可（省略時は無限に過去/未来扱い）。終了日はその日の 23:59:59 まで有効。
        </small>
      </p>

      {/* ─── クレカ還元キャンペーン (StoreRule) ─── */}
      <h3 style={{ marginTop: 18 }}>クレカ還元キャンペーン</h3>
      <p className="hint" style={{ marginBottom: 6 }}>
        カード × 店舗 (or 支払方法) で還元率がアップするキャンペーン。
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!srCardId || srStoreIds.size === 0 || !srCurrencyId) return;
          // 選択した全店舗に対してルールを 1 件ずつ追加
          for (const sid of srStoreIds) {
            addRule({
              cardId: srCardId,
              storeId: sid,
              paymentAppId: srPaymentAppId || undefined,
              rate: Number(srRate),
              currencyId: srCurrencyId,
              validFrom: srValidFrom || undefined,
              validTo: srValidTo || undefined,
              notes: srNotes.trim() || undefined,
            });
          }
          setSrCardId("");
          setSrStoreIds(new Set());
          setSrPaymentAppId("");
          setSrRate("0.05");
          setSrCurrencyId("");
          setSrValidFrom("");
          setSrValidTo("");
          setSrNotes("");
        }}
      >
        <select value={srCardId} onChange={(e) => setSrCardId(e.target.value)}>
          <option value="">カード</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {cardLabel(c)}
            </option>
          ))}
        </select>
        <MultiStorePicker
          stores={stores}
          selected={srStoreIds}
          onChange={setSrStoreIds}
          label="店舗"
        />
        <select
          value={srPaymentAppId}
          onChange={(e) => setSrPaymentAppId(e.target.value)}
          title="特定の支払方法のみ適用したい場合"
        >
          <option value="">全方法</option>
          {paymentApps.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.001"
          min="0"
          placeholder="還元率 (0.05=5%)"
          value={srRate}
          onChange={(e) => setSrRate(e.target.value)}
          style={{ width: 130 }}
        />
        <select
          value={srCurrencyId}
          onChange={(e) => setSrCurrencyId(e.target.value)}
        >
          <option value="">通貨</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={srValidFrom}
          onChange={(e) => setSrValidFrom(e.target.value)}
          style={{ width: 130 }}
          title="開始日 (省略可)"
        />
        <span>〜</span>
        <input
          type="date"
          value={srValidTo}
          onChange={(e) => setSrValidTo(e.target.value)}
          style={{ width: 130 }}
          title="終了日 (省略可)"
        />
        <input
          placeholder="メモ (任意)"
          value={srNotes}
          onChange={(e) => setSrNotes(e.target.value)}
        />
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={campaignStoreRules}
        columns={storeRuleColumns}
        onSave={(id, patch) => updateRule(id, patch)}
        onDelete={removeRule}
        empty="クレカ還元のキャンペーンルールはまだ登録されていません"
      />

      {/* ─── ポイント提示キャンペーン (LoyaltyRule) ─── */}
      <h3 style={{ marginTop: 22 }}>ポイント提示キャンペーン</h3>
      <p className="hint" style={{ marginBottom: 6 }}>
        ポイントカード提示で店舗特典が一時的に増えるキャンペーン。
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!lrPointCardId || lrStoreIds.size === 0) return;
          for (const sid of lrStoreIds) {
            addLoyaltyRule({
              pointCardId: lrPointCardId,
              storeId: sid,
              rate: Number(lrRate),
              validFrom: lrValidFrom || undefined,
              validTo: lrValidTo || undefined,
              notes: lrNotes.trim() || undefined,
            });
          }
          setLrPointCardId("");
          setLrStoreIds(new Set());
          setLrRate("0.02");
          setLrValidFrom("");
          setLrValidTo("");
          setLrNotes("");
        }}
      >
        <select
          value={lrPointCardId}
          onChange={(e) => setLrPointCardId(e.target.value)}
        >
          <option value="">ポイントカード</option>
          {pointCards.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <MultiStorePicker
          stores={stores}
          selected={lrStoreIds}
          onChange={setLrStoreIds}
          label="店舗"
        />
        <input
          type="number"
          step="0.001"
          min="0"
          placeholder="還元率 (0.02=2%)"
          value={lrRate}
          onChange={(e) => setLrRate(e.target.value)}
          style={{ width: 130 }}
        />
        <input
          type="date"
          value={lrValidFrom}
          onChange={(e) => setLrValidFrom(e.target.value)}
          style={{ width: 130 }}
          title="開始日 (省略可)"
        />
        <span>〜</span>
        <input
          type="date"
          value={lrValidTo}
          onChange={(e) => setLrValidTo(e.target.value)}
          style={{ width: 130 }}
          title="終了日 (省略可)"
        />
        <input
          placeholder="メモ (任意)"
          value={lrNotes}
          onChange={(e) => setLrNotes(e.target.value)}
        />
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={campaignLoyaltyRules}
        columns={loyaltyRuleColumns}
        onSave={(id, patch) => updateLoyaltyRule(id, patch)}
        onDelete={removeLoyaltyRule}
        empty="ポイント提示のキャンペーンルールはまだ登録されていません"
      />
    </section>
  );
}
