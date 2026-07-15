// @vitest-environment jsdom
//
// PR-4b: 起動時オーケストレーション (SyncUpdateModal) の分岐テスト。
//   - 安全な週 (追加のみ) → 自動反映 (autoApplySeedUpdate) が走り、モーダルは出さない。
//   - unsafe な週 (SEED_VERSION bump) → 従来モーダルを出し、確認文言を表示する。
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SyncUpdateModal } from "./SyncUpdateModal";
import { useStore } from "../state/store";
import { seed, SEED_VERSION } from "../state/seed";

// seed() から membership を 1 件欠いた state を作る (= 追加 1 件の安全な差分)。
function seedStateMissingOneMembership(lastSeedVersion: number) {
  const s = seed();
  const memberships = (s.memberships ?? []).slice(0, -1);
  useStore.setState({
    ...s,
    memberships,
    lastSeedVersion,
    autoApplyNotice: null,
  });
}

describe("SyncUpdateModal — 起動時オーケストレーション (PR-4b)", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().clearAll();
  });
  afterEach(cleanup);

  it("安全な週 (追加のみ・版 bump 無し) は自動反映し、モーダルを出さない", async () => {
    const before = (seed().memberships ?? []).length;
    // lastSeedVersion = SEED_VERSION → 版 bump 無し → 安全
    seedStateMissingOneMembership(SEED_VERSION);

    render(<SyncUpdateModal />);

    // オーケストレータ effect が autoApplySeedUpdate を呼び、欠けていた membership を反映。
    await waitFor(() => {
      expect(useStore.getState().memberships).toHaveLength(before);
    });
    // Undo バナー用の通知が立つ
    expect(useStore.getState().autoApplyNotice).not.toBeNull();
    // モーダル (role=dialog) は出さない
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("unsafe な週 (SEED_VERSION bump) は従来モーダルを確認文言つきで出す", () => {
    // lastSeedVersion < SEED_VERSION → 版 bump → unsafe
    seedStateMissingOneMembership(SEED_VERSION - 1);

    render(<SyncUpdateModal />);

    // モーダルが出る
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/削除や大きな変更を含むため確認をお願いします/),
    ).toBeInTheDocument();
    // 自動反映はされていない (notice 無し)
    expect(useStore.getState().autoApplyNotice).toBeNull();
  });
});
