"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { computeDay, dateKey, normalizeGoal } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Droplets, Moon, Scale, Target, TrendingDown } from "lucide-react";

type StatsRange = "week" | "month" | "year" | "all";

const RANGE_LABELS: Record<StatsRange, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  all: "All time",
};

const WeightTrendChart = dynamic(
  () => import("./stats-charts").then((mod) => mod.WeightTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height="h-[200px]" /> },
);

const DeficitChart = dynamic(
  () => import("./stats-charts").then((mod) => mod.DeficitChart),
  { ssr: false, loading: () => <ChartSkeleton height="h-[220px]" /> },
);

const WellnessChart = dynamic(
  () => import("./stats-charts").then((mod) => mod.WellnessChart),
  { ssr: false, loading: () => <ChartSkeleton height="h-[220px]" /> },
);

export default function StatsPage() {
  const [range, setRange] = useState<StatsRange>("week");
  const profile = useStore((s) => s.profile)!;
  const weightLogs = useStore((s) => s.weightLogs);
  const meals = useStore((s) => s.meals);
  const exerciseLogs = useStore((s) => s.exerciseLogs);
  const dailySummaries = useStore((s) => s.dailySummaries);

  const dateWindow = useMemo(() => getDateWindow(range), [range]);

  const weightData = useMemo(
    () =>
      [...weightLogs]
        .filter((w) => isInDateWindow(w.loggedAt.slice(0, 10), dateWindow))
        .sort((a, b) => +new Date(a.loggedAt) - +new Date(b.loggedAt))
        .map((w) => ({
          date: new Date(w.loggedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          weight: w.weight_kg,
        })),
    [dateWindow, weightLogs],
  );

  const deficitData = useMemo(() => {
    const mealsByDate = new Map<string, typeof meals>();
    const exerciseByDate = new Map<string, typeof exerciseLogs>();
    const summaryByDate = new Map(dailySummaries.map((summary) => [summary.date, summary]));

    for (const meal of meals) {
      const key = meal.loggedAt.slice(0, 10);
      const current = mealsByDate.get(key);
      if (current) current.push(meal);
      else mealsByDate.set(key, [meal]);
    }

    for (const exercise of exerciseLogs) {
      const key = exercise.loggedAt.slice(0, 10);
      const current = exerciseByDate.get(key);
      if (current) current.push(exercise);
      else exerciseByDate.set(key, [exercise]);
    }

    const keys = new Set<string>();
    for (const key of summaryByDate.keys()) {
      if (isInDateWindow(key, dateWindow)) keys.add(key);
    }
    for (const meal of meals) keys.add(meal.loggedAt.slice(0, 10));
    for (const exercise of exerciseLogs) keys.add(exercise.loggedAt.slice(0, 10));
    for (const key of [...keys]) {
      if (!isInDateWindow(key, dateWindow)) keys.delete(key);
    }

    if (keys.size === 0) {
      for (const key of fallbackDateKeys(dateWindow, range)) keys.add(key);
    }

    return [...keys].sort().map((key) => {
      const summary = summaryByDate.get(key);
      const d = new Date(`${key}T12:00:00`);
      const dayMeals = mealsByDate.get(key) ?? [];
      const dayEx = exerciseByDate.get(key) ?? [];
      const day = computeDay(dayMeals, dayEx, profile, d);
      return {
        date: key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        goal_deficit: Math.round(summary?.deficit_kcal ?? day.goal_deficit),
        real_deficit: Math.round(summary?.real_deficit_kcal ?? day.real_deficit),
        kcal_in: Math.round(summary?.kcal_in ?? day.kcal_in),
      };
    });
  }, [dailySummaries, dateWindow, exerciseLogs, meals, profile, range]);

  const waterGoalMl = recommendedWaterMl(profile.current_weight_kg);
  const sleepGoalHours = recommendedSleepHours(profile);
  const goal = normalizeGoal(profile);
  const wellnessData = useMemo(() => {
    const summaryByDate = new Map(dailySummaries.map((summary) => [summary.date, summary]));
    const keys = new Set<string>();
    for (const key of summaryByDate.keys()) {
      if (isInDateWindow(key, dateWindow)) keys.add(key);
    }

    if (keys.size === 0) {
      for (const key of fallbackDateKeys(dateWindow, range)) keys.add(key);
    }

    const days: {
      date: string;
      label: string;
      water_l: number;
      water_goal_l: number;
      sleep_hours: number;
      sleep_goal_hours: number;
    }[] = [];

    for (const key of [...keys].sort()) {
      const d = new Date(`${key}T12:00:00`);
      const summary = summaryByDate.get(key);
      days.push({
        date: key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        water_l: +((summary?.water_ml ?? 0) / 1000).toFixed(2),
        water_goal_l: +(waterGoalMl / 1000).toFixed(2),
        sleep_hours: +(summary?.sleep_hours ?? 0).toFixed(1),
        sleep_goal_hours: sleepGoalHours,
      });
    }

    return days;
  }, [dailySummaries, dateWindow, range, sleepGoalHours, waterGoalMl]);

  const weightChange = weightData.length > 1
    ? +(weightData[weightData.length - 1].weight - weightData[0].weight).toFixed(1)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-extrabold">Stats</h1>
            <p className="text-sm font-medium text-muted-foreground">
              Deficit, check-ins, water, and sleep history
            </p>
          </div>
          <RangeMenu value={range} onChange={setRange} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Week view uses ISO weeks: Monday to Sunday.
        </p>
      </div>

      {/* deficit overlay */}
      <Card className="premium-panel chart-grid rounded-[1.6rem]">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-base">
            <TrendingDown className="size-4 text-[var(--rosso-light)]" />
            Deficit / calories history
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <DeficitChart data={deficitData} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <Legend color="var(--rosso)" label="Goal deficit (bar)" />
            <Legend color="var(--amber)" label="Real deficit (line)" />
            <Legend color="var(--over)" label="kcal in (dotted)" />
          </div>
        </CardContent>
      </Card>

      {/* weight trend */}
      <Card className="premium-panel chart-grid rounded-[1.6rem]">
        <CardHeader>
          <CardTitle className="font-heading flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Scale className="size-4 text-[var(--rosso-light)]" />
              Weight trend + goal
            </span>
            {weightChange !== 0 && (
              <span
                className={
                  "text-sm font-bold " +
                  (weightChange < 0 ? "text-[var(--rosso-light)]" : "text-[var(--amber)]")
                }
              >
                {weightChange > 0 ? "+" : ""}
                {weightChange} kg
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="mb-4 rounded-2xl border border-white/7 bg-black/25 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Target className="size-4 shrink-0 text-[var(--rosso-light)]" />
                <div className="min-w-0">
                  <p className="text-sm font-bold capitalize">
                    {goal.mode} goal
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {goalMessage(goal.mode)}
                  </p>
                </div>
              </div>
              <p className="font-heading text-xl font-black text-[var(--rosso-light)]">
                {Math.round(goal.progress)}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--rosso)] transition-all"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Progress: {goal.currentDelta.toFixed(1)}kg of{" "}
              {goal.targetDelta.toFixed(1)}kg target.{" "}
              {goal.targetDate ? `Target date: ${goal.targetDate}.` : ""}
            </p>
          </div>
          {weightData.length === 0 ? (
            <EmptyChart text="Log a check-in to see your trend" />
          ) : (
            <WeightTrendChart data={weightData} />
          )}
        </CardContent>
      </Card>

      {/* progress photos */}
      <Card className="carbon-card rounded-[1.6rem] border-white/7">
        <CardHeader>
          <CardTitle className="font-heading flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Camera className="size-4 text-[var(--rosso-light)]" />
              Progress photos
            </span>
            <Link
              href="/checkin"
              className="rounded-full bg-[var(--rosso)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--rosso)]/90"
            >
              Check in
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {weightLogs.filter((w) => w.photo_url).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No photos yet. Add one during your next check-in.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[...weightLogs]
                .reverse()
                .filter((w) => w.photo_url)
                .map((w) => (
                  <div key={w.id} className="relative shrink-0 h-32 w-32">
                    <Image
                      src={w.photo_url!}
                      alt="Progress"
                      fill
                      className="rounded-[1.25rem] object-cover"
                    />
                    <p className="mt-1 text-center text-xs text-muted-foreground">
                      {new Date(w.loggedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* hydration + sleep */}
      <Card className="premium-panel chart-grid rounded-[1.6rem]">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-base">
            <Droplets className="size-4 text-[var(--aqua)]" />
            Water + sleep history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 py-2">
          <WellnessChart data={wellnessData} />
          <div className="grid grid-cols-2 gap-3">
            <RecommendationCard
              icon={<Droplets className="size-4 text-[var(--aqua)]" />}
              label="Water goal"
              value={`${(waterGoalMl / 1000).toFixed(1)}L/day`}
              text={waterRecommendation(wellnessData, waterGoalMl)}
            />
            <RecommendationCard
              icon={<Moon className="size-4 text-[var(--violet)]" />}
              label="Sleep goal"
              value={`${sleepGoalHours}h/night`}
              text={sleepRecommendation(wellnessData, sleepGoalHours)}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <Legend color="var(--aqua)" label="Water (bar)" />
            <Legend color="var(--violet)" label="Sleep (line)" />
            <Legend color="var(--amber)" label="Goal lines" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function recommendedWaterMl(weightKg: number) {
  return Math.round(Math.max(1800, Math.min(4200, weightKg * 35)) / 250) * 250;
}

function getDateWindow(range: StatsRange) {
  if (range === "all") return { start: null as string | null, end: null as string | null };

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);

  if (range === "week") {
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
  } else if (range === "month") {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }

  start.setHours(0, 0, 0, 0);
  return { start: dateKey(start), end: dateKey(end) };
}

function isInDateWindow(key: string, window: { start: string | null; end: string | null }) {
  if (window.start && key < window.start) return false;
  if (window.end && key > window.end) return false;
  return true;
}

function fallbackDateKeys(
  window: { start: string | null; end: string | null },
  range: StatsRange,
) {
  const keys: string[] = [];
  if (window.start && window.end) {
    const cursor = new Date(`${window.start}T12:00:00`);
    const end = new Date(`${window.end}T12:00:00`);
    while (cursor <= end) {
      keys.push(dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }

  const fallbackDays = range === "all" ? 30 : 7;
  for (let i = fallbackDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(dateKey(d));
  }
  return keys;
}

function RangeMenu({
  value,
  onChange,
}: {
  value: StatsRange;
  onChange: (value: StatsRange) => void;
}) {
  return (
    <details className="relative shrink-0">
      <summary className="list-none rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-semibold text-[var(--rosso-light)] marker:hidden">
        {RANGE_LABELS[value]}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-36 rounded-2xl border border-white/10 bg-[#111114] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
        {(["week", "month", "year", "all"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={
              "w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors " +
              (value === option
                ? "bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground")
            }
            onClick={(event) => {
              onChange(option);
              event.currentTarget.closest("details")?.removeAttribute("open");
            }}
          >
            {RANGE_LABELS[option]}
          </button>
        ))}
      </div>
    </details>
  );
}

function recommendedSleepHours(profile: { birthdate: string }) {
  const age = Math.floor(
    (Date.now() - new Date(profile.birthdate).getTime()) / 31_557_600_000,
  );
  return age < 18 ? 9 : 8;
}

function goalMessage(mode: "lose" | "gain" | "maintain") {
  if (mode === "lose") return "Stay in a sustainable deficit and watch the trend.";
  if (mode === "gain") return "Fuel the surplus and track steady mass gain.";
  return "Keep the trend stable and protect consistency.";
}

function waterRecommendation(
  data: { water_l: number }[],
  goalMl: number,
) {
  const logged = data.filter((day) => day.water_l > 0);
  if (logged.length === 0) return "";
  const averageMl =
    (logged.reduce((sum, day) => sum + day.water_l, 0) / logged.length) * 1000;
  if (averageMl >= goalMl) return "You are hitting hydration well.";
  return `Add about ${Math.round((goalMl - averageMl) / 250) * 250}ml more on average.`;
}

function sleepRecommendation(
  data: { sleep_hours: number }[],
  goalHours: number,
) {
  const logged = data.filter((day) => day.sleep_hours > 0);
  if (logged.length === 0) return "";
  const averageHours =
    logged.reduce((sum, day) => sum + day.sleep_hours, 0) / logged.length;
  if (averageHours >= goalHours) return "Sleep is on target.";
  return `Aim for about ${(goalHours - averageHours).toFixed(1)}h more.`;
}

function RecommendationCard({
  icon,
  label,
  value,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/7 bg-black/25 p-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-heading text-lg font-bold">{value}</p>
      {text && <p className="mt-1 text-xs text-muted-foreground">{text}</p>}
    </div>
  );
}

function ChartSkeleton({ height }: { height: string }) {
  return (
    <div className={`flex ${height} items-center justify-center rounded-2xl bg-white/[0.035]`}>
      <p className="text-sm text-muted-foreground">Loading chart...</p>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-40 items-center justify-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span
        className="inline-block size-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
