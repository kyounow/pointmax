// PR-U5: モバイル表示とアクセシビリティの静的な約束 (index.html と App.css をファイルとして読む)。
//   - viewport-fit=cover (iOS PWA で env(safe-area-inset-*) を効かせる)
//   - 下部固定タブバーはホームインジケータ分の余白 (safe-area-inset-bottom) を持つ
//   - prefers-reduced-motion: reduce で transition / animation を無効化する
//   - 100vh は必ず直後に 100dvh の宣言を重ねる (未対応ブラウザは vh にフォールバック)
// App.css は vitest の CSS 無効化で ?raw import が空文字になるため、fs で読む
// (tsconfig.app は node の型を読まないので、使う関数だけ最小限の型を付ける)。
import { describe, it, expect } from "vitest";

type Fs = { readFileSync(path: URL, encoding: "utf8"): string };
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(id: "node:fs"): Fs };
  }
).process.getBuiltinModule("node:fs");
const read = (rel: string) =>
  fs.readFileSync(new URL(rel, import.meta.url), "utf8");

const indexHtml = read("../index.html");
const appCss = read("./App.css");

// "prop: value;" 単位に分解したときの宣言列 (コメントを除く)。
const declarations = appCss
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/[;{}]/)
  .map((s) => s.trim())
  .filter((s) => /^[a-z-]+\s*:/.test(s));

describe("モバイル表示の約束 (PR-U5)", () => {
  it("index.html の viewport に viewport-fit=cover がある", () => {
    const viewport = indexHtml.match(/<meta\s+name="viewport"\s+content="([^"]+)"/);
    expect(viewport).not.toBeNull();
    expect(viewport![1]).toContain("viewport-fit=cover");
  });

  it("下部固定タブバーは safe-area-inset-bottom の余白を持つ", () => {
    const bottomBar = appCss.match(/\n\.bottom-bar \{([^}]*)\}/);
    expect(bottomBar).not.toBeNull();
    expect(bottomBar![1]).toMatch(/padding[^;]*env\(safe-area-inset-bottom\)/);
  });

  it("prefers-reduced-motion: reduce で transition と animation を無効化する", () => {
    const block = appCss.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
    );
    expect(block).not.toBeNull();
    expect(block![1]).toMatch(/animation:\s*none\s*!important/);
    expect(block![1]).toMatch(/transition:\s*none\s*!important/);
  });

  it("100vh の宣言には直後に同じプロパティの 100dvh を重ねる", () => {
    const vh = declarations
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => /\b100vh\b/.test(d));
    expect(vh.length).toBeGreaterThan(0);
    for (const { d, i } of vh) {
      expect(declarations[i + 1]).toBe(d.replace(/\b100vh\b/g, "100dvh"));
    }
  });
});
