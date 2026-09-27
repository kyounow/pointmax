// PR-6d (U6): アプリの最外殻。
//
//   - 最外の ErrorBoundary (scopeName="Root")。App のどこかで捕まらなかった描画例外は
//     root モードの復旧パネルになる (画面単位の境界は App.tsx の main 側)。
//   - persist の読み込み (hydrate) に失敗していたら App を描画せず、復旧パネルだけを出す。
//     App を描画しないので、壊れた生データを empty で上書きする最初の set() が起きない
//     (zustand persist は失敗しても state を empty のまま続行し、次の set() で persist キーを
//     上書きする。検知と退避は store.ts の onRehydrateStorage → hydrationGuard.ts)。
//   - DialogProvider は App 側だけに置く (復旧パネルは useDialog を使わない)。
// hydrate は store の生成時 (= import 時) に同期的に終わるので、最初の render で結果を読める。

import App from "./App";
import { DialogProvider } from "./ui/dialog/DialogProvider";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { RecoveryPanel } from "./ui/recovery/RecoveryPanel";
import { getHydrationFailure } from "./state/hydrationGuard";

export default function Root() {
  const failure = getHydrationFailure();
  return (
    <ErrorBoundary
      scopeName="Root"
      fallback={(e) => <RecoveryPanel mode="root" error={e} cause="render" />}
    >
      {failure ? (
        <RecoveryPanel mode="root" cause="hydrate" error={failure} />
      ) : (
        <DialogProvider>
          <App />
        </DialogProvider>
      )}
    </ErrorBoundary>
  );
}
