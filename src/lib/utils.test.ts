import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("should merge class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toBe("base visible");
  });

  it("should handle undefined and null", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toBe("base end");
  });

  it("should handle objects", () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe("foo baz");
  });

  it("should handle arrays", () => {
    const result = cn(["foo", "bar"], "baz");
    expect(result).toBe("foo bar baz");
  });

  it("should merge Tailwind classes correctly", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("should handle conflicting Tailwind classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("should preserve non-conflicting Tailwind classes", () => {
    const result = cn("p-4 m-2", "p-2");
    expect(result).toBe("m-2 p-2");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle single class", () => {
    const result = cn("single");
    expect(result).toBe("single");
  });

  it("should handle complex combinations", () => {
    const result = cn(
      "base-class",
      { conditional: true },
      ["array-class"],
      false && "hidden",
      "final"
    );
    expect(result).toContain("base-class");
    expect(result).toContain("conditional");
    expect(result).toContain("array-class");
    expect(result).toContain("final");
    expect(result).not.toContain("hidden");
  });
});
