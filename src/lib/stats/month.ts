// Utilitários para chaves YYYY-MM.
export function ymKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function addMonths(ym: string, k: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + k, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
