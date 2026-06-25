import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("filters falsy values", () => {
    expect(cn("a", null, undefined, false && "x", "b")).toBe("a b");
  });
  it("deduplicates conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("handles arrays and objects (clsx semantics)", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });
  it("returns empty string when given nothing", () => {
    expect(cn()).toBe("");
  });
});
