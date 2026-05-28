// ProgramsScreen.tsx — v3 PR 3
// BenefitProgram の一覧表示。各 Program を行として表示し、
// 「加盟店」セルをクリックすると StoreProgramMembership の store 一覧が展開される。
// 公式マスター由来の Program には「公式」バッジを表示。
// 現バージョンは読み取り専用 (ユーザー追加は将来対応)。
import { Fragment, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { isMasterProgram } from "../state/seed";
import { isRuleActiveAt, formatRulePeriod } from "../domain/ruleActiveAt";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { cardLabel } from "../domain/cardLabel";
import { sanitizeNoteForDisplay } from "../domain/noteParser";
import { byId } from "../domain/entityIndex";
import type { StoreProgramMembership } from "../domain/types";

type BonusTypeKey = "primary" | "addOn";

function bonusTypeBadge(bt: BonusTypeKey | undefined) {
  if (bt === "addOn") {
    return (
      <span className="badge" style={{ background: "#7c3aed" }} title="既存還元に上乗せ加算">
        addOn
      </span>
    );
  }
  return (
    <span className="badge" style={{ background: "#3a86ff" }} title="候補の中で最大 rate を採用">
      primary
    </span>
  );
}

type FilterKey = "all" | "active" | "inactive" | "campaign" | "loyalty" | "paymentapp";

export function ProgramsScreen() {
  const programs = useStore((s) => s.programs);
  const memberships = useStore((s) => s.memberships);
  const cards = useStore((s) => s.cards);
  const stores = useStore((s) => s.stores);
  const pointCards = useStore((s) => s.pointCards);
  const paymentApps = useStore((s) => s.paymentApps);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { currencyName } = useNameResolvers();

  // Wave 4 B-3 audit-fix: 配列 find を Map に置換 (O(N) → O(1) lookup)。
  // programs × cards/pointCards/paymentApps の積で N*M 回 find していたのを抑制。
  const cardById = useMemo(() => byId(cards), [cards]);
  const pointCardById = useMemo(() => byId(pointCards), [pointCards]);
  const paymentAppById = useMemo(() => byId(paymentApps), [paymentApps]);
  const storeById = useMemo(() => byId(stores), [stores]);

  // membership を programId でグルーピング (programs × memberships の N×M ループを避ける)。
  const membershipsByProgram = useMemo(() => {
    const map = new Map<string, StoreProgramMembership[]>();
    for (const m of memberships) {
      const arr = map.get(m.programId);
      if (arr) arr.push(m);
      else map.set(m.programId, [m]);
    }
    return map;
  }, [memberships]);

  const cardLabelById = (id: string) => {
    const c = cardById.get(id);
    return c ? cardLabel(c) : id;
  };
  const pointCardNameById = (id: string) =>
    pointCardById.get(id)?.name ?? id;
  const paymentAppNameById = (id: string) =>
    paymentAppById.get(id)?.name ?? id;

  const now = new Date();

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      switch (filter) {
        case "all":
          return true;
        case "active":
          return isRuleActiveAt(p, now);
        case "inactive":
          return !isRuleActiveAt(p, now);
        case "campaign":
          return !!(p.validFrom || p.validTo);
        case "loyalty":
          return !!p.pointCardId;
        case "paymentapp":
          return !!p.paymentAppId;
        default:
          return true;
      }
    });
  }, [programs, filter, now]);

  const filterCounts = useMemo(() => {
    const active = programs.filter((p) => isRuleActiveAt(p, now)).length;
    return {
      all: programs.length,
      active,
      inactive: programs.length - active,
      campaign: programs.filter((p) => !!(p.validFrom || p.validTo)).length,
      loyalty: programs.filter((p) => !!p.pointCardId).length,
      paymentapp: programs.filter((p) => !!p.paymentAppId).length,
    };
  }, [programs, now]);

  const getMembershipsForProgram = (programId: string) =>
    membershipsByProgram.get(programId) ?? [];

  return (
    <section>
      <h2>プログラム</h2>
      <p className="hint">
        BenefitProgram: クレカ × 店舗、ポイントカード提示、支払方法 による還元プログラムの一覧。
        加盟店欄をクリックすると対象店舗が展開されます。
        <br />
        <small>
          「公式」バッジ: マスターデータ由来のプログラム。「addOn」: 他の還元に上乗せ加算。「primary」: 最高 rate を排他採用。
        </small>
      </p>

      {/* ─── フィルタータブ ─── */}
      <div className="campaign-tabs" style={{ marginBottom: 12 }}>
        {(
          [
            { key: "all", label: "全て" },
            { key: "active", label: "有効中" },
            { key: "inactive", label: "非アクティブ" },
            { key: "campaign", label: "期間限定" },
            { key: "loyalty", label: "ポイントカード提示" },
            { key: "paymentapp", label: "支払方法" },
          ] as { key: FilterKey; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            className={filter === key ? "active" : ""}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className="count">({filterCounts[key]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="hint">該当するプログラムがありません。</p>
      )}

      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>プログラム名</th>
              <th>対象カード / ポイントカード / 支払方法</th>
              <th>種別</th>
              <th>還元率</th>
              <th>貯まる通貨</th>
              <th>期間</th>
              <th>加盟店</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const active = isRuleActiveAt(p, now);
              const mems = getMembershipsForProgram(p.id);
              const global = mems.length === 0;
              const isExpanded = expandedId === p.id;

              return (
                <Fragment key={p.id}>
                  <tr
                    style={{ opacity: active ? 1 : 0.55 }}
                  >
                    {/* プログラム名 */}
                    <td data-label="プログラム名">
                      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {isMasterProgram(p.id) && !p.userModifiedAt && (
                          <span className="card-master-badge" title="公式マスター由来">公式</span>
                        )}
                        <span>{p.name}</span>
                        {!active && (
                          <span className="badge" style={{ background: "#9ca3af", fontSize: 11 }}>非アクティブ</span>
                        )}
                      </span>
                      {(() => {
                        const cleaned = sanitizeNoteForDisplay(p.notes);
                        return cleaned ? (
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                            {cleaned}
                          </div>
                        ) : null;
                      })()}
                      {(() => {
                        const url = p.entryUrl ?? p.officialUrl;
                        if (!url) return null;
                        const label = p.entryUrl ? "エントリー" : "公式";
                        return (
                          <div style={{ marginTop: 2 }}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="campaign-link"
                              title={url}
                              style={{ fontSize: 11 }}
                            >
                              🔗 {label}
                            </a>
                          </div>
                        );
                      })()}
                    </td>

                    {/* 対象カード / ポイントカード / 支払方法 */}
                    <td data-label="対象">
                      {p.cardIds && p.cardIds.length > 0 && (
                        <div>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>カード: </span>
                          {p.cardIds.map((id) => cardLabelById(id)).join(" / ")}
                        </div>
                      )}
                      {p.pointCardId && (
                        <div>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>提示: </span>
                          {pointCardNameById(p.pointCardId)}
                        </div>
                      )}
                      {p.paymentAppId && (
                        <div>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>支払: </span>
                          {paymentAppNameById(p.paymentAppId)}
                        </div>
                      )}
                      {!p.cardIds?.length && !p.pointCardId && !p.paymentAppId && (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      )}
                    </td>

                    {/* bonusType */}
                    <td data-label="種別">{bonusTypeBadge(p.bonusType)}</td>

                    {/* 還元率 */}
                    <td data-label="還元率">{(p.rate * 100).toFixed(2)}%</td>

                    {/* 貯まる通貨 */}
                    <td data-label="貯まる通貨">{currencyName(p.currencyId)}</td>

                    {/* 期間 */}
                    <td data-label="期間">
                      {p.validFrom || p.validTo || p.recurringDays ? (
                        <span title={active ? "今日有効" : "今日は対象外"}>
                          {active ? "✓ " : "○ "}
                          {formatRulePeriod(p)}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>常時</span>
                      )}
                    </td>

                    {/* 加盟店 */}
                    <td data-label="加盟店">
                      {global ? (
                        <span style={{ color: "#6b7280" }}>全店舗</span>
                      ) : (
                        <button
                          className={isExpanded ? "active" : ""}
                          style={{ fontSize: 12, padding: "2px 8px" }}
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                          title={isExpanded ? "閉じる" : `${mems.length} 件の加盟店を表示`}
                        >
                          {mems.length} 店舗 {isExpanded ? "▲" : "▼"}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* 展開行: 加盟店リスト */}
                  {isExpanded && (
                    <tr key={`${p.id}-expanded`} className="program-membership-row">
                      <td colSpan={7} className="program-membership-cell">
                        <div className="program-membership-body">
                          <strong className="program-membership-title">
                            加盟店一覧 ({mems.length} 件)
                          </strong>
                          <div className="program-membership-chips">
                            {mems.map((m) => {
                              const s = storeById.get(m.storeId);
                              const label = s?.name ?? m.storeId;
                              const hasOverride = m.overrideRate != null || m.overrideCurrencyId != null;
                              return (
                                <span
                                  key={m.storeId}
                                  className={`program-membership-chip${hasOverride ? " has-override" : ""}`}
                                  title={
                                    hasOverride
                                      ? `上書き: ${m.overrideRate != null ? `${(m.overrideRate * 100).toFixed(2)}%` : ""} ${m.overrideCurrencyId ?? ""}`.trim()
                                      : label
                                  }
                                >
                                  {label}
                                  {hasOverride && m.overrideRate != null && (
                                    <span className="program-membership-chip-rate">
                                      {(m.overrideRate * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
