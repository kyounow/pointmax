import { describe, it, expect } from "vitest";
import {
  computeBlockedCurrencyIds,
  computeStrictBlockedCurrencyIds,
} from "./currencyGating";
import type { BenefitProgram, Card, PointCard } from "./types";

const card = (id: string, currency: string, enabled?: boolean): Card => ({
  id,
  name: id,
  defaultRate: 0.01,
  defaultCurrencyId: currency,
  enabled,
});
const pc = (id: string, currency: string, enabled?: boolean): PointCard => ({
  id,
  name: id,
  currencyId: currency,
  enabled,
});

describe("computeBlockedCurrencyIds", () => {
  it("disabled が 1 枚も無ければ空集合", () => {
    const blocked = computeBlockedCurrencyIds(
      [card("c1", "rakuten-pt")],
      [pc("p1", "d-pt")],
    );
    expect(blocked.size).toBe(0);
  });

  it("disabled pointCard の通貨をブロックする", () => {
    const blocked = computeBlockedCurrencyIds(
      [card("c1", "rakuten-pt")],
      [pc("p1", "d-pt", false)],
    );
    expect([...blocked]).toEqual(["d-pt"]);
  });

  it("disabled でも他の有効資産で貯まる通貨はブロックしない", () => {
    // d-pt は p1(disabled) だが card c2(enabled, default d-pt) で貯まる → ブロックしない
    const blocked = computeBlockedCurrencyIds(
      [card("c1", "rakuten-pt"), card("c2", "d-pt")],
      [pc("p1", "d-pt", false)],
    );
    expect(blocked.size).toBe(0);
  });

  it("同通貨に enabled / disabled pointCard が混在ならブロックしない", () => {
    const blocked = computeBlockedCurrencyIds(
      [],
      [pc("p1", "d-pt", false), pc("p2", "d-pt")],
    );
    expect(blocked.size).toBe(0);
  });

  it("enabled card の program 通貨は『貯まる』扱いでブロックしない", () => {
    const programs: BenefitProgram[] = [
      { id: "prog1", name: "p1", scope: "all-stores", cardIds: ["c1"], rate: 0.02, currencyId: "amazon-pt" },
    ];
    const blocked = computeBlockedCurrencyIds(
      [card("c1", "rakuten-pt")],
      [pc("p-amzn", "amazon-pt", false)],
      programs,
    );
    expect(blocked.size).toBe(0);
  });

  it("純粋な経由通貨 (pointCard 無し) はそもそもブロック対象外", () => {
    // x-pt にはどの pointCard も無い → blocked に現れない
    const blocked = computeBlockedCurrencyIds(
      [card("c1", "rakuten-pt")],
      [pc("p1", "d-pt", false)],
    );
    expect(blocked.has("x-pt")).toBe(false);
  });
});

describe("computeStrictBlockedCurrencyIds (EdgesScreen 用の強い除外)", () => {
  it("有効クレカが同通貨を貯めても OFF の pointCard 通貨を block する (通常との対比)", () => {
    const cards = [card("c1", "rakuten-pt")]; // 楽天カード相当 (enabled)
    const pcs = [pc("p1", "rakuten-pt", false)]; // 楽天ポイントカード OFF
    // 通常 (Calculator) は有効クレカで救済 → block しない
    expect(computeBlockedCurrencyIds(cards, pcs).size).toBe(0);
    // 強い (EdgesScreen) はクレカで救済しない → block する
    expect([...computeStrictBlockedCurrencyIds(pcs)]).toEqual(["rakuten-pt"]);
  });

  it("有効な別 pointCard が同通貨を持つ場合は救済 (block しない)", () => {
    const pcs = [pc("p1", "d-pt", false), pc("p2", "d-pt")];
    expect(computeStrictBlockedCurrencyIds(pcs).size).toBe(0);
  });

  it("disabled な pointCard が無ければ空集合", () => {
    expect(computeStrictBlockedCurrencyIds([pc("p1", "d-pt")]).size).toBe(0);
  });

  it("OFF の通貨を複数 block する", () => {
    const pcs = [
      pc("p1", "rakuten-pt", false),
      pc("p2", "v-pt", false),
      pc("p3", "ponta-pt"), // enabled → 含まれない
    ];
    const blocked = computeStrictBlockedCurrencyIds(pcs);
    expect(blocked.has("rakuten-pt")).toBe(true);
    expect(blocked.has("v-pt")).toBe(true);
    expect(blocked.has("ponta-pt")).toBe(false);
  });
});
