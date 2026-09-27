// @vitest-environment jsdom
//
// PR-4b: 起動時オーケストレーション (SyncUpdateModal) の分岐テスト。
//   - 安全な週 (追加のみ) → 自動反映 (autoApplySeedUpdate) が走り、モーダルは出さない。
//   - unsafe な週 (SEED_VERSION bump) → 従来モーダルを出し、確認文言を表示する。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SyncUpdateModal } from "./SyncUpdateModal";
import { useStore } from "../state/store";
import { seed, SEED_VERSION } from "../state/seed";
import { REMOVED_PROGRAM_IDS } from "../state/seed-additions";
import { REMOVED_MEMBERSHIP_IDS } from "../state/seed-blocklist";
import { mergeSeed, changeCount } from "../domain/mergeSeed";

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

// PR-0a-2b: membership の内容更新 / 単体 tombstone / channel 変更の週の振り分け。
describe("SyncUpdateModal — membership の更新・削除 (PR-0a-2b)", () => {
  const TOMBSTONE_OPTS = {
    removedProgramIds: REMOVED_PROGRAM_IDS,
    removedMembershipIds: REMOVED_MEMBERSHIP_IDS,
  };
  const pendingChangeCount = () =>
    changeCount(mergeSeed(useStore.getState(), seed(), TOMBSTONE_OPTS));

  let originalAutoApply: ReturnType<typeof useStore.getState>["autoApplySeedUpdate"];
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().clearAll();
    originalAutoApply = useStore.getState().autoApplySeedUpdate;
  });
  afterEach(() => {
    cleanup();
    useStore.setState({ autoApplySeedUpdate: originalAutoApply });
  });

  it("membership の notes 更新だけの週は自動反映され、再発火しない", async () => {
    const s = seed();
    const target = s.memberships.find((m) => m.notes !== undefined);
    expect(target, "notes 付きの公式 membership が seed に無い").toBeDefined();
    // 旧端末: 同 id 行の notes だけが古い (channel 等は公式と同じ)
    useStore.setState({
      ...s,
      memberships: s.memberships.map((m) =>
        m.id === target!.id ? { ...m, notes: "旧い注記" } : m,
      ),
      lastSeedVersion: SEED_VERSION,
      autoApplyNotice: null,
    });
    expect(pendingChangeCount()).toBe(1);
    const autoApply = vi.fn(originalAutoApply);
    useStore.setState({ autoApplySeedUpdate: autoApply });

    const { unmount } = render(<SyncUpdateModal />);

    await waitFor(() => {
      expect(
        useStore.getState().memberships.find((m) => m.id === target!.id)?.notes,
      ).toBe(target!.notes);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useStore.getState().autoApplyNotice?.count).toBe(1);
    expect(pendingChangeCount()).toBe(0);
    expect(autoApply).toHaveBeenCalledTimes(1);

    // 次回起動相当 (再マウント) でも差分 0 件なので再発火しない
    unmount();
    render(<SyncUpdateModal />);
    await new Promise((r) => setTimeout(r, 0));
    expect(autoApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("membership tombstone だけの週はモーダルが出て、反映後の count が 0 になる", () => {
    const s = seed();
    const tombstoned = REMOVED_MEMBERSHIP_IDS[0];
    const programId = "prog-jcb-jpoint-20x";
    expect(tombstoned).toBe(`m-${programId}-general`);
    useStore.setState({
      ...s,
      memberships: [
        ...s.memberships,
        { id: tombstoned, programId, storeId: "general" },
      ],
      lastSeedVersion: SEED_VERSION,
      autoApplyNotice: null,
    });
    expect(pendingChangeCount()).toBe(1);

    render(<SyncUpdateModal />);

    // 削除を含む = unsafe → 自動反映せずモーダルで確認
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("提携店舗の削除")).toBeInTheDocument();
    expect(useStore.getState().autoApplyNotice).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "アプリに反映" }));

    expect(useStore.getState().memberships.some((m) => m.id === tombstoned)).toBe(
      false,
    );
    expect(pendingChangeCount()).toBe(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("membership の channel 変更を含む週は unsafe (モーダル、自動反映しない)", () => {
    const s = seed();
    const target = s.memberships.find((m) => m.channel === "online");
    expect(target, "channel 付きの公式 membership が seed に無い").toBeDefined();
    // 旧端末: channel 付与前の行 (PR-0a-2a の membership channel が未配信)
    useStore.setState({
      ...s,
      memberships: s.memberships.map((m) => {
        if (m.id !== target!.id) return m;
        const old = { ...m };
        delete old.channel;
        return old;
      }),
      lastSeedVersion: SEED_VERSION,
      autoApplyNotice: null,
    });

    render(<SyncUpdateModal />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("提携条件の更新")).toBeInTheDocument();
    expect(useStore.getState().autoApplyNotice).toBeNull();
    // 反映すれば channel が届く
    fireEvent.click(screen.getByRole("button", { name: "アプリに反映" }));
    expect(
      useStore.getState().memberships.find((m) => m.id === target!.id)?.channel,
    ).toBe("online");
    expect(pendingChangeCount()).toBe(0);
  });
});
