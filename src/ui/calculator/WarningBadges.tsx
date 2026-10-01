// PR-6b: 警告チップの描画部品。通常ビュー (CalcResultCard の展開ビュー) と円換算ビュー
// (CalcYenResults の各行) が同じ見た目・同じ判定 (buildWarningPlan = rankWarningChips の出力) で
// 描画するための共通コンポーネント。描画するかどうかは plan.shown (警告予算の内側) だけで決める。

import type { MinUnitAnnotation } from "../../domain/rankCards";
import type { StaleWarning, WarningPlan } from "../../domain/warningChips";
import { formatNum } from "../../domain/formatNum";
import { RuleStatusBadge } from "../RuleStatusBadge";
import { NoteChips } from "../NoteChips";

/**
 * result-meta 行の警告: 採用 program の期間バッジ (RuleStatusBadge) + 条件チップ (NoteChips) +
 * 『⚠ 上限』+『⚠ 要エントリー』(entryUrl があれば別タブ起動のリンク)。
 */
export function MetaWarnings({ plan }: { plan: WarningPlan }) {
  const p = plan.program;
  const entry = plan.entry;
  return (
    <>
      {p && (
        <>
          <RuleStatusBadge
            validFrom={p.validFrom}
            validTo={p.validTo}
            style={{ marginLeft: 4 }}
          />
          {/* PR-0a-2b (M3): notes は従来どおり詳細ボタン付き。conditions /
              membership.notes 由来はチップが出るときだけ (詳細ボタンの対象外)。 */}
          <NoteChips
            notes={p.notes}
            chipNotes={plan.chipNotes}
            visibleKinds={plan.noteKinds}
          />
          {p.monthlyCapAmountYen && plan.shown.has("capBadge") && (
            <span
              className="cap-warn"
              title="この還元率には月間/年間の上限があります"
            >
              ⚠ 上限 {p.monthlyCapAmountYen.toLocaleString()}円/月
            </span>
          )}
        </>
      )}
      {entry &&
        plan.shown.has("entryBadge") &&
        (entry.entryUrl ? (
          <a
            className="entry-warn entry-warn-link"
            href={entry.entryUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={entry.title}
          >
            ⚠ 要エントリー
          </a>
        ) : (
          <span className="entry-warn" title={entry.title}>
            ⚠ 要エントリー
          </span>
        ))}
    </>
  );
}

/** 『⚠ 古い情報かも (最終確認 YYYY-MM)』(内訳は title)。 */
export function StaleWarnChip({ stale }: { stale: StaleWarning }) {
  return (
    <span className="rate-chip route-stale-chip" title={stale.title}>
      ⚠ 古い情報かも (最終確認 {stale.oldest})
    </span>
  );
}

/** 最低交換単位 (端数) の注記。複数 edge の注記は警告予算上 1 枠。 */
export function MinUnitChips({
  annotations,
  currencyName,
}: {
  annotations: readonly MinUnitAnnotation[];
  currencyName: (id: string) => string;
}) {
  return (
    <>
      {annotations.map((a) => (
        <span
          key={a.edgeId}
          className="rate-chip minunit-chip"
          title="この交換には最低交換単位があります。少額では単位に満たないため、貯めてから交換してください (経路選択には影響しません)。"
        >
          {currencyName(a.fromCurrencyId)} は {formatNum(a.minFromUnits)}{" "}
          貯めてから交換 (最低交換単位)
        </span>
      ))}
    </>
  );
}
