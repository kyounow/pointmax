import { describe, it, expect } from "vitest";
import { tierFamilyOf } from "./tierFamily";
import { membershipId } from "./defineMemberships";

describe("tierFamilyOf (PR-0a-2c)", () => {
  it.each([
    ["prog-jcb-jpoint-gold-2x", "jcb-jpoint-gold", 2],
    ["prog-jcb-jpoint-2x", "jcb-jpoint", 2],
    ["prog-jcb-jpoint-gold-20x", "jcb-jpoint-gold", 20],
    ["prog-jcb-jpoint-20x", "jcb-jpoint", 20],
    ["prog-epos-tamaru-4x", "epos-tamaru", 4],
    ["prog-epos-tamaru-30x", "epos-tamaru", 30],
  ] as const)("%s → %s × %i", (programId, family, multiplier) => {
    expect(tierFamilyOf(programId)).toEqual({ family, multiplier });
  });

  it("W と Gold の同倍率は別系列 (末尾アンカーで一意に分かれる)", () => {
    expect(tierFamilyOf("prog-jcb-jpoint-2x")?.family).not.toBe(
      tierFamilyOf("prog-jcb-jpoint-gold-2x")?.family,
    );
  });

  it.each([
    membershipId("prog-jcb-jpoint-gold-2x", "takashimaya"), // membership id
    "prog-epos-gp-marui", // 倍率 tier ではない program
    "prog-jcb-jpoint-gold", // 倍率なし
    "prog-jcb-jpoint-gold-2", // x なし
    "prog-jcb-jpoint-gold-2x-extra", // 末尾に余分
    "prog-rakuten-pointcard-1pc",
    "",
  ])("tier 系列でない id は null: %s", (id) => {
    expect(tierFamilyOf(id)).toBeNull();
  });
});
