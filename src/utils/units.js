const FRACTIONS = [
  { value: 1/8, symbol: "⅛" },
  { value: 1/6, symbol: "⅙" },
  { value: 1/5, symbol: "⅕" },
  { value: 1/4, symbol: "¼" },
  { value: 1/3, symbol: "⅓" },
  { value: 3/8, symbol: "⅜" },
  { value: 2/5, symbol: "⅖" },
  { value: 1/2, symbol: "½" },
  { value: 3/5, symbol: "⅗" },
  { value: 5/8, symbol: "⅝" },
  { value: 2/3, symbol: "⅔" },
  { value: 3/4, symbol: "¾" },
  { value: 4/5, symbol: "⅘" },
  { value: 5/6, symbol: "⅚" },
  { value: 7/8, symbol: "⅞" },
];

export function formatAmount(amount) {
  if (amount == null) return "";
  const whole = Math.trunc(amount);
  const fraction = amount - whole;
  const match = FRACTIONS.find((f) => Math.abs(f.value - fraction) < 0.02);
  if (match) {
    return `${whole ? whole + " " : ""}${match.symbol}`.trim();
  }
  if (fraction === 0) return `${whole}`;
  const rounded = Math.round(amount * 100) / 100;
  return `${rounded}`.replace(/\.0+$/, "");
}

export function toImperial(amount, unit) {
  if (amount == null) return { amount, unit };
  switch (unit) {
    case "ml":
    case "gr":
      return { amount: amount / 30, unit: "oz" };
    case "cl":
      return { amount: amount / 3, unit: "oz" };
    default:
      return { amount, unit };
  }
}

export function toMetric(amount, unit) {
  if (amount == null) return { amount, unit };
  switch (unit) {
    case "oz":
      return { amount: amount * 30, unit: "ml" };
    case "cup":
      return { amount: amount * 240, unit: "ml" };
    default:
      return { amount, unit };
  }
}
