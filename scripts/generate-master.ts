// ビルド時に seed から public/master.json を生成する。
// 出力先は .gitignore 済みで、ビルドのたびに最新状態に再生成される。
// GitHub Pages デプロイ後は https://<user>.github.io/<repo>/master.json で配信される。

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seed, SEED_VERSION } from "../src/state/seed";
import type { BenefitProgram } from "../src/domain/types";

// R1 横断規約 (PR-1d): seed/master は per-user preference キー (enabled) と編集
// トラッキング (userModifiedAt) を **出荷しない**。これらはユーザー所有キーで、
// 全上書き同期 (syncFromUrl) / 更新伝播 (mergeSeed) の carry-over が「incoming に
// キーが無い」ことを前提に成立する (キーを出荷すると opt-in ON が公式値で巻き戻る)。
// opt-in 特典は optIn:true のみ出荷し、既定 OFF は評価式 (isProgramPreferenceActive) が担う。
export function stripProgramPreferenceKeys(
  programs: BenefitProgram[],
): BenefitProgram[] {
  return programs.map((p) => {
    const next: BenefitProgram = { ...p };
    delete next.enabled;
    delete next.userModifiedAt;
    return next;
  });
}

// master.json に書き出すオブジェクトを構築する (副作用なし = テストから呼べる)。
export function buildMasterData() {
  const seedData = seed();
  return {
    version: SEED_VERSION,
    generatedAt: new Date().toISOString(),
    ...seedData,
    // R1: programs から enabled / userModifiedAt を strip して出荷。
    programs: stripProgramPreferenceKeys(seedData.programs),
  };
}

function writeMaster(): void {
  const data = buildMasterData();
  const target = resolve(process.cwd(), "public", "master.json");
  mkdirSync(resolve(process.cwd(), "public"), { recursive: true });
  writeFileSync(target, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✓ Wrote master.json (v${SEED_VERSION}) to ${target}`);
}

// スクリプトとして直接実行された時のみ書き込む (import 時は副作用なし)。
// prebuild / predev は `tsx scripts/generate-master.ts` で本ファイルを直接起動する。
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeMaster();
}
