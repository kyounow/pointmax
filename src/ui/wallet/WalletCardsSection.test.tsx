// @vitest-environment jsdom
//
// PR-2b2: カード起点の opt-in 特典 一次導線 + 誕生月の遅延プロンプトの UI テスト。
//   - opt-in 導線: optIn program を持つカードに「◯◯ の特典 N 件」が出て、
//     トグルで store.setProgramEnabled が呼ばれる (ProgramsScreen 暫定トグルと同じ state)。
//   - 誕生月: birthdayMonthOnly program を持つカードを ON にした瞬間、birthMonth 未設定なら
//     プロンプトが発火し、設定済みなら出ない。
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
import { WalletCardsSection } from "./WalletCardsSection";
import { DialogProvider } from "../dialog/DialogProvider";
import { useStore } from "../../state/store";
import type { BenefitProgram, Card, Currency } from "../../domain/types";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.clear();
  useStore.getState().clearAll();
  window.location.hash = "";
});
afterEach(cleanup);

const CURRENCIES: Currency[] = [{ id: "epos-pt", name: "エポスポイント" }];

const mkCard = (over: Partial<Card> & { id: string }): Card => ({
  name: over.id,
  defaultRate: 0.005,
  defaultCurrencyId: "epos-pt",
  ...over,
});

const renderSection = () =>
  render(
    <DialogProvider>
      <WalletCardsSection />
    </DialogProvider>,
  );

describe("WalletCardsSection opt-in 一次導線", () => {
  it("optIn program を持つカードに特典導線が出て、トグルで setProgramEnabled が呼ばれる", () => {
    const program: BenefitProgram = {
      id: "prog-optin",
      name: "選べるポイントアップ",
      scope: "all-stores",
      cardIds: ["epos-gold"],
      rate: 0.01,
      currencyId: "epos-pt",
      bonusType: "addOn",
      optIn: true,
      description: "対象ショップを選ぶと +1%",
      conditions: "「選べる特典」で当該特典を選択している場合のみ",
    };
    useStore.setState({
      currencies: CURRENCIES,
      cards: [mkCard({ id: "epos-gold", name: "エポスゴールド", enabled: true })],
      programs: [program],
    });
    renderSection();

    // 一次導線 (「◯◯ の特典 N 件」) と特典名が描画される
    const optin = screen.getByTestId("optin-epos-gold");
    expect(optin).toHaveTextContent("エポスゴールド の特典 1 件");
    expect(optin).toHaveTextContent("選べるポイントアップ");

    // details 内の「使う」トグルで setProgramEnabled(prog-optin, true)
    const toggle = within(optin).getByRole("checkbox");
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(
      useStore.getState().programs.find((p) => p.id === "prog-optin")?.enabled,
    ).toBe(true);
  });

  it("カードが OFF のときは特典導線に「カード自体が OFF」の注記が出る", () => {
    useStore.setState({
      currencies: CURRENCIES,
      // enabled 未設定 = OFF
      cards: [mkCard({ id: "epos-gold", name: "エポスゴールド" })],
      programs: [
        {
          id: "prog-optin",
          name: "選べるポイントアップ",
          scope: "all-stores",
          cardIds: ["epos-gold"],
          rate: 0.01,
          currencyId: "epos-pt",
          optIn: true,
        },
      ],
    });
    renderSection();
    expect(screen.getByTestId("optin-epos-gold")).toHaveTextContent(
      "このカード自体が「使う」OFF です",
    );
  });

  it("optIn でない program は特典導線を出さない", () => {
    useStore.setState({
      currencies: CURRENCIES,
      cards: [mkCard({ id: "epos-gold", name: "エポスゴールド", enabled: true })],
      programs: [
        {
          id: "prog-normal",
          name: "通常特約店",
          scope: "member-stores",
          cardIds: ["epos-gold"],
          rate: 0.02,
          currencyId: "epos-pt",
        },
      ],
    });
    renderSection();
    expect(screen.queryByTestId("optin-epos-gold")).toBeNull();
  });
});

describe("WalletCardsSection 誕生月の遅延プロンプト", () => {
  const bdayProgram: BenefitProgram = {
    id: "prog-bday",
    name: "誕生月ポイントアップ",
    scope: "all-stores",
    cardIds: ["epos-gold"],
    rate: 0.02,
    currencyId: "epos-pt",
    birthdayMonthOnly: true,
  };

  it("birthdayMonthOnly カードを ON にすると birthMonth 未設定ならプロンプトが発火し、入力で反映される", async () => {
    useStore.setState({
      currencies: CURRENCIES,
      cards: [mkCard({ id: "epos-gold", name: "エポスゴールド" })],
      programs: [bdayProgram],
      birthMonth: undefined,
    });
    renderSection();

    // birthdayMonthOnly は optIn ではないので特典導線は出ない → checkbox はカードの「使う」1 つのみ
    fireEvent.click(screen.getByRole("checkbox"));

    const dialog = await screen.findByTestId("dialog-prompt");
    expect(dialog).toHaveTextContent("誕生月を設定しますか？");

    // 3 を入力して設定 → store.birthMonth に反映
    fireEvent.change(within(dialog).getByRole("spinbutton"), {
      target: { value: "3" },
    });
    fireEvent.click(within(dialog).getByTestId("dialog-ok"));
    await waitFor(() => {
      expect(useStore.getState().birthMonth).toBe(3);
    });
  });

  it("birthMonth 設定済みなら ON にしてもプロンプトは出ない", async () => {
    useStore.setState({
      currencies: CURRENCIES,
      cards: [mkCard({ id: "epos-gold", name: "エポスゴールド" })],
      programs: [bdayProgram],
      birthMonth: 5,
    });
    renderSection();

    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => {
      expect(
        useStore.getState().cards.find((c) => c.id === "epos-gold")?.enabled,
      ).toBe(true);
    });
    expect(screen.queryByTestId("dialog-prompt")).toBeNull();
  });
});
