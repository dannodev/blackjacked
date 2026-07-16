"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useTodayData, sortToday } from "@/lib/use-today-data";
import { useCloudMeals } from "@/lib/use-cloud-meals";
import { useCloudExerciseLogs } from "@/lib/use-cloud-exercise-logs";
import { computeDay, MEAL_LABELS, type Meal } from "@/lib/types";
import { getCurrentMealOptions, getNextMealToLog } from "@/lib/menu-meals";
import { makeId } from "@/lib/id";
import { DeficitRing } from "@/components/deficit-ring";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Dumbbell, Droplets, Moon, TrendingUp, Play, Utensils, Sparkles, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const profile = useStore((s) => s.profile)!;
  const streaks = useStore((s) => s.streaks);
  const waterToday = useStore((s) => s.waterToday);
  const sleepToday = useStore((s) => s.sleepToday);
  const setWater = useStore((s) => s.setWater);
  const setSleep = useStore((s) => s.setSleep);
  const { addMeal, deleteMeal } = useCloudMeals();
  const { deleteExerciseLog } = useCloudExerciseLogs();
  const { meals, exerciseLogs } = useTodayData();
  const day = computeDay(meals, exerciseLogs, profile);

  const sortedMeals = sortToday(meals) as Meal[];
  const sortedEx = sortToday(exerciseLogs);

  const firstName = user?.name?.split(" ")[0] ?? "Athlete";

  const recommendation = getNextMealToLog(
    day.remaining_vs_goal,
    profile.meal_schedule,
  );
  const currentMealOptions = getCurrentMealOptions(profile.meal_schedule);
  const loggedMealNames = new Set(meals.flatMap((m) => m.items.map((i) => i.name)));

  async function quickLogRecommendation() {
    if (!recommendation) return;
    await addMeal({
      id: makeId(),
      type: recommendation.type,
      loggedAt: new Date().toISOString(),
      total_kcal: recommendation.kcal,
      p: recommendation.protein_g,
      f: recommendation.fat_g,
      c: recommendation.carb_g,
      items: [{
        food_item_id: recommendation.id,
        name: recommendation.name,
        quantity: 1,
        unit: "serving",
        kcal: recommendation.kcal,
        protein_g: recommendation.protein_g,
        fat_g: recommendation.fat_g,
        carb_g: recommendation.carb_g,
      }],
    });
    toast.success(`${recommendation.name} logged`, {
      description: `${recommendation.kcal} kcal added`,
    });
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* daily header */}
      <motion.div variants={item} className="flex items-center justify-between pt-1">
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
      </motion.div>

      {/* hero stats card with ring */}
      <motion.div variants={item}>
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
      </motion.div>

      {/* today's recommendation */}
      {recommendation && !loggedMealNames.has(recommendation.name) && (
        <motion.div variants={item}>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--rosso-light)]" />
            <h2 className="font-heading text-sm font-bold">Recommended next meal</h2>
          </div>
          <Card className="carbon-card overflow-hidden rounded-[1.35rem] border-[var(--rosso)]/20">
            <CardContent className="flex items-center gap-3 py-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.055] text-2xl">
                {recommendation.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{recommendation.name}</p>
                <p className="truncate text-xs text-muted-foreground">{recommendation.description}</p>
                <p className="mt-0.5 text-xs">
                  <span className="font-bold text-[var(--rosso-light)]">{recommendation.kcal} kcal</span>
                  <span className="text-muted-foreground"> · P{recommendation.protein_g}g C{recommendation.carb_g}g F{recommendation.fat_g}g</span>
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={quickLogRecommendation}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--rosso)] text-white rosso-glow"
                aria-label="Log recommended meal"
              >
                <Check className="size-5" strokeWidth={2.5} />
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* current meal options */}
      <motion.div variants={item}>
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
            href="/log?type=food"
            className="text-xs font-semibold text-[var(--rosso-light)] hover:underline"
          >
            Log from menu
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {currentMealOptions.options.map((m) => {
            const isLogged = loggedMealNames.has(m.name);
            return (
              <Link
                key={m.id}
                href="/log?type=food"
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
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* next workout teaser */}
      <motion.div variants={item}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold">Next workout</h2>
          <Link
            href="/workouts"
            className="text-xs font-semibold text-[var(--rosso-light)] hover:underline"
          >
            View all
          </Link>
        </div>
        <Card className="carbon-card relative overflow-hidden rounded-[1.5rem] border-white/7">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Flame className="size-4 text-[var(--rosso-light)]" />
                <span className="text-xs text-muted-foreground">
                  {sortedEx[0]?.kcal_burned ?? 200} kcal burn
                </span>
              </div>
              <h3 className="text-base font-bold">
                {sortedEx[0]?.exercise_name ?? "Upper Strength"}
              </h3>
              <span className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] capitalize">
                {sortedEx[0]?.category ?? "Circuit"}
              </span>
            </div>
            <Link
              href="/workouts"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--rosso)] text-white rosso-glow"
            >
              <Play className="ml-0.5 size-5 fill-current" />
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* hydration + sleep */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
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
            <div className="mt-1.5 flex gap-1">
              {[250, 500, 1000].map((ml) => (
                <button
                  key={ml}
                  onClick={() => setWater(waterToday + ml)}
                  className="flex-1 rounded-full bg-white/[0.055] py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-[var(--rosso)]/10 hover:text-[var(--rosso-light)]"
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
                  onClick={() => setSleep(h)}
                  className="flex-1 rounded-full bg-white/[0.055] py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-[var(--rosso)]/10 hover:text-[var(--rosso-light)]"
                >
                  {h}h
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* recent meals */}
      <motion.div variants={item}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold">My meals</h2>
          <Link
            href="/log?type=food"
            className="text-xs font-semibold text-[var(--rosso-light)] hover:underline"
          >
            View meal plan
          </Link>
        </div>
        {sortedMeals.length === 0 ? (
          <EmptyCard
            icon={<Utensils className="size-5" />}
            text="No meals logged yet. Tap a menu recommendation to fill the ring."
            cta={{ href: "/log?type=food", label: "Log a meal" }}
          />
        ) : (
          <div className="space-y-2">
            {sortedMeals.map((m) => (
              <MealRow
                key={m.id}
                meal={m}
                onDelete={async () => {
                  await deleteMeal(m.id);
                  toast.success("Meal removed");
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* recent workouts */}
      <motion.div variants={item}>
        <div className="mb-2 mt-4 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold">Workouts</h2>
          <Link
            href="/workouts"
            className="text-xs font-semibold text-[var(--rosso-light)] hover:underline"
          >
            Add
          </Link>
        </div>
        {sortedEx.length === 0 ? (
          <EmptyCard
            icon={<Dumbbell className="size-5" />}
            text="No workouts yet. Log a run or lift to add to your burn."
            cta={{ href: "/workouts", label: "Log a workout" }}
          />
        ) : (
          <div className="space-y-2">
            {sortedEx.map((e) => (
              <Card key={e.id} className="carbon-card rounded-[1.35rem] border-white/7">
                <CardContent className="flex items-center justify-between gap-3 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
                      <Dumbbell className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{e.exercise_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.duration_min} min
                        {e.distance_km ? ` · ${e.distance_km} km` : ""}
                        {e.sets ? ` · ${e.sets}×${e.reps} reps` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-bold text-[var(--rosso-light)]">
                      -{Math.round(e.kcal_burned)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete ${e.exercise_name}`}
                      className="flex size-8 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-[var(--over)]/40 hover:text-[var(--over)]"
                      onClick={async () => {
                        await deleteExerciseLog(e.id);
                        toast.success("Workout removed");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
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
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
        />
      </div>
    </div>
  );
}

function MealRow({
  meal,
  onDelete,
}: {
  meal: Meal;
  onDelete: () => void;
}) {
  return (
    <Card className="carbon-card rounded-[1.35rem] border-white/7">
      <CardContent className="flex items-center justify-between py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">{MEAL_LABELS[meal.type]}</p>
            <p className="text-xs text-muted-foreground">
              P {Math.round(meal.p)} · C {Math.round(meal.c)} · F {Math.round(meal.f)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[var(--rosso-light)]">
          <span className="font-bold">{meal.total_kcal}</span>
          <button
            type="button"
            aria-label={`Delete ${MEAL_LABELS[meal.type]}`}
            className="flex size-8 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-[var(--over)]/40 hover:text-[var(--over)]"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyCard({
  icon,
  text,
  cta,
}: {
  icon: React.ReactNode;
  text: string;
  cta: { href: string; label: string };
}) {
  return (
    <Card className="rounded-[1.5rem] border-dashed border-white/10 bg-white/[0.035]">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
          {icon}
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
        <Link
          href={cta.href}
          className="rounded-full bg-[var(--rosso)] px-4 py-2 text-sm font-semibold text-white rosso-glow"
        >
          {cta.label}
        </Link>
      </CardContent>
    </Card>
  );
}
