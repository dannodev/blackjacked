"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DailySummary } from "@/lib/types";

type DailySummaryRow = {
  user_id: string;
  date: string;
  kcal_in: number;
  kcal_out_activity: number;
  bmr_kcal: number;
  tdee_kcal: number;
  deficit_kcal: number;
  real_deficit_kcal: number;
  water_ml: number;
  sleep_hours: number;
  notes: string | null;
};

const DAILY_SUMMARY_COLUMNS =
  "user_id, date, kcal_in, kcal_out_activity, bmr_kcal, tdee_kcal, deficit_kcal, real_deficit_kcal, water_ml, sleep_hours, notes";

function fromRow(row: DailySummaryRow): DailySummary {
  return {
    date: row.date,
    kcal_in: row.kcal_in,
    kcal_out_activity: row.kcal_out_activity,
    bmr_kcal: row.bmr_kcal,
    tdee_kcal: row.tdee_kcal,
    deficit_kcal: row.deficit_kcal,
    real_deficit_kcal: row.real_deficit_kcal,
    water_ml: row.water_ml,
    sleep_hours: row.sleep_hours,
    notes: row.notes ?? undefined,
  };
}

function toRow(userId: string, summary: DailySummary): DailySummaryRow {
  return {
    user_id: userId,
    date: summary.date,
    kcal_in: Math.round(summary.kcal_in),
    kcal_out_activity: Math.round(summary.kcal_out_activity),
    bmr_kcal: Math.round(summary.bmr_kcal),
    tdee_kcal: Math.round(summary.tdee_kcal),
    deficit_kcal: Math.round(summary.deficit_kcal),
    real_deficit_kcal: Math.round(summary.real_deficit_kcal),
    water_ml: Math.max(0, Math.round(summary.water_ml)),
    sleep_hours: Math.max(0, summary.sleep_hours),
    notes: summary.notes ?? null,
  };
}

export async function loadSupabaseDailySummaries(
  userId: string,
): Promise<DailySummary[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("daily_summary")
    .select(DAILY_SUMMARY_COLUMNS)
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as DailySummaryRow[]).map(fromRow);
}

export async function saveSupabaseDailySummary(
  userId: string,
  summary: DailySummary,
): Promise<DailySummary> {
  if (!isSupabaseConfigured()) return summary;

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("daily_summary")
    .upsert(toRow(userId, summary), { onConflict: "user_id,date" })
    .select(DAILY_SUMMARY_COLUMNS)
    .single();

  if (error) throw error;
  return fromRow(data as DailySummaryRow);
}
