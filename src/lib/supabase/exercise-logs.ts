"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ExerciseCategory, ExerciseLog } from "@/lib/types";

const RECENT_EXERCISE_LIMIT = 250;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExerciseLogRow = {
  id: string;
  user_id: string;
  exercise_id: string | null;
  exercise_name: string;
  category: ExerciseCategory;
  mets: number;
  duration_min: number;
  distance_km: number | null;
  reps: number | null;
  sets: number | null;
  kcal_burned: number;
  logged_at: string;
};

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function fromRow(row: ExerciseLogRow): ExerciseLog {
  return {
    id: row.id,
    exercise_id: row.exercise_id ?? "",
    exercise_name: row.exercise_name,
    category: row.category,
    mets: row.mets,
    duration_min: row.duration_min,
    distance_km: row.distance_km ?? undefined,
    reps: row.reps ?? undefined,
    sets: row.sets ?? undefined,
    kcal_burned: row.kcal_burned,
    loggedAt: row.logged_at,
  };
}

function toRow(userId: string, log: ExerciseLog) {
  return {
    id: log.id,
    user_id: userId,
    exercise_id: log.exercise_id || null,
    exercise_name: log.exercise_name,
    category: log.category,
    mets: log.mets,
    duration_min: Math.round(log.duration_min),
    distance_km: log.distance_km ?? null,
    reps: log.reps ?? null,
    sets: log.sets ?? null,
    kcal_burned: log.kcal_burned,
    logged_at: log.loggedAt,
  };
}

export async function loadSupabaseExerciseLogs(
  userId: string,
): Promise<ExerciseLog[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("exercise_logs")
    .select(
      "id, user_id, exercise_id, exercise_name, category, mets, duration_min, distance_km, reps, sets, kcal_burned, logged_at",
    )
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(RECENT_EXERCISE_LIMIT);

  if (error) throw error;
  return ((data ?? []) as ExerciseLogRow[]).map(fromRow);
}

export async function saveSupabaseExerciseLog(
  userId: string,
  log: ExerciseLog,
): Promise<ExerciseLog | null> {
  if (!isSupabaseConfigured()) return log;
  if (!isUuid(log.id)) return null;

  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("exercise_logs")
    .upsert(toRow(userId, log), { onConflict: "id" });

  if (error) throw error;
  return log;
}

export async function deleteSupabaseExerciseLog(logId: string) {
  if (!isSupabaseConfigured() || !isUuid(logId)) return;

  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from("exercise_logs").delete().eq("id", logId);
  if (error) throw error;
}
