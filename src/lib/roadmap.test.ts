import { describe, it, expect } from "vitest";
import { roadmap } from "./roadmap";

describe("roadmap", () => {
  it("has at least one phase", () => {
    expect(Array.isArray(roadmap)).toBe(true);
    expect(roadmap.length).toBeGreaterThan(0);
  });
  it("each item has id/title/status", () => {
    for (const phase of roadmap) {
      for (const item of phase.items) {
        expect(item.id).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(["done", "todo", "doing"]).toContain(item.status);
      }
    }
  });
  it("item ids are unique", () => {
    const ids = roadmap.flatMap((p) => p.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("phase 8 is fully done", () => {
    const p8 = roadmap.find((p) => p.items.some((i) => i.id.startsWith("8.")));
    expect(p8).toBeTruthy();
    const items = p8!.items.filter((i) => i.id.startsWith("8."));
    expect(items.every((i) => i.status === "done")).toBe(true);
  });
});
