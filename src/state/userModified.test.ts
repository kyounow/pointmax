import { describe, it, expect } from "vitest";
import {
  SUBSTANTIVE_CARD_FIELDS,
  SUBSTANTIVE_PAYMENT_APP_FIELDS,
  isSubstantiveCardPatch,
  applyCardPatch,
  applyPaymentAppPatch,
  resetCardToSeedValues,
  resetPaymentAppToSeedValues,
} from "./userModified";
import type { Card, PaymentApp } from "../domain/types";

const NOW = new Date("2026-05-15T10:00:00.000Z");

const baseCard: Card = {
  id: "card-1",
  name: "テストカード",
  grade: "ゴールド",
  defaultRate: 0.01,
  defaultCurrencyId: "cur-1",
  enabled: true,
};

const basePaymentApp: PaymentApp = {
  id: "pa-1",
  name: "テスト Pay",
  iconChar: "T",
  iconColor: "#0000ff",
  paymentMode: "charge",
  chargeBased: true,
  compatibleCardIds: ["card-1"],
  notes: "公式メモ",
  enabled: true,
};

describe("SUBSTANTIVE_CARD_FIELDS", () => {
  it("name / grade / defaultRate / defaultCurrencyId を含む", () => {
    expect([...SUBSTANTIVE_CARD_FIELDS].sort()).toEqual(
      ["defaultCurrencyId", "defaultRate", "grade", "name"],
    );
  });
  it("enabled / id / userModifiedAt は含まない", () => {
    const arr = SUBSTANTIVE_CARD_FIELDS as readonly string[];
    expect(arr.includes("enabled")).toBe(false);
    expect(arr.includes("id")).toBe(false);
    expect(arr.includes("userModifiedAt")).toBe(false);
  });
});

describe("isSubstantiveCardPatch", () => {
  it("defaultRate のみの patch は substantive", () => {
    expect(isSubstantiveCardPatch({ defaultRate: 0.02 })).toBe(true);
  });
  it("name のみの patch は substantive", () => {
    expect(isSubstantiveCardPatch({ name: "別名" })).toBe(true);
  });
  it("enabled のみの patch は substantive ではない", () => {
    expect(isSubstantiveCardPatch({ enabled: false })).toBe(false);
  });
  it("enabled + name の混在は substantive (name 由来)", () => {
    expect(isSubstantiveCardPatch({ enabled: false, name: "X" })).toBe(true);
  });
  it("空 patch は substantive ではない", () => {
    expect(isSubstantiveCardPatch({})).toBe(false);
  });
});

describe("applyCardPatch", () => {
  it("substantive 変更で userModifiedAt がスタンプされる", () => {
    const result = applyCardPatch(baseCard, { defaultRate: 0.02 }, NOW);
    expect(result.defaultRate).toBe(0.02);
    expect(result.userModifiedAt).toBe(NOW.toISOString());
  });

  it("enabled のみの変更では userModifiedAt は付かない", () => {
    const result = applyCardPatch(baseCard, { enabled: false }, NOW);
    expect(result.enabled).toBe(false);
    expect(result.userModifiedAt).toBeUndefined();
  });

  it("enabled のみの変更で、既存の userModifiedAt は維持される", () => {
    const prior: Card = { ...baseCard, userModifiedAt: "2026-01-01T00:00:00.000Z" };
    const result = applyCardPatch(prior, { enabled: false }, NOW);
    expect(result.userModifiedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("substantive 再編集で userModifiedAt が更新される", () => {
    const prior: Card = { ...baseCard, userModifiedAt: "2026-01-01T00:00:00.000Z" };
    const result = applyCardPatch(prior, { name: "更新名" }, NOW);
    expect(result.userModifiedAt).toBe(NOW.toISOString());
  });

  it("id は patch で変更されない (Partial<Omit<Card, 'id'>> の運用前提)", () => {
    // type 的には patch から id が省かれるが、runtime は防御しない。
    // ここでは substantive 判定のみ重要。
    const result = applyCardPatch(baseCard, { name: "x" }, NOW);
    expect(result.id).toBe("card-1");
  });
});

describe("SUBSTANTIVE_PAYMENT_APP_FIELDS", () => {
  it("name / paymentMode / chargeBased / compatibleCardIds / notes を含む", () => {
    expect([...SUBSTANTIVE_PAYMENT_APP_FIELDS].sort()).toEqual(
      ["chargeBased", "compatibleCardIds", "name", "notes", "paymentMode"],
    );
  });
  it("iconChar / iconColor / enabled は含まない (cosmetic / preference)", () => {
    const arr = SUBSTANTIVE_PAYMENT_APP_FIELDS as readonly string[];
    expect(arr.includes("iconChar")).toBe(false);
    expect(arr.includes("iconColor")).toBe(false);
    expect(arr.includes("enabled")).toBe(false);
  });
});

describe("applyPaymentAppPatch", () => {
  it("notes 変更は substantive", () => {
    const result = applyPaymentAppPatch(basePaymentApp, { notes: "別" }, NOW);
    expect(result.userModifiedAt).toBe(NOW.toISOString());
  });
  it("iconChar 変更は substantive ではない (cosmetic)", () => {
    const result = applyPaymentAppPatch(basePaymentApp, { iconChar: "Z" }, NOW);
    expect(result.userModifiedAt).toBeUndefined();
  });
  it("iconColor 変更は substantive ではない (cosmetic)", () => {
    const result = applyPaymentAppPatch(basePaymentApp, { iconColor: "#ff0" }, NOW);
    expect(result.userModifiedAt).toBeUndefined();
  });
  it("enabled トグルは substantive ではない", () => {
    const result = applyPaymentAppPatch(basePaymentApp, { enabled: false }, NOW);
    expect(result.userModifiedAt).toBeUndefined();
  });
  it("compatibleCardIds 変更は substantive", () => {
    const result = applyPaymentAppPatch(
      basePaymentApp,
      { compatibleCardIds: ["card-2"] },
      NOW,
    );
    expect(result.userModifiedAt).toBe(NOW.toISOString());
  });
});

describe("resetCardToSeedValues", () => {
  const original: Card = {
    id: "card-1",
    name: "公式名",
    grade: "ゴールド",
    defaultRate: 0.01,
    defaultCurrencyId: "cur-1",
  };
  const edited: Card = {
    ...original,
    name: "編集後",
    defaultRate: 0.02,
    enabled: false,
    userModifiedAt: "2026-05-15T00:00:00.000Z",
  };

  it("name / defaultRate が original 値に戻る", () => {
    const result = resetCardToSeedValues(edited, original);
    expect(result.name).toBe("公式名");
    expect(result.defaultRate).toBe(0.01);
  });

  it("userModifiedAt がクリアされる", () => {
    const result = resetCardToSeedValues(edited, original);
    expect(result.userModifiedAt).toBeUndefined();
  });

  it("enabled は current から保持される (preference 保護)", () => {
    const result = resetCardToSeedValues(edited, original);
    expect(result.enabled).toBe(false);
  });

  it("id は変わらない", () => {
    const result = resetCardToSeedValues(edited, original);
    expect(result.id).toBe("card-1");
  });
});

describe("resetPaymentAppToSeedValues", () => {
  const original: PaymentApp = {
    id: "pa-1",
    name: "公式 Pay",
    iconChar: "O",
    iconColor: "#000000",
    paymentMode: "charge",
    chargeBased: true,
    compatibleCardIds: ["card-1"],
    notes: "公式メモ",
  };
  const edited: PaymentApp = {
    ...original,
    name: "編集 Pay",
    iconChar: "E",
    iconColor: "#ff00ff",
    notes: "ユーザ書き換え",
    enabled: false,
    userModifiedAt: "2026-05-15T00:00:00.000Z",
  };

  it("substantive (name/notes/paymentMode 等) が公式値に戻る", () => {
    const result = resetPaymentAppToSeedValues(edited, original);
    expect(result.name).toBe("公式 Pay");
    expect(result.notes).toBe("公式メモ");
  });

  it("userModifiedAt がクリアされる", () => {
    const result = resetPaymentAppToSeedValues(edited, original);
    expect(result.userModifiedAt).toBeUndefined();
  });

  it("enabled は current から保持される", () => {
    const result = resetPaymentAppToSeedValues(edited, original);
    expect(result.enabled).toBe(false);
  });

  it("iconChar / iconColor は original 値に戻る (cosmetic も含めて完全に公式に揃える)", () => {
    // 設計判断: reset は「公式値に揃える」なので cosmetic 含めて original で上書き。
    // ただし userModifiedAt は cosmetic 編集では立たないので、reset ボタン自体が
    // 出るのは substantive 編集後に限られる (= 通常 cosmetic だけの reset は起きない)。
    const result = resetPaymentAppToSeedValues(edited, original);
    expect(result.iconChar).toBe("O");
    expect(result.iconColor).toBe("#000000");
  });
});
