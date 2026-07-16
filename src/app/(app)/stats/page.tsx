"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { computeDay, dateKey } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Scale, TrendingDown } from "lucide-react";

const WeightTrendChart = dynamic(
  () => import("./stats-charts").then((mod) => mod.WeightTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height="h-[200px]" /> },
);

const DeficitChart = dynamic(
  () => import("./stats-charts").then((mod) => mod.DeficitChart),
  { ssr: false, loading: () => <ChartSkeleton height="h-[220px]" /> },
);

export default function StatsPage() {
  const profile = useStore((s) => s.profile)!;
  const weightLogs = useStore((s) => s.weightLogs);
  const meals = useStore((s) => s.meals);
  const exerciseLogs = useStore((s) => s.exerciseLogs);

  // weight chart data
  const weightData = useMemo(
    () =>
      [...weightLogs]
        .sort((a, b) => +new Date(a.loggedAt) - +new Date(b.loggedAt))
        .map((w) => ({
          date: new Date(w.loggedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          weight: w.weight_kg,
        })),
    [weightLogs],
  );

  // last 7 days deficit data
  const deficitData = useMemo(() => {
    const mealsByDate = new Map<string, typeof meals>();
    const exerciseByDate = new Map<string, typeof exerciseLogs>();

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

    const days: {
      date: string;
      label: string;
      goal_deficit: number;
      real_deficit: number;
      kcal_in: number;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const dayMeals = mealsByDate.get(key) ?? [];
      const dayEx = exerciseByDate.get(key) ?? [];
      const day = computeDay(dayMeals, dayEx, profile, d);
      days.push({
        date: key,
        label: d.toLocaleDateString(undefined, {
          weekday: "short",
        }),
        goal_deficit: Math.round(day.goal_deficit),
        real_deficit: Math.round(day.real_deficit),
        kcal_in: Math.round(day.kcal_in),
      });
    }
    return days;
  }, [meals, exerciseLogs, profile]);

  const weightChange = weightData.length > 1
    ? +(weightData[weightData.length - 1].weight - weightData[0].weight).toFixed(1)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-extrabold">Stats</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Weight trends and daily deficit overlay
        </p>
      </div>

      {/* weight trend */}
      <Card className="premium-panel chart-grid rounded-[1.6rem]">
        <CardHeader>
          <CardTitle className="font-heading flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Scale className="size-4 text-[var(--rosso-light)]" />
              Weight trend
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
          {weightData.length === 0 ? (
            <EmptyChart text="Log a check-in to see your trend" />
          ) : (
            <WeightTrendChart data={weightData} />
          )}
        </CardContent>
      </Card>

      {/* deficit overlay */}
      <Card className="premium-panel chart-grid rounded-[1.6rem]">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-base">
            <TrendingDown className="size-4 text-[var(--rosso-light)]" />
            7-day deficit
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <DeficitChart data={deficitData} />
          <div className="mt-3 flex gap-4 text-xs">
            <Legend color="var(--rosso)" label="Goal deficit (bar)" />
            <Legend color="var(--amber)" label="Real deficit (line)" />
            <Legend color="var(--over)" label="kcal in (dotted)" />
          </div>
        </CardContent>
      </Card>

      {/* progress photos */}
      <Card className="carbon-card rounded-[1.6rem] border-white/7">
        <CardHeader>
          <CardTitle className="font-heading text-base">Progress photos</CardTitle>
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
