import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages にデプロイする時はリポジトリ名がベースパスになる。
// VITE_BASE 環境変数で上書き可能（ローカル開発時は "/"）。
const base = process.env.VITE_BASE ?? "/";

// PR-4b (UX-8(3)): ビルドごとに変わる識別子。SW 更新後の初回起動を検知して
// 「アプリを更新しました」バナーを 1 回出すのに使う (src/state/swUpdateNotice.ts)。
// vite build (デプロイ) のたびに新しい値になる。CI で固定したい場合は VITE_BUILD_ID で上書き可。
const buildId = process.env.VITE_BUILD_ID ?? new Date().toISOString();

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    // グローバル定数として埋め込む (swUpdateNotice.ts が declare で参照)。
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg"],
      manifest: {
        name: "PointMax",
        short_name: "PointMax",
        description:
          "クレジットカード・ポイントカードからの還元と交換ルートを最適化",
        theme_color: "#0f1115",
        background_color: "#0f1115",
        display: "standalone",
        orientation: "portrait",
        lang: "ja",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // React Flow / xyflow の動的import を含むので大きめに
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // 大型依存を別 chunk に切り出して初期 bundle を軽量化。
        // - xyflow: グラフ画面 (EdgesScreen) でのみ使う、Calculator/Cards/Stores では不要
        // - react-vendor: React core (react / react-dom) を分離してブラウザキャッシュ効果を最大化
        // - seed-data: seed マスタデータ群 (v6 トレイン PR-1a で分離)。コードと違い
        //   データは cron 追加で単調増加するため、main chunk の 300 KiB ガードから
        //   切り離す (eager import のままなので読み込みタイミングは不変)
        manualChunks(id: string) {
          if (id.includes("@xyflow/react")) return "xyflow";
          if (
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          if (
            id.includes("/src/state/seed-data-") ||
            id.includes("/src/state/seed-additions")
          ) {
            return "seed-data";
          }
          return undefined;
        },
      },
    },
  },
});
