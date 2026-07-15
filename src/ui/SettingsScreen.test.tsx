// @vitest-environment jsdom
//
// PR-2b2: 設定画面の「誕生月」設定 (恒久設定箇所) のテスト。
//   - select で月を選ぶと store.birthMonth に反映される。
//   - 未設定を選ぶと undefined に戻る。
//   - 既存の birthMonth が select に初期表示される。
// PR-2d: 設定内「マスタ更新履歴」セクション (旧「更新履歴」タブ) のテスト。
//   - 最新 1 件のプレビュー (日付 + 件数) は常時表示。
//   - #settings/history (旧 #sync-history 含む) で details を自動展開 + scrollIntoView。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SettingsScreen } from "./SettingsScreen";
import { DialogProvider } from "./dialog/DialogProvider";
import { useStore } from "../state/store";
import { loadSyncHistory } from "../domain/syncHistory";
import { takeSnapshot, getSnapshotMeta } from "../state/stateSnapshot";
import { PERSIST_SCHEMA_VERSION } from "../state/persist-versions";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().clearAll();
  vi.restoreAllMocks();
  window.location.hash = "";
  // jsdom は scrollIntoView 未実装なので no-op スタブ (history 展開 effect が呼ぶ)。
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const renderSettings = () =>
  render(
    <DialogProvider>
      <SettingsScreen />
    </DialogProvider>,
  );

describe("SettingsScreen 誕生月設定", () => {
  it("月を選ぶと store.birthMonth に反映され、未設定でクリアされる", () => {
    renderSettings();
    const select = screen.getByLabelText("誕生月") as HTMLSelectElement;
    expect(select.value).toBe(""); // 初期は未設定

    fireEvent.change(select, { target: { value: "7" } });
    expect(useStore.getState().birthMonth).toBe(7);

    fireEvent.change(select, { target: { value: "" } });
    expect(useStore.getState().birthMonth).toBeUndefined();
  });

  it("既存の birthMonth が select に初期表示される", () => {
    useStore.setState({ birthMonth: 9 });
    renderSettings();
    const select = screen.getByLabelText("誕生月") as HTMLSelectElement;
    expect(select.value).toBe("9");
  });
});

describe("SettingsScreen データ管理 (IA-6 / PR-2e)", () => {
  it("データ管理セクションに 5 操作がリスク昇順で並ぶ", () => {
    renderSettings();
    expect(
      screen.getByRole("heading", { name: "データ管理", level: 3 }),
    ).toBeInTheDocument();

    // エクスポート → インポート → URL同期(全上書き) → サンプル投入 → 初期化 の順。
    const ordered = [
      screen.getByRole("button", { name: "エクスポート" }),
      screen.getByRole("button", { name: "インポート" }),
      screen.getByRole("button", { name: /URLから取得して全上書き/ }),
      screen.getByRole("button", { name: "サンプル投入" }),
      screen.getByRole("button", { name: "ローカルデータ初期化" }),
    ];
    // DOM 出現順が定義順どおりであることを確認。
    for (let i = 1; i < ordered.length; i++) {
      const rel = ordered[i - 1].compareDocumentPosition(ordered[i]);
      expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("サンプル投入は mergeFromSeed でシードを取り込む (件数が増える)", async () => {
    renderSettings();
    expect(useStore.getState().currencies.length).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "サンプル投入" }));
    // 確認ダイアログの「投入」を押す。
    fireEvent.click(await screen.findByRole("button", { name: "投入" }));
    // seed が取り込まれ通貨などが 0 件から増える (非同期ハンドラ完了待ち)。
    await waitFor(() =>
      expect(useStore.getState().currencies.length).toBeGreaterThan(0),
    );
  });
});

describe("SettingsScreen 直前の状態に戻す (PR-4a / N-4)", () => {
  // 代表的な persist app state (最小構成)。
  const sampleState = () => ({
    cards: [
      {
        id: "rakuten-card",
        name: "楽天カード",
        defaultRate: 0.01,
        defaultCurrencyId: "rakuten-pt",
      },
    ],
    currencies: [],
    stores: [],
    edges: [],
    pointCards: [],
    paymentApps: [],
    programs: [],
    memberships: [],
    lastSeedVersion: 43,
    syncUrl: "",
    lastSyncAt: null,
    preferredCurrencyIds: [],
  });

  it("スナップショット未保存なら『まだありません』を表示しボタンを出さない", () => {
    renderSettings();
    expect(
      screen.getByText("スナップショットはまだありません。"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /直前の状態に戻す/ }),
    ).toBeNull();
  });

  it("スナップショットがあれば trigger ラベル付きボタンを出し、復元で persist 書き戻し + reload", async () => {
    // 「インポート前」のスナップショットを用意 (実 stateSnapshot モジュール)。
    takeSnapshot("import", sampleState());
    // jsdom は location.reload が非設定可 (redefine 不可) なので window.location ごと差し替える。
    const reloadMock = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, hash: "", reload: reloadMock },
    });
    try {
      renderSettings();
      const btn = screen.getByRole("button", { name: /直前の状態に戻す/ });
      expect(btn).toHaveTextContent("インポート前");
      expect(btn).toBeEnabled();

      fireEvent.click(btn);
      // 確認ダイアログの「元に戻す」を押す。
      fireEvent.click(await screen.findByRole("button", { name: "元に戻す" }));

      // restore → persist キー書き戻し + snapshot 消費 + reload。
      await waitFor(() => expect(reloadMock).toHaveBeenCalled());
      const persisted = JSON.parse(
        localStorage.getItem("pointmax-v08-store") ?? "null",
      );
      expect(persisted?.state?.cards?.[0]?.id).toBe("rakuten-card");
      expect(getSnapshotMeta()).toBeNull();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("初期化 (reset) 実行後にボタンが『初期化前』ラベルで即時出現する (mount 後 refresh)", async () => {
    // 永続データを用意 (persist キーにも書かれ、reset 時の snapshot 対象になる)。
    useStore.setState({
      cards: [
        {
          id: "rakuten-card",
          name: "楽天カード",
          defaultRate: 0.01,
          defaultCurrencyId: "rakuten-pt",
          enabled: true,
        },
      ],
    });
    renderSettings();
    // マウント時はまだスナップショット無し。
    expect(
      screen.queryByRole("button", { name: /直前の状態に戻す/ }),
    ).toBeNull();

    // ローカルデータ初期化 → 確認 → 初期化。
    fireEvent.click(
      screen.getByRole("button", { name: "ローカルデータ初期化" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "初期化" }));

    // 破壊的操作後、画面がマウントされたままでもボタンが即時に出る (refresh 検証)。
    const btn = await screen.findByRole("button", {
      name: /直前の状態に戻す/,
    });
    expect(btn).toHaveTextContent("初期化前");
  });

  it("schemaVersion 不一致のスナップショットはボタン disabled + 理由表示", () => {
    // 旧世代スナップを直接 localStorage に書く (takeSnapshot は常に現行 version で採るため)。
    localStorage.setItem(
      "pointmax:snapshot:v1",
      JSON.stringify({
        takenAt: new Date().toISOString(),
        schemaVersion: PERSIST_SCHEMA_VERSION - 1,
        trigger: "reset",
        state: sampleState(),
      }),
    );
    renderSettings();
    const btn = screen.getByRole("button", { name: /直前の状態に戻す/ });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/データ形式が更新された/)).toBeInTheDocument();
  });
});

describe("SettingsScreen マスタ更新履歴 (PR-2d)", () => {
  it("最新 1 件のプレビュー (日付 + 件数) を常時表示し、全履歴は折りたたむ", () => {
    const latest = loadSyncHistory().entries[0];
    // このテストは bundle 同梱の SYNC_HISTORY.json が非空である前提 (常に entry あり)。
    expect(latest).toBeDefined();

    const { container } = renderSettings();

    // セクション見出し
    expect(
      screen.getByRole("heading", { name: "マスタ更新履歴", level: 3 }),
    ).toBeInTheDocument();

    // プレビュー行に最新の日付 + 件数が出る
    const preview = container.querySelector(".sync-history-preview");
    expect(preview).not.toBeNull();
    expect(preview?.textContent).toContain(latest.date);
    expect(preview?.textContent).toContain(`auto ${latest.totalCount} 件`);

    // 全履歴は details 折りたたみ (既定は閉じている)
    const details = container.querySelector(
      "details.sync-history-more",
    ) as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(screen.getByText(/過去の更新をすべて表示/)).toBeInTheDocument();
  });

  it("#settings/history で details を自動展開し scrollIntoView する", () => {
    window.location.hash = "#settings/history";
    const { container } = renderSettings();

    const details = container.querySelector(
      "details.sync-history-more",
    ) as HTMLDetailsElement | null;
    expect(details?.open).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("旧 #sync-history からの流入 (replaceRoute 前) でも自動展開する", () => {
    window.location.hash = "#sync-history";
    const { container } = renderSettings();

    const details = container.querySelector(
      "details.sync-history-more",
    ) as HTMLDetailsElement | null;
    expect(details?.open).toBe(true);
  });

  it("#settings (sub なし) では details は閉じたまま", () => {
    window.location.hash = "#settings";
    const { container } = renderSettings();

    const details = container.querySelector(
      "details.sync-history-more",
    ) as HTMLDetailsElement | null;
    expect(details?.open).toBe(false);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
