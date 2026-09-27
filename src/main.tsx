import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Root from "./Root.tsx";
import { showStaticCrashFallback } from "./ui/recovery/staticFallback";

// PR-6d (U6): Root (最外の ErrorBoundary + 読み込み失敗時の復旧パネル + DialogProvider + App)。
// どの境界にも捕まらなかった例外 (復旧パネル自身の throw 等) は onUncaughtError で拾い、
// React の外に静的な再読み込み案内を出す (#root には書かない)。
createRoot(document.getElementById("root")!, {
  onUncaughtError: (error, info) => {
    console.error("[uncaught]", error, info.componentStack);
    showStaticCrashFallback();
  },
}).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
