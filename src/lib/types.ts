export type Sex = "male" | "female";
export type ActivityFactor = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type GoalMode = "lose" | "gain" | "maintain";
export type MealSchedule = {
  breakfast_time?: string | null;
  lunch_time?: string | null;
  dinner_time?: string | null;
  am_snack_time?: string | null;
  pm_snack_time?: string | null;
};
export type ExerciseCategory =
  | "cardio"
  | "gym"
  | "calisthenics"
  | "sports"
  | "daily"
  | "core";

export const ACTIVITY_OPTIONS: {
  value: ActivityFactor;
  label: string;
  desc: string;
}[] = [
  { value: 1.2, label: "Sedentary", desc: "Little or no exercise, desk job" },
  { value: 1.375, label: "Light", desc: "1–3 days/week, light exercise" },
  { value: 1.55, label: "Moderate", desc: "3–5 days/week, moderate exercise" },
  { value: 1.725, label: "Very active", desc: "6–7 days/week, hard exercise" },
  { value: 1.9, label: "Athlete", desc: "Daily physical job + training" },
];

export interface Profile {
  sex: Sex;
  birthdate: string;
  height_cm: number;
  current_weight_kg: number;
  activity_factor: ActivityFactor;
  calorie_goal: number;
  protein_goal: number;
  fat_goal: number;
  carb_goal: number;
  createdAt: string;
  meal_schedule?: MealSchedule;
  goal_mode?: GoalMode;
  goal_start_weight_kg?: number;
  goal_target_weight_kg?: number;
  goal_start_date?: string;
  goal_target_date?: string;
  avatar_url?: string;
  avatar_public_id?: string;
}

export function normalizeGoal(profile: Profile) {
  const mode = profile.goal_mode ?? "lose";
  const startWeight = profile.goal_start_weight_kg ?? profile.current_weight_kg;
  const targetWeight =
    profile.goal_target_weight_kg ??
    (mode === "lose"
      ? startWeight * 0.9
      : mode === "gain"
        ? startWeight * 1.05
        : startWeight);
  const targetDelta = Math.abs(targetWeight - startWeight);
  const currentDelta =
    mode === "lose"
      ? startWeight - profile.current_weight_kg
      : mode === "gain"
        ? profile.current_weight_kg - startWeight
        : targetDelta - Math.abs(profile.current_weight_kg - targetWeight);
  const progress =
    targetDelta <= 0
      ? mode === "maintain"
        ? 100
        : 0
      : Math.max(0, Math.min(100, (currentDelta / targetDelta) * 100));

  return {
    mode,
    startWeight,
    targetWeight,
    targetDelta,
    currentDelta,
    progress,
    startDate: profile.goal_start_date ?? profile.createdAt.slice(0, 10),
    targetDate: profile.goal_target_date ?? null,
  };
}

export interface FoodItem {
  id: string;
  source: "seed" | "ai" | "custom";
  name: string;
  brand?: string;
  serving_size: number;
  serving_unit: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  barcode?: string;
}

export interface MealItem {
  food_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
}

export interface Meal {
  id: string;
  type: MealType;
  loggedAt: string;
  total_kcal: number;
  p: number;
  f: number;
  c: number;
  items: MealItem[];
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  mets: number;
  distance_based?: boolean;
  fixed_kcal_per_25_min?: number;
}

export interface ExerciseLog {
  id: string;
  exercise_id: string;
  exercise_name: string;
  category: ExerciseCategory;
  mets: number;
  duration_min: number;
  distance_km?: number;
  reps?: number;
  sets?: number;
  kcal_burned: number;
  loggedAt: string;
}

export interface WeightLog {
  id: string;
  weight_kg: number;
  waist_cm?: number;
  chest_cm?: number;
  hip_cm?: number;
  arm_cm?: number;
  photo_url?: string;
  loggedAt: string;
}

export interface DailySummary {
  date: string;
  kcal_in: number;
  kcal_out_activity: number;
  bmr_kcal: number;
  tdee_kcal: number;
  deficit_kcal: number;
  real_deficit_kcal: number;
  water_ml: number;
  sleep_hours: number;
  notes?: string;
}

export interface Streaks {
  current_streak: number;
  longest_streak: number;
  last_logged_date: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  instructions: string;
  is_template: boolean;
  ingredients: { food_item_id: string; name: string; qty: number; unit: string }[];
  createdAt: string;
}

export function ageFromBirthdate(birthdate: string, at = new Date()): number {
  const b = new Date(birthdate);
  let age = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) age--;
  return age;
}

export function mifflinBMR(
  sex: Sex,
  age: number,
  height_cm: number,
  weight_kg: number,
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function computeTDEE(bmr: number, activity_factor: number): number {
  return bmr * activity_factor;
}

export function adlKcal(tdee: number, bmr: number): number {
  return tdee - bmr;
}

export function activityKcal(mets: number, weight_kg: number, min: number): number {
  const hours = min / 60;
  return mets * weight_kg * hours;
}

export function exerciseKcal(exercise: Exercise, weight_kg: number, min: number): number {
  if (exercise.fixed_kcal_per_25_min) {
    return (exercise.fixed_kcal_per_25_min / 25) * min;
  }
  return activityKcal(exercise.mets, weight_kg, min);
}

export interface DailyTotals {
  kcal_in: number;
  p: number;
  f: number;
  c: number;
  kcal_out_activity: number;
  bmr_kcal: number;
  tdee_kcal: number;
  total_out: number;
  goal_deficit: number;
  real_deficit: number;
  remaining_vs_goal: number;
}

export function computeDay(
  meals: Meal[],
  exerciseLogs: ExerciseLog[],
  profile: Profile,
  at = new Date(),
): DailyTotals {
  const kcal_in = meals.reduce((s, m) => s + m.total_kcal, 0);
  const p = meals.reduce((s, m) => s + m.p, 0);
  const f = meals.reduce((s, m) => s + m.f, 0);
  const c = meals.reduce((s, m) => s + m.c, 0);
  const kcal_out_activity = exerciseLogs.reduce(
    (s, e) => s + e.kcal_burned,
    0,
  );
  const age = ageFromBirthdate(profile.birthdate, at);
  const bmr_kcal = mifflinBMR(
    profile.sex,
    age,
    profile.height_cm,
    profile.current_weight_kg,
  );
  const tdee_kcal = computeTDEE(bmr_kcal, profile.activity_factor);
  const total_out = tdee_kcal + kcal_out_activity;
  const goal_deficit = profile.calorie_goal - kcal_in;
  const real_deficit = total_out - kcal_in;
  const remaining_vs_goal = goal_deficit;
  return {
    kcal_in,
    p,
    f,
    c,
    kcal_out_activity,
    bmr_kcal,
    tdee_kcal,
    total_out,
    goal_deficit,
    real_deficit,
    remaining_vs_goal,
  };
}

export function ringState(remaining: number, goal: number) {
  const ratio = goal <= 0 ? 1 : remaining / goal;
  if (remaining <= 0) return { color: "var(--over)", label: "Over" } as const;
  if (ratio < 0.25) return { color: "var(--amber)", label: "Near goal" } as const;
  return { color: "var(--rosso)", label: "On track" } as const;
}

export const todayKey = (at = new Date()): string =>
  at.toISOString().slice(0, 10);

export const dateKey = (d: Date): string => d.toISOString().slice(0, 10);

export function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export interface SquadMember {
  id: string;
  name: string;
  color: string;
  calorie_goal: number;
  kcal_in: number;
  kcal_out: number;
  streak: number;
}

export interface Squad {
  id: string;
  name: string;
  members: SquadMember[];
  createdAt: string;
}
