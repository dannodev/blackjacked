import { describe, it, expect } from "vitest";
import {
  mifflinBMR,
  computeTDEE,
  adlKcal,
  activityKcal,
  computeDay,
  dateKey,
  ringState,
  ageFromBirthdate,
  sameDay,
  recommendedCalorieTarget,
  type Profile,
  type Meal,
  type ExerciseLog,
} from "./types";

const baseProfile: Profile = {
  sex: "male",
  birthdate: "1995-01-15",
  height_cm: 180,
  current_weight_kg: 80,
  activity_factor: 1.55,
  calorie_goal: 1900,
  protein_goal: 130,
  fat_goal: 60,
  carb_goal: 200,
  createdAt: "2024-01-01",
};

const at = new Date("2025-07-14T12:00:00Z");

describe("ageFromBirthdate", () => {
  it("calculates age correctly", () => {
    expect(ageFromBirthdate("1995-01-15", new Date("2025-07-14"))).toBe(30);
  });
  it("handles birthday not yet passed", () => {
    expect(ageFromBirthdate("1995-12-15", new Date("2025-07-14"))).toBe(29);
  });
});

describe("date helpers", () => {
  it("keeps local calendar dates instead of UTC-shifting them", () => {
    expect(dateKey(new Date(2026, 6, 16, 22, 30))).toBe("2026-07-16");
  });

  it("compares date-only keys and timestamp strings by calendar day", () => {
    expect(sameDay("2026-07-16", "2026-07-16T12:00:00.000Z")).toBe(true);
    expect(sameDay("2026-07-16", "2026-07-17T12:00:00.000Z")).toBe(false);
  });
});

describe("mifflinBMR", () => {
  it("calculates male BMR with Mifflin-St Jeor", () => {
    const age = 30;
    const bmr = mifflinBMR("male", age, 180, 80);
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(bmr).toBe(1780);
  });
  it("calculates female BMR with Mifflin-St Jeor", () => {
    const age = 30;
    const bmr = mifflinBMR("female", age, 165, 65);
    // 10*65 + 6.25*165 - 5*30 - 161 = 650 + 1031.25 - 150 - 161 = 1370.25
    expect(bmr).toBeCloseTo(1370.25, 2);
  });
  it("male BMR > female BMR for same stats", () => {
    const male = mifflinBMR("male", 30, 175, 75);
    const female = mifflinBMR("female", 30, 175, 75);
    expect(male).toBeGreaterThan(female);
  });
});

describe("computeTDEE", () => {
  it("multiplies BMR by activity factor", () => {
    expect(computeTDEE(1780, 1.55)).toBeCloseTo(2759, 0);
  });
  it("sedentary factor = 1.2", () => {
    expect(computeTDEE(1780, 1.2)).toBeCloseTo(2136, 0);
  });
  it("athlete factor = 1.9", () => {
    expect(computeTDEE(1780, 1.9)).toBeCloseTo(3382, 0);
  });
});

describe("adlKcal", () => {
  it("returns TDEE - BMR", () => {
    expect(adlKcal(2759, 1780)).toBeCloseTo(979, 0);
  });
});

describe("activityKcal", () => {
  it("calculates kcal from MET × kg × hours", () => {
    // 9.8 MET × 80 kg × 0.5 hours = 392
    expect(activityKcal(9.8, 80, 30)).toBeCloseTo(392, 0);
  });
  it("60 min doubles 30 min", () => {
    const half = activityKcal(7, 75, 30);
    const full = activityKcal(7, 75, 60);
    expect(full).toBeCloseTo(half * 2, 1);
  });
  it("returns 0 for 0 duration", () => {
    expect(activityKcal(10, 80, 0)).toBe(0);
  });
});

describe("computeDay", () => {
  it("returns zeros for empty day", () => {
    const day = computeDay([], [], baseProfile, at);
    expect(day.kcal_in).toBe(0);
    expect(day.kcal_out_activity).toBe(0);
    expect(day.p).toBe(0);
    expect(day.f).toBe(0);
    expect(day.c).toBe(0);
  });
  it("sums meal calories and macros", () => {
    const meals: Meal[] = [
      {
        id: "1",
        type: "breakfast",
        loggedAt: "2025-07-14T08:00:00Z",
        total_kcal: 400,
        p: 30,
        f: 15,
        c: 40,
        items: [],
      },
      {
        id: "2",
        type: "lunch",
        loggedAt: "2025-07-14T13:00:00Z",
        total_kcal: 650,
        p: 45,
        f: 20,
        c: 60,
        items: [],
      },
    ];
    const day = computeDay(meals, [], baseProfile, at);
    expect(day.kcal_in).toBe(1050);
    expect(day.p).toBe(75);
    expect(day.f).toBe(35);
    expect(day.c).toBe(100);
  });
  it("tracks exercise without double-counting it in total expenditure", () => {
    const exercises: ExerciseLog[] = [
      {
        id: "1",
        exercise_id: "run",
        exercise_name: "Running",
        category: "cardio",
        mets: 9.8,
        duration_min: 30,
        kcal_burned: 392,
        loggedAt: "2025-07-14T18:00:00Z",
      },
    ];
    const day = computeDay([], exercises, baseProfile, at);
    expect(day.kcal_out_activity).toBe(392);
    expect(day.total_out).toBeCloseTo(day.tdee_kcal, 0);
  });
  it("goal_deficit = calorie_goal - kcal_in", () => {
    const meals: Meal[] = [
      {
        id: "x",
        type: "lunch",
        loggedAt: "2025-07-14T12:00:00Z",
        total_kcal: 1450,
        p: 100,
        f: 50,
        c: 150,
        items: [],
      },
    ];
    const day = computeDay(meals, [], baseProfile, at);
    expect(day.goal_deficit).toBe(1900 - 1450); // 450
    expect(day.remaining_vs_goal).toBe(450);
  });
  it("real_deficit = total_out - kcal_in", () => {
    const meals: Meal[] = [
      {
        id: "x",
        type: "lunch",
        loggedAt: "2025-07-14T12:00:00Z",
        total_kcal: 2000,
        p: 100,
        f: 50,
        c: 200,
        items: [],
      },
    ];
    const day = computeDay(meals, [], baseProfile, at);
    expect(day.real_deficit).toBeCloseTo(day.tdee_kcal - 2000, 0);
  });
  it("does not increase estimated deficit when activity factor already includes exercise", () => {
    const noEx = computeDay(
      [{ id: "x", type: "lunch", loggedAt: "2025-07-14T12:00:00Z", total_kcal: 1500, p: 80, f: 40, c: 150, items: [] }],
      [],
      baseProfile,
      at,
    );
    const withEx = computeDay(
      [{ id: "x", type: "lunch", loggedAt: "2025-07-14T12:00:00Z", total_kcal: 1500, p: 80, f: 40, c: 150, items: [] }],
      [{ id: "e", exercise_id: "run", exercise_name: "Running", category: "cardio", mets: 9.8, duration_min: 30, kcal_burned: 392, loggedAt: "2025-07-14T18:00:00Z" }],
      baseProfile,
      at,
    );
    expect(withEx.real_deficit).toBeCloseTo(noEx.real_deficit, 0);
  });
});

describe("recommendedCalorieTarget", () => {
  it("uses goal-aware adjustments", () => {
    expect(recommendedCalorieTarget(2500, "lose", "male")).toBe(2150);
    expect(recommendedCalorieTarget(2500, "maintain", "male")).toBe(2500);
    expect(recommendedCalorieTarget(2500, "gain", "male")).toBe(2750);
  });

  it("enforces conservative minimums", () => {
    expect(recommendedCalorieTarget(1300, "lose", "male")).toBe(1500);
    expect(recommendedCalorieTarget(1200, "lose", "female")).toBe(1200);
  });
});

describe("ringState", () => {
  it("returns rosso when on track (>25% of goal remaining)", () => {
    const s = ringState(500, 1900);
    expect(s.color).toBe("var(--rosso)");
    expect(s.label).toBe("On track");
  });
  it("returns amber when near goal (<25% remaining but >0)", () => {
    const s = ringState(300, 1900);
    expect(s.color).toBe("var(--amber)");
    expect(s.label).toBe("Near goal");
  });
  it("returns red when over (remaining <= 0)", () => {
    const s = ringState(0, 1900);
    expect(s.color).toBe("var(--over)");
    expect(s.label).toBe("Over");
  });
  it("returns red for negative remaining", () => {
    const s = ringState(-200, 1900);
    expect(s.color).toBe("var(--over)");
  });
  it("handles zero goal edge case", () => {
    const s = ringState(0, 0);
    expect(s.color).toBe("var(--over)");
  });
});
