// PR-3c (ONB-1): 非ブロッキングな 2 ステップ・オンボーディングチェックリスト。
//
// PR-1f の暫定オンボーディング box の正式版。計算画面上部の BannerSlot「onboarding 枠」
// に描画される (通知系バナーより最優先で 1 枚に統制される — bannerPriority 参照)。
//
// 【表示ライフサイクル】(判定は親 CalculatorScreen が保持)
//   ① 保有カードを選ぶ    — 完了: enabled===true のカードが 1 枚以上 (= hasHeldCards)
//   ② よく貯める通貨を選ぶ — 完了: preferredCurrencyIds が非空
//   - 各ステップに ✓ (完了) / 番号 (未完了) の視覚状態。
//   - 両方完了 → 親が onboardingActive=false にするので枠から自動的に消える。
//   - 「✕」手動クローズ → onClose (独立 localStorage キー) 経由で以後は再表示しない。
// 本コンポーネントは presentational (state を持たず props と navigate のみ)。

import { navigate } from "../../navigation";

type Props = {
  /** ① 保有カードを選ぶ の完了状態 (enabled カードが 1 枚以上)。 */
  step1Done: boolean;
  /** ② よく貯める通貨を選ぶ の完了状態 (preferredCurrencyIds 非空)。 */
  step2Done: boolean;
  /** 「✕」手動クローズ。親が localStorage フラグを立てて再表示を止める。 */
  onClose: () => void;
};

// 1 ステップの行。完了なら ✓ とラベルのみ、未完了なら番号 + 遷移ボタンを出す。
function ChecklistStep({
  index,
  done,
  label,
  ctaLabel,
  route,
}: {
  index: number;
  done: boolean;
  label: string;
  ctaLabel: string;
  route: string;
}) {
  return (
    <li className={`onboarding-step ${done ? "done" : ""}`}>
      <span className="onboarding-check" aria-hidden="true">
        {done ? "✓" : index}
      </span>
      <span className="onboarding-step-label">{label}</span>
      {done ? (
        <span className="onboarding-done-label">完了</span>
      ) : (
        <button type="button" onClick={() => navigate(route)}>
          {ctaLabel}
        </button>
      )}
    </li>
  );
}

export function OnboardingChecklist({ step1Done, step2Done, onClose }: Props) {
  return (
    <div className="onboarding-box" role="region" aria-label="はじめの設定">
      <div className="onboarding-header">
        <p className="onboarding-title">はじめに 2 ステップで準備しましょう</p>
        <button
          type="button"
          className="onboarding-close"
          onClick={onClose}
          aria-label="オンボーディングを閉じる"
          title="閉じる (以後は自動表示しません)"
        >
          ✕
        </button>
      </div>
      <ol className="onboarding-steps">
        <ChecklistStep
          index={1}
          done={step1Done}
          label="保有カードを選ぶ"
          ctaLabel="ウォレットを開く"
          route="wallet"
        />
        <ChecklistStep
          index={2}
          done={step2Done}
          label="よく貯める通貨を選ぶ"
          ctaLabel="通貨画面を開く"
          route="currencies"
        />
      </ol>
      <p className="hint" style={{ margin: "8px 0 0", fontSize: 13 }}>
        ウォレットで「使う」を ON にしたカードだけが計算対象になります。
      </p>
    </div>
  );
}
