import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Dialog } from "./Dialog";
import { DialogContext } from "./useDialog";
import type {
  AlertOpts,
  ConfirmOpts,
  DialogApi,
  DialogState,
  PromptOpts,
} from "./types";

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        setState({ type: "confirm", opts, resolve });
      }),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOpts) =>
      new Promise<string | null>((resolve) => {
        setState({ type: "prompt", opts, resolve });
      }),
    [],
  );

  const alert = useCallback(
    (opts: AlertOpts) =>
      new Promise<void>((resolve) => {
        setState({ type: "alert", opts, resolve });
      }),
    [],
  );

  const api = useMemo<DialogApi>(
    () => ({ confirm, prompt, alert }),
    [confirm, prompt, alert],
  );

  const handleConfirm = (result: boolean) => {
    if (state?.type === "confirm") state.resolve(result);
    setState(null);
  };
  const handlePrompt = (result: string | null) => {
    if (state?.type === "prompt") state.resolve(result);
    setState(null);
  };
  const handleAlert = () => {
    if (state?.type === "alert") state.resolve();
    setState(null);
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      {state && (
        <Dialog
          state={state}
          onConfirm={handleConfirm}
          onPrompt={handlePrompt}
          onAlert={handleAlert}
        />
      )}
    </DialogContext.Provider>
  );
}
