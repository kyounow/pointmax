// store.ts の action の薄い integration テスト。
// pure helper (userModified.ts / seed.ts のルックアップ) は別ファイルで個別テスト済み。
// ここでは store action 固有の「ガード条件」「ストア state への反映」のみ検査。
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";
import { PERSIST_SCHEMA_VERSION } from "./persist-versions";
import type {
  BenefitProgram,
  Card,
  PaymentApp,
  StoreProgramMembership,
} from "../domain/types";

const MASTER_CARD_ID = "rakuten-card";
const MASTER_PAYMENT_APP_ID = "pa-rakuten-pay";

describe("store: resetCardToSeed", () => {
  // 各テスト前に seed() 由来の clean state にリセット (clearAll で empty に戻し、
  // 必要な部分だけ setState で詰める)
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("non-master id (UUID) を渡すと no-op (state 不変)", () => {
    const customCard: Card = {
      id: "custom-uuid-123",
      name: "ユーザ追加カード",
      defaultRate: 0.02,
      defaultCurrencyId: "rakuten-pt",
      userModifiedAt: "2026-05-15T00:00:00.000Z",
    };
    useStore.setState({ cards: [customCard] });

    useStore.getState().resetCardToSeed("custom-uuid-123");

    // ガード条件 `if (!original) return;` で early return、変化なし
    const after = useStore.getState().cards[0];
    expect(after).toEqual(customCard);
    expect(after.userModifiedAt).toBe("2026-05-15T00:00:00.000Z");
  });

  it("master id を渡すと seed 値で上書き、userModifiedAt クリア、enabled 保持", () => {
    const editedRakuten: Card = {
      id: MASTER_CARD_ID,
      name: "編集された名前",
      defaultRate: 0.99,
      defaultCurrencyId: "edited-currency",
      enabled: false,
      userModifiedAt: "2026-05-15T00:00:00.000Z",
    };
    useStore.setState({ cards: [editedRakuten] });

    useStore.getState().resetCardToSeed(MASTER_CARD_ID);

    const after = useStore.getState().cards[0];
    expect(after.id).toBe(MASTER_CARD_ID);
    expect(after.name).not.toBe("編集された名前"); // seed の名前に戻る
    expect(after.defaultRate).not.toBe(0.99); // seed の rate に戻る
    expect(after.enabled).toBe(false); // preference 保持
    expect(after.userModifiedAt).toBeUndefined();
  });

  it("存在しない id を渡しても crash しない (no-op)", () => {
    useStore.setState({ cards: [] });
    expect(() => {
      useStore.getState().resetCardToSeed("nonexistent");
    }).not.toThrow();
    expect(useStore.getState().cards).toEqual([]);
  });
});

describe("store: resetPaymentAppToSeed", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("non-master id を渡すと no-op", () => {
    const customApp: PaymentApp = {
      id: "custom-pa-uuid",
      name: "ユーザ追加 Pay",
      userModifiedAt: "2026-05-15T00:00:00.000Z",
    };
    useStore.setState({ paymentApps: [customApp] });

    useStore.getState().resetPaymentAppToSeed("custom-pa-uuid");

    const after = useStore.getState().paymentApps[0];
    expect(after).toEqual(customApp);
  });

  it("master id を渡すと seed 値で上書き", () => {
    const editedApp: PaymentApp = {
      id: MASTER_PAYMENT_APP_ID,
      name: "編集された名前",
      iconChar: "X",
      enabled: false,
      userModifiedAt: "2026-05-15T00:00:00.000Z",
    };
    useStore.setState({ paymentApps: [editedApp] });

    useStore.getState().resetPaymentAppToSeed(MASTER_PAYMENT_APP_ID);

    const after = useStore.getState().paymentApps[0];
    expect(after.id).toBe(MASTER_PAYMENT_APP_ID);
    expect(after.name).not.toBe("編集された名前");
    expect(after.enabled).toBe(false); // preference 保持
    expect(after.userModifiedAt).toBeUndefined();
  });
});

describe("store: updateCard / updatePaymentApp の userModifiedAt スタンプ (integration)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("substantive な updateCard で userModifiedAt がスタンプされる", () => {
    const card: Card = {
      id: "test-card",
      name: "テスト",
      defaultRate: 0.01,
      defaultCurrencyId: "rakuten-pt",
    };
    useStore.setState({ cards: [card] });

    useStore.getState().updateCard("test-card", { defaultRate: 0.02 });

    const after = useStore.getState().cards[0];
    expect(after.defaultRate).toBe(0.02);
    expect(after.userModifiedAt).toBeDefined();
    // ISO 8601 形式
    expect(after.userModifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("enabled トグルのみの updateCard では userModifiedAt はスタンプされない", () => {
    const card: Card = {
      id: "test-card",
      name: "テスト",
      defaultRate: 0.01,
      defaultCurrencyId: "rakuten-pt",
    };
    useStore.setState({ cards: [card] });

    useStore.getState().updateCard("test-card", { enabled: false });

    const after = useStore.getState().cards[0];
    expect(after.enabled).toBe(false);
    expect(after.userModifiedAt).toBeUndefined();
  });

  it("iconColor のみの updatePaymentApp は cosmetic なのでスタンプされない", () => {
    const pa: PaymentApp = { id: "test-pa", name: "テスト Pay" };
    useStore.setState({ paymentApps: [pa] });

    useStore.getState().updatePaymentApp("test-pa", { iconColor: "#ff0000" });

    const after = useStore.getState().paymentApps[0];
    expect(after.iconColor).toBe("#ff0000");
    expect(after.userModifiedAt).toBeUndefined();
  });
});

describe("store: preferredCurrencyIds (v4.0.0 ②)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("初期状態は空配列", () => {
    expect(useStore.getState().preferredCurrencyIds).toEqual([]);
  });

  it("addPreferredCurrency で末尾に追加 (順序保持)", () => {
    useStore.getState().addPreferredCurrency("rakuten-pt");
    useStore.getState().addPreferredCurrency("ana-mile");
    expect(useStore.getState().preferredCurrencyIds).toEqual([
      "rakuten-pt",
      "ana-mile",
    ]);
  });

  it("重複 add は無視される", () => {
    useStore.getState().addPreferredCurrency("rakuten-pt");
    useStore.getState().addPreferredCurrency("rakuten-pt");
    expect(useStore.getState().preferredCurrencyIds).toEqual(["rakuten-pt"]);
  });

  it("removePreferredCurrency で除外", () => {
    useStore.setState({ preferredCurrencyIds: ["a", "b", "c"] });
    useStore.getState().removePreferredCurrency("b");
    expect(useStore.getState().preferredCurrencyIds).toEqual(["a", "c"]);
  });

  it("movePreferredCurrency up/down で並べ替え", () => {
    useStore.setState({ preferredCurrencyIds: ["a", "b", "c"] });
    useStore.getState().movePreferredCurrency("c", "up");
    expect(useStore.getState().preferredCurrencyIds).toEqual(["a", "c", "b"]);
    useStore.getState().movePreferredCurrency("a", "down");
    expect(useStore.getState().preferredCurrencyIds).toEqual(["c", "a", "b"]);
  });

  it("先頭を up / 末尾を down は no-op (境界)", () => {
    useStore.setState({ preferredCurrencyIds: ["a", "b"] });
    useStore.getState().movePreferredCurrency("a", "up");
    useStore.getState().movePreferredCurrency("b", "down");
    expect(useStore.getState().preferredCurrencyIds).toEqual(["a", "b"]);
  });

  it("removeCurrency で通貨削除すると preferred からも除外される (dangling 防止)", () => {
    useStore.setState({
      currencies: [
        { id: "cur-x", name: "X" },
        { id: "cur-y", name: "Y" },
      ],
      preferredCurrencyIds: ["cur-x", "cur-y"],
    });
    useStore.getState().removeCurrency("cur-x");
    expect(useStore.getState().preferredCurrencyIds).toEqual(["cur-y"]);
  });
});

describe("store: exportJson / importJson は programs / memberships を保持する (A4)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  const program: BenefitProgram = {
    id: "prog-a4-test",
    name: "A4 テストプログラム",
    scope: "member-stores",
    rate: 0.05,
    currencyId: "rakuten-pt",
  };
  const membership: StoreProgramMembership = {
    programId: "prog-a4-test",
    storeId: "store-a4",
  };

  it("export → import ラウンドトリップで programs / memberships が失われない", () => {
    useStore.setState({ programs: [program], memberships: [membership] });
    const json = useStore.getState().exportJson();
    // 別端末を模して programs / memberships を消してから復元
    useStore.setState({ programs: [], memberships: [] });

    const res = useStore.getState().importJson(json);
    expect(res.ok).toBe(true);
    expect(useStore.getState().programs).toEqual([program]);
    expect(useStore.getState().memberships).toEqual([membership]);
  });

  it("programs / memberships 欄が無い (schemaVersion は現行) import は既存値を保持する", () => {
    useStore.setState({ programs: [program], memberships: [membership] });
    // v6 の import ガードを通すため schemaVersion は現行値。programs/memberships 欄のみ欠落。
    const legacyJson = JSON.stringify({
      version: 1,
      schemaVersion: PERSIST_SCHEMA_VERSION,
      cards: [],
      currencies: [],
      stores: [],
      edges: [],
    });

    const res = useStore.getState().importJson(legacyJson);
    expect(res.ok).toBe(true);
    // preserve-on-missing: 旧フォーマットでも同期済みデータを消さない
    expect(useStore.getState().programs).toEqual([program]);
    expect(useStore.getState().memberships).toEqual([membership]);
  });
});

describe("store: importJson 入力バリデーション (A6/D2)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("妥当な JSON は受理される", () => {
    const good = JSON.stringify({
      schemaVersion: PERSIST_SCHEMA_VERSION,
      cards: [{ id: "c1", name: "C", defaultRate: 0.01, defaultCurrencyId: "cur1" }],
      currencies: [{ id: "cur1", name: "C1" }],
      stores: [],
      edges: [],
    });
    const res = useStore.getState().importJson(good);
    expect(res.ok).toBe(true);
    expect(useStore.getState().cards).toHaveLength(1);
  });

  it("card.defaultRate が文字列の不正 JSON を拒否し State を汚染しない", () => {
    // schemaVersion は現行値にして、rate 検証まで到達させる (schemaVersion 短絡ではなく値検証で弾く)。
    const bad = JSON.stringify({
      schemaVersion: PERSIST_SCHEMA_VERSION,
      cards: [{ id: "c1", name: "C", defaultRate: "x", defaultCurrencyId: "cur1" }],
      currencies: [{ id: "cur1", name: "C1" }],
      stores: [],
      edges: [],
    });
    const res = useStore.getState().importJson(bad);
    expect(res.ok).toBe(false);
    expect(useStore.getState().cards).toHaveLength(0); // set() に到達しない
  });
});
