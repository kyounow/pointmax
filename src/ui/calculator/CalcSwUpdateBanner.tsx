// PR-4b (UX-8(3)): Service Worker が新バージョンを適用した直後の起動で 1 回だけ出す
// 「アプリを新しいバージョンに更新しました」バナー。判定は swUpdateNotice.ts
// (前回起動時とビルド識別子が違えば更新後の初回起動) が持つ。
//
// 表示可否 (isSwUpdated) は BannerSlot が useState で 1 回だけ読み、本コンポーネントは
// 表示と dismiss だけを担う presentational。dismiss で現ビルドを記録し再表示しない。

type Props = {
  onDismiss: () => void;
};

export function CalcSwUpdateBanner({ onDismiss }: Props) {
  return (
    <div className="update-banner sw-update-banner">
      <div className="update-banner-text">
        <small>アプリを新しいバージョンに更新しました。</small>
      </div>
      <div className="update-banner-actions">
        <button
          onClick={onDismiss}
          className="dismiss"
          aria-label="更新の通知を閉じる"
          title="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
