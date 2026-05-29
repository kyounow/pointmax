import { describe, it, expect } from "vitest";
import { computeBlockedCurrencyIds } from "./currencyGating";
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
      { id: "prog1", name: "p1", cardIds: ["c1"], rate: 0.02, currencyId: "amazon-pt" },
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
