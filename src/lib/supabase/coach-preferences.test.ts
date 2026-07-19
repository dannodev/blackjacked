import { describe, expect, it } from "vitest";
import { normalizeCoachFocus } from "./coach-preferences";

describe("normalizeCoachFocus", () => {
  it("keeps valid priorities, removes duplicates, and caps the dashboard at five", () => {
    expect(normalizeCoachFocus([
      "water",
      "water",
      "sleep",
      "meals",
      "fitness_streak",
      "exercise:running",
      "no_fap",
    ])).toEqual(["water", "sleep", "meals", "fitness_streak", "exercise:running"]);
  });

  it("rejects malformed preference values", () => {
    expect(normalizeCoachFocus(["unknown", "exercise:", "exercise:bench-press"])).toEqual([
      "exercise:bench-press",
    ]);
  });
});
