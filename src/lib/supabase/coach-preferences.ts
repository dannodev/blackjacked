"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export type CoachFocusId =
  | "water"
  | "sleep"
  | "meals"
  | "no_fap"
  | "fitness_streak"
  | `exercise:${string}`;

export const DEFAULT_COACH_FOCUS: CoachFocusId[] = [
  "water",
  "meals",
  "fitness_streak",
];

export function normalizeCoachFocus(items: readonly string[]): CoachFocusId[] {
  const normalized = items.filter((item): item is CoachFocusId =>
    ["water", "sleep", "meals", "no_fap", "fitness_streak"].includes(item) ||
    /^exercise:[a-z0-9_-]{1,100}$/i.test(item),
  );
  return [...new Set(normalized)].slice(0, 5);
}

export async function loadCoachPreferences(userId: string) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabaseBrowser()
    .from("coach_preferences")
    .select("focus_items")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeCoachFocus(data.focus_items ?? []) : null;
}

export async function saveCoachPreferences(userId: string, focusItems: CoachFocusId[]) {
  const normalized = normalizeCoachFocus(focusItems);
  if (!isSupabaseConfigured()) return normalized;
  const { data, error } = await getSupabaseBrowser()
    .from("coach_preferences")
    .upsert({
      user_id: userId,
      focus_items: normalized,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("focus_items")
    .single();
  if (error) throw error;
  return normalizeCoachFocus(data.focus_items ?? []);
}

export function subscribeCoachPreferences(
  userId: string,
  onChange: (items: CoachFocusId[]) => void,
) {
  if (!isSupabaseConfigured()) return () => undefined;
  const supabase = getSupabaseBrowser();
  const channel = supabase
    .channel(`coach-preferences:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "coach_preferences",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as { focus_items?: string[] };
        if (row.focus_items) onChange(normalizeCoachFocus(row.focus_items));
      },
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
