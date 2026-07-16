"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ActivityFactor, Profile, Sex } from "@/lib/types";

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
  created_at: string;
};

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
  };
}

export async function loadSupabaseProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, sex, birthdate, height_cm, current_weight_kg, activity_factor, calorie_goal, protein_goal, fat_goal, carb_goal, created_at",
    )
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
    .select(
      "id, sex, birthdate, height_cm, current_weight_kg, activity_factor, calorie_goal, protein_goal, fat_goal, carb_goal, created_at",
    )
    .single();

  if (error) throw error;
  return fromRow(data as ProfileRow);
}
