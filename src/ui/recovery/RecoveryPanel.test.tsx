// @vitest-environment jsdom
//
// PR-6d (U6): 復旧パネル (RecoveryPanel) のテスト。
//   - hydrate 文言 / スナップショットの有無 / root モード
//   - 公式データで初期化の 2 段確認、「書き出してから初期化」の順序、resetToSeed 失敗時の予備経路
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../../state/exportFile", () => ({ downloadJsonFile: vi.fn() }));

import { RecoveryPanel } from "./RecoveryPanel";
import { downloadJsonFile } from "../../state/exportFile";
import { useStore } from "../../state/store";
import { takeSnapshot } from "../../state/stateSnapshot";
import { PERSIST_SCHEMA_VERSION, PERSIST_STORE_KEY } from "../../state/persist-versions";
import { readCrashBackup } from "../../state/hydrationGuard";
import { seed, SEED_VERSION } from "../../state/seed";

const downloadMock = vi.mocked(downloadJsonFile);
const reloadMock = vi.fn();
let originalLocation: Location;
const originalResetToSeed = useStore.getState().resetToSeed;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  localStorage.clear(); // clearAll が採るスナップショットを消す
  downloadMock.mockClear();
  reloadMock.mockClear();
  originalLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, reload: reloadMock },
  });
});
afterEach(() => {
  cleanup();
  useStore.setState({ resetToSeed: originalResetToSeed });
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
  vi.restoreAllMocks();
});

const openRecovery = () => fireEvent.click(screen.getByText("データの復旧"));

describe("RecoveryPanel 表示", () => {
  it("cause=hydrate では読み込み失敗と退避済みの文言を出す", () => {
    render(<RecoveryPanel mode="root" cause="hydrate" error={new Error("Unexpected token")} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "保存データを読み込めませんでした。元のデータは端末内に退避済みです",
    );
    expect(alert).toHaveTextContent("Unexpected token");
  });

  it("root モードでは『もう一度試す』を出さず、『ページを再読み込み』が最上段", () => {
    render(<RecoveryPanel mode="root" cause="render" error={new Error("x")} onRetry={() => {}} />);
    expect(screen.queryByRole("button", { name: "もう一度試す" })).toBeNull();
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("ページを再読み込み");
    fireEvent.click(buttons[0]);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("スナップショットが無ければ『直前の状態に戻す』を出さない", () => {
    render(<RecoveryPanel mode="screen" error={new Error("x")} />);
    openRecovery();
    expect(screen.queryByRole("button", { name: /直前の状態に戻す/ })).toBeNull();
  });

  it("seed-apply かつ現行 schema のスナップショットならラベル付きで出し、押すと復元して reload", () => {
    takeSnapshot("seed-apply", { ...seed(), lastSeedVersion: 5 });
    render(<RecoveryPanel mode="screen" error={new Error("x")} />);
    openRecovery();
    const btn = screen.getByRole("button", { name: /直前の状態に戻す/ });
    expect(btn).toHaveTextContent("マスタ更新前");
    fireEvent.click(btn);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse(localStorage.getItem(PERSIST_STORE_KEY) ?? "null");
    expect(persisted.state.lastSeedVersion).toBe(5);
  });

  it("旧 schema のスナップショットは出さない", () => {
    localStorage.setItem(
      "pointmax:snapshot:v1",
      JSON.stringify({
        takenAt: new Date().toISOString(),
        schemaVersion: PERSIST_SCHEMA_VERSION - 1,
        trigger: "reset",
        state: {},
      }),
    );
    render(<RecoveryPanel mode="screen" error={new Error("x")} />);
    openRecovery();
    expect(screen.queryByRole("button", { name: /直前の状態に戻す/ })).toBeNull();
  });

  it("[データを書き出す] は復旧用 JSON を pointmax-recovery で書き出す", () => {
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    render(<RecoveryPanel mode="root" cause="hydrate" error={new Error("x")} />);
    openRecovery();
    fireEvent.click(screen.getByRole("button", { name: "データを書き出す" }));
    expect(downloadMock).toHaveBeenCalledTimes(1);
    const [json, prefix] = downloadMock.mock.calls[0];
    expect(prefix).toBe("pointmax-recovery");
    expect(JSON.parse(json)).toMatchObject({ kind: "pointmax-recovery-raw", raw: "{broken" });
  });

  it("[コピー] はクリップボードに書き、非対応なら書き出しを案内する", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<RecoveryPanel mode="screen" error={new Error("x")} />);
    openRecovery();
    fireEvent.click(screen.getByRole("button", { name: "コピー" }));
    expect(await screen.findByText("コピーしました")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledTimes(1);

    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    fireEvent.click(screen.getByRole("button", { name: "コピー" }));
    expect(await screen.findByText("失敗しました")).toBeInTheDocument();
  });
});

describe("RecoveryPanel 公式データで初期化 (2 段確認)", () => {
  it("1 段目では resetToSeed を呼ばず、[初期化する] で呼んで reload する", () => {
    const reset = vi.fn(originalResetToSeed);
    useStore.setState({ resetToSeed: reset });
    render(<RecoveryPanel mode="screen" error={new Error("x")} />);
    openRecovery();
    fireEvent.click(screen.getByRole("button", { name: "公式データで初期化…" }));
    expect(reset).not.toHaveBeenCalled();
    expect(
      screen.getByText(/カードの「使う」設定・優先通貨・誕生月・除外設定はやり直しになります/),
    ).toBeInTheDocument();
    // 2 段目の primary は「書き出してから初期化」
    expect(screen.getByRole("button", { name: "書き出してから初期化" })).toHaveClass("primary");

    fireEvent.click(screen.getByRole("button", { name: "初期化する" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(useStore.getState().lastSeedVersion).toBe(SEED_VERSION);
    expect(useStore.getState().stores).toEqual(seed().stores);
  });

  it("[やめる] で 1 段目に戻り、何もしない", () => {
    const reset = vi.fn();
    useStore.setState({ resetToSeed: reset });
    render(<RecoveryPanel mode="screen" error={new Error("x")} />);
    openRecovery();
    fireEvent.click(screen.getByRole("button", { name: "公式データで初期化…" }));
    fireEvent.click(screen.getByRole("button", { name: "やめる" }));
    expect(screen.getByRole("button", { name: "公式データで初期化…" })).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("『書き出してから初期化』は downloadJsonFile → resetToSeed → reload の順", () => {
    const reset = vi.fn();
    useStore.setState({ resetToSeed: reset });
    render(<RecoveryPanel mode="screen" error={new Error("x")} />);
    openRecovery();
    fireEvent.click(screen.getByRole("button", { name: "公式データで初期化…" }));
    fireEvent.click(screen.getByRole("button", { name: "書き出してから初期化" }));

    expect(downloadMock).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(downloadMock.mock.invocationCallOrder[0]).toBeLessThan(
      reset.mock.invocationCallOrder[0],
    );
    expect(reset.mock.invocationCallOrder[0]).toBeLessThan(
      reloadMock.mock.invocationCallOrder[0],
    );
  });

  it("書き出しに失敗したら初期化しない", () => {
    downloadMock.mockImplementationOnce(() => {
      throw new Error("blob");
    });
    const reset = vi.fn();
    useStore.setState({ resetToSeed: reset });
    render(<RecoveryPanel mode="screen" error={new Error("x")} />);
    openRecovery();
    fireEvent.click(screen.getByRole("button", { name: "公式データで初期化…" }));
    fireEvent.click(screen.getByRole("button", { name: "書き出してから初期化" }));
    expect(reset).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("失敗しました");
  });

  it("初期化の直前に壊れた生データを crash-backup に退避する", () => {
    const reset = vi.fn();
    useStore.setState({ resetToSeed: reset });
    // setState は persist に書くので、その後に壊れた raw を置く
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    render(<RecoveryPanel mode="root" cause="hydrate" error={new Error("x")} />);
    openRecovery();
    fireEvent.click(screen.getByRole("button", { name: "公式データで初期化…" }));
    fireEvent.click(screen.getByRole("button", { name: "初期化する" }));
    expect(readCrashBackup()).toMatchObject({ raw: "{broken", cause: "reset" });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("resetToSeed が throw したら persist キーだけ消して (退避済み) 案内を出し、reload する", () => {
    useStore.setState({
      resetToSeed: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    });
    localStorage.setItem(PERSIST_STORE_KEY, "{broken");
    localStorage.setItem("pointmax-sync-seen-digest", "d");
    render(<RecoveryPanel mode="root" cause="hydrate" error={new Error("x")} />);
    openRecovery();
    fireEvent.click(screen.getByRole("button", { name: "公式データで初期化…" }));
    fireEvent.click(screen.getByRole("button", { name: "初期化する" }));

    // removePersistedForRecovery: persist キーだけ消え、生データは crash-backup に残る
    expect(localStorage.getItem(PERSIST_STORE_KEY)).toBeNull();
    expect(localStorage.getItem("pointmax-sync-seen-digest")).toBe("d");
    expect(readCrashBackup()?.raw).toBe("{broken");
    expect(
      within(screen.getByRole("status")).getByText(
        /再読み込み後は公式データで起動します \(カードの「使う」設定はやり直し\)/,
      ),
    ).toBeInTheDocument();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
