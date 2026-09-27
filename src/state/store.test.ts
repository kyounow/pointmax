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
import { mergeSeed, changeCount } from "../domain/mergeSeed";
import { PERSIST_SCHEMA_VERSION } from "./persist-versions";
import { seed, SEED_VERSION } from "./seed";
import { MIGRATIONS, conflictItems, planMigrations } from "../domain/migrations";
import { REMOVED_PROGRAM_IDS } from "./seed-additions";
import { REMOVED_MEMBERSHIP_IDS } from "./seed-blocklist";
import { membershipId } from "./defineMemberships";
import { isAutoApplySafe } from "../domain/autoApplySafety";
import type {
  BenefitProgram,
  Card,
  ConversionEdge,
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

// PR-2: 店舗 × 決済ペアのワンタップ除外 (user-owned)。追加/復帰/重複防止 +
// 全置換取込 (syncFromUrl / importJson) で消えない保護要件を検査する。
describe("store: excludeStorePayment / restoreStorePayment (PR-2)", () => {
  beforeEach(() => {
    useStore.getState().clearAll();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("除外を追加する (storeId × paymentAppId + excludedAt)", () => {
    useStore.getState().excludeStorePayment("lawson", "pa-dbarai");
    const list = useStore.getState().excludedStorePayments;
    expect(list).toHaveLength(1);
    expect(list[0].storeId).toBe("lawson");
    expect(list[0].paymentAppId).toBe("pa-dbarai");
    expect(list[0].excludedAt).toBeTruthy();
  });

  it("同一 (店舗 × 決済) の重複追加は無視する (重複防止)", () => {
    useStore.getState().excludeStorePayment("lawson", "pa-dbarai");
    useStore.getState().excludeStorePayment("lawson", "pa-dbarai");
    expect(useStore.getState().excludedStorePayments).toHaveLength(1);
  });

  it("別店舗 / 別決済は個別レコードとして追加される", () => {
    useStore.getState().excludeStorePayment("lawson", "pa-dbarai");
    useStore.getState().excludeStorePayment("lawson", "pa-paypay");
    useStore.getState().excludeStorePayment("seven", "pa-dbarai");
    expect(useStore.getState().excludedStorePayments).toHaveLength(3);
  });

  it("restoreStorePayment は該当ペアのみ削除する", () => {
    useStore.getState().excludeStorePayment("lawson", "pa-dbarai");
    useStore.getState().excludeStorePayment("lawson", "pa-paypay");
    useStore.getState().restoreStorePayment("lawson", "pa-dbarai");
    const list = useStore.getState().excludedStorePayments;
    expect(list).toHaveLength(1);
    expect(list[0].paymentAppId).toBe("pa-paypay");
  });

  it("restoreStorePayment: 存在しないペアは no-op", () => {
    useStore.getState().excludeStorePayment("lawson", "pa-dbarai");
    useStore.getState().restoreStorePayment("seven", "pa-dbarai");
    expect(useStore.getState().excludedStorePayments).toHaveLength(1);
  });

  it("syncFromUrl (公式 master 全置換) 後も excludedStorePayments が残る (保護要件)", async () => {
    const record = {
      storeId: "lawson",
      paymentAppId: "pa-dbarai",
      excludedAt: "2026-07-20T00:00:00.000Z",
    };
    useStore.setState({
      excludedStorePayments: [record],
      syncUrl: "https://example.test/master.json",
    });
    // 公式 master.json (per-user 設定を出荷しない) を全置換取込する
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
    // 全置換経路は excludedStorePayments を触らないため除外が生き残る
    expect(useStore.getState().excludedStorePayments).toEqual([record]);
  });

  it("importJson (全置換) 後も excludedStorePayments が残る (保護要件)", () => {
    const record = {
      storeId: "lawson",
      paymentAppId: "pa-dbarai",
      excludedAt: "2026-07-20T00:00:00.000Z",
    };
    useStore.setState({ excludedStorePayments: [record] });
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
    expect(useStore.getState().excludedStorePayments).toEqual([record]);
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

// PR-0a-2a: v46 監査の修正 (edge 3 本の rate 修正・2 本の削除・廃止 program 2 件) と
// たまるの channel を、SEED 46 以前で初期化した既存端末へ届ける配信経路の結線テスト。
// 旧端末 state = seed() に v46 以前の値を混ぜたもの (lastSeedVersion=46)。
// 「アプリに反映」(applySeedUpdate([])) / 自動反映 (autoApplySeedUpdate) /
// サンプル投入 (mergeFromSeed) の 3 経路とも同じ結果になる (mergeFromSeed は computeSeedUpdate に委譲)。
describe("store: seed 反映の既存端末配信 (PR-0a-2a / MIGRATIONS v47 + tombstone)", () => {
  const OLD_REMOVED_PROGRAMS: BenefitProgram[] = [
    {
      id: "prog-au-pay-card-addon",
      scope: "all-stores",
      name: "au PAY × au PAYカード 上乗せ",
      paymentAppId: "pa-au-pay",
      cardIds: ["au-pay-card"],
      rate: 0.01,
      currencyId: "ponta-pt",
      bonusType: "addOn",
      description: "au PAYカードからチャージで +1% 上乗せ (au PAY 0.5% と合わせて 1.5%)",
    },
    {
      id: "prog-rakuten-pointcard-1pc",
      scope: "member-stores",
      name: "楽天ポイントカード提示 1%",
      pointCardId: "rakuten-pointcard",
      rate: 0.01,
      currencyId: "rakuten-pt",
      bonusType: "primary",
      description: "楽天ポイントカード提示で 100円=1pt (1%) 還元",
    },
  ];
  const OLD_REMOVED_MEMBERSHIPS: StoreProgramMembership[] = ["mcdonalds", "doutor"].map(
    (storeId) => ({
      id: `m-prog-rakuten-pointcard-1pc-${storeId}`,
      programId: "prog-rakuten-pointcard-1pc",
      storeId,
    }),
  );
  const OLD_EDGE_RATES: Record<string, number> = {
    "eikyu-to-d": 5,
    "eikyu-to-amazon": 5,
    "jre-to-jal-normal": 0.5,
  };
  const OLD_REMOVED_EDGES: ConversionEdge[] = [
    { id: "eikyu-to-edy", fromCurrencyId: "eikyu", toCurrencyId: "edy", rate: 4.5 },
    { id: "eikyu-to-rakuten", fromCurrencyId: "eikyu", toCurrencyId: "rakuten-pt", rate: 4.5 },
  ];

  // v46 以前の端末 state を組み立てる。edgeOverrides で手編集 edge を再現できる。
  const setOldState = (edgeOverrides: Record<string, number> = {}) => {
    const s = seed();
    const withoutChannel = <T extends { channel?: unknown }>(x: T): T => {
      const next = { ...x };
      delete next.channel;
      return next;
    };
    useStore.setState({
      cards: s.cards,
      currencies: s.currencies,
      stores: s.stores,
      edges: [
        ...s.edges.map((e) =>
          e.id in edgeOverrides
            ? { ...e, rate: edgeOverrides[e.id] }
            : e.id in OLD_EDGE_RATES
              ? { ...e, rate: OLD_EDGE_RATES[e.id] }
              : e,
        ),
        ...OLD_REMOVED_EDGES,
      ],
      pointCards: s.pointCards,
      paymentApps: s.paymentApps,
      programs: [...s.programs.map(withoutChannel), ...OLD_REMOVED_PROGRAMS],
      memberships: [...s.memberships.map(withoutChannel), ...OLD_REMOVED_MEMBERSHIPS],
      lastSeedVersion: 46,
    });
  };

  const expectDelivered = () => {
    const st = useStore.getState();
    // たまる 3 program は channel:"online" (program の公式更新伝播で届く)
    for (const n of [2, 3, 4]) {
      const p = st.programs.find((x) => x.id === `prog-epos-tamaru-${n}x`);
      expect(p?.channel, `prog-epos-tamaru-${n}x`).toBe("online");
    }
    // edge 3 本の rate 修正 (MIGRATIONS v47 の updateField)
    const edgeRate = (id: string) => st.edges.find((e) => e.id === id)?.rate;
    expect(edgeRate("eikyu-to-d")).toBe(4.5);
    expect(edgeRate("eikyu-to-amazon")).toBe(4);
    expect(edgeRate("jre-to-jal-normal")).toBe(0.3333);
    // edge 2 本の削除 (MIGRATIONS v47 の delete)
    expect(st.edges.some((e) => e.id === "eikyu-to-edy")).toBe(false);
    expect(st.edges.some((e) => e.id === "eikyu-to-rakuten")).toBe(false);
    // 廃止 program 2 件 + cascade membership (REMOVED_PROGRAM_IDS)
    for (const id of ["prog-au-pay-card-addon", "prog-rakuten-pointcard-1pc"]) {
      expect(st.programs.some((p) => p.id === id), id).toBe(false);
      expect(st.memberships.some((m) => m.programId === id), id).toBe(false);
    }
    expect(st.lastSeedVersion).toBe(SEED_VERSION);
    expect(SEED_VERSION).toBeGreaterThanOrEqual(47);
  };

  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("applySeedUpdate([]) (アプリに反映) で配信される", () => {
    setOldState();
    useStore.getState().applySeedUpdate([]);
    expectDelivered();
  });

  it("autoApplySeedUpdate (自動反映) でも同じく配信される", () => {
    setOldState();
    useStore.getState().autoApplySeedUpdate({ digest: "d-v47", count: 1 });
    expectDelivered();
  });

  it("mergeFromSeed (設定 > サンプル投入) でも同じく配信される (computeSeedUpdate に委譲)", () => {
    setOldState();
    useStore.getState().mergeFromSeed();
    expectDelivered();
  });

  it("手編集した edge (eikyu-to-d=6) は conflict として保護され、overrideKeys 無しでは 6 のまま", () => {
    setOldState({ "eikyu-to-d": 6 });
    useStore.getState().applySeedUpdate([]);
    const st = useStore.getState();
    expect(st.edges.find((e) => e.id === "eikyu-to-d")?.rate).toBe(6);
    // 衝突しない他の修正は届く
    expect(st.edges.find((e) => e.id === "eikyu-to-amazon")?.rate).toBe(4);
    expect(st.edges.some((e) => e.id === "eikyu-to-edy")).toBe(false);
  });

  it("手編集 edge の conflict キーを overrideKeys に指定すると公式値 4.5 で上書きされる", () => {
    setOldState({ "eikyu-to-d": 6 });
    const before = useStore.getState();
    const plan = planMigrations(before, before.lastSeedVersion, SEED_VERSION, MIGRATIONS);
    const conflict = conflictItems(plan).find((p) => p.migration.id === "eikyu-to-d");
    expect(conflict, "eikyu-to-d が conflict として検出されない").toBeDefined();
    expect(conflict?.currentValue).toBe(6);
    useStore.getState().applySeedUpdate(conflict ? [conflict.key] : []);
    expect(useStore.getState().edges.find((e) => e.id === "eikyu-to-d")?.rate).toBe(4.5);
  });

  it("mergeFromSeed でも手編集 edge は上書きしない (conflict は未適用のまま)", () => {
    setOldState({ "eikyu-to-d": 6 });
    useStore.getState().mergeFromSeed();
    expect(useStore.getState().edges.find((e) => e.id === "eikyu-to-d")?.rate).toBe(6);
  });
});

// PR-0a-2b (F3): membership 単体 tombstone (REMOVED_MEMBERSHIP_IDS) を seed 反映の 3 経路に配線。
// 以前は preview (useSeedMerge) にだけ渡していたため、#103 の general 混入 4 件は
// 「アプリに反映」しても消えず、isAutoApplySafe が恒久 false のままだった。
describe("store: seed 反映の membership tombstone 配線 (PR-0a-2b)", () => {
  const GENERAL_103: StoreProgramMembership[] = [
    "prog-jcb-jpoint-20x",
    "prog-jcb-jpoint-gold-20x",
    "prog-jcb-jpoint-2x",
    "prog-jcb-jpoint-gold-2x",
  ].map((programId) => ({
    id: `m-${programId}-general`,
    programId,
    storeId: "general",
  }));
  // ユーザー作成 program (UUID) の membership。tombstone とも公式 id とも衝突しない。
  const USER_MEMBERSHIP: StoreProgramMembership = {
    id: "m-5b1f0c7e-user-prog-general",
    programId: "5b1f0c7e-user-prog",
    storeId: "general",
    userModifiedAt: "2026-09-01T00:00:00.000Z",
  };

  const setStateWith103 = () => {
    const s = seed();
    useStore.setState({
      ...s,
      memberships: [...s.memberships, ...GENERAL_103, USER_MEMBERSHIP],
      lastSeedVersion: SEED_VERSION,
    });
  };

  const expectTombstoned = () => {
    const ids = new Set(useStore.getState().memberships.map((m) => m.id));
    for (const m of GENERAL_103) expect(ids.has(m.id), m.id).toBe(false);
    expect(ids.has(USER_MEMBERSHIP.id)).toBe(true);
    // 反映後は preview (useSeedMerge と同じ opts) の差分が 0 件 = 再通知されない
    const merged = mergeSeed(useStore.getState(), seed(), {
      removedProgramIds: REMOVED_PROGRAM_IDS,
      removedMembershipIds: REMOVED_MEMBERSHIP_IDS,
    });
    expect(changeCount(merged)).toBe(0);
  };

  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("前提: REMOVED_MEMBERSHIP_IDS は #103 の general 4 件を含む", () => {
    for (const m of GENERAL_103) expect(REMOVED_MEMBERSHIP_IDS).toContain(m.id);
  });

  it("applySeedUpdate([]) (アプリに反映) で 4 件とも消え、UUID program の membership は残る", () => {
    setStateWith103();
    useStore.getState().applySeedUpdate([]);
    expectTombstoned();
  });

  it("autoApplySeedUpdate (自動反映) でも同じく消える", () => {
    setStateWith103();
    useStore.getState().autoApplySeedUpdate({ digest: "d-103", count: 4 });
    expectTombstoned();
  });

  it("mergeFromSeed (設定 > サンプル投入) でも同じく消える", () => {
    setStateWith103();
    useStore.getState().mergeFromSeed();
    expectTombstoned();
  });
});

// PR-0a-2c: tier 重複 2 件 (高島屋 × Gold 2倍 = ADDED、無印 × たまる 4倍 = 旧手書き) の membership
// tombstone を seed() 実データ (ADDED 行込み) で検証する。seed() 側のフィルタが無いと ADDED 行が
// 毎回「追加 → tombstone 除去」を往復し、isAutoApplySafe が恒久 false になる。
// (ADDED 行は次の cron apply が物理削除するので、ここでは ADDED の有無に依存せず行を組み立てる)
describe("store: tier 重複の membership tombstone (PR-0a-2c)", () => {
  const OLD_TIER_ROWS: StoreProgramMembership[] = [
    ["prog-jcb-jpoint-gold-2x", "takashimaya"],
    ["prog-epos-tamaru-4x", "muji"],
  ].map(([programId, storeId]) => ({
    id: membershipId(programId, storeId),
    programId,
    storeId,
  }));
  const MERGE_OPTS = {
    removedProgramIds: REMOVED_PROGRAM_IDS,
    removedMembershipIds: REMOVED_MEMBERSHIP_IDS,
  };

  // 2c 以前の端末: seed() (ADDED 行込み) に加えて、tombstone 対象の 2 行を持っている。
  const setOldDevice = () => {
    const s = seed();
    useStore.setState({
      ...s,
      memberships: [...s.memberships, ...OLD_TIER_ROWS],
      lastSeedVersion: SEED_VERSION,
    });
  };

  beforeEach(() => {
    useStore.getState().clearAll();
  });

  it("前提: 2 行とも REMOVED_MEMBERSHIP_IDS に入っており、seed() には無い", () => {
    const ids = new Set(seed().memberships.map((m) => m.id));
    for (const m of OLD_TIER_ROWS) {
      expect(REMOVED_MEMBERSHIP_IDS).toContain(m.id);
      expect(ids.has(m.id), m.id).toBe(false);
    }
  });

  it("反映前は membership 削除 2 件で isAutoApplySafe が false (確認モーダルで届く)", () => {
    setOldDevice();
    const merged = mergeSeed(useStore.getState(), seed(), MERGE_OPTS);
    expect(merged.removedMemberships.map((m) => m.id).sort()).toEqual(
      OLD_TIER_ROWS.map((m) => m.id).sort(),
    );
    expect(isAutoApplySafe(merged, { seedVersionBumped: false })).toBe(false);
  });

  it("applySeedUpdate([]) の後は 2 行が state から消え、差分 0 で isAutoApplySafe が true に戻る", () => {
    setOldDevice();
    useStore.getState().applySeedUpdate([]);
    const st = useStore.getState();
    for (const m of OLD_TIER_ROWS) {
      expect(st.memberships.some((x) => x.id === m.id), m.id).toBe(false);
    }
    // 正しい tier は残る
    expect(
      st.memberships.some(
        (x) => x.id === membershipId("prog-jcb-jpoint-gold-4x", "takashimaya"),
      ),
    ).toBe(true);
    expect(
      st.memberships.some((x) => x.id === membershipId("prog-epos-tamaru-2x", "muji")),
    ).toBe(true);
    const merged = mergeSeed(st, seed(), MERGE_OPTS);
    expect(changeCount(merged)).toBe(0);
    expect(
      isAutoApplySafe(merged, {
        seedVersionBumped: st.lastSeedVersion < SEED_VERSION,
      }),
    ).toBe(true);
  });

  it("フィルタ後の seed() を mergeSeed に 2 回通しても diff.memberships が空 (追加 → 除去の往復が無い)", () => {
    const s = seed();
    const first = mergeSeed(s, seed(), MERGE_OPTS);
    expect(first.diff.memberships).toEqual([]);
    expect(first.removedMemberships).toEqual([]);
    const second = mergeSeed(first, seed(), MERGE_OPTS);
    expect(second.diff.memberships).toEqual([]);
    expect(second.removedMemberships).toEqual([]);
    expect(changeCount(second)).toBe(0);
    expect(isAutoApplySafe(second, { seedVersionBumped: false })).toBe(true);
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

  it("autoApplySeedUpdate (自動反映) は trigger:'seed-apply' で採取し notice を立てる", () => {
    useStore.getState().autoApplySeedUpdate({ digest: "d-1", count: 3 });
    expect(
      takeSnapshotMock.mock.calls.some((c) => c[0] === "seed-apply"),
    ).toBe(true);
    expect(useStore.getState().autoApplyNotice).toEqual({
      digest: "d-1",
      count: 3,
    });
  });

  it("mergeFromSeed (サンプル投入) も trigger:'seed-apply' で採取する (PR-0a-2a: 公式の修正・削除も反映するため)", () => {
    useStore.getState().mergeFromSeed();
    expect(
      takeSnapshotMock.mock.calls.some((c) => c[0] === "seed-apply"),
    ).toBe(true);
  });

  it("dismissAutoApplyNotice で notice が null に戻る", () => {
    useStore.getState().autoApplySeedUpdate({ digest: "d-2", count: 1 });
    expect(useStore.getState().autoApplyNotice).not.toBeNull();
    useStore.getState().dismissAutoApplyNotice();
    expect(useStore.getState().autoApplyNotice).toBeNull();
  });
});

// PR-6a-1 (F7): 新規プロファイル / 初期化後の次回起動で公式 seed を自動投入する。
// (node 環境 = persist が無いので hydration 判定は飛ぶ。hydration 失敗時の no-op は App.test (jsdom))
describe("store: seedIfEmpty (新規プロファイルの seed 自動投入、PR-6a-1)", () => {
  const COLLECTIONS = [
    "cards",
    "currencies",
    "stores",
    "edges",
    "pointCards",
    "paymentApps",
    "programs",
    "memberships",
  ] as const;
  const takeSnapshotMock = vi.mocked(takeSnapshot);

  beforeEach(() => {
    // clearAll = 設定 > 初期化 と同じ empty (lastSeedVersion 0) に戻す
    useStore.getState().clearAll();
    takeSnapshotMock.mockClear();
  });

  it("空 state では 8 collection が seed() と一致し、lastSeedVersion = SEED_VERSION、通知・スナップショット無し", () => {
    expect(useStore.getState().seedIfEmpty()).toBe(true);

    const s = useStore.getState();
    const expected = seed();
    for (const k of COLLECTIONS) {
      expect(s[k]).toEqual(expected[k]);
    }
    expect(s.stores.length).toBeGreaterThan(0);
    expect(s.lastSeedVersion).toBe(SEED_VERSION);
    expect(s.autoApplyNotice).toBeNull();
    expect(takeSnapshotMock).not.toHaveBeenCalled();
    // per-user 設定は初期値のまま (seed は preference を出荷しない)
    expect(s.preferredCurrencyIds).toEqual([]);
  });

  it("カードは R1 どおり全 OFF (enabled を出荷しない) で入る", () => {
    useStore.getState().seedIfEmpty();
    const cards = useStore.getState().cards;
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((c) => c.enabled !== true)).toBe(true);
  });

  it("投入後は bundled seed との差分が 0 件 (SyncUpdateModal / UpdateBanner が出ない前提)", () => {
    useStore.getState().seedIfEmpty();
    const s = useStore.getState();
    // useSeedMerge と同じ tombstone オプションで差分を取る
    const merged = mergeSeed(s, seed(), {
      removedProgramIds: REMOVED_PROGRAM_IDS,
      removedMembershipIds: REMOVED_MEMBERSHIP_IDS,
    });
    expect(changeCount(merged)).toBe(0);
    // UpdateBanner は lastSeedVersion < SEED_VERSION のときだけ出る
    expect(s.lastSeedVersion).toBeGreaterThanOrEqual(SEED_VERSION);
  });

  it("2 回目は no-op (冪等。StrictMode の effect 二重実行でも 1 回だけ入る)", () => {
    expect(useStore.getState().seedIfEmpty()).toBe(true);
    const first = useStore.getState();
    expect(useStore.getState().seedIfEmpty()).toBe(false);
    expect(useStore.getState()).toBe(first);
  });

  it.each(COLLECTIONS)(
    "%s に 1 件でもデータがある state では no-op",
    (key) => {
      const one = seed()[key].slice(0, 1);
      expect(one).toHaveLength(1);
      useStore.setState({ [key]: one });

      expect(useStore.getState().seedIfEmpty()).toBe(false);
      const s = useStore.getState();
      expect(s[key]).toEqual(one);
      for (const k of COLLECTIONS) {
        if (k !== key) expect(s[k]).toEqual([]);
      }
      expect(s.lastSeedVersion).toBe(0);
    },
  );

  it("lastSeedVersion が 0 でなければ (空でも) no-op", () => {
    useStore.setState({ lastSeedVersion: SEED_VERSION });
    expect(useStore.getState().seedIfEmpty()).toBe(false);
    expect(useStore.getState().stores).toEqual([]);
    expect(useStore.getState().cards).toEqual([]);
  });

  it("schema 移行待ち (_pendingSchemaMigration) の間は no-op (同意モーダルの Apply に任せる)", () => {
    useStore.setState({
      _pendingSchemaMigration: { type: "reset", reason: "test" },
    });
    expect(useStore.getState().seedIfEmpty()).toBe(false);
    expect(useStore.getState().stores).toEqual([]);
    useStore.setState({ _pendingSchemaMigration: undefined });
  });

  it("clearAll (設定 > 初期化) の後は同じ規則で再投入される", () => {
    useStore.getState().seedIfEmpty();
    useStore.getState().setCardEnabled(useStore.getState().cards[0].id, true);
    useStore.getState().clearAll();
    expect(useStore.getState().cards).toEqual([]);
    expect(useStore.getState().lastSeedVersion).toBe(0);

    expect(useStore.getState().seedIfEmpty()).toBe(true);
    expect(useStore.getState().stores).toEqual(seed().stores);
    expect(useStore.getState().cards.every((c) => c.enabled !== true)).toBe(true);
  });
});

// PR-6d (U6): 復旧パネルの「公式データで初期化」(resetToSeed) と、それに委譲した
// schema reset の Apply (applySchemaMigration)。投入内容は seedIfEmpty と共通 (applySeedState)。
describe("store: resetToSeed / applySchemaMigration (PR-6d)", () => {
  const COLLECTIONS = [
    "cards",
    "currencies",
    "stores",
    "edges",
    "pointCards",
    "paymentApps",
    "programs",
    "memberships",
  ] as const;
  const takeSnapshotMock = vi.mocked(takeSnapshot);

  // ユーザーが使い込んだ state (per-user 設定・通知・編集済みデータ入り)。
  const dirtyState = () => {
    useStore.getState().clearAll();
    useStore.getState().seedIfEmpty();
    const s = useStore.getState();
    s.setCardEnabled(s.cards[0].id, true);
    s.addPreferredCurrency(s.currencies[0].id);
    s.setBirthMonth(7);
    s.setYenValueOverride(s.currencies[0].id, 1.5);
    s.excludeStorePayment(s.stores[0].id, s.paymentApps[0].id);
    s.addCard({
      name: "ユーザ追加",
      defaultRate: 0.01,
      defaultCurrencyId: s.currencies[0].id,
    });
    useStore.setState({
      autoApplyNotice: { digest: "d-1", count: 1 },
      lastSeedVersion: 1,
    });
    takeSnapshotMock.mockClear();
  };

  const expectSeedState = () => {
    const s = useStore.getState();
    const expected = seed();
    for (const k of COLLECTIONS) {
      expect(s[k]).toEqual(expected[k]);
    }
    expect(s.lastSeedVersion).toBe(SEED_VERSION);
    expect(s.autoApplyNotice).toBeNull();
    // per-user 設定は引き継がない (open 項目の決定)
    expect(s.preferredCurrencyIds).toEqual([]);
    expect(s.birthMonth).toBeUndefined();
    expect(s.yenValueOverrides).toEqual({});
    expect(s.excludedStorePayments).toEqual([]);
    expect(s.cards.every((c) => c.enabled !== true)).toBe(true);
    expect(s._pendingSchemaMigration).toBeUndefined();
    expect(s._legacyPersistedState).toBeUndefined();
  };

  it("resetToSeed は seed と一致する state にし、スナップショットを取らない", () => {
    dirtyState();
    useStore.getState().resetToSeed();
    expectSeedState();
    expect(takeSnapshotMock).not.toHaveBeenCalled();
  });

  it("applySchemaMigration も同じ結果で、_pending / _legacy を消す (スナップショット無し)", () => {
    dirtyState();
    useStore.setState({
      _pendingSchemaMigration: { type: "reset", reason: "test" },
      _legacyPersistedState: { cards: "legacy" },
    });
    useStore.getState().applySchemaMigration();
    expectSeedState();
    expect(takeSnapshotMock).not.toHaveBeenCalled();
  });

  it("seedIfEmpty と resetToSeed の投入内容は一致する", () => {
    useStore.getState().clearAll();
    useStore.getState().seedIfEmpty();
    const bySeedIfEmpty = useStore.getState();
    dirtyState();
    useStore.getState().resetToSeed();
    const byReset = useStore.getState();
    for (const k of COLLECTIONS) {
      expect(byReset[k]).toEqual(bySeedIfEmpty[k]);
    }
    expect(byReset.lastSeedVersion).toBe(bySeedIfEmpty.lastSeedVersion);
  });
});
