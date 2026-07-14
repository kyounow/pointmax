// PR-2e: デスクトップナビの「データ ▾」ドロップダウン (menu button パターン)。
//
// a11y 要件:
//   - トリガー: aria-haspopup="menu" + aria-expanded、現在 data 系タブなら aria-current="page"
//   - メニュー: role="menu" / 各項目 role="menuitem"
//   - Escape でメニューを閉じてトリガーへフォーカスを戻す
//   - 外側クリックで閉じる
//   - 開いたら最初の項目へフォーカス、↑↓ で項目間を移動
import { useEffect, useRef, useState } from "react";
import { navigate } from "../../navigation";
import type { TabDef } from "./navConfig";

type Props = {
  items: TabDef[];
  // 現在タブが data グループ (通貨/店舗/データ) かどうか。
  active: boolean;
};

export function DataMenu({ items, active }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // 開いたら最初の menuitem にフォーカス。
    const menuItems = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ??
          [],
      );
    menuItems()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const list = menuItems();
        if (list.length === 0) return;
        e.preventDefault();
        const idx = list.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? list[(idx + 1) % list.length]
            : list[(idx - 1 + list.length) % list.length];
        next?.focus();
      }
    };

    // 外側クリックで閉じる (トリガー自身のクリックはトグルなので除外)。
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const go = (id: string) => {
    navigate(id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="data-menu">
      <button
        ref={triggerRef}
        type="button"
        className={active ? "data-menu-trigger active" : "data-menu-trigger"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        データ <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          className="data-menu-list"
          role="menu"
          aria-label="データ"
          ref={menuRef}
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              className="data-menu-item"
              onClick={() => go(it.id)}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
