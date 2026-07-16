"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { WeightLog } from "@/lib/types";

type WeightLogRow = {
  id: string;
  user_id: string;
  weight_kg: number;
  waist_cm: number | null;
  chest_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  photo_url: string | null;
  logged_at: string;
};

const WEIGHT_LOG_COLUMNS =
  "id, user_id, weight_kg, waist_cm, chest_cm, hip_cm, arm_cm, photo_url, logged_at";

function fromRow(row: WeightLogRow): WeightLog {
  return {
    id: row.id,
    weight_kg: row.weight_kg,
    waist_cm: row.waist_cm ?? undefined,
    chest_cm: row.chest_cm ?? undefined,
    hip_cm: row.hip_cm ?? undefined,
    arm_cm: row.arm_cm ?? undefined,
    photo_url: row.photo_url ?? undefined,
    loggedAt: row.logged_at,
  };
}

function toRow(userId: string, log: WeightLog) {
  return {
    id: log.id,
    user_id: userId,
    weight_kg: log.weight_kg,
    waist_cm: log.waist_cm ?? null,
    chest_cm: log.chest_cm ?? null,
    hip_cm: log.hip_cm ?? null,
    arm_cm: log.arm_cm ?? null,
    photo_url: log.photo_url ?? null,
    logged_at: log.loggedAt,
  };
}

export async function loadSupabaseWeightLogs(
  userId: string,
): Promise<WeightLog[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("weight_logs")
    .select(WEIGHT_LOG_COLUMNS)
    .eq("user_id", userId)
    .order("logged_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as WeightLogRow[]).map(fromRow);
}

export async function saveSupabaseWeightLog(
  userId: string,
  log: WeightLog,
): Promise<WeightLog> {
  if (!isSupabaseConfigured()) return log;

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("weight_logs")
    .upsert(toRow(userId, log), { onConflict: "id" })
    .select(WEIGHT_LOG_COLUMNS)
    .single();

  if (error) throw error;
  return fromRow(data as WeightLogRow);
}
