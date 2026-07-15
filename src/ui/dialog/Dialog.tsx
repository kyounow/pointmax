import { useEffect, useRef, useState } from "react";
import type { DialogState } from "./types";

type Props = {
  state: DialogState;
  onConfirm: (result: boolean) => void;
  onPrompt: (result: string | null) => void;
  onAlert: () => void;
};

export function Dialog({ state, onConfirm, onPrompt, onAlert }: Props) {
  const [value, setValue] = useState(
    state.type === "prompt" ? (state.opts.defaultValue ?? "") : "",
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const okButtonRef = useRef<HTMLButtonElement>(null);

  // ok/cancel は effect / イベントハンドラより前で宣言する (open effect と
  // onCancel クロージャが cancel を参照するため。後方宣言だと宣言前アクセスになる)。
  const ok = () => {
    if (state.type === "confirm") onConfirm(true);
    else if (state.type === "prompt") onPrompt(value);
    else onAlert();
  };
  const cancel = () => {
    if (state.type === "confirm") onConfirm(false);
    else if (state.type === "prompt") onPrompt(null);
    else onAlert();
  };

  // ダイアログが切り替わった時に input 内容を初期化する (render 中 guard。
  // effect 内 setState を避ける React 公認の「prop 変化時に state 調整」パターン)。
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    setValue(state.type === "prompt" ? (state.opts.defaultValue ?? "") : "");
  }

  // ネイティブ <dialog> を modal として開閉する。showModal() により
  // focus trap / 背景 inert / Esc(cancel イベント) がブラウザ標準で得られる。
  // jsdom 等 showModal 未実装環境では open 属性フォールバックで可視化する
  // (テストが role/testid で拾えるようにするため)。
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (typeof dlg.showModal === "function") {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.setAttribute("open", "");
    }
    return () => {
      // アンマウント時の閉じ漏れ防止 (閉じ忘れると背景 inert を掴んだまま残る)。
      if (typeof dlg.close === "function") {
        if (dlg.open) dlg.close();
      } else {
        dlg.removeAttribute("open");
      }
    };
  }, []);

  // 初期フォーカス (state 切替時も再適用): prompt は入力欄を全選択、
  // それ以外は OK ボタン。showModal は既定で先頭 focusable を選ぶため、
  // 明示制御でフォーカス先を固定する。
  useEffect(() => {
    if (state.type === "prompt") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      okButtonRef.current?.focus();
    }
  }, [state]);

  const okText = state.opts.okText ?? "OK";
  const cancelText =
    state.type === "alert"
      ? null
      : (state.opts as { cancelText?: string }).cancelText ?? "キャンセル";

  const danger = state.type === "confirm" && !!state.opts.danger;
  const level = state.type === "alert" ? state.opts.level ?? "info" : "info";

  return (
    <dialog
      ref={dialogRef}
      className={`dialog dialog-${level}`}
      data-testid={`dialog-${state.type}`}
      aria-modal="true"
      onCancel={(e) => {
        // Esc: ネイティブ既定の close を止め、React state / promise と同期する
        // 自前の cancel() 経由でアンマウントさせる。
        e.preventDefault();
        cancel();
      }}
      onClick={(e) => {
        // 背景 (::backdrop) クリックでキャンセル。パネル枠外の座標かで判定する
        // (パネル内側の余白クリックでは閉じない)。
        const dlg = dialogRef.current;
        if (!dlg) return;
        const r = dlg.getBoundingClientRect();
        const outside =
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom;
        if (outside) cancel();
      }}
    >
      <h3 className="dialog-title">{state.opts.title}</h3>
      {state.opts.message && (
        <p className="dialog-message">
          {state.opts.message.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
      )}
      {state.type === "prompt" && (
        <input
          ref={inputRef}
          type={state.opts.inputType === "number" ? "number" : "text"}
          step={state.opts.step}
          min={state.opts.min}
          placeholder={state.opts.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ok();
            }
          }}
          className="dialog-input"
        />
      )}
      <div className="dialog-actions">
        {cancelText && (
          <button onClick={cancel} data-testid="dialog-cancel">
            {cancelText}
          </button>
        )}
        <button
          ref={okButtonRef}
          onClick={ok}
          className={danger ? "danger" : "primary"}
          data-testid="dialog-ok"
        >
          {okText}
        </button>
      </div>
    </dialog>
  );
}
