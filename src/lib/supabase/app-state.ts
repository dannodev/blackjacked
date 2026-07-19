"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { FoodItem, Recipe, WorkoutRoutine } from "@/lib/types";
import type { Language } from "@/lib/store";
import type { MenuMealPreset } from "@/lib/menu-meals";

export type CloudAppState = {
  language: Language;
  recipes: Recipe[];
  customFoods: FoodItem[];
  customMenuMeals: MenuMealPreset[];
  favoriteExerciseIds: string[];
  favoriteFoodIds: string[];
  workoutRoutines: WorkoutRoutine[];
  useDefaultMenu: boolean;
  streakDates: string[];
  noMasturbationDates: string[];
};

export async function loadCloudAppState(userId: string): Promise<CloudAppState | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabaseBrowser()
    .from("user_app_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.state as CloudAppState | null;
}

export async function saveCloudAppState(userId: string, state: CloudAppState) {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabaseBrowser().from("user_app_state").upsert({
    user_id: userId,
    state,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}
