import { describe, it, expect } from "vitest";
import { meanStddev, findOutliers } from "./zscore";
import { ymKey, addMonths } from "./month";

describe("meanStddev", () => {
  it("calcula média e desvio padrão", () => {
    const { mean, stddev } = meanStddev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(mean).toBe(5);
    expect(stddev).toBeCloseTo(2, 5);
  });
  it("trata lista vazia", () => {
    const { mean, stddev } = meanStddev([]);
    expect(mean).toBe(0);
    expect(stddev).toBe(0);
  });
});

describe("findOutliers", () => {
  it("detecta valores acima do threshold", () => {
    const items = [1, 1, 1, 1, 1, 50].map((v, i) => ({ id: i, v }));
    const out = findOutliers(items, (i) => i.v, 2);
    expect(out).toHaveLength(1);
    expect(out[0].v).toBe(50);
  });
  it("retorna vazio quando stddev é zero", () => {
    expect(findOutliers([{ v: 5 }, { v: 5 }], (i) => i.v)).toEqual([]);
  });
});

describe("month utils", () => {
  it("ymKey extrai YYYY-MM", () => {
    expect(ymKey("2026-03-15")).toBe("2026-03");
  });
  it("addMonths avança e recua", () => {
    expect(addMonths("2026-01", 2)).toBe("2026-03");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });
});
