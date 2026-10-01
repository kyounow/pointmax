// PR-6d (U6): アプリの最外殻。
//
//   - 最外の ErrorBoundary (scopeName="Root")。App のどこかで捕まらなかった描画例外は
//     root モードの復旧パネルになる (画面単位の境界は App.tsx の main 側)。
//   - persist の読み込み (hydrate) に失敗していたら App を描画せず、復旧パネルだけを出す。
//     App を描画しないので、壊れた生データを empty で上書きする最初の set() が起きない
//     (zustand persist は失敗しても state を empty のまま続行し、次の set() で persist キーを
//     上書きする。検知と退避は store.ts の onRehydrateStorage → hydrationGuard.ts)。
//   - DialogProvider は App 側だけに置く (復旧パネルは useDialog を使わない)。
//   - 新規プロファイルの公式データ投入 (seedIfEmpty) を App の描画より前に同期で 1 回行う。
//     App の useEffect (初回 paint の後) だけだと、カード 0 / 店舗 0 の空画面が 1 フレーム出る。
//     App 側の useEffect + onFinishHydration は非同期 storage の保険として残す (冪等)。
//     読み込み失敗時は App を描画しないので呼ばない (seedIfEmpty 自体も hasHydrated=false で no-op)。
// hydrate は store の生成時 (= import 時) に同期的に終わるので、最初の render で結果を読める。

import App from "./App";
import { DialogProvider } from "./ui/dialog/DialogProvider";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { RecoveryPanel } from "./ui/recovery/RecoveryPanel";
import { getHydrationFailure } from "./state/hydrationGuard";
import { useStore } from "./state/store";

export default function Root() {
  const failure = getHydrationFailure();
  // Root は props も state も持たないので render されるのはマウント時だけ (StrictMode の 2 回目は
  // seedIfEmpty の冪等性で no-op)。その時点では store の購読者 (App) がまだいないので set しても安全。
  if (!failure) useStore.getState().seedIfEmpty();
  return (
    <ErrorBoundary
      scopeName="Root"
      fallback={(e) => <RecoveryPanel mode="root" error={e} />}
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
