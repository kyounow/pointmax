// BenefitsScreen.tsx — 改善プラン Phase 2 PR-2c
// ProgramsScreen (全 program 一覧 + opt-in トグル + 加盟店展開) と
// CampaignsScreen (期間分類 + 終了カウントダウン + 手動登録 + 自作分削除) を
// 同一エンティティ BenefitProgram の 1 画面「特典・キャンペーン」に統合する。
//
// 統合方針:
//   - フィルタを一本化 (すべて / 常設 / 期間限定(有効中) / 期限切れ / 未来開始 /
//     ポイントカード提示 / 決済アプリ / opt-in 特典)。件数バッジ付き (benefitsFilter)。
//   - 一覧行は両画面の情報を合流: 状態バッジ / 名前(公式・種別・条件・メモ・リンク) /
//     発動主体 / 還元率 / 通貨 / 期間(+終了カウントダウン) / opt-in「使う」トグル /
//     加盟店展開 / 自作分の削除。
//   - 手動キャンペーン登録フォーム (CampaignForm) は画面下部の <details> に配置 (既定閉)。
//   - useToday / isRuleActiveAt / classifyCampaignStatus / useNameResolvers は共有ロジックを流用。

import { Fragment, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../state/store";
import { isMasterProgram } from "../state/seed";
import {
  isRuleActiveAt,
  formatRulePeriod,
  daysUntilValidTo,
} from "../domain/ruleActiveAt";
import {
  BENEFIT_FILTERS,
  classifyProgramPeriod,
  countBenefitFilters,
  matchesBenefitFilter,
  type BenefitFilterKey,
  type PeriodClass,
} from "./benefits/benefitsFilter";
import { CampaignForm } from "./benefits/CampaignForm";
import { useNameResolvers } from "./hooks/useNameResolvers";
import { useToday } from "./hooks/useToday";
import { useDialog } from "./dialog/useDialog";
import { cardLabel } from "../domain/cardLabel";
import { sanitizeNoteForDisplay } from "../domain/noteParser";
import { byId } from "../domain/entityIndex";
import { isSafeHttpUrl } from "../domain/urlSafety";
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

// 期間分類バッジ (常設/有効中/期限切れ/未来開始)。CampaignsScreen の campaign-status
// スタイルを流用 (permanent は ongoing スタイル = 📌)。
function periodBadge(cls: PeriodClass) {
  switch (cls) {
    case "permanent":
      return (
        <span className="campaign-status ongoing" title="常設 (終了予定なし)">
          📌 常設
        </span>
      );
    case "active":
      return (
        <span className="campaign-status active" title="現在キャンペーン期間内">
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

// 終了日カウントダウン (C-5)。あと 7 日以内は warning、3 日以内は urgent。
// 期限切れ / validTo 無しは何も出さない (呼び出し側で分岐)。
function countdown(validTo: string, today: Date) {
  const days = daysUntilValidTo(validTo, today);
  if (days === null || days < 0) return null;
  const cls = days <= 3 ? "urgent" : days <= 7 ? "warning" : "";
  return (
    <span
      className={`rule-days-left ${cls}`}
      title={days === 0 ? "今日 23:59:59 まで" : `あと ${days} 日で終了`}
    >
      {days === 0 ? "本日まで" : `あと${days}日`}
    </span>
  );
}

export function BenefitsScreen() {
  const {
    programs,
    memberships,
    cards,
    stores,
    pointCards,
    paymentApps,
    removeUserProgram,
  } = useStore(
    useShallow((s) => ({
      programs: s.programs,
      memberships: s.memberships,
      cards: s.cards,
      stores: s.stores,
      pointCards: s.pointCards,
      paymentApps: s.paymentApps,
      removeUserProgram: s.removeUserProgram,
    })),
  );
  // opt-in 特典の「使う」トグル (PR-1d、action は stable ref)。
  const setProgramEnabled = useStore((s) => s.setProgramEnabled);
  const dialog = useDialog();

  const [filter, setFilter] = useState<BenefitFilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 手動登録フォームの開閉。<details> を自前 state で制御し、閉じている間は
  // CampaignForm 本体 (全店舗チェックリスト) を mount しない (遅延生成)。
  const [formOpen, setFormOpen] = useState(false);

  const { currencyName } = useNameResolvers();

  // O(1) lookup 用の index (programs × cards/pointCards/paymentApps の積を避ける)。
  const cardById = useMemo(() => byId(cards), [cards]);
  const pointCardById = useMemo(() => byId(pointCards), [pointCards]);
  const paymentAppById = useMemo(() => byId(paymentApps), [paymentApps]);
  const storeById = useMemo(() => byId(stores), [stores]);

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
  const pointCardNameById = (id: string) => pointCardById.get(id)?.name ?? id;
  const paymentAppNameById = (id: string) => paymentAppById.get(id)?.name ?? id;

  // useToday: 同じ暦日の間は参照固定、日付が変わると自動更新 (C-2)。
  // フィルタ件数・期間分類・行の dim 表示の基準時刻を画面全体で統一する。
  const now = useToday();

  const filtered = useMemo(() => {
    const base = programs.filter((p) => matchesBenefitFilter(p, filter, now));
    // 「期間限定 (有効中)」だけは終了が近い順にソート (C-5: 使い逃し防止)。
    // 他フィルタは登録順のまま。validTo なし (null) は末尾へ。
    if (filter !== "active") return base;
    return [...base].sort((a, b) => {
      const da = daysUntilValidTo(a.validTo, now);
      const db = daysUntilValidTo(b.validTo, now);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [programs, filter, now]);

  const filterCounts = useMemo(
    () => countBenefitFilters(programs, now),
    [programs, now],
  );

  const getMembershipsForProgram = (programId: string) =>
    membershipsByProgram.get(programId) ?? [];

  return (
    <section>
      <h2>特典・キャンペーン</h2>
      <p className="hint">
        BenefitProgram: クレカ × 店舗、ポイントカード提示、決済アプリ による還元プログラム
        (常設特典 + 期間限定キャンペーン) の一覧。加盟店欄をクリックすると対象店舗が展開されます。
        <br />
        <small>
          「公式」バッジ: マスターデータ由来。「addOn」: 他の還元に上乗せ加算。「primary」: 最高 rate を排他採用。
          期間限定は<strong>最高 rate</strong>が採用され、期間外は通常還元に戻ります (終了日 = その日の 23:59:59 まで)。
          <br />
          「選択制」の特典 (Olive 選べる特典・エポス選べるポイントアップ等) は既定 OFF です。
          対象を登録・選択している場合は「使う」を ON にすると計算に反映されます。
          見つけたキャンペーンは下の「キャンペーンを手動登録」で自分のデータとして追加できます (自作分のみ削除可)。
        </small>
      </p>

      {/* ─── 統合フィルタ (単一のフィルタ行) ─── */}
      <div className="campaign-tabs" style={{ marginBottom: 12 }}>
        {BENEFIT_FILTERS.map(({ key, label }) => (
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
              <th>状態</th>
              <th>プログラム名</th>
              <th>対象カード / ポイントカード / 決済アプリ</th>
              <th>還元率</th>
              <th>貯まる通貨</th>
              <th>期間</th>
              <th>使う</th>
              <th>加盟店</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const active = isRuleActiveAt(p, now);
              const periodCls = classifyProgramPeriod(p, now);
              const mems = getMembershipsForProgram(p.id);
              const global = mems.length === 0;
              const isExpanded = expandedId === p.id;
              const master = isMasterProgram(p.id);

              return (
                <Fragment key={p.id}>
                  <tr style={{ opacity: active ? 1 : 0.55 }}>
                    {/* 状態 */}
                    <td data-label="状態">{periodBadge(periodCls)}</td>

                    {/* プログラム名 (+ 公式 / 種別 / 条件 / メモ / リンク) */}
                    <td data-label="プログラム名">
                      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {master && !p.userModifiedAt && (
                          <span className="card-master-badge" title="公式マスター由来">公式</span>
                        )}
                        <span>{p.name}</span>
                        {bonusTypeBadge(p.bonusType)}
                        {!active && (
                          <span className="badge" style={{ background: "#9ca3af", fontSize: 11 }}>非アクティブ</span>
                        )}
                      </span>
                      {p.conditions && (
                        <div
                          style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}
                          title="このプログラムの適用条件"
                        >
                          ⚠ 条件: {p.conditions}
                        </div>
                      )}
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
                        if (!url || !isSafeHttpUrl(url)) return null;
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

                    {/* 発動主体: 対象カード / ポイントカード / 決済アプリ */}
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

                    {/* 還元率 */}
                    <td data-label="還元率">{(p.rate * 100).toFixed(2)}%</td>

                    {/* 貯まる通貨 */}
                    <td data-label="貯まる通貨">{currencyName(p.currencyId)}</td>

                    {/* 期間 (常設 or 期間 + 終了カウントダウン) */}
                    <td data-label="期間">
                      {p.validFrom || p.validTo || p.recurringDays || p.recurringWeekdays ? (
                        <span>
                          <span title={active ? "今日有効" : "今日は対象外"}>
                            {active ? "✓ " : "○ "}
                            {formatRulePeriod(p)}
                          </span>
                          {/* 期間限定 (validTo あり・未終了) のみカウントダウン */}
                          {p.validTo && periodCls === "active" && (
                            <> {countdown(p.validTo, now)}</>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>常設</span>
                      )}
                    </td>

                    {/* 使う (opt-in トグル、対象のみ) */}
                    <td data-label="使う">
                      {p.optIn === true ? (
                        <label
                          className={`card-enabled-toggle ${p.enabled === true ? "is-on" : "is-off"}`}
                        >
                          <input
                            type="checkbox"
                            checked={p.enabled === true}
                            onChange={(e) =>
                              setProgramEnabled(p.id, e.target.checked)
                            }
                          />
                          <span>{p.enabled === true ? "使う" : "OFF"}</span>
                        </label>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      )}
                    </td>

                    {/* 加盟店 (展開) */}
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

                    {/* 操作 (自作分のみ削除。公式分は削除不可) */}
                    <td data-label="操作">
                      {master ? (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      ) : (
                        <button
                          className="danger"
                          onClick={async () => {
                            const ok = await dialog.confirm({
                              title: "キャンペーンを削除",
                              message: `「${p.name}」と対象店舗との紐付けを削除します。よろしいですか?`,
                              okText: "削除する",
                              danger: true,
                            });
                            if (ok) removeUserProgram(p.id);
                          }}
                        >
                          削除
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* 展開行: 加盟店リスト */}
                  {isExpanded && (
                    <tr key={`${p.id}-expanded`} className="program-membership-row">
                      <td colSpan={9} className="program-membership-cell">
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

      {/* ─── 手動キャンペーン登録 (既定閉、画面下部) ─── */}
      {/* open は自前 state で制御 (summary onClick で preventDefault + toggle)。
          native の toggle event に依存せず、閉じている間は本体を mount しない。 */}
      <details
        className="benefits-manual-form"
        style={{ marginTop: 16 }}
        open={formOpen}
      >
        <summary
          style={{ cursor: "pointer", fontWeight: 600 }}
          onClick={(e) => {
            e.preventDefault();
            setFormOpen((v) => !v);
          }}
        >
          キャンペーンを手動登録
        </summary>
        {formOpen && (
          <>
            <p className="hint" style={{ marginTop: 6 }}>
              cron が拾えない店頭・アプリ内告知のキャンペーン用。「発動の種類 (決済アプリ /
              ポイントカード提示 / クレカ) × 還元率 × 期間 × 曜日限定 × 複数店舗」を
              自分のデータとして一括登録できます (自作分のみ削除可)。
            </p>
            <CampaignForm embedded />
          </>
        )}
      </details>
    </section>
  );
}
