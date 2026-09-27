// PointMax: 画面単位の Error Boundary (Wave 4 B-6 audit-fix)
//
// 背景:
//   App ルートや各 Screen で予期しない例外が発生すると white-screen of death になり、
//   ユーザーは「アプリが落ちた」と感じてリロードを強いられる。さらに開発側も実発生を
//   早期に検知できず silent failure を許す。
//
// 対応:
//   class ErrorBoundary で componentDidCatch / getDerivedStateFromError をフック、
//   fallback UI を出して「再読み込み」CTA を提供。console.error にもログ。
//   PR-6d (U6): 既定 fallback は復旧パネル (RecoveryPanel の screen モード。ページ再読み込み /
//   もう一度試す / データの書き出し・コピー・直前の状態に戻す・公式データで初期化)。
//   任意 UI (同期モーダル / 更新バナー / BannerSlot) は fallback={() => null} で非表示に縮退させる。
//
// 使い方:
//   <ErrorBoundary scopeName="Calculator">
//     <CalculatorScreen />
//   </ErrorBoundary>
//
// 注意: React 19 でも ErrorBoundary は依然として class component が必要。
// Suspense と組合せ可能だが本実装は同期エラー専用。

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RecoveryPanel } from "./recovery/RecoveryPanel";

type Props = {
  /** デバッグ用の scope 名。fallback UI と console.error に表示される。 */
  scopeName?: string;
  /** カスタム fallback を渡したい場合。省略時はデフォルト UI。 */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 本番では Sentry 等へ送るのが理想だが、現状は console.error に詳細を残す
    console.error(
      `[ErrorBoundary${this.props.scopeName ? ` / ${this.props.scopeName}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <RecoveryPanel
        mode="screen"
        error={error}
        scopeName={this.props.scopeName}
        cause="render"
        onRetry={this.reset}
      />
    );
  }
}
