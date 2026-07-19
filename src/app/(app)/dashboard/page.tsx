"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useTodayData } from "@/lib/use-today-data";
import { useCloudMeals } from "@/lib/use-cloud-meals";
import { useCloudExerciseLogs } from "@/lib/use-cloud-exercise-logs";
import {
  computeDay,
  dateKey,
  exerciseKcal,
  MEAL_LABELS,
  type Exercise,
  type ExerciseLog,
  type Meal,
} from "@/lib/types";
import {
  getCurrentMealOptions,
  MENU_MEAL_PRESETS,
  type MenuMealOption,
} from "@/lib/menu-meals";
import { CATEGORY_LABELS, EXERCISES } from "@/lib/exercises-seed";
import { makeId } from "@/lib/id";
import { DeficitRing } from "@/components/deficit-ring";
import { Card, CardContent } from "@/components/ui/card";
import {
  Flame,
  Droplets,
  Moon,
  Users,
  Check,
  Star,
  Target,
  Dumbbell,
  Utensils,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveSupabaseDailySummary } from "@/lib/supabase/daily-summary";
import { loadMySquad, subscribeToSquad, type SquadSnapshot } from "@/lib/supabase/squad";
import { t } from "@/lib/i18n";
import { WeeklyCoachCard } from "@/components/weekly-coach-card";
import type { CoachFocusId } from "@/lib/supabase/coach-preferences";

export default function DashboardPage() {
  const { user } = useAuth();
  const profile = useStore((s) => s.profile)!;
  const streaks = useStore((s) => s.streaks);
  const noMasturbationStreaks = useStore((s) => s.noMasturbationStreaks);
  const logNoMasturbationDay = useStore((s) => s.logNoMasturbationDay);
  const language = useStore((s) => s.language);
  const waterToday = useStore((s) => s.waterToday);
  const sleepToday = useStore((s) => s.sleepToday);
  const setWater = useStore((s) => s.setWater);
  const setSleep = useStore((s) => s.setSleep);
  const upsertDailySummary = useStore((s) => s.upsertDailySummary);
  const customMenuMeals = useStore((s) => s.customMenuMeals);
  const useDefaultMenu = useStore((s) => s.useDefaultMenu);
  const favoriteExerciseIds = useStore((s) => s.favoriteExerciseIds);
  const coachFocusItems = useStore((s) => s.coachFocusItems);
  const { addMeal, deleteMeal } = useCloudMeals();
  const { addExerciseLog } = useCloudExerciseLogs();
  const [selectedMenuMeal, setSelectedMenuMeal] = useState<MenuMealOption | null>(null);
  const [confirmNoFapOpen, setConfirmNoFapOpen] = useState(false);
  const [squadSnapshot, setSquadSnapshot] = useState<SquadSnapshot | null>(null);
  const [calorieDetailsOpen, setCalorieDetailsOpen] = useState(false);
  const { meals, exerciseLogs } = useTodayData();
  const day = computeDay(meals, exerciseLogs, profile);
  const today = dateKey(new Date());
  const noMasturbationLoggedToday =
    noMasturbationStreaks.last_logged_date === today;

  const firstName = user?.name?.split(" ")[0] ?? "Athlete";

  const menuMeals = [
    ...(useDefaultMenu ? MENU_MEAL_PRESETS : []),
    ...customMenuMeals,
  ];
  const currentMealWindow = getCurrentMealOptions(
    profile.meal_schedule,
    new Date(),
    menuMeals,
    language,
  );
  const seenMealNames = new Set<string>();
  const currentMealOptions = {
    ...currentMealWindow,
    options: currentMealWindow.options.filter((option) => {
      const key = option.name.trim().toLowerCase();
      if (seenMealNames.has(key)) return false;
      seenMealNames.add(key);
      return true;
    }),
  };
  const loggedMealIds = new Set(
    meals.flatMap((meal) => meal.items.map((item) => item.food_item_id)),
  );
  const loggedMealNames = new Set(meals.flatMap((m) => m.items.map((i) => i.name)));
  const favoriteExercises = favoriteExerciseIds
    .map((id) => EXERCISES.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is Exercise => Boolean(exercise));
  const visibleCoachFocus = coachFocusItems.filter((item) =>
    profile.sex === "male" || item !== "no_fap",
  ).slice(0, 5);

  useEffect(() => {
    let cancelled = false;
    loadMySquad()
      .then((snapshot) => {
        if (!cancelled) setSquadSnapshot(snapshot);
      })
      .catch(() => {
        if (!cancelled) setSquadSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!squadSnapshot?.squad.id) return;
    return subscribeToSquad(squadSnapshot.squad.id, () => {
      loadMySquad().then(setSquadSnapshot).catch(() => undefined);
    });
  }, [squadSnapshot?.squad.id]);

  async function logMenuMeal(menuMeal: MenuMealOption) {
    await addMeal({
      id: makeId(),
      type: menuMeal.type,
      loggedAt: new Date().toISOString(),
      total_kcal: menuMeal.kcal,
      p: menuMeal.protein_g,
      f: menuMeal.fat_g,
      c: menuMeal.carb_g,
      items: [{
        food_item_id: menuMeal.id,
        name: menuMeal.name,
        quantity: 1,
        unit: "serving",
        kcal: menuMeal.kcal,
        protein_g: menuMeal.protein_g,
        fat_g: menuMeal.fat_g,
        carb_g: menuMeal.carb_g,
      }],
    });
    toast.success(`${menuMeal.name} logged`, {
      description: `${menuMeal.kcal} kcal added`,
    });
    setSelectedMenuMeal(null);
  }

  async function quickLogExercise(exercise: Exercise) {
    const isTimedOnly = Boolean(exercise.timed_only || exercise.fixed_kcal_per_25_min);
    const isStrength =
      !isTimedOnly &&
      ["gym", "core", "calisthenics"].includes(exercise.category);
    const duration = exercise.fixed_kcal_per_25_min ? 25 : 30;
    const kcal = exerciseKcal(exercise, profile.current_weight_kg, duration);

    await addExerciseLog({
      id: makeId(),
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category,
      mets: exercise.mets,
      duration_min: duration,
      sets: isStrength ? 3 : undefined,
      reps: isStrength ? 10 : undefined,
      kcal_burned: kcal,
      loggedAt: new Date().toISOString(),
    });
    toast.success(`${exercise.name} logged`, {
      description: `~${Math.round(kcal)} kcal burned`,
    });
  }

  async function saveWellness(nextWater: number, nextSleep: number) {
    const date = dateKey(new Date());
    const summary = {
      date,
      kcal_in: day.kcal_in,
      kcal_out_activity: day.kcal_out_activity,
      bmr_kcal: day.bmr_kcal,
      tdee_kcal: day.tdee_kcal,
      deficit_kcal: day.goal_deficit,
      real_deficit_kcal: day.real_deficit,
      water_ml: nextWater,
      sleep_hours: nextSleep,
      notes: undefined,
    };
    upsertDailySummary(summary);
    if (user) {
      try {
        await saveSupabaseDailySummary(user.id, summary);
      } catch {
        toast.info("Saved locally", {
          description: "Wellness sync will catch up when Supabase is available.",
        });
      }
    }
  }

  function updateWater(nextWater: number) {
    const safeWater = Math.max(0, nextWater);
    setWater(safeWater);
    void saveWellness(safeWater, sleepToday);
  }

  function updateSleep(nextSleep: number) {
    setSleep(nextSleep);
    void saveWellness(waterToday, nextSleep);
  }

  return (
    <div className="dashboard-stagger space-y-5">
      {/* daily header */}
      <div className="dashboard-item flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 border border-white/10 bg-[var(--rosso)]/12 shadow-[0_0_26px_rgba(244,63,63,0.12)]">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={`${firstName} profile`} />}
            <AvatarFallback className="bg-transparent text-sm font-extrabold text-[var(--rosso-light)]">
              {firstName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {new Date().toLocaleDateString(language === "es" ? "es-MX" : undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <h1 className="font-heading text-2xl font-extrabold">Hi, {firstName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--rosso)]/25 bg-[var(--rosso)]/12 px-3 py-1.5 text-sm text-[var(--rosso-light)]">
            <Flame className="size-4" />
            <span className="font-bold">{streaks.current_streak}</span>
          </div>
          {profile.sex === "male" && (
            <button
              type="button"
              disabled={noMasturbationLoggedToday}
              onClick={() => setConfirmNoFapOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-sm text-cyan-100 disabled:opacity-70"
              aria-label={t(language, "Log no-fap streak day")}
            >
              <span aria-hidden className="text-base leading-none">🍌</span>
              <span className="font-bold">{noMasturbationStreaks.current_streak}</span>
            </button>
          )}
        </div>
      </div>

      <Dialog open={confirmNoFapOpen} onOpenChange={setConfirmNoFapOpen}>
        <DialogContent className="rounded-[1.6rem] border-white/10 bg-[#111]">
          <DialogHeader>
            <DialogTitle>{t(language, "Did you complete the No fap challenge today?")}</DialogTitle>
            <DialogDescription>
              {t(language, "Be honest. Consistency only works when the check-in is real.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setConfirmNoFapOpen(false)}>
              {t(language, "Not today")}
            </Button>
            <Button
              className="bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
              onClick={() => {
                logNoMasturbationDay();
                setConfirmNoFapOpen(false);
                toast.success(t(language, "No-fap streak logged"), {
                  description: t(language, "Challenge day registered."),
                });
              }}
            >
              {t(language, "Yes, log it")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* personalized today priorities */}
      <div className="dashboard-item">
        <Card id="today-priorities" className="premium-panel chart-grid relative scroll-mt-24 overflow-hidden rounded-[2rem]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--rosso)]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[var(--ember)]/10 blur-3xl" />
          <CardContent className="relative space-y-2 py-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">
                  Today priorities
                </p>
                <h2 className="font-heading text-2xl font-extrabold">Your daily focus</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-center">
                <p className="font-heading text-sm font-extrabold leading-none text-white">{Math.round((day.kcal_in / Math.max(1, profile.calorie_goal)) * 100)}%</p>
                <p className="mt-1 text-[8px] uppercase text-muted-foreground">Calories</p>
              </div>
            </div>
            <TodayPriorityRow emoji="⚡" label="Calories" value={`${Math.round(day.kcal_in).toLocaleString()} / ${profile.calorie_goal.toLocaleString()} kcal`} onClick={() => setCalorieDetailsOpen((open) => !open)} />
            {visibleCoachFocus.map((focus) => {
              const row = coachFocusRow(focus, {
                waterToday,
                sleepToday,
                mealCount: meals.length,
                streak: streaks.current_streak,
                noFapStreak: noMasturbationStreaks.current_streak,
                exerciseLogs,
              });
              if (!row) return null;
              return <TodayPriorityRow key={focus} {...row} onClick={focus === "no_fap" ? () => setConfirmNoFapOpen(true) : undefined} />;
            })}
            {calorieDetailsOpen && <div id="daily-details" className="mt-4 border-t border-white/8 pt-4">
              <div className="flex justify-center"><DeficitRing remaining={day.remaining_vs_goal} goal={profile.calorie_goal} inToday={day.kcal_in} outActivity={day.kcal_out_activity} tdee={day.tdee_kcal} /></div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <MacroPill label="Calories" value={day.kcal_in} unit="kcal" goal={profile.calorie_goal} color="var(--rosso-light)" />
                <MacroPill label="Protein" value={day.p} unit="g" goal={profile.protein_goal} color="var(--ember)" />
                <MacroPill label="Carbs" value={day.c} unit="g" goal={profile.carb_goal} color="var(--aqua)" />
                <MacroPill label="Fat" value={day.f} unit="g" goal={profile.fat_goal} color="var(--violet)" />
              </div>
              <Link href="/stats" className="mt-3 block text-center text-xs font-semibold text-[var(--rosso-light)]">Open complete trends and history</Link>
            </div>}
          </CardContent>
        </Card>
      </div>

      <div className="dashboard-item"><WeeklyCoachCard /></div>

      {/* current meal options */}
      <div className="dashboard-item">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sm font-bold">
              {currentMealOptions.label} options
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Based on your {currentMealOptions.time} meal time
            </p>
          </div>
          <Link
            href="/log"
            className="text-xs font-semibold text-[var(--rosso-light)] hover:underline"
          >
            Your Menu
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {currentMealOptions.options.map((m) => {
              const isLogged = loggedMealIds.has(m.id) || loggedMealNames.has(m.name);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMenuMeal(m)}
                className={`flex w-30 shrink-0 flex-col gap-1 rounded-[1.25rem] border p-3 transition-all ${
                  isLogged
                    ? "border-[var(--rosso)]/30 bg-[var(--rosso)]/10"
                    : "border-white/7 bg-white/[0.045]"
                }`}
              >
                <div className="text-lg">{m.emoji}</div>
                <p className="text-[11px] font-semibold leading-tight">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">{m.kcal} kcal</p>
                {isLogged && <Check className="size-3 text-[var(--rosso-light)]" />}
              </button>
            );
          })}
          {currentMealOptions.options.length === 0 && (
            <Link
              href="/menu"
              className="flex min-h-24 w-full items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.035] px-4 text-center text-xs text-muted-foreground"
            >
              No meals for this time yet. Add meals to Your Menu.
            </Link>
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(selectedMenuMeal)}
        onOpenChange={(open) => {
          if (!open) setSelectedMenuMeal(null);
        }}
      >
        <DialogContent className="rounded-[1.6rem] border-white/10 bg-[#111]">
          {selectedMenuMeal && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMenuMeal.name}</DialogTitle>
                <DialogDescription>
                  {selectedMenuMeal.meal_slot} · {selectedMenuMeal.kcal} kcal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <p className="rounded-2xl border border-white/7 bg-white/[0.045] p-3 text-sm">
                  {selectedMenuMeal.description}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <MacroBox label="Protein" value={`${selectedMenuMeal.protein_g}g`} />
                  <MacroBox label="Carbs" value={`${selectedMenuMeal.carb_g}g`} />
                  <MacroBox label="Fat" value={`${selectedMenuMeal.fat_g}g`} />
                </div>
                <Button
                  className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
                  onClick={() => void logMenuMeal(selectedMenuMeal)}
                >
                  Log this meal
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* logged meals */}
      <div className="dashboard-item">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold">Logged meals</h2>
          <Link
            href="/log"
            className="text-xs font-semibold text-[var(--rosso-light)] hover:underline"
          >
            Add meal
          </Link>
        </div>
        {meals.length === 0 ? (
          <Card className="rounded-[1.35rem] border-dashed border-white/10 bg-white/[0.035]">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
                <Utensils className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold">No meals logged yet</p>
                <p className="text-xs text-muted-foreground">
                  Tap a meal option above or use Log.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {[...meals]
              .sort((a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt))
              .map((meal) => (
                <LoggedMealRow
                  key={meal.id}
                  meal={meal}
                  onDelete={async () => {
                    await deleteMeal(meal.id);
                    toast.success("Meal removed");
                  }}
                />
              ))}
          </div>
        )}
      </div>

      {/* squad shortcut */}
      <div className="dashboard-item">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold">Squad pulse</h2>
          <Link
            href="/squad"
            className="text-xs font-semibold text-[var(--rosso-light)] hover:underline"
          >
            Open squad
          </Link>
        </div>
        {squadSnapshot &&
        squadSnapshot.members.some((member) => member.user_id !== user?.id) ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {squadSnapshot.members
              .filter((member) => member.user_id !== user?.id)
              .map((member) => {
              const latestActivity = [...squadSnapshot.activity]
                .filter((activity) => activity.user_id === member.user_id)
                .sort((a, b) => b.date.localeCompare(a.date))[0];
              return (
                <Link
                  key={member.user_id}
                  href="/squad"
                  className="flex w-44 shrink-0 flex-col gap-2 rounded-[1.35rem] border border-white/7 bg-white/[0.045] p-3"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="size-9 shrink-0 rounded-2xl border border-white/10" style={{ background: member.color }}>
                      {member.avatar_url && <AvatarImage src={member.avatar_url} alt={`${member.display_name} profile`} />}
                      <AvatarFallback className="rounded-2xl bg-transparent font-heading text-sm font-bold text-white">{member.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        <span
                          className={
                            "mr-1.5 inline-block size-2 rounded-full align-middle " +
                            (isSquadMemberOnline(member.last_seen_at)
                              ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]"
                              : "bg-zinc-500")
                          }
                        />
                        {member.display_name}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-[var(--rosso-light)]">
                        <Flame className="size-3" />
                        {latestActivity?.streak ?? 0} streak
                      </p>
                      {profile.sex === "male" && <p className="flex items-center gap-1 text-[11px] text-cyan-200"><span aria-hidden>🍌</span>{latestActivity?.no_masturbation_streak ?? 0} No fap</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
                    <SquadMiniStat
                      icon={<Target className="size-3" />}
                      value={`${Math.round(latestActivity?.goal_progress_pct ?? 0)}%`}
                      label="goal"
                    />
                    <SquadMiniStat
                      icon={<Dumbbell className="size-3" />}
                      value={latestActivity?.exercise_done ? "done" : "pending"}
                      label="workout"
                    />
                    <SquadMiniStat
                      icon={<Utensils className="size-3" />}
                      value={`${latestActivity?.meals_count ?? 0}`}
                      label="meals"
                    />
                    <SquadMiniStat
                      icon={<Flame className="size-3" />}
                      value={`${(latestActivity?.goal_delta_kg ?? 0).toFixed(1)}kg`}
                      label="progress"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-[1.5rem] border-dashed border-white/10 bg-white/[0.035]">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
                <Users className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">No squad yet</p>
                <p className="text-xs text-muted-foreground">
                  Join a squad to see friends here.
                </p>
              </div>
              <Link
                href="/squad"
                className="rounded-full bg-[var(--rosso)] px-3 py-2 text-xs font-semibold text-white"
              >
                Squad
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* next workout teaser */}
      <div className="dashboard-item">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold">Next workout</h2>
          <Link
            href="/workouts"
            className="text-xs font-semibold text-[var(--rosso-light)] hover:underline"
          >
            Star exercises
          </Link>
        </div>
        {favoriteExercises.length === 0 ? (
          <Card className="rounded-[1.5rem] border-dashed border-white/10 bg-white/[0.035]">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--amber)]/12 text-[var(--amber)]">
                <Star className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">No favorite workouts yet</p>
                <p className="text-xs text-muted-foreground">
                  Star exercises in Workouts and they will show up here.
                </p>
              </div>
              <Link
                href="/workouts"
                className="rounded-full bg-[var(--rosso)] px-3 py-2 text-xs font-semibold text-white"
              >
                Add
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favoriteExercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => void quickLogExercise(exercise)}
                className="flex w-40 shrink-0 flex-col gap-2 rounded-[1.35rem] border border-[var(--amber)]/25 bg-[var(--amber)]/10 p-3 text-left transition-colors hover:bg-[var(--amber)]/15"
              >
                <div className="flex items-center justify-between gap-2">
                  <Star className="size-4 fill-[var(--amber)] text-[var(--amber)]" />
                  <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Log
                  </span>
                </div>
                <div>
                  <p className="line-clamp-2 text-sm font-bold leading-tight">
                    {exercise.name}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {CATEGORY_LABELS[exercise.category]} · ~
                    {Math.round(
                      exerciseKcal(
                        exercise,
                        profile.current_weight_kg,
                        exercise.fixed_kcal_per_25_min ? 25 : 30,
                      ),
                    )} kcal
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* hydration + sleep */}
      <div className="dashboard-item grid grid-cols-2 gap-3">
        <Card id="hydration" tabIndex={-1} className="carbon-card scroll-mt-24 rounded-[1.35rem] border-white/7 target:ring-2 target:ring-[var(--aqua)]/60">
          <CardContent className="py-3.5">
            <div className="mb-1.5 flex items-center gap-2">
              <Droplets className="size-4 text-[var(--aqua)]" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Water</span>
            </div>
            <p className="text-lg font-bold">
              {(waterToday / 1000).toFixed(1)}
              <span className="text-xs text-muted-foreground">L</span>
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <button
                onClick={() => updateWater(waterToday - 250)}
                className="rounded-full bg-white/[0.055] py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-[var(--over)]/10 hover:text-[var(--over)]"
              >
                -250ml
              </button>
              {[250, 500, 1000].map((ml) => (
                <button
                  key={ml}
                  onClick={() => updateWater(waterToday + ml)}
                  className="rounded-full bg-white/[0.055] py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-[var(--rosso)]/10 hover:text-[var(--rosso-light)]"
                >
                  +{ml >= 1000 ? "1L" : `${ml}ml`}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card id="sleep" tabIndex={-1} className="carbon-card scroll-mt-24 rounded-[1.35rem] border-white/7 target:ring-2 target:ring-[var(--violet)]/60">
          <CardContent className="py-3.5">
            <div className="mb-1.5 flex items-center gap-2">
              <Moon className="size-4 text-[var(--violet)]" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sleep</span>
            </div>
            <p className="text-lg font-bold">
              {sleepToday.toFixed(1)}
              <span className="text-xs text-muted-foreground">h</span>
            </p>
            <div className="mt-1.5 flex gap-1">
              {[6, 7, 8].map((h) => (
                <button
                  key={h}
                  onClick={() => updateSleep(h)}
                  className="flex-1 rounded-full bg-white/[0.055] py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-[var(--rosso)]/10 hover:text-[var(--rosso-light)]"
                >
                  {h}h
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type TodayPriority = {
  emoji: string;
  label: string;
  value: string;
  href?: string;
  onClick?: () => void;
};

function TodayPriorityRow({ emoji, label, value, href, onClick }: TodayPriority) {
  const content = <>
    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--rosso)]/10 text-xl" aria-hidden>{emoji}</span>
    <span className="min-w-0 flex-1 text-left"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span><span className="block truncate font-heading text-base font-extrabold">{value}</span></span>
    <span className="text-lg text-[var(--rosso-light)]" aria-hidden>›</span>
  </>;
  const className = "flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/7 bg-black/25 px-3 py-2 transition-colors hover:bg-white/[0.055]";
  if (href) return <Link href={href} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}

function coachFocusRow(
  focus: CoachFocusId,
  data: {
    waterToday: number;
    sleepToday: number;
    mealCount: number;
    streak: number;
    noFapStreak: number;
    exerciseLogs: ExerciseLog[];
  },
): TodayPriority | null {
  if (focus === "water") return { emoji: "💦", label: "Water", value: `${(data.waterToday / 1000).toFixed(1)} / 2.0 L`, href: "/dashboard#hydration" };
  if (focus === "sleep") return { emoji: "🌙", label: "Sleep", value: `${data.sleepToday.toFixed(1)} / 8 hours`, href: "/dashboard#sleep" };
  if (focus === "meals") return { emoji: "🍎", label: "Meals", value: `${data.mealCount} logged today`, href: "/log" };
  if (focus === "fitness_streak") return { emoji: "🔥", label: "Fitness streak", value: `${data.streak} day${data.streak === 1 ? "" : "s"}`, href: "/workouts" };
  if (focus === "no_fap") return { emoji: "🍌", label: "No fap challenge", value: `${data.noFapStreak} day${data.noFapStreak === 1 ? "" : "s"} clean` };
  const exerciseId = focus.slice("exercise:".length);
  const exercise = EXERCISES.find((item) => item.id === exerciseId);
  if (!exercise) return null;
  const completed = data.exerciseLogs.some((log) => log.exercise_id === exerciseId);
  return { emoji: "🏃", label: exercise.name, value: completed ? "Done today" : "Not logged yet", href: `/workouts?exercise=${encodeURIComponent(exerciseId)}` };
}

function MacroPill({
  label,
  value,
  unit,
  goal,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  goal: number;
  color: string;
}) {
  const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  return (
    <div className="rounded-2xl border border-white/7 bg-black/30 p-2.5">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-heading text-base font-extrabold" style={{ color }}>
        {Math.round(value)}
        <span className="ml-0.5 text-[9px] text-muted-foreground">{unit}</span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="macro-progress h-full rounded-full"
          style={{ background: color, width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MacroBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/7 bg-white/[0.045] px-2 py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-heading text-sm font-bold text-[var(--rosso-light)]">
        {value}
      </p>
    </div>
  );
}

function LoggedMealRow({
  meal,
  onDelete,
}: {
  meal: Meal;
  onDelete: () => void | Promise<void>;
}) {
  const title = meal.items[0]?.name ?? MEAL_LABELS[meal.type];
  return (
    <Card className="rounded-[1.25rem] border-white/7 bg-white/[0.045]">
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {MEAL_LABELS[meal.type]} · P {Math.round(meal.p)} · C{" "}
            {Math.round(meal.c)} · F {Math.round(meal.f)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-heading text-sm font-bold text-[var(--rosso-light)]">
            {Math.round(meal.total_kcal)}
          </span>
          <button
            type="button"
            aria-label={`Remove ${title}`}
            className="flex size-8 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-[var(--over)]/40 hover:text-[var(--over)]"
            onClick={() => void onDelete()}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function SquadMiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-black/25 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[var(--rosso-light)]">
        {icon}
        <span className="font-bold text-foreground">{value}</span>
      </div>
      <p>{label}</p>
    </div>
  );
}

function isSquadMemberOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}
