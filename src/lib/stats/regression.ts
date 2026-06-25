// Regressão linear simples — y = a·x + b (mínimos quadrados).
export interface Point { x: number; y: number }
export interface LinearFit { a: number; b: number }

export function linearRegression(points: Point[]): LinearFit {
  const n = points.length;
  if (n < 2) return { a: 0, b: points[0]?.y ?? 0 };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxy += p.x * p.y;
    sxx += p.x * p.x;
  }
  const denom = n * sxx - sx * sx || 1;
  const a = (n * sxy - sx * sy) / denom;
  const b = (sy - a * sx) / n;
  return { a, b };
}

export function predict(fit: LinearFit, x: number) {
  return fit.a * x + fit.b;
}
