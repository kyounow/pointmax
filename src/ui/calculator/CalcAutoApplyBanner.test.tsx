// @vitest-environment jsdom
//
// PR-4b: 自動反映 Undo バナーの結線テスト。
//   - [元に戻す] → restoreSnapshot() + reload、かつ reload 前に digest を既読化
//     (reload 後の再自動反映ループ防止)。
//   - ✕ → store.dismissAutoApplyNotice で notice が消え、digest が既読化される。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// snapshot 層をモック: seed-apply かつ現行スキーマ = 巻き戻し可能。
vi.mock("../../state/stateSnapshot", async () => {
  const actual = await vi.importActual<
    typeof import("../../state/persist-versions")
  >("../../state/persist-versions");
  return {
    getSnapshotMeta: () => ({
      takenAt: new Date().toISOString(),
      trigger: "seed-apply" as const,
      schemaVersion: actual.PERSIST_SCHEMA_VERSION,
    }),
    restoreSnapshot: vi.fn(() => ({ ok: true as const })),
  };
});

import { CalcAutoApplyBanner } from "./CalcAutoApplyBanner";
import { useStore } from "../../state/store";
import { restoreSnapshot } from "../../state/stateSnapshot";

const SEEN_KEY = "pointmax-sync-seen-digest";
const notice = { digest: "digest-abc", count: 3 };

describe("CalcAutoApplyBanner", () => {
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...window.location, reload: reloadMock },
    });
    useStore.setState({ autoApplyNotice: notice });
  });
  afterEach(cleanup);

  it("反映件数を表示し、詳細/元に戻す/✕ を出す", () => {
    render(<CalcAutoApplyBanner notice={notice} />);
    expect(screen.getByText(/マスタを自動更新しました/)).toBeInTheDocument();
    expect(screen.getByText(/3 件/)).toBeInTheDocument();
    expect(screen.getByText("元に戻す")).toBeInTheDocument();
    // 期限切れ整理の件数が無ければ併記しない
    expect(screen.queryByText(/期限切れ/)).toBeNull();
  });

  it("PR-6a-2: expiredRemovedCount があれば『（期限切れ M 件を整理）』を併記する", () => {
    render(<CalcAutoApplyBanner notice={{ ...notice, count: 1, expiredRemovedCount: 2 }} />);
    expect(
      screen.getByText("追加・更新 1 件を反映しました（期限切れ 2 件を整理）。"),
    ).toBeInTheDocument();
  });

  it("[元に戻す] は digest を既読化 → restoreSnapshot → reload の順で結線", () => {
    render(<CalcAutoApplyBanner notice={notice} />);
    fireEvent.click(screen.getByText("元に戻す"));
    // reload 前に digest 既読化 (ループ防止)
    expect(localStorage.getItem(SEEN_KEY)).toBe(notice.digest);
    expect(restoreSnapshot).toHaveBeenCalledTimes(1);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("✕ は notice を消し digest を既読化する (reload しない)", () => {
    render(<CalcAutoApplyBanner notice={notice} />);
    fireEvent.click(screen.getByLabelText("自動更新の通知を閉じる"));
    expect(useStore.getState().autoApplyNotice).toBeNull();
    expect(localStorage.getItem(SEEN_KEY)).toBe(notice.digest);
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
