// PR-6d (U6): React の外の最後の防衛線。
//
// createRoot の onUncaughtError (どの ErrorBoundary にも捕まらなかった例外 = Root 境界の
// fallback である RecoveryPanel 自身が throw した等) から呼ぶ。React はこの時点で root を
// アンマウントして画面が白くなるため、document.body に静的な DOM を append して再読み込みを促す。
// React が管理する #root には書き込まない (管理下の DOM を直接いじらない)。冪等。

const FALLBACK_ID = "pointmax-static-fallback";

export function showStaticCrashFallback(): void {
  try {
    if (document.getElementById(FALLBACK_ID)) return;
    const box = document.createElement("div");
    box.id = FALLBACK_ID;
    box.className = "recovery-panel";
    box.setAttribute("role", "alert");
    // 固定文言のみ (外部入力を含めない)
    box.innerHTML =
      "<p>エラーが発生しました。再読み込みしてください</p><button>再読み込み</button>";
    box.querySelector("button")!.onclick = () => window.location.reload();
    document.body.append(box);
  } catch {
    // 最後の防衛線なので、ここでの失敗は何もしない
  }
}
