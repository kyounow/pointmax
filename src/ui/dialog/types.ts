export type ConfirmOpts = {
  title: string;
  message?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
};

export type PromptOpts = {
  title: string;
  message?: string;
  defaultValue?: string;
  okText?: string;
  cancelText?: string;
  inputType?: "text" | "number";
  step?: string;
  min?: number;
  placeholder?: string;
};

export type AlertOpts = {
  title: string;
  message?: string;
  okText?: string;
  level?: "info" | "error" | "success";
};

export type DialogApi = {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
  alert: (opts: AlertOpts) => Promise<void>;
};

export type DialogState =
  | { type: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { type: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | { type: "alert"; opts: AlertOpts; resolve: () => void };
