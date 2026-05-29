import { createContext, useContext } from "react";
import type { DialogApi } from "./types";

// DialogContext + useDialog hook を DialogProvider.tsx (component) から分離。
// react-refresh/only-export-components: 1 ファイルが component と非 component
// (hook / context) を両方 export すると fast refresh が壊れるため別ファイル化。
// DialogProvider は本ファイルから DialogContext を import して Provider を構築する。
export const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be inside DialogProvider");
  return ctx;
}
