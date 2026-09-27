// @vitest-environment jsdom
//
// PR-0a-2b: UpdateBanner (SEED_VERSION リリース通知) の件数表示。
//   membership の内容更新 (提携条件) / 単体 tombstone 削除 (提携店舗) を「更新」「削除」に数え、
//   membership の変更だけの版で「0件適用」と表示されていた不具合を防ぐ。
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { UpdateBanner } from "./UpdateBanner";
import { useStore } from "../state/store";
import { seed, SEED_VERSION } from "../state/seed";
import { REMOVED_MEMBERSHIP_IDS } from "../state/seed-blocklist";
import {
  clearSeedUpdateDismiss,
  dismissSeedUpdate,
  isSeedUpdateDismissed,
} from "../state/seedUpdateDismiss";

describe("UpdateBanner — membership の更新・削除の件数 (PR-0a-2b)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useStore.getState().clearAll();
  });
  afterEach(cleanup);

  // 版 bump (lastSeedVersion = SEED_VERSION - 1) の端末で、seed との差分が
  // membership の notes 更新 1 件 + membership 単体 tombstone 1 件だけの state を作る。
  const setState = () => {
    const s = seed();
    const target = s.memberships.find((m) => m.notes !== undefined);
    expect(target, "notes 付きの公式 membership が seed に無い").toBeDefined();
    const tombstoned = REMOVED_MEMBERSHIP_IDS[0];
    useStore.setState({
      ...s,
      memberships: [
        ...s.memberships.map((m) =>
          m.id === target!.id ? { ...m, notes: "旧い注記" } : m,
        ),
        { id: tombstoned, programId: "prog-jcb-jpoint-20x", storeId: "general" },
      ],
      lastSeedVersion: SEED_VERSION - 1,
    });
    return { target: target!, tombstoned };
  };

  it("membership の更新 1・削除 1 が『更新』『削除』に数えられ、『0件適用』にならない", () => {
    setState();
    render(<UpdateBanner />);

    expect(
      screen.queryByRole("button", { name: "0件適用" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2件適用" })).toBeInTheDocument();
    const summary = screen.getByText(/自動適用:/);
    expect(summary.textContent).toMatch(/更新1/);
    expect(summary.textContent).toMatch(/削除1/);

    // 詳細に membership の件数行が出る
    fireEvent.click(screen.getByRole("button", { name: "詳細" }));
    expect(screen.getByText("提携条件の更新: 1件")).toBeInTheDocument();
    expect(screen.getByText("提携店舗の削除: 1件")).toBeInTheDocument();
  });

  it("適用すると membership の更新・削除が反映され、版が進む", () => {
    const { target, tombstoned } = setState();
    render(<UpdateBanner />);
    fireEvent.click(screen.getByRole("button", { name: "2件適用" }));

    const st = useStore.getState();
    expect(st.memberships.find((m) => m.id === target.id)?.notes).toBe(
      target.notes,
    );
    expect(st.memberships.some((m) => m.id === tombstoned)).toBe(false);
    expect(st.lastSeedVersion).toBe(SEED_VERSION);
  });
});

// PR-0a-2b (任意項目): 「あとで」は lastSeedVersion を進めない。以前は版を進めるだけで、
// その版の MIGRATIONS (v47 の edge 修正など) が永久にスキップされていた。
describe("UpdateBanner —「あとで」は版を進めず当日のセッション内だけ隠す (PR-0a-2b)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useStore.getState().clearAll();
  });
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  // v47 の MIGRATIONS (eikyu-to-d 5→4.5) が未適用の旧端末 (lastSeedVersion=46)。
  const setOldState = () => {
    const s = seed();
    useStore.setState({
      ...s,
      edges: s.edges.map((e) => (e.id === "eikyu-to-d" ? { ...e, rate: 5 } : e)),
      lastSeedVersion: 46,
    });
  };

  it("「あとで」でバナーが消え、lastSeedVersion は据え置き。再マウントしても当日のセッション内は隠れたまま", () => {
    setOldState();
    const first = render(<UpdateBanner />);
    fireEvent.click(screen.getByRole("button", { name: "あとで" }));
    expect(first.container.querySelector(".update-banner")).toBeNull();
    expect(useStore.getState().lastSeedVersion).toBe(46);
    expect(isSeedUpdateDismissed(SEED_VERSION)).toBe(true);
    first.unmount();

    const again = render(<UpdateBanner />);
    expect(again.container.querySelector(".update-banner")).toBeNull();
  });

  it("翌日 / 次の版 / セッション終了 (記録消去) では再表示される", () => {
    setOldState();
    const today = new Date("2026-09-30T10:00:00+09:00");
    dismissSeedUpdate(SEED_VERSION, today);
    expect(isSeedUpdateDismissed(SEED_VERSION, today)).toBe(true);
    expect(
      isSeedUpdateDismissed(SEED_VERSION, new Date("2026-10-01T10:00:00+09:00")),
    ).toBe(false);
    expect(isSeedUpdateDismissed(SEED_VERSION + 1, today)).toBe(false);

    clearSeedUpdateDismiss();
    const { container } = render(<UpdateBanner />);
    expect(container.querySelector(".update-banner")).not.toBeNull();
  });

  it("「あとで」の後でも MIGRATIONS は保留され、あとから適用すれば届く", () => {
    setOldState();
    render(<UpdateBanner />);
    fireEvent.click(screen.getByRole("button", { name: "あとで" }));
    // 版を進めていないので、後の「アプリに反映」で v47 の edge 修正が適用される
    useStore.getState().applySeedUpdate([]);
    const st = useStore.getState();
    expect(st.edges.find((e) => e.id === "eikyu-to-d")?.rate).toBe(4.5);
    expect(st.lastSeedVersion).toBe(SEED_VERSION);
  });
});
