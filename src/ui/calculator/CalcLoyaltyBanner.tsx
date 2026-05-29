// CalculatorScreen から切り出した「ポイントカード併用 (二重/三重取り)」バナー (Wave 6 B-2)。
// 動作不変リファクタ。loyalties が空なら親側で非表示にするので、ここでは描画前提。

import type { LoyaltyResult } from "../../domain/loyalty";
import type { Currency } from "../../domain/types";
import { formatNum } from "../../domain/formatNum";
import { formatRatio } from "../../domain/currencyKind";
import { NodePill } from "../NodePill";
import { RuleStatusBadge } from "../RuleStatusBadge";
import { NoteChips } from "../NoteChips";

type Props = {
  loyalties: LoyaltyResult[];
  activeCurrencyId: string;
  currencyById: Map<string, Currency>;
  currencyName: (id: string) => string;
  cardName: (id: string) => string;
};

export function CalcLoyaltyBanner({
  loyalties,
  activeCurrencyId,
  currencyById,
  currencyName,
  cardName,
}: Props) {
  if (loyalties.length === 0) return null;

  return (
    <div className="loyalty-banner">
      <div className="loyalty-banner-title">
        ポイントカード併用
        {loyalties.length > 1
          ? `（${loyalties.length}枚を同時提示・三重取り）`
          : `（${loyalties[0].pointCard.name}）`}
      </div>
      {loyalties.map((loyalty, idx) => (
        <div className="loyalty-banner-body" key={loyalty.rule.id}>
          {loyalties.length > 1 && (
            <span className="loyalty-stack-tag">{idx + 1}枚目</span>
          )}
          <span className="loyalty-rate">
            {loyalties.length > 1 && (
              <>
                <strong>{loyalty.pointCard.name}</strong>{" "}
              </>
            )}
            還元率 {(loyalty.rule.rate * 100).toFixed(2)}% →{" "}
            {formatNum(loyalty.earnedAmount)}{" "}
            {currencyName(loyalty.earnedCurrencyId)}
            <RuleStatusBadge
              validFrom={loyalty.rule.validFrom}
              validTo={loyalty.rule.validTo}
              style={{ marginLeft: 6 }}
            />
            <NoteChips notes={loyalty.rule.notes} />
          </span>
          <span className="path-line">
            <NodePill currency={currencyById.get(loyalty.earnedCurrencyId)} />
            {loyalty.pathSteps.map((step) => (
              <span key={step.id} className="path-segment">
                <span className="arrow">
                  →<small>{formatRatio(step.rate)}</small>
                </span>
                {step.requiredCardIds?.length ? (
                  <small
                    className="step-required-card"
                    title="この交換ステップにこのカード保有が必要です"
                  >
                    (要 {step.requiredCardIds.map(cardName).join(" / ")})
                  </small>
                ) : null}
                <NodePill currency={currencyById.get(step.toCurrencyId)} />
              </span>
            ))}
          </span>
          {loyalty.reachable ? (
            <strong className="final" style={{ marginLeft: "auto" }}>
              +{formatNum(loyalty.finalAmount)} {currencyName(activeCurrencyId)}
            </strong>
          ) : (
            <small className="hint">
              {currencyName(loyalty.earnedCurrencyId)} から{" "}
              {currencyName(activeCurrencyId)} へのルート未登録（合算は0扱い）
            </small>
          )}
        </div>
      ))}
    </div>
  );
}
