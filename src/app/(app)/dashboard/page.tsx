"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { useTodayData, sortToday } from "@/lib/use-today-data";
import { computeDay, MEAL_LABELS, type Meal } from "@/lib/types";
import { DeficitRing } from "@/components/deficit-ring";
import { Card, CardContent } from "@/components/ui/card";
import { Bolt, Flame, Dumbbell } from "lucide-react";
import Link from "next/link";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function DashboardPage() {
  const profile = useStore((s) => s.profile)!;
  const streaks = useStore((s) => s.streaks);
  const { meals, exerciseLogs } = useTodayData();
  const day = computeDay(meals, exerciseLogs, profile);

  const sortedMeals = sortToday(meals) as Meal[];
  const sortedEx = sortToday(exerciseLogs);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* sticky daily header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          <h1 className="font-heading text-xl font-bold">Today</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--lime)]/10 px-3 py-1.5 text-sm text-[var(--lime)]">
          <Bolt className="size-4" />
          <span className="font-heading font-bold">{streaks.current_streak}</span>
          <span className="text-xs opacity-75">day streak</span>
        </div>
      </motion.div>

      {/* ring */}
      <motion.div variants={item} className="flex justify-center pt-2">
        <DeficitRing
          remaining={day.remaining_vs_goal}
          goal={profile.calorie_goal}
          inToday={day.kcal_in}
          outActivity={day.kcal_out_activity}
          tdee={day.tdee_kcal}
        />
      </motion.div>

      {/* deficit explainer */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              vs your target
            </p>
            <p className="font-heading text-2xl font-bold text-[var(--lime)]">
              {Math.round(day.goal_deficit).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile.calorie_goal.toLocaleString()} − in
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              real deficit
            </p>
            <p
              className={
                "font-heading text-2xl font-bold " +
                (day.real_deficit > 0
                  ? "text-[var(--lime)]"
                  : "text-[var(--over)]")
              }
            >
              {Math.round(day.real_deficit).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              out − in · biological
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* macros */}
      <motion.div variants={item}>
        <MacroBar label="Protein" value={day.p} goal={profile.protein_goal} />
        <MacroBar label="Carbs" value={day.c} goal={profile.carb_goal} />
        <MacroBar label="Fat" value={day.f} goal={profile.fat_goal} />
      </motion.div>

      {/* meals */}
      <motion.div variants={item}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Meals</h2>
          <Link
            href="/log?type=food"
            className="text-sm text-[var(--lime)] hover:underline"
          >
            Add
          </Link>
        </div>
        {sortedMeals.length === 0 ? (
          <EmptyCard
            icon={<Flame className="size-5" />}
            text="No meals logged yet. Add lunch to fill the ring."
            cta={{ href: "/log?type=food", label: "Log a meal" }}
          />
        ) : (
          <div className="space-y-2">
            {sortedMeals.map((m) => (
              <MealRow key={m.id} meal={m} />
            ))}
          </div>
        )}
      </motion.div>

      {/* exercises */}
      <motion.div variants={item}>
        <div className="mb-2 mt-6 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Workouts</h2>
          <Link
            href="/log?type=exercise"
            className="text-sm text-[var(--lime)] hover:underline"
          >
            Add
          </Link>
        </div>
        {sortedEx.length === 0 ? (
          <EmptyCard
            icon={<Dumbbell className="size-5" />}
            text="No workouts yet. Log a run or lift to add to your burn."
            cta={{ href: "/log?type=exercise", label: "Log a workout" }}
          />
        ) : (
          <div className="space-y-2">
            {sortedEx.map((e) => (
              <Card
                key={e.id}
                className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl"
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{e.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.duration_min} min
                      {e.distance_km ? ` · ${e.distance_km} km` : ""}
                      {e.sets ? ` · ${e.sets}×${e.reps} reps` : ""}
                    </p>
                  </div>
                  <span className="font-heading font-bold text-[var(--lime)]">
                    -{Math.round(e.kcal_burned)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function MacroBar({
  label,
  value,
  goal,
}: {
  label: string;
  value: number;
  goal: number;
}) {
  const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-heading">
          {Math.round(value)}/{goal}g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-[var(--lime)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
        />
      </div>
    </div>
  );
}

function MealRow({ meal }: { meal: Meal }) {
  return (
    <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="font-medium">{MEAL_LABELS[meal.type]}</p>
          <p className="text-xs text-muted-foreground">
            P {Math.round(meal.p)} · C {Math.round(meal.c)} · F {Math.round(meal.f)}
          </p>
        </div>
        <span className="font-heading font-bold">{meal.total_kcal}</span>
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
    <Card className="rounded-2xl border-dashed border-white/10 bg-card/40">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--lime)]/10 text-[var(--lime)]">
          {icon}
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
        <Link
          href={cta.href}
          className="rounded-full bg-[var(--lime)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
        >
          {cta.label}
        </Link>
      </CardContent>
    </Card>
  );
}