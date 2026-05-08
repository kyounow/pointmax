import type { CurrencyKind } from "./types";

export type KindStyle = {
  label: string;
  bg: string;
  border: string;
  text: string;
};

const STYLES: Record<CurrencyKind, KindStyle> = {
  point: {
    label: "ポイント",
    bg: "#1e2a3f",
    border: "#4ea1ff",
    text: "#cfe3ff",
  },
  mile: {
    label: "マイル",
    bg: "#2a1f0f",
    border: "#f59e0b",
    text: "#ffe6b3",
  },
  cashlike: {
    label: "現金相当",
    bg: "#0f2a1e",
    border: "#10b981",
    text: "#bdf0d6",
  },
};

const DEFAULT: KindStyle = {
  label: "未分類",
  bg: "#20242c",
  border: "#2a2f39",
  text: "#e6e6e6",
};

export function styleOf(kind?: CurrencyKind): KindStyle {
  return kind ? STYLES[kind] : DEFAULT;
}

export const KIND_OPTIONS: { value: CurrencyKind; label: string }[] = [
  { value: "point", label: "ポイント" },
  { value: "mile", label: "マイル" },
  { value: "cashlike", label: "現金相当" },
];

// レート → 「2pt → 1pt」風の比率表記
// rate >= 1 → "1 → N"  / rate < 1 で 1/rate が綺麗な整数 → "N → 1"  / それ以外は "1 → 0.5"
export function formatRatio(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return "?";
  if (rate >= 1) return `1 → ${stripZero(rate)}`;
  const inv = 1 / rate;
  if (Math.abs(inv - Math.round(inv)) < 1e-6 && inv <= 1000) {
    return `${Math.round(inv)} → 1`;
  }
  return `1 → ${stripZero(rate)}`;
}

function stripZero(n: number): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}
