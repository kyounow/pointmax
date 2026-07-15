// store.ts の action の薄い integration テスト。
// pure helper (userModified.ts / seed.ts のルックアップ) は別ファイルで個別テスト済み。
// ここでは store action 固有の「ガード条件」「ストア state への反映」のみ検査。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
// PR-4a: 破壊的操作の snapshot 採取を結線検査するため stateSnapshot をモックする。
// takeSnapshot を no-op スパイに差し替え、trigger だけを検査する
// (実際の localStorage 書き込みは stateSnapshot.test.ts で検証済み)。
vi.mock("./stateSnapshot", () => ({ takeSnapshot: vi.fn() }));
import { useStore } from "./store";
import { takeSnapshot } from "./stateSnapshot";
import { rankCards } from "../domain/rankCards";
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
    id: "m-prog-a4-test-store-a4",
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

describe("store: setCardEnabled 排他 invariant (v6 PR-1c)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  // exclusive family (family-epos) のフィクスチャ。gradeLevel は計算に不使用だが seed 準拠で付与。
  // v7: 「保有中 (ON)」のカードは enabled:true を明示する (undefined は OFF になったため)。
  const eposCards = (): Card[] => [
    {
      id: "epos-card",
      name: "エポスカード",
      defaultRate: 0.005,
      defaultCurrencyId: "epos",
      enabled: true,
      familyId: "family-epos",
      gradeLevel: 1,
    },
    {
      id: "epos-gold",
      name: "エポスゴールド",
      defaultRate: 0.005,
      defaultCurrencyId: "epos",
      enabled: false,
      familyId: "family-epos",
      gradeLevel: 2,
    },
    {
      id: "epos-platinum",
      name: "エポスプラチナ",
      defaultRate: 0.005,
      defaultCurrencyId: "epos",
      enabled: false,
      familyId: "family-epos",
      gradeLevel: 3,
    },
  ];

  const byId = () => new Map(useStore.getState().cards.map((c) => [c.id, c]));

  it("exclusive family のカードを ON にすると兄弟が自動 OFF になり、名前を返す", () => {
    // 一般 (epos-card) が有効な状態でゴールドを ON にする
    useStore.setState({ cards: eposCards() });
    const disabled = useStore.getState().setCardEnabled("epos-gold", true);

    expect(disabled).toEqual(["エポスカード"]);
    expect(byId().get("epos-gold")?.enabled).not.toBe(false); // 有効化された
    expect(byId().get("epos-card")?.enabled).toBe(false); // 自動 OFF
    expect(byId().get("epos-platinum")?.enabled).toBe(false); // 元々 OFF のまま
  });

  it("既に OFF の兄弟は戻り値に含めない (自動 OFF になったカードのみ報告)", () => {
    const cards = eposCards();
    cards[0].enabled = false; // epos-card も最初から OFF
    useStore.setState({ cards });

    const disabled = useStore.getState().setCardEnabled("epos-gold", true);
    expect(disabled).toEqual([]);
    expect(byId().get("epos-gold")?.enabled).not.toBe(false);
  });

  it("非 exclusive family (JCB) は兄弟を OFF にしない (併存可)", () => {
    useStore.setState({
      cards: [
        {
          id: "jcb-w",
          name: "JCB CARD W",
          defaultRate: 0.01,
          defaultCurrencyId: "j-point",
          enabled: true,
          familyId: "family-jcb",
          gradeLevel: 1,
        },
        {
          id: "jcb-gold",
          name: "JCB ゴールド",
          defaultRate: 0.005,
          defaultCurrencyId: "j-point",
          enabled: false,
          familyId: "family-jcb",
          gradeLevel: 2,
        },
      ],
    });
    const disabled = useStore.getState().setCardEnabled("jcb-gold", true);

    expect(disabled).toEqual([]);
    expect(byId().get("jcb-gold")?.enabled).not.toBe(false);
    expect(byId().get("jcb-w")?.enabled).not.toBe(false); // W は有効のまま (併存)
  });

  it("family 無しカードは他カードに影響しない", () => {
    useStore.setState({
      cards: [
        {
          id: "rakuten-card",
          name: "楽天カード",
          defaultRate: 0.01,
          defaultCurrencyId: "rakuten-pt",
          enabled: true,
        },
        {
          id: "smbc-v",
          name: "三井住友カード",
          defaultRate: 0.005,
          defaultCurrencyId: "v-pt",
          enabled: false,
        },
      ],
    });
    const disabled = useStore.getState().setCardEnabled("smbc-v", true);

    expect(disabled).toEqual([]);
    expect(byId().get("rakuten-card")?.enabled).not.toBe(false);
    expect(byId().get("smbc-v")?.enabled).not.toBe(false);
  });

  it("OFF 操作 (enabled=false) では排他 invariant は発火しない", () => {
    const cards = eposCards();
    cards[1].enabled = true; // v7: epos-gold も有効 (enabled:true) な状態から
    useStore.setState({ cards });

    const disabled = useStore.getState().setCardEnabled("epos-gold", false);
    expect(disabled).toEqual([]);
    expect(byId().get("epos-gold")?.enabled).toBe(false); // OFF になった
    expect(byId().get("epos-card")?.enabled).not.toBe(false); // 兄弟は影響なし
  });

  it("jal-suica 普通を ON にするとゴールドが自動 OFF (両方 ON 不可の意図的挙動変更)", () => {
    useStore.setState({
      cards: [
        {
          id: "jal-suica",
          name: "JALカードSuica",
          defaultRate: 0.01,
          defaultCurrencyId: "jal-mile",
          enabled: true,
          familyId: "family-jal-suica",
          gradeLevel: 2,
        },
        {
          id: "jal-suica-normal",
          name: "JALカードSuica（普通）",
          defaultRate: 0.01,
          defaultCurrencyId: "jal-mile",
          enabled: false,
          familyId: "family-jal-suica",
          gradeLevel: 1,
        },
      ],
    });
    const disabled = useStore.getState().setCardEnabled("jal-suica-normal", true);

    expect(disabled).toEqual(["JALカードSuica"]);
    expect(byId().get("jal-suica")?.enabled).toBe(false);
    expect(byId().get("jal-suica-normal")?.enabled).not.toBe(false);
  });

  it("updateCard 経由 (編集モード保存) でも排他 invariant が担保される", () => {
    useStore.setState({ cards: eposCards() });
    // v7: 編集モード保存は updateCard(id, { enabled: true }) で有効化する
    useStore.getState().updateCard("epos-gold", { enabled: true });

    expect(byId().get("epos-gold")?.enabled).not.toBe(false);
    expect(byId().get("epos-card")?.enabled).toBe(false); // 自動 OFF
    // enabled トグルは substantive ではないので userModifiedAt は付かない
    expect(byId().get("epos-gold")?.userModifiedAt).toBeUndefined();
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

// ─── v7 PR-1f: ユーザー追加系 action は enabled:true を明示セット ───

describe("store: 追加系 action は enabled:true を明示する (v7)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("addCard は enabled:true 付きで追加する (保有 = 使う)", () => {
    useStore.getState().addCard({
      name: "自作カード",
      defaultRate: 0.01,
      defaultCurrencyId: "cur1",
    });
    const c = useStore.getState().cards.at(-1);
    expect(c?.enabled).toBe(true);
  });

  it("addPointCard は enabled:true 付きで追加する", () => {
    useStore.getState().addPointCard({ name: "自作PC", currencyId: "cur1" });
    const p = useStore.getState().pointCards.at(-1);
    expect(p?.enabled).toBe(true);
  });

  it("addPaymentApp は enabled:true 付きで追加する", () => {
    useStore.getState().addPaymentApp({ name: "自作Pay" });
    const a = useStore.getState().paymentApps.at(-1);
    expect(a?.enabled).toBe(true);
  });
});

// ─── v6 PR-1d: program の opt-in preference (enabled) + 誕生月 ───

describe("store: setProgramEnabled (v6 PR-1d)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  const optInProgram: BenefitProgram = {
    id: "prog-optin",
    name: "opt-in 特典",
    scope: "all-stores",
    rate: 0.01,
    currencyId: "v-pt",
    optIn: true,
  };

  it("enabled:true を書き込む (opt-in の有効化)。userModifiedAt はスタンプしない", () => {
    useStore.setState({ programs: [optInProgram] });
    useStore.getState().setProgramEnabled("prog-optin", true);
    const p = useStore.getState().programs[0];
    expect(p.enabled).toBe(true);
    expect(p.userModifiedAt).toBeUndefined(); // preference なので stamp なし
  });

  it("enabled:false を書き込む (明示 OFF)", () => {
    useStore.setState({ programs: [{ ...optInProgram, enabled: true }] });
    useStore.getState().setProgramEnabled("prog-optin", false);
    expect(useStore.getState().programs[0].enabled).toBe(false);
  });

  it("存在しない programId は no-op", () => {
    useStore.setState({ programs: [optInProgram] });
    expect(() =>
      useStore.getState().setProgramEnabled("nope", true),
    ).not.toThrow();
    expect(useStore.getState().programs[0].enabled).toBeUndefined();
  });
});

describe("store: setBirthMonth (v6 PR-1d)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("1-12 の値を設定できる", () => {
    useStore.getState().setBirthMonth(7);
    expect(useStore.getState().birthMonth).toBe(7);
  });

  it("undefined でクリアできる", () => {
    useStore.setState({ birthMonth: 5 });
    useStore.getState().setBirthMonth(undefined);
    expect(useStore.getState().birthMonth).toBeUndefined();
  });

  it("範囲外 (0 / 13 / 非整数) は無視する", () => {
    useStore.setState({ birthMonth: 3 });
    useStore.getState().setBirthMonth(0);
    expect(useStore.getState().birthMonth).toBe(3);
    useStore.getState().setBirthMonth(13);
    expect(useStore.getState().birthMonth).toBe(3);
    useStore.getState().setBirthMonth(7.5);
    expect(useStore.getState().birthMonth).toBe(3);
  });
});

describe("store: importJson の program enabled carry-over (v6 PR-1d)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  const optInProgram: BenefitProgram = {
    id: "prog-optin",
    name: "opt-in 特典",
    scope: "all-stores",
    rate: 0.01,
    currencyId: "v-pt",
    optIn: true,
  };

  // 公式 master 相当 (enabled キーを持たない) の import JSON を作る
  const masterJson = (programEnabled?: boolean) =>
    JSON.stringify({
      version: 1,
      schemaVersion: PERSIST_SCHEMA_VERSION,
      cards: [],
      currencies: [],
      stores: [],
      edges: [],
      programs: [
        programEnabled === undefined
          ? optInProgram // enabled キーなし
          : { ...optInProgram, enabled: programEnabled },
      ],
      memberships: [],
    });

  it("incoming に enabled キーが無い → local の enabled:true を維持 (公式 master 取込)", () => {
    useStore.setState({ programs: [{ ...optInProgram, enabled: true }] });
    const res = useStore.getState().importJson(masterJson(undefined));
    expect(res.ok).toBe(true);
    expect(useStore.getState().programs[0].enabled).toBe(true);
  });

  it("incoming が enabled:false を明示 → そちらを採用 (ユーザー自身の export)", () => {
    useStore.setState({ programs: [{ ...optInProgram, enabled: true }] });
    const res = useStore.getState().importJson(masterJson(false));
    expect(res.ok).toBe(true);
    expect(useStore.getState().programs[0].enabled).toBe(false);
  });
});

describe("store: syncFromUrl の program enabled carry-over (v6 PR-1d)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const optInProgram: BenefitProgram = {
    id: "prog-optin",
    name: "opt-in 特典",
    scope: "all-stores",
    rate: 0.01,
    currencyId: "v-pt",
    optIn: true,
  };

  it("公式 master (enabled 非出荷) を全置換取込しても local の enabled:true が保持される", async () => {
    // local: opt-in を ON にしたユーザー
    useStore.setState({
      programs: [{ ...optInProgram, enabled: true }],
      syncUrl: "https://example.test/master.json",
    });
    // master.json は enabled を出荷しない (R1)
    const master = {
      version: 43,
      cards: [],
      currencies: [],
      stores: [],
      edges: [],
      pointCards: [],
      paymentApps: [],
      programs: [optInProgram], // enabled キーなし
      memberships: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify(master),
      }),
    );

    const res = await useStore.getState().syncFromUrl();
    expect(res.ok).toBe(true);
    // 公式 rate は届き、ユーザーの opt-in ON は巻き戻らない
    expect(useStore.getState().programs[0].rate).toBe(0.01);
    expect(useStore.getState().programs[0].enabled).toBe(true);
  });
});

// v6 PR-1e: 旧 addLoyaltyRule の後継。手動の「店舗×ポイントカード提示還元」を
// BenefitProgram + membership に変換して atomic に追加する。
describe("store: addUserLoyaltyProgram", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("program + membership を同一 action で atomic に追加する", () => {
    useStore.setState({
      pointCards: [{ id: "d-pc", name: "dポイントカード", currencyId: "d-pt" }],
    });
    const id = useStore.getState().addUserLoyaltyProgram({
      storeId: "lawson",
      pointCardId: "d-pc",
      rate: 0.01,
    });
    const { programs, memberships } = useStore.getState();
    expect(programs).toHaveLength(1);
    expect(memberships).toHaveLength(1);
    const p = programs[0];
    expect(p.id).toBe(id);
    expect(p.scope).toBe("member-stores");
    expect(p.bonusType).toBe("primary");
    expect(p.pointCardId).toBe("d-pc");
    expect(p.rate).toBe(0.01);
    // ユーザー作成物の印
    expect(p.userModifiedAt).toBeTruthy();
    // enabled は付けない (undefined = 有効。optIn ではない)
    expect("enabled" in p).toBe(false);
    // membership は membershipId 規約 (`m-{programId}-{storeId}`) で採番し program を指す
    expect(memberships[0].programId).toBe(id);
    expect(memberships[0].storeId).toBe("lawson");
    expect(memberships[0].id).toBe(`m-${id}-lawson`);
  });

  it("currencyId 省略時は pointCard.currencyId で補完する", () => {
    useStore.setState({
      pointCards: [{ id: "d-pc", name: "dポイントカード", currencyId: "d-pt" }],
    });
    useStore.getState().addUserLoyaltyProgram({
      storeId: "lawson",
      pointCardId: "d-pc",
      rate: 0.01,
    });
    expect(useStore.getState().programs[0].currencyId).toBe("d-pt");
  });

  it("currencyId を明示すればそれを使う", () => {
    useStore.setState({
      pointCards: [{ id: "d-pc", name: "dポイントカード", currencyId: "d-pt" }],
    });
    useStore.getState().addUserLoyaltyProgram({
      storeId: "lawson",
      pointCardId: "d-pc",
      rate: 0.01,
      currencyId: "rakuten-pt",
    });
    expect(useStore.getState().programs[0].currencyId).toBe("rakuten-pt");
  });

  it("removeUserProgram で program + membership が cascade 削除される", () => {
    useStore.setState({
      pointCards: [{ id: "d-pc", name: "dポイントカード", currencyId: "d-pt" }],
    });
    const id = useStore.getState().addUserLoyaltyProgram({
      storeId: "lawson",
      pointCardId: "d-pc",
      rate: 0.01,
    });
    useStore.getState().removeUserProgram(id);
    expect(useStore.getState().programs).toHaveLength(0);
    expect(useStore.getState().memberships).toHaveLength(0);
  });

  it("等価性: addUserLoyaltyProgram の loyalty が旧 LoyaltyRule と同じ還元 (rate×amount) を生む", () => {
    const card: Card = {
      id: "rakuten",
      name: "楽天カード",
      defaultRate: 0.01,
      defaultCurrencyId: "rakuten-pt",
      enabled: true, // v7: 保有中 (使う)
    };
    useStore.setState({
      cards: [card],
      stores: [{ id: "lawson", name: "ローソン" }],
      pointCards: [
        { id: "d-pc", name: "dポイントカード", currencyId: "d-pt", enabled: true },
      ],
      edges: [],
    });
    useStore.getState().addUserLoyaltyProgram({
      storeId: "lawson",
      pointCardId: "d-pc",
      rate: 0.01,
    });
    const s = useStore.getState();
    const { rankings } = rankCards({
      payment: { storeId: "lawson", amount: 10000 },
      targetCurrencyId: "d-pt",
      cards: s.cards,
      stores: s.stores,
      edges: s.edges,
      pointCards: s.pointCards,
      programs: s.programs,
      memberships: s.memberships,
    });
    const top = rankings[0];
    expect(top.loyalties).toHaveLength(1);
    // 旧 { storeId: "lawson", pointCardId: "d-pc", rate: 0.01 } と同一: 10000 × 0.01 = 100 d-pt
    expect(top.loyalties[0].finalAmount).toBe(100);
    expect(top.loyalties[0].earnedCurrencyId).toBe("d-pt");
  });
});

// PR-4a (N-4): 破壊的操作 4 経路が直前スナップショットを採取するかの結線テスト。
// takeSnapshot はモック済み (先頭 vi.mock)。ここでは「呼ばれること + trigger」だけを検査する
// (state 引数は node 環境で localStorage 不在のため null になる = 中身は別テストの領域)。
describe("store: 破壊的操作の直前 snapshot 採取 (PR-4a 結線)", () => {
  const takeSnapshotMock = vi.mocked(takeSnapshot);

  beforeEach(() => {
    // clearAll 自体が snapshot を採る → リセット後に mockClear して各テストを clean に始める。
    useStore.getState().clearAll();
    takeSnapshotMock.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clearAll (初期化) は trigger:'reset' で採取する", () => {
    useStore.getState().clearAll();
    expect(takeSnapshotMock).toHaveBeenCalledTimes(1);
    expect(takeSnapshotMock.mock.calls[0][0]).toBe("reset");
  });

  it("importJson は trigger:'import' で採取する", () => {
    const json = JSON.stringify({
      version: 1,
      schemaVersion: PERSIST_SCHEMA_VERSION,
      cards: [],
      currencies: [],
      stores: [],
      edges: [],
    });
    const res = useStore.getState().importJson(json);
    expect(res.ok).toBe(true);
    expect(
      takeSnapshotMock.mock.calls.some((c) => c[0] === "import"),
    ).toBe(true);
  });

  it("不正 JSON の importJson は snapshot を採らない (弾かれた操作)", () => {
    const res = useStore.getState().importJson("{ not valid");
    expect(res.ok).toBe(false);
    expect(takeSnapshotMock).not.toHaveBeenCalled();
  });

  it("syncFromUrl (全上書き) は trigger:'sync-overwrite' で採取する", async () => {
    useStore.setState({ syncUrl: "https://example.test/master.json" });
    const master = {
      version: 43,
      cards: [],
      currencies: [],
      stores: [],
      edges: [],
      pointCards: [],
      paymentApps: [],
      programs: [],
      memberships: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify(master),
      }),
    );
    const res = await useStore.getState().syncFromUrl();
    expect(res.ok).toBe(true);
    expect(
      takeSnapshotMock.mock.calls.some((c) => c[0] === "sync-overwrite"),
    ).toBe(true);
  });

  it("applySeedUpdate (マスタ反映) は trigger:'seed-apply' で採取する", () => {
    useStore.getState().applySeedUpdate([]);
    expect(
      takeSnapshotMock.mock.calls.some((c) => c[0] === "seed-apply"),
    ).toBe(true);
  });
});
