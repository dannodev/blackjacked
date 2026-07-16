"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ActivityFactor, GoalMode, MealSchedule, Profile, Sex } from "@/lib/types";

type ProfileRow = {
  id: string;
  sex: Sex;
  birthdate: string;
  height_cm: number;
  current_weight_kg: number;
  activity_factor: number;
  calorie_goal: number;
  protein_goal: number;
  fat_goal: number;
  carb_goal: number;
  breakfast_time: string | null;
  lunch_time: string | null;
  dinner_time: string | null;
  am_snack_time: string | null;
  pm_snack_time: string | null;
  goal_mode: GoalMode | null;
  goal_start_weight_kg: number | null;
  goal_target_weight_kg: number | null;
  goal_start_date: string | null;
  goal_target_date: string | null;
  avatar_url: string | null;
  avatar_public_id: string | null;
  created_at: string;
};

const PROFILE_COLUMNS =
  "id, sex, birthdate, height_cm, current_weight_kg, activity_factor, calorie_goal, protein_goal, fat_goal, carb_goal, breakfast_time, lunch_time, dinner_time, am_snack_time, pm_snack_time, goal_mode, goal_start_weight_kg, goal_target_weight_kg, goal_start_date, goal_target_date, avatar_url, avatar_public_id, created_at";

function normalizeTime(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function hasMealSchedule(schedule: MealSchedule) {
  return Object.values(schedule).some(Boolean);
}

function fromRow(row: ProfileRow): Profile {
  return {
    sex: row.sex,
    birthdate: row.birthdate,
    height_cm: row.height_cm,
    current_weight_kg: row.current_weight_kg,
    activity_factor: row.activity_factor as ActivityFactor,
    calorie_goal: row.calorie_goal,
    protein_goal: row.protein_goal,
    fat_goal: row.fat_goal,
    carb_goal: row.carb_goal,
    meal_schedule: {
      breakfast_time: normalizeTime(row.breakfast_time),
      lunch_time: normalizeTime(row.lunch_time),
      dinner_time: normalizeTime(row.dinner_time),
      am_snack_time: normalizeTime(row.am_snack_time),
      pm_snack_time: normalizeTime(row.pm_snack_time),
    },
    goal_mode: row.goal_mode ?? "lose",
    goal_start_weight_kg: row.goal_start_weight_kg ?? undefined,
    goal_target_weight_kg: row.goal_target_weight_kg ?? undefined,
    goal_start_date: row.goal_start_date ?? undefined,
    goal_target_date: row.goal_target_date ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
    avatar_public_id: row.avatar_public_id ?? undefined,
    createdAt: row.created_at,
  };
}

function toRow(userId: string, profile: Profile): Omit<ProfileRow, "created_at"> {
  return {
    id: userId,
    sex: profile.sex,
    birthdate: profile.birthdate,
    height_cm: profile.height_cm,
    current_weight_kg: profile.current_weight_kg,
    activity_factor: profile.activity_factor,
    calorie_goal: profile.calorie_goal,
    protein_goal: profile.protein_goal,
    fat_goal: profile.fat_goal,
    carb_goal: profile.carb_goal,
    breakfast_time: hasMealSchedule(profile.meal_schedule ?? {})
      ? normalizeTime(profile.meal_schedule?.breakfast_time)
      : null,
    lunch_time: hasMealSchedule(profile.meal_schedule ?? {})
      ? normalizeTime(profile.meal_schedule?.lunch_time)
      : null,
    dinner_time: hasMealSchedule(profile.meal_schedule ?? {})
      ? normalizeTime(profile.meal_schedule?.dinner_time)
      : null,
    am_snack_time: hasMealSchedule(profile.meal_schedule ?? {})
      ? normalizeTime(profile.meal_schedule?.am_snack_time)
      : null,
    pm_snack_time: hasMealSchedule(profile.meal_schedule ?? {})
      ? normalizeTime(profile.meal_schedule?.pm_snack_time)
      : null,
    goal_mode: profile.goal_mode ?? "lose",
    goal_start_weight_kg: profile.goal_start_weight_kg ?? profile.current_weight_kg,
    goal_target_weight_kg: profile.goal_target_weight_kg ?? null,
    goal_start_date: profile.goal_start_date ?? profile.createdAt.slice(0, 10),
    goal_target_date: profile.goal_target_date ?? null,
    avatar_url: profile.avatar_url ?? null,
    avatar_public_id: profile.avatar_public_id ?? null,
  };
}

export async function loadSupabaseProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? fromRow(data as ProfileRow) : null;
}

export async function saveSupabaseProfile(
  userId: string,
  profile: Profile,
): Promise<Profile> {
  if (!isSupabaseConfigured()) return profile;

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(toRow(userId, profile), { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return fromRow(data as ProfileRow);
}
