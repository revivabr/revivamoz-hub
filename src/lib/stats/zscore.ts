// Deteção de anomalias por z-score.
export interface ZScoreStats { mean: number; stddev: number }

export function meanStddev(values: number[]): ZScoreStats {
  const n = values.length || 1;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const stddev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { mean, stddev };
}

export function findOutliers<T>(
  items: T[],
  getValue: (item: T) => number,
  threshold = 2,
): T[] {
  const values = items.map(getValue);
  const { mean, stddev } = meanStddev(values);
  if (stddev === 0) return [];
  return items.filter((item) => (getValue(item) - mean) / stddev > threshold);
}
