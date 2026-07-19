import { describe, expect, it } from "vitest";
import { buildWeeklyCoachRecommendation } from "./weekly-coach";
import type { DailySummary, Profile, WeightLog } from "./types";

const profile: Profile = { sex: "male", birthdate: "1990-01-01", height_cm: 180, current_weight_kg: 90, activity_factor: 1.55, calorie_goal: 2200, protein_goal: 160, carb_goal: 220, fat_goal: 70, goal_mode: "lose", createdAt: "2026-01-01" };
const now = new Date("2026-07-18T12:00:00Z");
const summaries = Array.from({ length: 7 }, (_, index): DailySummary => ({ date: `2026-07-${String(11 + index).padStart(2, "0")}`, kcal_in: 2200, kcal_out_activity: 0, bmr_kcal: 1800, tdee_kcal: 2700, deficit_kcal: 0, real_deficit_kcal: 500, water_ml: 2000, sleep_hours: 8 }));

describe("weekly coach", () => {
  it("waits for enough data", () => {
    expect(buildWeeklyCoachRecommendation(profile, [], [], now).ready).toBe(false);
  });

  it("suggests a small reduction after a flat adherent trend", () => {
    const weights: WeightLog[] = [
      { id: "1", weight_kg: 90, loggedAt: "2026-07-05T12:00:00Z" },
      { id: "2", weight_kg: 90, loggedAt: "2026-07-18T12:00:00Z" },
    ];
    expect(buildWeeklyCoachRecommendation(profile, weights, summaries, now).suggestedCalorieGoal).toBe(2100);
  });
});
