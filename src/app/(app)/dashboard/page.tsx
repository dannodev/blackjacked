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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { loadMySquad, type SquadSnapshot } from "@/lib/supabase/squad";

export default function DashboardPage() {
  const { user } = useAuth();
  const profile = useStore((s) => s.profile)!;
  const streaks = useStore((s) => s.streaks);
  const waterToday = useStore((s) => s.waterToday);
  const sleepToday = useStore((s) => s.sleepToday);
  const setWater = useStore((s) => s.setWater);
  const setSleep = useStore((s) => s.setSleep);
  const upsertDailySummary = useStore((s) => s.upsertDailySummary);
  const customMenuMeals = useStore((s) => s.customMenuMeals);
  const useDefaultMenu = useStore((s) => s.useDefaultMenu);
  const favoriteExerciseIds = useStore((s) => s.favoriteExerciseIds);
  const { addMeal, deleteMeal } = useCloudMeals();
  const { addExerciseLog } = useCloudExerciseLogs();
  const [selectedMenuMeal, setSelectedMenuMeal] = useState<MenuMealOption | null>(null);
  const [squadSnapshot, setSquadSnapshot] = useState<SquadSnapshot | null>(null);
  const { meals, exerciseLogs } = useTodayData();
  const day = computeDay(meals, exerciseLogs, profile);

  const firstName = user?.name?.split(" ")[0] ?? "Athlete";

  const menuMeals = [
    ...(useDefaultMenu ? MENU_MEAL_PRESETS : []),
    ...customMenuMeals,
  ];
  const currentMealOptions = getCurrentMealOptions(
    profile.meal_schedule,
    new Date(),
    menuMeals,
  );
  const loggedMealNames = new Set(meals.flatMap((m) => m.items.map((i) => i.name)));
  const favoriteExercises = favoriteExerciseIds
    .map((id) => EXERCISES.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is Exercise => Boolean(exercise));

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
            <AvatarFallback className="bg-transparent text-sm font-extrabold text-[var(--rosso-light)]">
              {firstName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <h1 className="font-heading text-2xl font-extrabold">Hi, {firstName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--rosso)]/25 bg-[var(--rosso)]/12 px-3 py-1.5 text-sm text-[var(--rosso-light)]">
          <Flame className="size-4" />
          <span className="font-bold">{streaks.current_streak}</span>
        </div>
      </div>

      {/* hero stats card with ring */}
      <div className="dashboard-item">
        <Card className="premium-panel chart-grid relative overflow-hidden rounded-[2rem]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--rosso)]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[var(--ember)]/10 blur-3xl" />
          <CardContent className="relative py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">
                  Daily balance
                </p>
                <h2 className="font-heading text-2xl font-extrabold">Calories</h2>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/35">
                <div className="text-center">
                  <p className="font-heading text-sm font-extrabold leading-none text-white">
                    {Math.round((day.kcal_in / Math.max(1, profile.calorie_goal)) * 100)}%
                  </p>
                  <p className="text-[8px] uppercase text-muted-foreground">Goal</p>
                </div>
              </div>
            </div>

            <div className="mt-2 flex justify-center">
              <DeficitRing
                remaining={day.remaining_vs_goal}
                goal={profile.calorie_goal}
                inToday={day.kcal_in}
                outActivity={day.kcal_out_activity}
                tdee={day.tdee_kcal}
              />
            </div>

            {/* macro cards */}
            <div className="mt-5 grid grid-cols-4 gap-2">
              <MacroPill
                label="Calories"
                value={day.kcal_in}
                unit="kcal"
                goal={profile.calorie_goal}
                color="var(--rosso-light)"
              />
              <MacroPill
                label="Protein"
                value={day.p}
                unit="g"
                goal={profile.protein_goal}
                color="var(--ember)"
              />
              <MacroPill
                label="Carbs"
                value={day.c}
                unit="g"
                goal={profile.carb_goal}
                color="var(--aqua)"
              />
              <MacroPill
                label="Fat"
                value={day.f}
                unit="g"
                goal={profile.fat_goal}
                color="var(--violet)"
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
            const isLogged = loggedMealNames.has(m.name);
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
        {squadSnapshot && squadSnapshot.members.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {squadSnapshot.members.map((member) => {
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
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-2xl font-heading text-sm font-bold text-white"
                      style={{ background: member.color }}
                    >
                      {member.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{member.display_name}</p>
                      <p className="flex items-center gap-1 text-[11px] text-[var(--rosso-light)]">
                        <Flame className="size-3" />
                        {latestActivity?.streak ?? 0} streak
                      </p>
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
        <Card className="carbon-card rounded-[1.35rem] border-white/7">
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
        <Card className="carbon-card rounded-[1.35rem] border-white/7">
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
