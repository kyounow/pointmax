// ユーザー手動のキャンペーン登録フォーム (改善計画 A-4)。
// v3 で廃止した旧 StoreRule/LoyaltyRule のキャンペーン編集 UI の後継として、
// BenefitProgram + 対象店舗 memberships を 1 回の操作で一括追加する。
// cron が拾えないキャンペーン (店頭掲示・アプリ内告知等) の受け皿。
//
// 仕様:
//   - 発動の種類: 決済アプリ / ポイントカード提示 / クレジットカード のいずれか
//   - 還元率は % 入力 (5 → rate 0.05)、貯まる通貨は対象選択時に自動補完 (変更可)
//   - 開始日必須・終了日任意 (キャンペーンタブの分類セマンティクスと整合)
//   - 曜日限定 (recurringWeekdays、C-6) を任意指定可
//   - 対象店舗は検索付きチェックリストで 1 件以上必須
// 追加された program はユーザー作成 (UUID id、非 master) として扱われ、
// CampaignsScreen から削除できる。

import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { useDialog } from "./dialog/useDialog";
import { cardLabel } from "../domain/cardLabel";
import type { BenefitProgram } from "../domain/types";

type TriggerKind = "paymentApp" | "pointCard" | "card";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function CampaignForm() {
  const {
    cards,
    pointCards,
    paymentApps,
    currencies,
    stores,
    programs,
    addCampaignProgram,
  } = useStore(
    useShallow((s) => ({
      cards: s.cards,
      pointCards: s.pointCards,
      paymentApps: s.paymentApps,
      currencies: s.currencies,
      stores: s.stores,
      programs: s.programs,
      addCampaignProgram: s.addCampaignProgram,
    })),
  );
  const dialog = useDialog();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TriggerKind>("paymentApp");
  const [targetId, setTargetId] = useState("");
  const [ratePct, setRatePct] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [bonusType, setBonusType] = useState<"addOn" | "primary">("addOn");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [storeIds, setStoreIds] = useState<Set<string>>(new Set());

  const sortedStores = useMemo(
    () => [...stores].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [stores],
  );
  const visibleStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return sortedStores;
    return sortedStores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q),
    );
  }, [sortedStores, storeSearch]);

  // 対象の選択肢 (種類別)。クレカは enabled に関係なく全カードから選べる
  const targetOptions = useMemo(() => {
    switch (kind) {
      case "paymentApp":
        return paymentApps.map((p) => ({ id: p.id, label: p.name }));
      case "pointCard":
        return pointCards.map((p) => ({ id: p.id, label: p.name }));
      case "card":
        return cards.map((c) => ({ id: c.id, label: cardLabel(c) }));
    }
  }, [kind, paymentApps, pointCards, cards]);

  // 対象選択時に「貯まる通貨」を自動補完 (ユーザーは上書き可能)。
  // PaymentApp 自体は通貨を持たない (v3 で還元は BenefitProgram に統合) ため、
  // 同じ paymentApp の既存 program から推定する (例: pa-d-pay → d-pt)。
  const defaultCurrencyFor = (k: TriggerKind, id: string): string => {
    if (k === "paymentApp")
      return programs.find((p) => p.paymentAppId === id)?.currencyId ?? "";
    if (k === "pointCard")
      return pointCards.find((p) => p.id === id)?.currencyId ?? "";
    return cards.find((c) => c.id === id)?.defaultCurrencyId ?? "";
  };

  const handleKindChange = (k: TriggerKind) => {
    setKind(k);
    setTargetId("");
  };

  const handleTargetChange = (id: string) => {
    setTargetId(id);
    const cur = defaultCurrencyFor(kind, id);
    if (cur) setCurrencyId(cur);
  };

  const toggleStore = (id: string) => {
    setStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleWeekday = (w: number) => {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  const reset = () => {
    setName("");
    setKind("paymentApp");
    setTargetId("");
    setRatePct("");
    setCurrencyId("");
    setBonusType("addOn");
    setValidFrom("");
    setValidTo("");
    setWeekdays(new Set());
    setNotes("");
    setStoreSearch("");
    setStoreIds(new Set());
  };

  const handleSubmit = async () => {
    const rate = Number(ratePct) / 100;
    const errors: string[] = [];
    if (!name.trim()) errors.push("キャンペーン名を入力してください");
    if (!targetId) errors.push("対象 (決済アプリ / ポイントカード / カード) を選択してください");
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1)
      errors.push("還元率は 0 より大きく 100 以下の % で入力してください");
    if (!currencyId) errors.push("貯まる通貨を選択してください");
    if (!validFrom) errors.push("開始日を入力してください");
    if (validTo && validFrom && validTo < validFrom)
      errors.push("終了日は開始日以降にしてください");
    if (storeIds.size === 0) errors.push("対象店舗を 1 件以上選択してください");
    if (errors.length > 0) {
      await dialog.alert({
        title: "入力内容を確認してください",
        message: errors.join("\n"),
        level: "error",
      });
      return;
    }

    const program: Omit<BenefitProgram, "id"> = {
      name: name.trim(),
      rate,
      currencyId,
      bonusType,
      validFrom,
      ...(validTo ? { validTo } : {}),
      ...(weekdays.size > 0
        ? { recurringWeekdays: [...weekdays].sort((a, b) => a - b) }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(kind === "paymentApp" ? { paymentAppId: targetId } : {}),
      ...(kind === "pointCard" ? { pointCardId: targetId } : {}),
      ...(kind === "card" ? { cardIds: [targetId] } : {}),
    };
    addCampaignProgram(program, [...storeIds]);
    await dialog.alert({
      title: "キャンペーンを追加しました",
      message: `「${program.name}」を対象 ${storeIds.size} 店舗で登録しました。計算画面に即時反映されます。`,
      level: "success",
    });
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <div style={{ margin: "8px 0 12px" }}>
        <button onClick={() => setOpen(true)}>➕ キャンペーンを手動追加</button>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "8px 0 16px",
        padding: "12px 14px",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>キャンペーンを手動追加</strong>
        <small className="hint" style={{ margin: 0 }}>
          cron が拾えない店頭・アプリ内告知のキャンペーン用。自分のデータとして保存されます
        </small>
      </div>

      <div className="row">
        <label>
          キャンペーン名
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ○○ストア d払いで+5%"
            style={{ minWidth: 240 }}
          />
        </label>
      </div>

      <div className="row">
        <span style={{ color: "var(--muted)" }}>発動の種類:</span>
        {(
          [
            { k: "paymentApp", label: "決済アプリ" },
            { k: "pointCard", label: "ポイントカード提示" },
            { k: "card", label: "クレジットカード" },
          ] as { k: TriggerKind; label: string }[]
        ).map(({ k, label }) => (
          <label key={k}>
            <input
              type="radio"
              name="campaign-kind"
              checked={kind === k}
              onChange={() => handleKindChange(k)}
            />
            {label}
          </label>
        ))}
        <label>
          対象
          <select
            value={targetId}
            onChange={(e) => handleTargetChange(e.target.value)}
          >
            <option value="">選択...</option>
            {targetOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="row">
        <label>
          還元率 (%)
          <input
            type="number"
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
            min={0}
            step="0.1"
            style={{ width: 90 }}
          />
        </label>
        <label>
          貯まる通貨
          <select
            value={currencyId}
            onChange={(e) => setCurrencyId(e.target.value)}
          >
            <option value="">選択...</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          加算方式
          <select
            value={bonusType}
            onChange={(e) =>
              setBonusType(e.target.value as "addOn" | "primary")
            }
          >
            <option value="addOn">上乗せ (addOn)</option>
            <option value="primary">置き換え (primary)</option>
          </select>
        </label>
      </div>

      <div className="row">
        <label>
          開始日
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </label>
        <label>
          終了日 (任意)
          <input
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
          />
        </label>
        <span style={{ color: "var(--muted)" }}>曜日限定 (任意):</span>
        {WEEKDAY_LABELS.map((label, w) => (
          <label key={w} style={{ gap: 2 }}>
            <input
              type="checkbox"
              checked={weekdays.has(w)}
              onChange={() => toggleWeekday(w)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="row">
        <label>
          メモ (任意)
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例: 要エントリー、上限 1,000pt"
            style={{ minWidth: 280 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 4 }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <span style={{ color: "var(--muted)" }}>
            対象店舗 ({storeIds.size} 件選択):
          </span>
          <input
            type="text"
            value={storeSearch}
            onChange={(e) => setStoreSearch(e.target.value)}
            placeholder="店舗名で検索..."
          />
        </div>
        <div
          style={{
            maxHeight: 180,
            overflowY: "auto",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            display: "flex",
            flexWrap: "wrap",
            gap: "2px 14px",
          }}
        >
          {visibleStores.map((s) => (
            <label
              key={s.id}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <input
                type="checkbox"
                checked={storeIds.has(s.id)}
                onChange={() => toggleStore(s.id)}
              />
              {s.name}
              {s.category && (
                <small style={{ color: "var(--muted)" }}>({s.category})</small>
              )}
            </label>
          ))}
          {visibleStores.length === 0 && (
            <span className="hint">該当する店舗がありません</span>
          )}
        </div>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" onClick={handleSubmit}>
          追加する
        </button>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
