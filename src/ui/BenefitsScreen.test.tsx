// @vitest-environment jsdom
//
// 特典・キャンペーン統合 (PR-2c) の UI テスト。
//   - 統合フィルタの分類 (すべて/常設/有効中/期限切れ/未来開始/opt-in) と件数バッジ。
//   - opt-in「使う」トグルで store.setProgramEnabled が反映される。
//   - 手動登録フォーム (<details>) の開閉で CampaignForm が遅延 mount される。
//   - 自作 program は削除でき、公式 program は削除ボタンが出ない。
//
// 期間分類は実行時刻に依存しないよう、過去 (2000) / 未来 (2099) の固定日で fixture を組む。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BenefitsScreen } from "./BenefitsScreen";
import { DialogProvider } from "./dialog/DialogProvider";
import { useStore } from "../state/store";
import { MASTER_PROGRAM_IDS } from "../state/seed";
import type { BenefitProgram } from "../domain/types";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.clear();
  useStore.getState().clearAll();
  window.location.hash = "";
});
afterEach(cleanup);

const mkProg = (
  over: Partial<BenefitProgram> & { id: string },
): BenefitProgram => ({
  name: over.id,
  scope: "all-stores",
  rate: 0.01,
  currencyId: "epos-pt",
  ...over,
});

// 期間分類が「今」に依存しないよう極端な過去/未来日を使う。
const PERMANENT = mkProg({ id: "u-perm", name: "常設マーケット" });
const ACTIVE = mkProg({
  id: "u-active",
  name: "有効中キャンペーン",
  paymentAppId: "pa-x",
  validFrom: "2000-01-01",
  validTo: "2099-12-31",
});
const EXPIRED = mkProg({
  id: "u-expired",
  name: "終了キャンペーン",
  validFrom: "2000-01-01",
  validTo: "2000-12-31",
});
const FUTURE = mkProg({
  id: "u-future",
  name: "未来キャンペーン",
  validFrom: "2099-01-01",
  validTo: "2099-12-31",
});
const OPTIN = mkProg({
  id: "u-optin",
  name: "選べる特典",
  cardIds: ["epos-card"],
  optIn: true,
});
const LOYALTY = mkProg({
  id: "u-loyalty",
  name: "提示ポイント",
  scope: "member-stores",
  pointCardId: "pc-1",
});

function seed(programs: BenefitProgram[]) {
  useStore.setState({
    currencies: [{ id: "epos-pt", name: "エポスポイント" }],
    cards: [
      {
        id: "epos-card",
        name: "エポスカード",
        defaultRate: 0.005,
        defaultCurrencyId: "epos-pt",
      },
    ],
    pointCards: [{ id: "pc-1", name: "エポスポイント提示", currencyId: "epos-pt" }],
    paymentApps: [{ id: "pa-x", name: "エポスペイ" }],
    stores: [{ id: "s-1", name: "マルイ" }],
    programs,
    memberships: [],
  });
}

const renderScreen = () =>
  render(
    <DialogProvider>
      <BenefitsScreen />
    </DialogProvider>,
  );

// フィルタタブ (button) を label 前方一致で取得。
const filterTab = (labelPrefix: string) =>
  screen
    .getAllByRole("button")
    .find((b) => (b.textContent ?? "").startsWith(labelPrefix))!;

describe("BenefitsScreen フィルタ", () => {
  it("既定 (すべて) は全 program を表示し、件数バッジが分類を反映する", () => {
    seed([PERMANENT, ACTIVE, EXPIRED, FUTURE, OPTIN, LOYALTY]);
    renderScreen();

    // 全 6 件が並ぶ
    for (const name of [
      "常設マーケット",
      "有効中キャンペーン",
      "終了キャンペーン",
      "未来キャンペーン",
      "選べる特典",
      "提示ポイント",
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    // 件数バッジ (期間系は排他: 常設3 + 有効中1 + 期限切れ1 + 未来1 = all 6)
    expect(filterTab("すべて").textContent).toContain("(6)");
    expect(filterTab("常設").textContent).toContain("(3)"); // perm + optin + loyalty
    expect(filterTab("期間限定").textContent).toContain("(1)");
    expect(filterTab("期限切れ").textContent).toContain("(1)");
    expect(filterTab("未来開始").textContent).toContain("(1)");
    expect(filterTab("ポイントカード提示").textContent).toContain("(1)");
    expect(filterTab("決済アプリ").textContent).toContain("(1)");
    expect(filterTab("opt-in").textContent).toContain("(1)");
  });

  it("フィルタ切替で該当分類のみ表示する", () => {
    seed([PERMANENT, ACTIVE, EXPIRED, FUTURE, OPTIN, LOYALTY]);
    renderScreen();

    // 常設: perm / optin / loyalty のみ
    fireEvent.click(filterTab("常設"));
    expect(screen.getByText("常設マーケット")).toBeInTheDocument();
    expect(screen.getByText("選べる特典")).toBeInTheDocument();
    expect(screen.getByText("提示ポイント")).toBeInTheDocument();
    expect(screen.queryByText("有効中キャンペーン")).toBeNull();
    expect(screen.queryByText("終了キャンペーン")).toBeNull();

    // 期間限定 (有効中): active のみ
    fireEvent.click(filterTab("期間限定"));
    expect(screen.getByText("有効中キャンペーン")).toBeInTheDocument();
    expect(screen.queryByText("常設マーケット")).toBeNull();
    expect(screen.queryByText("未来キャンペーン")).toBeNull();

    // 期限切れ: expired のみ
    fireEvent.click(filterTab("期限切れ"));
    expect(screen.getByText("終了キャンペーン")).toBeInTheDocument();
    expect(screen.queryByText("有効中キャンペーン")).toBeNull();

    // 未来開始: future のみ
    fireEvent.click(filterTab("未来開始"));
    expect(screen.getByText("未来キャンペーン")).toBeInTheDocument();
    expect(screen.queryByText("終了キャンペーン")).toBeNull();

    // opt-in 特典: optin のみ
    fireEvent.click(filterTab("opt-in"));
    expect(screen.getByText("選べる特典")).toBeInTheDocument();
    expect(screen.queryByText("常設マーケット")).toBeNull();
  });
});

describe("BenefitsScreen opt-in トグル", () => {
  it("opt-in 特典の「使う」トグルで setProgramEnabled が反映される", () => {
    seed([OPTIN]);
    const { container } = renderScreen();

    const toggle = container.querySelector<HTMLInputElement>(
      '.card-enabled-toggle input[type="checkbox"]',
    )!;
    expect(toggle).toBeTruthy();
    expect(toggle.checked).toBe(false);
    expect(screen.getByText("OFF")).toBeInTheDocument();

    fireEvent.click(toggle);

    // store に enabled:true が書かれる
    expect(
      useStore.getState().programs.find((p) => p.id === "u-optin")?.enabled,
    ).toBe(true);
    // トグル表示も ON ("使う") に変わる (th 見出しと衝突しないようトグル内に限定)
    expect(toggle.checked).toBe(true);
    expect(
      container.querySelector(".card-enabled-toggle span")?.textContent,
    ).toBe("使う");
  });
});

describe("BenefitsScreen 手動登録フォーム", () => {
  it("details を開くと CampaignForm が mount され、閉じると unmount される", () => {
    seed([PERMANENT]);
    renderScreen();

    const summary = screen.getByText("キャンペーンを手動登録");
    // 既定閉: フォームの入力は未 mount
    expect(screen.queryByPlaceholderText(/○○ストア/)).toBeNull();

    fireEvent.click(summary);
    expect(screen.getByPlaceholderText(/○○ストア/)).toBeInTheDocument();

    // もう一度クリックで閉じる → unmount
    fireEvent.click(summary);
    expect(screen.queryByPlaceholderText(/○○ストア/)).toBeNull();
  });
});

describe("BenefitsScreen 削除", () => {
  it("公式 program は削除ボタンが出ず「公式」バッジを表示、自作 program は削除できる", async () => {
    const masterId = [...MASTER_PROGRAM_IDS][0];
    const master = mkProg({ id: masterId, name: "公式プログラム" });
    const userProg = mkProg({ id: "u-del", name: "自作キャンペーン" });
    seed([master, userProg]);
    renderScreen();

    // 公式: 「公式」バッジあり
    expect(screen.getByText("公式")).toBeInTheDocument();

    // 行数分の削除ボタンは 1 つ (自作のみ)
    const delButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent === "削除");
    expect(delButtons).toHaveLength(1);

    // 自作を削除 → 確認ダイアログ OK
    fireEvent.click(delButtons[0]);
    const dialog = await screen.findByTestId("dialog-confirm");
    fireEvent.click(within(dialog).getByTestId("dialog-ok"));

    // confirm 解決は microtask 経由なので flush を待つ → store から消える
    await waitFor(() =>
      expect(
        useStore.getState().programs.find((p) => p.id === "u-del"),
      ).toBeUndefined(),
    );
  });
});
