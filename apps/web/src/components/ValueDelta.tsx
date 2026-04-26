interface ValueDeltaProps {
  value: string;
  direction: "positive" | "negative" | "neutral";
}

const directionClass = {
  positive: "text-profit",
  negative: "text-danger",
  neutral: "text-text"
} as const;

export function ValueDelta({ value, direction }: ValueDeltaProps) {
  const prefix = direction === "positive" ? "+" : direction === "negative" ? "-" : "";

  return <span className={`font-display text-3xl ${directionClass[direction]}`}>{`${prefix}${value}`}</span>;
}
