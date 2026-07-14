import { useRoute, navigate } from "../navigation";
import {
  resolveWalletSection,
  walletSectionHash,
  type WalletSection,
} from "./wallet/walletRoute";
import { WalletCardsSection } from "./wallet/WalletCardsSection";
import { WalletPointCardsSection } from "./wallet/WalletPointCardsSection";
import { WalletPaymentAppsSection } from "./wallet/WalletPaymentAppsSection";

// 改善プラン PR-2b1: 同型 3 画面 (カード / ポイントカード / 支払方法) を「ウォレット」
// 1 タブに統合。セクションは hash sub (#wallet[/point-cards|/payment-apps]) で表現し、
// 切替は navigate で hash を更新する (リロード・戻る/進むが自動で効く)。
const SEGMENTS: { id: WalletSection; label: string }[] = [
  { id: "cards", label: "クレジットカード" },
  { id: "point-cards", label: "ポイントカード" },
  { id: "payment-apps", label: "支払方法" },
];

export function WalletScreen() {
  const route = useRoute();
  const section = resolveWalletSection(route);
  // ?highlight=<cardId|familyId> は該当セクションの item を一時ハイライトする
  // (後続 PR の導線用)。空文字は undefined 扱い。
  const highlightId = route.params.get("highlight") || undefined;

  return (
    <section>
      {/* UX-8(1) / PR-2e: role=tablist/tab は tabpanel を伴わない orphan ARIA だった
          ため撤去。「選択中」セクションは aria-current で表現する。 */}
      <div
        className="campaign-tabs wallet-segments"
        style={{ marginBottom: 16 }}
        role="group"
        aria-label="ウォレットの種類"
      >
        {SEGMENTS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-current={section === id ? "true" : undefined}
            className={section === id ? "active" : ""}
            onClick={() => navigate(walletSectionHash(id))}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "cards" && <WalletCardsSection highlightId={highlightId} />}
      {section === "point-cards" && (
        <WalletPointCardsSection highlightId={highlightId} />
      )}
      {section === "payment-apps" && (
        <WalletPaymentAppsSection highlightId={highlightId} />
      )}
    </section>
  );
}
