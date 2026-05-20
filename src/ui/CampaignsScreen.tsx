import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { cardLabel } from "../domain/cardLabel";
import { isRuleActiveAt, formatRulePeriod } from "../domain/ruleActiveAt";
import type { BenefitProgram } from "../domain/types";
import { ResponsiveTable, type ColumnDef } from "./ResponsiveTable";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { sanitizeNoteForDisplay } from "../domain/noteParser";

type CampaignStatus = "active" | "expired" | "future" | "ongoing";

function classifyCampaign(rule: {
  validFrom?: string;
  validTo?: string;
}): CampaignStatus {
  const now = new Date();

  // future: validFrom が未来
  if (rule.validFrom) {
    const from = new Date(rule.validFrom);
    if (!Number.isNaN(from.getTime()) && now.getTime() < from.getTime()) {
      return "future";
    }
  }

  // expired: validTo が過去 (期間が明示的に終わってる場合のみ)
  if (rule.validTo) {
    const to = new Date(rule.validTo);
    to.setHours(23, 59, 59, 999);
    if (!Number.isNaN(to.getTime()) && now.getTime() > to.getTime()) {
      return "expired";
    }
  }

  // ongoing: validFrom only (validTo なし、期限未告知の長期プログラム)
  // recurringDays が今日 hit しなくても、期間自体は終わってないので ongoing 扱い
  if (rule.validFrom && !rule.validTo) {
    return "ongoing";
  }

  // active: 両方 set + 期間範囲内
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
  const cards = useStore((s) => s.cards);
  const pointCards = useStore((s) => s.pointCards);
  const programs = useStore((s) => s.programs);
  const paymentApps = useStore((s) => s.paymentApps);

  const [activeTab, setActiveTab] = useState<TabKey>("all");

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
  const filteredPrograms = useMemo(
    () =>
      activeTab === "all"
        ? campaignPrograms
        : campaignPrograms.filter((p) => classifyCampaign(p) === activeTab),
    [campaignPrograms, activeTab],
  );

  // ─── タブごとの件数 ───
  const tabCounts = useMemo(() => {
    const count = (key: CampaignStatus) =>
      campaignPrograms.filter((r) => classifyCampaign(r) === key).length;
    return {
      all: campaignPrograms.length,
      active: count("active"),
      ongoing: count("ongoing"),
      expired: count("expired"),
      future: count("future"),
    };
  }, [campaignPrograms]);

  // ─── 列定義: BenefitProgram ───
  const programColumns: ColumnDef<BenefitProgram>[] = [
    {
      key: "status",
      label: "状態",
      view: (p) => statusBadge(classifyCampaign(p)),
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
      view: (p) => p.validTo ?? "-",
    },
    {
      key: "period",
      label: "期間",
      view: (p) => {
        const active = isRuleActiveAt(p);
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
      label: "メモ",
      view: (p) => sanitizeNoteForDisplay(p.notes) ?? "-",
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
