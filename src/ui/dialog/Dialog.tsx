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
  const inputRef = useRef<HTMLInputElement>(null);

  // ok/cancel は Escape effect より前で宣言する (effect クロージャが cancel を
  // 参照するため。後方宣言だと react-hooks/immutability = 宣言前アクセスになる)。
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

  // prompt 表示時のフォーカス & 全選択 (副作用のみ。setState は含めない)
  useEffect(() => {
    if (state.type === "prompt") {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [state]);

  // Escape キーでキャンセル
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const okText = state.opts.okText ?? "OK";
  const cancelText =
    state.type === "alert"
      ? null
      : (state.opts as { cancelText?: string }).cancelText ?? "キャンセル";

  const danger = state.type === "confirm" && !!state.opts.danger;
  const level = state.type === "alert" ? state.opts.level ?? "info" : "info";

  return (
    <div
      className="dialog-overlay"
      onMouseDown={(e) => {
        // クリックがオーバーレイ自体（中身ではない）の時だけキャンセル
        if (e.target === e.currentTarget) cancel();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`dialog dialog-${level}`}
        data-testid={`dialog-${state.type}`}
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
            onClick={ok}
            className={danger ? "danger" : "primary"}
            data-testid="dialog-ok"
            autoFocus={state.type !== "prompt"}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
