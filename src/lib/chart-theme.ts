// Centralized recharts theming — uses semantic tokens so it adapts to dark/light.
export const chartColors = {
  primary: "var(--primary)",
  accent: "var(--accent)",
  destructive: "var(--destructive)",
  muted: "var(--muted-foreground)",
  border: "var(--border)",
  fg: "var(--foreground)",
  card: "var(--card)",
  cardFg: "var(--card-foreground)",
};

// 10 visually distinct categorical colors (works on dark & light).
export const categoricalPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.65 0.18 260)", // indigo
  "oklch(0.70 0.17 330)", // pink
  "oklch(0.72 0.15 200)", // teal
  "oklch(0.75 0.16 50)",  // orange
  "oklch(0.65 0.16 290)", // violet
];

export const tooltipContentStyle: React.CSSProperties = {
  background: "var(--card)",
  color: "var(--card-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  boxShadow: "0 8px 24px -12px rgb(0 0 0 / 0.25)",
  padding: "8px 12px",
  fontSize: 12,
};
export const tooltipLabelStyle: React.CSSProperties = {
  color: "var(--card-foreground)",
  fontWeight: 600,
  marginBottom: 4,
};
export const tooltipItemStyle: React.CSSProperties = {
  color: "var(--card-foreground)",
};

export const axisTickStyle = { fill: "var(--muted-foreground)", fontSize: 11 };
export const gridStroke = "var(--border)";
export const legendStyle: React.CSSProperties = { color: "var(--foreground)", fontSize: 12 };
