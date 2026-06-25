import { describe, it, expect } from "vitest";
import { formatMZN, formatDate, formatDateTime } from "./format";

describe("formatMZN", () => {
  it("formats with 2 decimals by default (pt-PT)", () => {
    expect(formatMZN(1234.5)).toMatch(/^MZN 1.?234,50$/);
  });

  it("formats zero", () => {
    expect(formatMZN(0)).toBe("MZN 0,00");
  });

  it("formats negative values preserving sign", () => {
    expect(formatMZN(-50)).toMatch(/^MZN -50,00$/);
  });

  it("uses compact suffix k for thousands", () => {
    expect(formatMZN(2500, { compact: true })).toMatch(/^MZN 2,5k$/);
  });

  it("uses compact suffix M for millions", () => {
    expect(formatMZN(2_500_000, { compact: true })).toMatch(/^MZN 2,5M$/);
  });

  it("falls back to standard formatting under compact threshold", () => {
    expect(formatMZN(999, { compact: true })).toBe("MZN 999,00");
  });

  it("respects an alternate locale", () => {
    const out = formatMZN(1234.5, { locale: "en-US" });
    expect(out).toBe("MZN 1,234.50");
  });

  it("handles very large numbers without scientific notation", () => {
    const out = formatMZN(1e9);
    expect(out).toContain("MZN");
    expect(out).not.toMatch(/e\+/i);
  });
});

describe("formatDate / formatDateTime", () => {
  it("formats ISO date in dd/mm/yyyy (pt-PT)", () => {
    expect(formatDate("2026-01-15T00:00:00Z")).toMatch(/15\/01\/2026/);
  });

  it("includes hour:minute in formatDateTime", () => {
    expect(formatDateTime("2026-01-15T10:30:00Z")).toMatch(/\d{2}:\d{2}/);
  });

  it("returns 'Invalid Date' string for invalid input (does not throw)", () => {
    expect(() => formatDate("not-a-date")).not.toThrow();
  });
});
