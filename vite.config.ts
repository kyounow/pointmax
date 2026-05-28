import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages にデプロイする時はリポジトリ名がベースパスになる。
// VITE_BASE 環境変数で上書き可能（ローカル開発時は "/"）。
const base = process.env.VITE_BASE ?? "/";

// https://vite.dev/config/
export default defineConfig({
  base,
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
        manualChunks(id: string) {
          if (id.includes("@xyflow/react")) return "xyflow";
          if (
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          return undefined;
        },
      },
    },
  },
});
