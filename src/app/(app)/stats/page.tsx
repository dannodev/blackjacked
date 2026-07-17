"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { computeDay, dateKey, dateKeyFromDateTime, normalizeGoal } from "@/lib/types";
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
  const rangeKeys = useMemo(() => fallbackDateKeys(dateWindow, range), [dateWindow, range]);
  const goal = useMemo(() => normalizeGoal(profile), [profile]);

  const weightData = useMemo(
    () => buildWeeklyWeightData(weightLogs, goal, dateWindow, range),
    [dateWindow, goal, range, weightLogs],
  );

  const deficitData = useMemo(() => {
    const mealsByDate = new Map<string, typeof meals>();
    const exerciseByDate = new Map<string, typeof exerciseLogs>();
    const summaryByDate = new Map(dailySummaries.map((summary) => [summary.date, summary]));

    for (const meal of meals) {
      const key = dateKeyFromDateTime(meal.loggedAt);
      const current = mealsByDate.get(key);
      if (current) current.push(meal);
      else mealsByDate.set(key, [meal]);
    }

    for (const exercise of exerciseLogs) {
      const key = dateKeyFromDateTime(exercise.loggedAt);
      const current = exerciseByDate.get(key);
      if (current) current.push(exercise);
      else exerciseByDate.set(key, [exercise]);
    }

    const keys = new Set<string>(range === "all" ? [] : rangeKeys);
    for (const key of summaryByDate.keys()) {
      if (isInDateWindow(key, dateWindow)) keys.add(key);
    }
    for (const meal of meals) keys.add(dateKeyFromDateTime(meal.loggedAt));
    for (const exercise of exerciseLogs) keys.add(dateKeyFromDateTime(exercise.loggedAt));
    for (const key of [...keys]) {
      if (!isInDateWindow(key, dateWindow)) keys.delete(key);
    }

    if (keys.size === 0) {
      for (const key of rangeKeys) keys.add(key);
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
        calorie_goal: Math.round(profile.calorie_goal),
        real_deficit: Math.round(summary?.real_deficit_kcal ?? day.real_deficit),
        kcal_in: Math.round(summary?.kcal_in ?? day.kcal_in),
        kcal_burned: Math.round(summary?.kcal_out_activity ?? day.kcal_out_activity),
      };
    });
  }, [dailySummaries, dateWindow, exerciseLogs, meals, profile, range, rangeKeys]);

  const waterGoalMl = recommendedWaterMl(profile.current_weight_kg);
  const sleepGoalHours = recommendedSleepHours(profile);
  const wellnessData = useMemo(() => {
    const summaryByDate = new Map(dailySummaries.map((summary) => [summary.date, summary]));
    const keys = new Set<string>(range === "all" ? [] : rangeKeys);
    for (const key of summaryByDate.keys()) {
      if (isInDateWindow(key, dateWindow)) keys.add(key);
    }

    if (keys.size === 0) {
      for (const key of rangeKeys) keys.add(key);
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
  }, [dailySummaries, dateWindow, range, rangeKeys, sleepGoalHours, waterGoalMl]);

  const loggedWeightData = weightData.filter((point) => typeof point.weight === "number");
  const weightChange = loggedWeightData.length > 1
    ? +(loggedWeightData[loggedWeightData.length - 1].weight! - loggedWeightData[0].weight!).toFixed(1)
    : 0;
  const weeklyPace = getWeeklyPace(goal);
  const latestWeightPoint = [...loggedWeightData].reverse()[0];
  const paceMessage = getPaceMessage(goal, weeklyPace, latestWeightPoint);

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
            <Legend color="var(--rosso)" label="Calories eaten (bar)" />
            <Legend color="var(--aqua)" label="Workout burn (bar)" />
            <Legend color="var(--amber)" label="Real deficit (line)" />
            <Legend color="var(--over)" label="Calorie goal (dotted)" />
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
          <div className="mb-4 grid grid-cols-3 gap-2">
            <GoalStat
              label="Progress"
              value={`${Math.round(goal.progress)}%`}
              accent
            />
            <GoalStat
              label="This pace"
              value={`${weeklyPace.requiredPerWeek.toFixed(1)}kg/wk`}
            />
            <GoalStat
              label="Remaining"
              value={`${Math.max(0, goal.targetDelta - goal.currentDelta).toFixed(1)}kg`}
            />
          </div>
          {loggedWeightData.length === 0 ? (
            <EmptyChart text="Log a check-in to see your trend" />
          ) : (
            <WeightTrendChart data={weightData} />
          )}
          <div className="mt-3 rounded-2xl border border-white/7 bg-black/25 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Target className="size-4 text-[var(--rosso-light)]" />
              <p className="text-sm font-bold capitalize">{goal.mode} goal</p>
            </div>
            <p className="text-xs text-muted-foreground">{goalMessage(goal.mode)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{paceMessage}</p>
          </div>
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
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (range === "month") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  } else {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  start.setHours(0, 0, 0, 0);
  return { start: dateKey(start), end: dateKey(end) };
}

function mondayOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d;
}

function buildWeeklyWeightData(
  weightLogs: { weight_kg: number; loggedAt: string }[],
  goal: ReturnType<typeof normalizeGoal>,
  window: { start: string | null; end: string | null },
  range: StatsRange,
) {
  const logsByWeek = new Map<string, { weight_kg: number; loggedAt: string }>();
  for (const log of [...weightLogs].sort(
    (a, b) => +new Date(a.loggedAt) - +new Date(b.loggedAt),
  )) {
    const key = dateKey(mondayOf(new Date(log.loggedAt)));
    if (!isInDateWindow(key, window) && range !== "all") continue;
    logsByWeek.set(key, log);
  }

  const weekKeys =
    range === "all"
      ? [...logsByWeek.keys()].sort()
      : fallbackDateKeys(window, range)
          .filter((key) => dateKey(mondayOf(new Date(`${key}T12:00:00`))) === key)
          .sort();

  if (weekKeys.length === 0 && logsByWeek.size > 0) {
    weekKeys.push(...[...logsByWeek.keys()].sort());
  }

  return weekKeys.map((weekKey) => {
    const weekStart = new Date(`${weekKey}T12:00:00`);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const log = logsByWeek.get(weekKey);
    return {
      date: `${weekStart.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}-${weekEnd.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`,
      weight: log?.weight_kg,
      target_weight: targetWeightForDate(goal, weekEnd),
    };
  });
}

function targetWeightForDate(goal: ReturnType<typeof normalizeGoal>, at: Date) {
  if (!goal.targetDate) return goal.targetWeight;
  const start = new Date(`${goal.startDate}T12:00:00`);
  const end = new Date(`${goal.targetDate}T12:00:00`);
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.max(0, Math.min(total, at.getTime() - start.getTime()));
  const ratio = elapsed / total;
  if (goal.mode === "lose") {
    return +(goal.startWeight - goal.targetDelta * ratio).toFixed(1);
  }
  if (goal.mode === "gain") {
    return +(goal.startWeight + goal.targetDelta * ratio).toFixed(1);
  }
  return +goal.targetWeight.toFixed(1);
}

function getWeeklyPace(goal: ReturnType<typeof normalizeGoal>) {
  if (!goal.targetDate) return { requiredPerWeek: 0, remainingPerWeek: 0 };
  const start = new Date(`${goal.startDate}T12:00:00`);
  const target = new Date(`${goal.targetDate}T12:00:00`);
  const now = new Date();
  const totalWeeks = Math.max(1, (target.getTime() - start.getTime()) / 604_800_000);
  const remainingWeeks = Math.max(1, (target.getTime() - now.getTime()) / 604_800_000);
  const remainingDelta = Math.max(0, goal.targetDelta - goal.currentDelta);
  return {
    requiredPerWeek: goal.targetDelta / totalWeeks,
    remainingPerWeek: remainingDelta / remainingWeeks,
  };
}

function getPaceMessage(
  goal: ReturnType<typeof normalizeGoal>,
  pace: { requiredPerWeek: number; remainingPerWeek: number },
  latest?: { weight?: number; target_weight?: number },
) {
  if (!goal.targetDate || !latest?.weight || !latest.target_weight) {
    return "Add weekly check-ins to compare actual progress against target pace.";
  }
  const onPace =
    goal.mode === "lose"
      ? latest.weight <= latest.target_weight
      : goal.mode === "gain"
        ? latest.weight >= latest.target_weight
        : Math.abs(latest.weight - latest.target_weight) <= 0.5;
  if (onPace) return "You are on pace for this week.";
  if (goal.mode === "maintain") return "You are drifting from maintenance; tighten this week.";
  return `Behind pace. New pace needed: ${pace.remainingPerWeek.toFixed(1)}kg/week.`;
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

function GoalStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/7 bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-1 font-heading text-lg font-black " +
          (accent ? "text-[var(--rosso-light)]" : "text-foreground")
        }
      >
        {value}
      </p>
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
