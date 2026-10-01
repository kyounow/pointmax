// @vitest-environment jsdom
//
// PR-5a: 交換ルート詳細の「最終確認」は同梱 seed を参照して解決する (lastVerifiedAt は META キーで
// 既存端末に伝播しないため)。rate が seed と一致すれば seed の月、不一致・seed に無い id は local の月。
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { EdgeDetailPanel } from "./EdgeDetailPanel";
import { seed } from "../../state/seed";
import type { ConversionEdge } from "../../domain/types";

afterEach(cleanup);

const renderPanel = (edge: ConversionEdge) =>
  render(
    <EdgeDetailPanel
      edge={edge}
      cards={[]}
      currencyById={new Map()}
      currencyName={(id) => id}
      isEdgeAccessible={() => true}
      onUpdate={() => {}}
      onDelete={() => {}}
      onDismiss={() => {}}
    />,
  );

// 「最終確認:」行 (ratio-hint) のテキスト。
const verifiedLine = () =>
  screen.getByText("最終確認:").parentElement?.textContent ?? "";

describe("EdgeDetailPanel 最終確認 (PR-5a: 同梱 seed 参照)", () => {
  const official = seed().edges.find((e) => e.lastVerifiedAt !== undefined);

  it("前提: lastVerifiedAt を持つ seed edge がある", () => {
    expect(official).toBeDefined();
  });

  it("local が未記入でも、rate が seed と一致すれば seed の月を表示する", () => {
    renderPanel({ ...official!, lastVerifiedAt: undefined });
    expect(verifiedLine()).toContain(official!.lastVerifiedAt!);
    expect(verifiedLine()).not.toContain("未確認");
  });

  it("local の rate が seed と不一致なら local の月を表示する", () => {
    renderPanel({ ...official!, rate: official!.rate + 1, lastVerifiedAt: "2026-05" });
    expect(verifiedLine()).toContain("2026-05");
  });

  it("seed に無い edge (ユーザー作成) で未記入なら『未確認 (未記入)』", () => {
    renderPanel({ id: "user-edge", fromCurrencyId: "a", toCurrencyId: "b", rate: 1 });
    expect(screen.getByText("未確認 (未記入)")).toBeInTheDocument();
  });

  it("12ヶ月超の月は ⚠ (要確認) を付ける", () => {
    renderPanel({
      id: "user-edge",
      fromCurrencyId: "a",
      toCurrencyId: "b",
      rate: 1,
      lastVerifiedAt: "2020-01",
    });
    expect(screen.getByText("⚠ 2020-01 (要確認)")).toBeInTheDocument();
  });
});
