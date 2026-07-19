"use client";

import { useMemo, useState } from "react";
import { BrainCircuit, Check, Gauge, Settings2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { saveSupabaseProfile } from "@/lib/supabase/profile";
import { buildWeeklyCoachRecommendation, currentWeekStart } from "@/lib/weekly-coach";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackProductEvent } from "@/lib/product-analytics";
import { EXERCISES } from "@/lib/exercises-seed";
import {
  normalizeCoachFocus,
  saveCoachPreferences,
  type CoachFocusId,
} from "@/lib/supabase/coach-preferences";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function WeeklyCoachCard() {
  const { user } = useAuth();
  const profile = useStore((s) => s.profile)!;
  const weightLogs = useStore((s) => s.weightLogs);
  const summaries = useStore((s) => s.dailySummaries);
  const updateProfile = useStore((s) => s.updateProfile);
  const coachFocusItems = useStore((s) => s.coachFocusItems);
  const setCoachFocusItems = useStore((s) => s.setCoachFocusItems);
  const [saving, setSaving] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draftFocus, setDraftFocus] = useState<CoachFocusId[]>(coachFocusItems);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const recommendation = useMemo(
    () => buildWeeklyCoachRecommendation(profile, weightLogs, summaries),
    [profile, weightLogs, summaries],
  );

  async function record(status: "accepted" | "dismissed") {
    if (!user || !isSupabaseConfigured()) return;
    const { error } = await getSupabaseBrowser().from("coach_recommendations").upsert({
      user_id: user.id,
      week_start: currentWeekStart(),
      recommendation: recommendation.explanation,
      previous_calorie_goal: profile.calorie_goal,
      suggested_calorie_goal: recommendation.suggestedCalorieGoal,
      signals: { adherence: recommendation.adherence, weekly_weight_change_kg: recommendation.weeklyWeightChangeKg },
      status,
    }, { onConflict: "user_id,week_start" });
    if (error) throw error;
  }

  async function accept() {
    if (!recommendation.suggestedCalorieGoal) return;
    try {
      setSaving(true);
      const next = { ...profile, calorie_goal: recommendation.suggestedCalorieGoal };
      const saved = user ? await saveSupabaseProfile(user.id, next) : next;
      updateProfile({ calorie_goal: saved.calorie_goal });
      await record("accepted");
      trackProductEvent("coach_adjustment_accepted");
      toast.success(`Daily target updated to ${saved.calorie_goal} kcal`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply recommendation");
    } finally {
      setSaving(false);
    }
  }

  function openPreferences() {
    setDraftFocus(normalizeCoachFocus(coachFocusItems).filter((item) =>
      profile.sex === "male" || item !== "no_fap",
    ));
    setExerciseQuery("");
    setPreferencesOpen(true);
  }

  function toggleFocus(id: CoachFocusId) {
    setDraftFocus((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 5) {
        toast.info("Choose up to five priorities");
        return current;
      }
      return [...current, id];
    });
  }

  async function savePreferences() {
    try {
      setSaving(true);
      const safeDraft = normalizeCoachFocus(draftFocus).filter((item) =>
        profile.sex === "male" || item !== "no_fap",
      );
      const saved = user
        ? await saveCoachPreferences(user.id, safeDraft)
        : safeDraft;
      setCoachFocusItems(saved);
      setPreferencesOpen(false);
      toast.success("Coach priorities updated", {
        description: "Your Today view and reminders now use these priorities.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save coach priorities");
    } finally {
      setSaving(false);
    }
  }

  const baseOptions: { id: CoachFocusId; emoji: string; label: string; description: string }[] = [
    { id: "water", emoji: "💦", label: "Water", description: "Stay on top of hydration" },
    { id: "sleep", emoji: "🌙", label: "Sleep", description: "Log and protect recovery" },
    { id: "meals", emoji: "🍎", label: "Meals", description: "Remember planned meals" },
    { id: "fitness_streak", emoji: "🔥", label: "Fitness streak", description: "Keep daily momentum" },
    ...(profile.sex === "male"
      ? [{ id: "no_fap" as CoachFocusId, emoji: "🍌", label: "No fap challenge", description: "Protect your clean-day streak" }]
      : []),
  ];
  const matchingExercises = EXERCISES.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseQuery.trim().toLowerCase()),
  ).slice(0, 30);

  return <><Card className="premium-panel overflow-hidden rounded-[1.6rem] border-[var(--aqua)]/20">
    <CardContent className="py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--aqua)]/12 text-[var(--aqua)]"><BrainCircuit className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aqua)]">Weekly coach</p>
            <button type="button" onClick={openPreferences} className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground">
              <Settings2 className="size-3" /> Customize
            </button>
          </div>
          <h2 className="font-heading text-base font-extrabold">{recommendation.title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{recommendation.explanation}</p>
          {recommendation.suggestedCalorieGoal && <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.045] p-3">
            <div className="flex items-center gap-2"><Gauge className="size-4 text-[var(--rosso-light)]" /><span className="text-sm"><strong>{recommendation.suggestedCalorieGoal}</strong> kcal/day</span></div>
            <Button size="sm" disabled={saving} onClick={() => void accept()} className="bg-[var(--rosso)] text-white"><Check className="mr-1 size-3" />Apply</Button>
          </div>}
        </div>
      </div>
    </CardContent>
  </Card>
  <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-[1.6rem] border-white/10 bg-[#111] sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Choose your coach priorities</DialogTitle>
        <DialogDescription>Select up to five. Calories always remain visible in Today.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {baseOptions.map((option) => {
            const active = draftFocus.includes(option.id);
            return <button key={option.id} type="button" aria-pressed={active} onClick={() => toggleFocus(option.id)} className={`rounded-2xl border p-3 text-left transition-colors ${active ? "border-[var(--rosso)]/45 bg-[var(--rosso)]/12" : "border-white/8 bg-white/[0.035]"}`}>
              <div className="flex items-center justify-between"><span className="text-xl" aria-hidden>{option.emoji}</span>{active && <Check className="size-4 text-[var(--rosso-light)]" />}</div>
              <p className="mt-1 text-sm font-bold">{option.label}</p>
              <p className="text-[11px] text-muted-foreground">{option.description}</p>
            </button>;
          })}
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Specific exercises</p>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={exerciseQuery} onChange={(event) => setExerciseQuery(event.target.value)} placeholder="Search running, squats, yoga…" className="pl-9" /></div>
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
            {matchingExercises.map((exercise) => {
              const id = `exercise:${exercise.id}` as CoachFocusId;
              const active = draftFocus.includes(id);
              return <button key={exercise.id} type="button" aria-pressed={active} onClick={() => toggleFocus(id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${active ? "bg-[var(--rosso)]/12 text-[var(--rosso-light)]" : "hover:bg-white/[0.05]"}`}><span>{exercise.name}</span>{active && <Check className="size-4" />}</button>;
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
          <span className="text-xs text-muted-foreground">{draftFocus.length} / 5 selected</span>
          <Button disabled={saving} onClick={() => void savePreferences()} className="bg-[var(--rosso)] text-white">Save priorities</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog></>;
}
