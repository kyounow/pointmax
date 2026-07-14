import { describe, it, expect } from "vitest";
import {
  stripProgramPreferenceKeys,
  buildMasterData,
} from "./generate-master";
import type { BenefitProgram } from "../src/domain/types";

// R1 横断規約 (PR-1d): master.json は per-user preference キー (enabled) と
// userModifiedAt を出荷しない。opt-in 特典は optIn:true のみ出荷する。

describe("stripProgramPreferenceKeys", () => {
  it("enabled / userModifiedAt を落とし、それ以外は保持する", () => {
    const programs: BenefitProgram[] = [
      {
        id: "prog-a",
        name: "A",
        scope: "all-stores",
        rate: 0.01,
        currencyId: "v-pt",
        optIn: true,
        enabled: true,
        userModifiedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const [out] = stripProgramPreferenceKeys(programs);
    expect("enabled" in out).toBe(false);
    expect("userModifiedAt" in out).toBe(false);
    // optIn / rate 等は維持される
    expect(out.optIn).toBe(true);
    expect(out.rate).toBe(0.01);
    expect(out.id).toBe("prog-a");
  });
});

describe("buildMasterData (R1 出荷契約)", () => {
  const data = buildMasterData();

  it("全 program が enabled / userModifiedAt を持たない", () => {
    for (const p of data.programs) {
      expect("enabled" in p, `${p.id} が enabled を出荷している`).toBe(false);
      expect("userModifiedAt" in p, `${p.id} が userModifiedAt を出荷している`).toBe(
        false,
      );
    }
  });

  it("opt-in 特典 (optIn:true) は出荷される (既定 OFF は評価式が担う)", () => {
    const optInIds = data.programs.filter((p) => p.optIn === true).map((p) => p.id);
    expect(optInIds).toContain("prog-olive-vpoint-up-selected-benefit");
    expect(optInIds).toContain("prog-epos-gp-selectable-pointup");
  });

  // R1 完成 (PR-1f): cards / pointCards / paymentApps も enabled を出荷しない
  // (v7 全 OFF 起点。preservePreferences の「キー不在→ローカル継承」が構造的に成立する)。
  it("全 card / pointCard / paymentApp が enabled を持たない", () => {
    for (const c of data.cards) {
      expect("enabled" in c, `card ${c.id} が enabled を出荷している`).toBe(false);
    }
    for (const p of data.pointCards) {
      expect("enabled" in p, `pointCard ${p.id} が enabled を出荷している`).toBe(
        false,
      );
    }
    for (const a of data.paymentApps) {
      expect("enabled" in a, `paymentApp ${a.id} が enabled を出荷している`).toBe(
        false,
      );
    }
  });
});
