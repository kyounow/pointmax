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
//
// 使い方:
//   <ErrorBoundary scopeName="Calculator">
//     <CalculatorScreen />
//   </ErrorBoundary>
//
// 注意: React 19 でも ErrorBoundary は依然として class component が必要。
// Suspense と組合せ可能だが本実装は同期エラー専用。

import { Component, type ErrorInfo, type ReactNode } from "react";

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
      <div
        role="alert"
        style={{
          padding: 16,
          margin: 12,
          border: "1px solid var(--danger, #ef4444)",
          borderRadius: 8,
          background: "rgba(239, 68, 68, 0.08)",
        }}
      >
        <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>
          画面エラーが発生しました
          {this.props.scopeName && (
            <span style={{ fontWeight: 400, marginLeft: 6, color: "#9ca3af" }}>
              ({this.props.scopeName})
            </span>
          )}
        </h3>
        <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#9ca3af" }}>
          {error.message || "詳細不明のエラーです"}
        </p>
        <button
          type="button"
          onClick={this.reset}
          style={{
            padding: "6px 12px",
            fontSize: 13,
            background: "var(--accent-2, #2b7ad6)",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          再読み込み
        </button>
      </div>
    );
  }
}
