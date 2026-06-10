import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { cardLabel } from "../domain/cardLabel";
import {
  isRuleActiveAt,
  formatRulePeriod,
  classifyCampaignStatus,
  daysUntilValidTo,
  type CampaignStatus,
} from "../domain/ruleActiveAt";
import type { BenefitProgram } from "../domain/types";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { useToday } from "./hooks/useToday";
import { sanitizeNoteForDisplay } from "../domain/noteParser";

// 終了日セル: 日付 + 終了間近カウントダウン (C-5)。
// あと 7 日以内は warning、3 日以内は urgent (RuleStatusBadge と同じ閾値)。
function validToWithCountdown(validTo: string | undefined, today: Date) {
  if (!validTo) return "-";
  const days = daysUntilValidTo(validTo, today);
  if (days === null || days < 0) return validTo; // 期限切れ/不正は日付のみ
  const cls = days <= 3 ? "urgent" : days <= 7 ? "warning" : "";
  return (
    <span>
      {validTo}{" "}
      <span
        className={`rule-days-left ${cls}`}
        title={days === 0 ? "今日 23:59:59 まで" : `あと ${days} 日で終了`}
      >
        {days === 0 ? "本日まで" : `あと${days}日`}
      </span>
    </span>
  );
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
    case "ongoing":
      return (
        <span
          className="campaign-status ongoing"
          title="公式プログラム (期限未告知)"
        >
          📌 公式プログラム
        </span>
      );
  }
}

type TabKey = "all" | "active" | "ongoing" | "expired" | "future";

export function CampaignsScreen() {
  // Wave 5 B-1: 4 個別 subscribe → 単一 useShallow
  const { cards, pointCards, programs, paymentApps } = useStore(
    useShallow((s) => ({
      cards: s.cards,
      pointCards: s.pointCards,
      programs: s.programs,
      paymentApps: s.paymentApps,
    })),
  );

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  // 同じ暦日の間は参照固定、日付が変わると自動更新 (C-2)。
  // 分類・カウントダウン・isRuleActiveAt の基準時刻を画面全体で統一する。
  const today = useToday();

  const cardName = (id: string) => {
    const c = cards.find((c) => c.id === id);
    return c ? cardLabel(c) : id;
  };
  const pointCardName = (id: string) =>
    pointCards.find((p) => p.id === id)?.name ?? id;
  const { currencyName } = useNameResolvers();
  const paymentAppById = useMemo(
    () => new Map(paymentApps.map((p) => [p.id, p])),
    [paymentApps],
  );

  // ─── BenefitProgram キャンペーン (validFrom or validTo を持つ programs) ───
  // v3 で 旧 StoreRule / LoyaltyRule のキャンペーン編集 UI は廃止。
  // ユーザー追加のキャンペーンが必要な場合は将来 Program 直接編集を提供予定。
  const campaignPrograms = useMemo(
    () => programs.filter((p) => !!(p.validFrom || p.validTo)),
    [programs],
  );

  // ─── タブ別フィルター (programs) ───
  // 「期限あり」タブは終了が近い順にソート (C-5: 使い逃し防止)。
  // 他タブは従来どおり登録順。
  const filteredPrograms = useMemo(() => {
    const base =
      activeTab === "all"
        ? campaignPrograms
        : campaignPrograms.filter(
            (p) => classifyCampaignStatus(p, today) === activeTab,
          );
    if (activeTab !== "active") return base;
    return [...base].sort((a, b) => {
      const da = daysUntilValidTo(a.validTo, today);
      const db = daysUntilValidTo(b.validTo, today);
      // validTo なし (null) は末尾
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [campaignPrograms, activeTab, today]);

  // ─── タブごとの件数 ───
  const tabCounts = useMemo(() => {
    const count = (key: CampaignStatus) =>
      campaignPrograms.filter(
        (r) => classifyCampaignStatus(r, today) === key,
      ).length;
    return {
      all: campaignPrograms.length,
      active: count("active"),
      ongoing: count("ongoing"),
      expired: count("expired"),
      future: count("future"),
    };
  }, [campaignPrograms, today]);

  // ─── 列定義: BenefitProgram ───
  const programColumns: ColumnDef<BenefitProgram>[] = [
    {
      key: "status",
      label: "状態",
      view: (p) => statusBadge(classifyCampaignStatus(p, today)),
    },
    {
      key: "name",
      label: "プログラム名",
      view: (p) => p.name,
    },
    {
      key: "target",
      label: "対象カード / ポイントカード",
      view: (p) => {
        const parts: string[] = [];
        if (p.cardIds?.length)
          parts.push(p.cardIds.map((id) => cardName(id)).join(" / "));
        if (p.pointCardId) parts.push(pointCardName(p.pointCardId));
        if (p.paymentAppId) {
          parts.push(
            paymentAppById.get(p.paymentAppId)?.name ?? p.paymentAppId,
          );
        }
        return parts.join(" + ") || "-";
      },
    },
    {
      key: "rate",
      label: "還元率",
      view: (p) => `${(p.rate * 100).toFixed(2)}%`,
    },
    {
      key: "currency",
      label: "貯まる通貨",
      view: (p) => currencyName(p.currencyId),
    },
    {
      key: "validFrom",
      label: "開始日",
      view: (p) => p.validFrom ?? "-",
    },
    {
      key: "validTo",
      label: "終了日",
      view: (p) => validToWithCountdown(p.validTo, today),
    },
    {
      key: "period",
      label: "期間",
      view: (p) => {
        const active = isRuleActiveAt(p, today);
        return (
          <span title={active ? "今日有効" : "今日は対象外"}>
            {active ? "✓ " : "○ "}
            {formatRulePeriod(p)}
          </span>
        );
      },
    },
    {
      key: "link",
      label: "リンク",
      view: (p) => {
        const url = p.entryUrl ?? p.officialUrl;
        if (!url) return "-";
        const label = p.entryUrl ? "エントリー" : "公式";
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="campaign-link"
            title={url}
          >
            🔗 {label}
          </a>
        );
      },
    },
    {
      key: "notes",
      label: "条件・メモ",
      // C-7: conditions (適用条件、これまで未表示) を notes と併記
      view: (p) => {
        const cleaned = sanitizeNoteForDisplay(p.notes);
        if (!p.conditions && !cleaned) return "-";
        return (
          <span>
            {p.conditions && (
              <span
                style={{ color: "#b45309" }}
                title="このプログラムの適用条件"
              >
                ⚠ {p.conditions}
              </span>
            )}
            {p.conditions && cleaned && <br />}
            {cleaned}
          </span>
        );
      },
    },
  ];

  return (
    <section>
      <h2>キャンペーン</h2>
      <p className="hint">
        期間限定 / 期限未告知のプログラム一覧。
        通常還元と共存し、期間中は<strong>最高 rate</strong>が採用されます。
        期間外は通常還元 / カードのデフォルトに戻ります。
        <br />
        <small>
          終了日 = その日の 23:59:59 まで有効。プログラム本体の追加・編集は
          現在マスターデータ (seed) でのみ管理しています。
        </small>
      </p>

      {/* ─── フィルタータブ ─── */}
      <div className="campaign-tabs">
        {(
          [
            { key: "all", label: "全て" },
            { key: "active", label: "🎯 期限あり" },
            { key: "ongoing", label: "📌 公式プログラム" },
            { key: "expired", label: "⌛ 期限切れ" },
            { key: "future", label: "🕒 未来開始" },
          ] as { key: TabKey; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            className={activeTab === key ? "active" : ""}
            onClick={() => setActiveTab(key)}
          >
            {label}
            <span className="count">({tabCounts[key]})</span>
          </button>
        ))}
      </div>

      {campaignPrograms.length === 0 ? (
        <p className="hint" style={{ marginTop: 12 }}>
          期間情報を持つプログラムはまだありません。
        </p>
      ) : (
        <ResponsiveTable
          rows={filteredPrograms}
          columns={programColumns}
          empty="このカテゴリの該当プログラムはありません (タブを切り替えてください)"
        />
      )}
    </section>
  );
}
