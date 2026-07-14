// @vitest-environment jsdom
//
// ウォレット統合 (PR-2b1) の UI テスト。
//   - buildCardGroups: family グルーピング (グレード順ソート / 単独行 / exclusive) の純関数検証。
//   - WalletScreen: セグメント切替 (hash 更新で cards ↔ point-cards) と ?highlight の描画検証。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { WalletScreen } from "./WalletScreen";
import { buildCardGroups, type CardGroupBlock } from "./wallet/cardGroups";
import { DialogProvider } from "./dialog/DialogProvider";
import { CARD_FAMILIES } from "../state/seed-data-card-families";
import { useStore } from "../state/store";
import type { Card } from "../domain/types";

// jsdom は scrollIntoView 未実装なので no-op スタブ (highlight effect が呼ぶ)。
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.clear();
  useStore.getState().clearAll();
  window.location.hash = "";
});
afterEach(cleanup);

// ----- buildCardGroups (純関数) -----
describe("buildCardGroups", () => {
  const mk = (over: Partial<Card> & { id: string }): Card => ({
    name: over.id,
    defaultRate: 0.01,
    defaultCurrencyId: "pt",
    ...over,
  });

  it("同 family はグレード順 (gradeLevel 昇順) に 1 グループへまとめる", () => {
    const cards = [
      mk({ id: "epos-platinum", familyId: "family-epos", gradeLevel: 3 }),
      mk({ id: "epos-card", familyId: "family-epos", gradeLevel: 1 }),
      mk({ id: "epos-gold", familyId: "family-epos", gradeLevel: 2 }),
    ];
    const blocks = buildCardGroups(cards, CARD_FAMILIES);
    expect(blocks).toHaveLength(1);
    const block = blocks[0] as Extract<CardGroupBlock, { kind: "family" }>;
    expect(block.kind).toBe("family");
    expect(block.familyId).toBe("family-epos");
    expect(block.family.exclusive).toBe(true);
    expect(block.cards.map((c) => c.id)).toEqual([
      "epos-card",
      "epos-gold",
      "epos-platinum",
    ]);
  });

  it("family なしカードは単独行ブロック (連続分は 1 ブロックに merge)", () => {
    const cards = [
      mk({ id: "rakuten-card" }),
      mk({ id: "smbc-v" }),
    ];
    const blocks = buildCardGroups(cards, CARD_FAMILIES);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("singles");
    expect(blocks[0].cards.map((c) => c.id)).toEqual(["rakuten-card", "smbc-v"]);
  });

  it("family と単独が混在しても初出位置でブロック分割される", () => {
    const cards = [
      mk({ id: "rakuten-card" }),
      mk({ id: "epos-card", familyId: "family-epos", gradeLevel: 1 }),
      mk({ id: "epos-gold", familyId: "family-epos", gradeLevel: 2 }),
      mk({ id: "smbc-v" }),
    ];
    const blocks = buildCardGroups(cards, CARD_FAMILIES);
    expect(blocks.map((b) => b.kind)).toEqual(["singles", "family", "singles"]);
    expect(blocks[1].cards.map((c) => c.id)).toEqual(["epos-card", "epos-gold"]);
  });

  it("未知 familyId は単独行として扱う", () => {
    const cards = [mk({ id: "x", familyId: "family-does-not-exist" })];
    const blocks = buildCardGroups(cards, CARD_FAMILIES);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("singles");
  });
});

// ----- WalletScreen 描画 / セグメント切替 -----
function seedCards() {
  useStore.setState({
    currencies: [
      { id: "epos-pt", name: "エポスポイント" },
      { id: "rakuten-pt", name: "楽天ポイント" },
    ],
    cards: [
      {
        id: "epos-card",
        name: "エポス一般",
        defaultRate: 0.005,
        defaultCurrencyId: "epos-pt",
        familyId: "family-epos",
        gradeLevel: 1,
      },
      {
        id: "epos-gold",
        name: "エポスゴールド",
        defaultRate: 0.01,
        defaultCurrencyId: "epos-pt",
        familyId: "family-epos",
        gradeLevel: 2,
      },
      {
        id: "epos-platinum",
        name: "エポスプラチナ",
        defaultRate: 0.015,
        defaultCurrencyId: "epos-pt",
        familyId: "family-epos",
        gradeLevel: 3,
      },
      {
        id: "rakuten-card",
        name: "楽天カード",
        defaultRate: 0.01,
        defaultCurrencyId: "rakuten-pt",
      },
    ],
  });
}

const renderWallet = () =>
  render(
    <DialogProvider>
      <WalletScreen />
    </DialogProvider>,
  );

describe("WalletScreen", () => {
  it("既定 (#wallet) はクレカセクションを表示し、エポスを family グループ化する", () => {
    seedCards();
    window.location.hash = "#wallet";
    renderWallet();

    // クレカセクションの見出し
    expect(screen.getByText("保有クレジットカード")).toBeInTheDocument();
    // family グループ見出し (h3) + exclusive 注記
    expect(
      screen.getByRole("heading", { name: "エポスカード", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText("同時に1枚のみ有効")).toBeInTheDocument();
    // 3 グレードすべて + 単独カードが並ぶ
    expect(screen.getByText("エポス一般")).toBeInTheDocument();
    expect(screen.getByText("エポスゴールド")).toBeInTheDocument();
    expect(screen.getByText("エポスプラチナ")).toBeInTheDocument();
    expect(screen.getByText("楽天カード")).toBeInTheDocument();
  });

  it("セグメント「ポイントカード」クリックで hash が変わり point-cards セクションへ切替", async () => {
    seedCards();
    window.location.hash = "#wallet";
    renderWallet();

    // 初期はクレカ、ポイントカードセクションの見出しは無い
    expect(screen.queryByText("保有しているポイントカード")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "ポイントカード" }));

    // hash が更新される (navigate 同期)
    expect(window.location.hash).toContain("wallet/point-cards");
    // hashchange 後に point-cards セクションが描画される
    expect(
      await screen.findByText("保有しているポイントカード"),
    ).toBeInTheDocument();
    // クレカセクションは非表示に
    expect(screen.queryByText("保有クレジットカード")).toBeNull();
  });

  it("?highlight=family-epos で該当 family グループに wallet-highlight クラスが付く", () => {
    seedCards();
    window.location.hash = "#wallet?highlight=family-epos";
    const { container } = renderWallet();

    const group = container.querySelector('[data-family-id="family-epos"]');
    expect(group).not.toBeNull();
    expect(group).toHaveClass("wallet-highlight");
  });
});
