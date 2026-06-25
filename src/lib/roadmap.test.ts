import { describe, it, expect } from "vitest";
import { roadmap, roadmapProgress, type RoadmapTask } from "./roadmap";

describe("roadmap", () => {
  it("has at least one phase", () => {
    expect(roadmap.length).toBeGreaterThan(0);
  });
  it("each task has id/title/valid status", () => {
    for (const phase of roadmap) {
      for (const t of phase.tasks as RoadmapTask[]) {
        expect(t.id).toBeTruthy();
        expect(t.title).toBeTruthy();
        expect(["done", "todo", "in-progress"]).toContain(t.status);
      }
    }
  });
  it("task ids are unique across roadmap", () => {
    const ids = roadmap.flatMap((p) => p.tasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("phase 8 tasks are all done", () => {
    const p8 = roadmap.find((p) => p.tasks.some((t) => t.id.startsWith("8.")));
    expect(p8).toBeTruthy();
    expect(p8!.tasks.filter((t) => t.id.startsWith("8.")).every((t) => t.status === "done")).toBe(true);
  });
});

describe("roadmapProgress", () => {
  it("returns 100% when all tasks are done", () => {
    const r = roadmapProgress([
      { id: "x", title: "x", goal: "", tasks: [
        { id: "1", title: "a", status: "done" },
        { id: "2", title: "b", status: "done" },
      ] },
    ]);
    expect(r.percent).toBe(100);
  });
  it("returns 0% when nothing done", () => {
    const r = roadmapProgress([
      { id: "x", title: "x", goal: "", tasks: [
        { id: "1", title: "a", status: "todo" },
      ] },
    ]);
    expect(r.percent).toBe(0);
  });
  it("computes intermediate ratio", () => {
    const r = roadmapProgress([
      { id: "x", title: "x", goal: "", tasks: [
        { id: "1", title: "a", status: "done" },
        { id: "2", title: "b", status: "todo" },
        { id: "3", title: "c", status: "todo" },
        { id: "4", title: "d", status: "done" },
      ] },
    ]);
    expect(r.percent).toBe(50);
  });
  it("uses the live roadmap by default and returns a numeric percent", () => {
    const r = roadmapProgress();
    expect(typeof r.percent).toBe("number");
    expect(r.percent).toBeGreaterThanOrEqual(0);
    expect(r.percent).toBeLessThanOrEqual(100);
  });
});
