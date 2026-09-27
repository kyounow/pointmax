import { describe, it, expect } from "vitest";
import { seedFreshness } from "./seedFreshness";
import { seed } from "./seed";

// PR-5a: 確認月を同梱 seed から解決する resolver (resolveVerifiedMonth + getSeed*)。
describe("seedFreshness (同梱 seed 参照の確認月)", () => {
  const S = seed();

  it("edge: ローカルが未記入・古い月でも、rate が seed と一致すれば seed の月を使う", () => {
    const official = S.edges.find((e) => e.lastVerifiedAt !== undefined);
    if (!official) throw new Error("lastVerifiedAt を持つ seed edge が無い");
    expect(
      seedFreshness.edgeMonth({ ...official, lastVerifiedAt: undefined }),
    ).toBe(official.lastVerifiedAt);
    expect(
      seedFreshness.edgeMonth({ ...official, lastVerifiedAt: "2024-01" }),
    ).toBe(official.lastVerifiedAt);
  });

  it("edge: rate が seed と違えば (旧 rate のまま / 手編集) ローカルの月", () => {
    const official = S.edges[0];
    expect(
      seedFreshness.edgeMonth({
        ...official,
        rate: official.rate + 1,
        lastVerifiedAt: "2024-01",
      }),
    ).toBe("2024-01");
  });

  it("edge: seed に無い id (ユーザー作成) はローカルの月", () => {
    expect(
      seedFreshness.edgeMonth({
        id: "user-edge-uuid",
        fromCurrencyId: "a",
        toCurrencyId: "b",
        rate: 1,
        lastVerifiedAt: "2024-01",
      }),
    ).toBe("2024-01");
  });

  it("program: rate が一致すれば seed の値をそのまま使う (seed が未記入なら local の古い月は使わない)", () => {
    const official = S.programs[0];
    expect(
      seedFreshness.programMonth({ ...official, lastVerifiedAt: "2024-01" }),
    ).toBe(official.lastVerifiedAt);
  });

  it("program: 編集済み (userModifiedAt) は確認月を出さない", () => {
    const official = S.programs[0];
    expect(
      seedFreshness.programMonth({
        ...official,
        lastVerifiedAt: "2026-07",
        userModifiedAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBeUndefined();
  });

  // B11: カードは defaultRate を率として比較する。
  it("card: defaultRate が seed と一致すれば seed の値 (seed 未記入なら local の古い月は使わない)", () => {
    const official = S.cards[0];
    expect(
      seedFreshness.cardMonth({ ...official, lastVerifiedAt: "2024-01" }),
    ).toBe(official.lastVerifiedAt);
  });

  it("card: defaultRate が seed と違えば local の月 / 編集済みは出さない / seed に無い id は local", () => {
    const official = S.cards[0];
    expect(
      seedFreshness.cardMonth({
        ...official,
        defaultRate: official.defaultRate + 0.01,
        lastVerifiedAt: "2024-01",
      }),
    ).toBe("2024-01");
    expect(
      seedFreshness.cardMonth({
        ...official,
        lastVerifiedAt: "2026-07",
        userModifiedAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBeUndefined();
    expect(
      seedFreshness.cardMonth({
        id: "user-card-uuid",
        name: "自作カード",
        defaultRate: 0.01,
        defaultCurrencyId: "x",
        lastVerifiedAt: "2024-01",
      }),
    ).toBe("2024-01");
  });

  it("program: ユーザー作成 (seed に無い id) はローカルの月", () => {
    expect(
      seedFreshness.programMonth({
        id: "user-prog-uuid",
        name: "自作",
        scope: "all-stores",
        rate: 0.01,
        currencyId: "x",
        lastVerifiedAt: "2024-01",
      }),
    ).toBe("2024-01");
  });
});
