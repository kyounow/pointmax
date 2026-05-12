import { describe, it, expect } from "vitest";
import { resolveCardId, resolveStoreId } from "./aliases";

describe("resolveCardId / resolveStoreId", () => {
  it("registered alias は target に正規化される", () => {
    expect(resolveCardId("smbc-v-gold")).toBe("smbc-v");
    expect(resolveStoreId("seven-eleven")).toBe("conv-7eleven");
    expect(resolveStoreId("macdonalds")).toBe("mcdonalds");
  });

  it("未登録の id はそのまま返る", () => {
    expect(resolveCardId("unknown-card")).toBe("unknown-card");
    expect(resolveStoreId("brand-new-store")).toBe("brand-new-store");
  });
});
