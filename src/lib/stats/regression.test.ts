import { describe, it, expect } from "vitest";
import { linearRegression, predict } from "./regression";

describe("linearRegression", () => {
  it("retorna ponto único quando há um só ponto", () => {
    expect(linearRegression([{ x: 0, y: 5 }])).toEqual({ a: 0, b: 5 });
  });
  it("ajusta y = 2x + 1", () => {
    const fit = linearRegression([
      { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 },
    ]);
    expect(fit.a).toBeCloseTo(2, 6);
    expect(fit.b).toBeCloseTo(1, 6);
    expect(predict(fit, 4)).toBeCloseTo(9, 6);
  });
});
