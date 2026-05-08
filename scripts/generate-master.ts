// ビルド時に seed から public/master.json を生成する。
// 出力先は .gitignore 済みで、ビルドのたびに最新状態に再生成される。
// GitHub Pages デプロイ後は https://<user>.github.io/<repo>/master.json で配信される。

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { seed, SEED_VERSION } from "../src/state/seed";

const data = {
  version: SEED_VERSION,
  generatedAt: new Date().toISOString(),
  ...seed(),
};

const target = resolve(process.cwd(), "public", "master.json");
mkdirSync(resolve(process.cwd(), "public"), { recursive: true });
writeFileSync(target, JSON.stringify(data, null, 2), "utf-8");

console.log(`✓ Wrote master.json (v${SEED_VERSION}) to ${target}`);
