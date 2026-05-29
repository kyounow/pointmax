// CI 専用の最小 lint config: React の Rules of Hooks 違反「だけ」を error として検出する。
//
// 背景 (v6.1.1 / PR #68):
//   src/ui/SyncUpdateModal.tsx で useRef/useEffect が `if (!visible) return null` の早期
//   return より後ろに置かれており、visible が true→false になる再レンダー (「アプリに反映」/
//   「閉じる」押下) で hook 数が減って React が "Rendered fewer hooks than expected" を
//   throw → ErrorBoundary 未捕捉でアプリ全体が白画面クラッシュした。
//   これは react-hooks/rules-of-hooks で静的検出できる ("called conditionally") が、
//   - CI (deploy.yml / bundle-size.yml) は test + build のみで lint を走らせていなかった
//   - 通常の `npm run lint` (eslint.config.js) は既存の多数の lint エラー
//     (scripts の prefer-const/no-unused-vars、set-state-in-effect、only-export-components 等)
//     で常時 exit 1 になり、そのままでは CI gating に使えなかった
//   ため検出をすり抜けた。
//
// 対策として rules-of-hooks 1 ルールだけを error にした本 config を用意し、
// `npm run lint:hooks` として CI で gating する。他ルールは意図的に無効のままなので、
// 既存の lint エラーに引っかからずグリーンを維持できる (本 class のバグ再発のみを確実に防止)。
//
// 補足: 既存 28 件の lint エラー解消 → `npm run lint` 全体の gating 化は別 follow-up。
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["src/**/*.{ts,tsx}"],
    // .tsx の型注釈等を解析するため TypeScript パーサが必須 (espree では parse error)。
    languageOptions: {
      parser: tseslint.parser,
    },
    // 本 config は exhaustive-deps 等を無効にしているため、ソース中の
    // `// eslint-disable-next-line react-hooks/exhaustive-deps` 等が「未使用ディレクティブ」
    // として警告になる。gate の出力をクリーンに保つため未使用ディレクティブ報告は off。
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    // rules-of-hooks のみ。recommended を extends すると set-state-in-effect 等も
    // 有効化され既存エラーで fail するため、意図的に単一ルールに絞る。
    rules: {
      "react-hooks/rules-of-hooks": "error",
    },
  },
]);
