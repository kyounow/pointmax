import type { Currency } from "../domain/types";
import { styleOf } from "../domain/currencyKind";

type Props = {
  currency: Currency;
  size?: number;
};

export function CurrencyIcon({ currency, size = 36 }: Props) {
  if (currency.iconUrl) {
    return (
      <img
        src={currency.iconUrl}
        alt={currency.name}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          background: "#fff",
        }}
      />
    );
  }
  const bg = currency.iconColor ?? styleOf(currency.kind).border;
  const char = currency.iconChar ?? currency.name.charAt(0);
  const len = char.length;
  const fontRatio = len === 1 ? 0.5 : len === 2 ? 0.38 : 0.3;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "white",
        fontSize: Math.max(9, Math.floor(size * fontRatio)),
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        lineHeight: 1,
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        letterSpacing: len > 2 ? -0.5 : 0,
        userSelect: "none",
      }}
    >
      {char}
    </div>
  );
}
