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
import { membershipId } from "../state/defineMemberships";
import type { BenefitProgram } from "../domain/types";

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
    // Undo バナー用の通知が立つ (期限切れ整理が無い週は expiredRemovedCount を載せない)
    expect(useStore.getState().autoApplyNotice).not.toBeNull();
    expect(useStore.getState().autoApplyNotice?.count).toBe(1);
    expect(useStore.getState().autoApplyNotice?.expiredRemovedCount).toBeUndefined();
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

// PR-6a-2 (U1): 期限切れ campaign の整理だけの週はサイレント反映、混在週はバナーに併記。
// tombstone の id は cron の codegen が再生成するので直書きせず REMOVED_PROGRAM_IDS[0] を参照し、
// validTo は固定値 (2020-01-31 = 過去 / 2099-12-31 = 未来) で与える (実時刻に依存させない)。
describe("SyncUpdateModal — 期限切れ整理 (PR-6a-2)", () => {
  const SEEN_KEY = "pointmax-sync-seen-digest";
  const P = REMOVED_PROGRAM_IDS[0];
  const program = (validTo: string): BenefitProgram => ({
    id: P,
    name: "期限切れテスト",
    scope: "member-stores",
    rate: 0.05,
    currencyId: seed().currencies[0].id,
    validFrom: "2020-01-01",
    validTo,
  });
  const cascadeId = () => membershipId(P, seed().stores[0].id);

  // seed() に tombstone 対象の program P とその membership を足した旧端末の state。
  // dropOneMembership で seed の membership を 1 件欠かせる (= 追加 1 件が同じ週に混ざる)。
  function setDevice(validTo: string, dropOneMembership = false) {
    const s = seed();
    const memberships = dropOneMembership ? s.memberships.slice(0, -1) : s.memberships;
    useStore.setState({
      ...s,
      programs: [...s.programs, program(validTo)],
      memberships: [
        ...memberships,
        { id: cascadeId(), programId: P, storeId: s.stores[0].id },
      ],
      lastSeedVersion: SEED_VERSION,
      // 前の週の閉じられていない Undo バナー (サイレント反映で消えることを確かめる)
      autoApplyNotice: { digest: "d-prev", count: 2 },
    });
  }
  const hasP = () => useStore.getState().programs.some((p) => p.id === P);
  const hasCascade = () =>
    useStore.getState().memberships.some((m) => m.id === cascadeId());

  beforeEach(() => {
    localStorage.clear();
    useStore.getState().clearAll();
  });
  afterEach(cleanup);

  it("期限切れ整理だけの週: モーダルもバナー用 notice も出さずに反映し、digest を既読化する", async () => {
    setDevice("2020-01-31");
    expect(hasP()).toBe(true);
    expect(hasCascade()).toBe(true);

    render(<SyncUpdateModal />);

    await waitFor(() => expect(hasP()).toBe(false));
    expect(hasCascade()).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    // 前の notice も消える (Undo の戻り先が今回のスナップショットに変わるため)
    expect(useStore.getState().autoApplyNotice).toBeNull();
    // 既読化 (戻して reload した直後の再自動反映を防ぐ)
    expect(localStorage.getItem(SEEN_KEY) ?? "").not.toBe("");
    expect(useStore.getState().lastSeedVersion).toBe(SEED_VERSION);
  });

  it("期限切れ整理 + 追加 1 件の週: notice は {count:1, expiredRemovedCount:1}", async () => {
    setDevice("2020-01-31", true);

    render(<SyncUpdateModal />);

    await waitFor(() => expect(hasP()).toBe(false));
    expect(hasCascade()).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useStore.getState().autoApplyNotice).toMatchObject({
      count: 1,
      expiredRemovedCount: 1,
    });
    expect(useStore.getState().memberships).toHaveLength(seed().memberships.length);
  });

  it("validTo が未来の tombstone の週: 従来どおりモーダルを出し、自動反映しない", () => {
    setDevice("2099-12-31");

    render(<SyncUpdateModal />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(hasP()).toBe(true);
    expect(hasCascade()).toBe(true);
    expect(useStore.getState().autoApplyNotice).toEqual({ digest: "d-prev", count: 2 });
    expect(localStorage.getItem(SEEN_KEY)).toBeNull();
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
