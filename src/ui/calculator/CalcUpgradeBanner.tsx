// CalculatorScreen の「未使用ポイントカードを有効化すればもっとお得」提案バナー (v6.0.0)。
// rankCards が返す ScopeUpgrade を受け取り、現最適 (CalcLoyaltyBanner) の直下に表示する。
// 現最適 = 確定情報、本バナー = 「使えば得する」仮定情報、として層を分ける。

import type { ScopeUpgrade } from "../../domain/rankCards";
import type { Currency } from "../../domain/types";
import { formatNum } from "../../domain/formatNum";

type Props = {
  upgrade: ScopeUpgrade;
  activeCurrencyId: string;
  currencyById: Map<string, Currency>;
  currencyName: (id: string) => string;
};

export function CalcUpgradeBanner({
  upgrade,
  activeCurrencyId,
  currencyById,
  currencyName,
}: Props) {
  const { deltaFinalAmount, loyaltyDelta, routeDelta, addedLoyalties, unlockCurrencyIds } =
    upgrade;
  const targetName = currencyName(activeCurrencyId);

  // 内訳テキスト (二重取り / ルート改善) を組み立て
  const parts: string[] = [];
  if (loyaltyDelta > 0) parts.push(`二重取り +${formatNum(loyaltyDelta)}`);
  if (routeDelta > 0) parts.push(`ルート改善 +${formatNum(routeDelta)}`);

  return (
    <div className="upgrade-banner">
      <div className="upgrade-banner-title">
        💡 未使用のポイントカードを有効化すると{" "}
        <strong>+{formatNum(deltaFinalAmount)} {targetName}</strong>
        {parts.length > 0 && (
          <small className="upgrade-banner-breakdown">（{parts.join(" / ")}）</small>
        )}
      </div>

      {addedLoyalties.length > 0 && (
        <ul className="upgrade-banner-list">
          {addedLoyalties.map((l) => (
            <li key={l.pointCard.id}>
              <strong>{l.pointCard.name}</strong> を提示すると{" "}
              {(l.rule.rate * 100).toFixed(2)}% →{" "}
              {l.reachable ? (
                <>+{formatNum(l.finalAmount)} {targetName}</>
              ) : (
                <>+{formatNum(l.earnedAmount)} {currencyName(l.earnedCurrencyId)}</>
              )}
            </li>
          ))}
        </ul>
      )}

      {unlockCurrencyIds.length > 0 && (
        <div className="upgrade-banner-route">
          交換ルート改善:{" "}
          {unlockCurrencyIds
            .map((id) => currencyById.get(id)?.name ?? id)
            .join(" / ")}{" "}
          を使い始めるとより効率的な交換ルートが開きます
        </div>
      )}

      <div className="upgrade-banner-cta">
        「ポイントカード」画面で<strong>「使う」を ON</strong> にすると反映されます
      </div>
    </div>
  );
}
