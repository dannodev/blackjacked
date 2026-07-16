"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
  Bar,
} from "recharts";
import { useStore } from "@/lib/store";
import { computeDay, dateKey } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Scale, TrendingDown } from "lucide-react";

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
      const dayMeals = meals.filter((m) => m.loggedAt.slice(0, 10) === key);
      const dayEx = exerciseLogs.filter((e) => e.loggedAt.slice(0, 10) === key);
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
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Weight trends and daily deficit overlay
        </p>
      </div>

      {/* weight trend */}
      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Scale className="size-4 text-[var(--lime)]" />
              Weight trend
            </span>
            {weightChange !== 0 && (
              <span
                className={
                  "text-sm font-bold " +
                  (weightChange < 0 ? "text-[var(--lime)]" : "text-[var(--amber)]")
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
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weightData}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--lime)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--lime)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--lime)"
                  strokeWidth={2}
                  fill="url(#weightGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* deficit overlay */}
      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <TrendingDown className="size-4 text-[var(--lime)]" />
            7-day deficit
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={deficitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="goal_deficit"
                fill="var(--lime)"
                radius={[4, 4, 0, 0]}
                opacity={0.6}
                name="Goal deficit"
              />
              <Line
                type="monotone"
                dataKey="real_deficit"
                stroke="var(--amber)"
                strokeWidth={2}
                dot={{ fill: "var(--amber)", r: 3 }}
                name="Real deficit"
              />
              <Line
                type="monotone"
                dataKey="kcal_in"
                stroke="var(--over)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="kcal in"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-3 flex gap-4 text-xs">
            <Legend color="var(--lime)" label="Goal deficit (bar)" />
            <Legend color="var(--amber)" label="Real deficit (line)" />
            <Legend color="var(--over)" label="kcal in (dotted)" />
          </div>
        </CardContent>
      </Card>

      {/* progress photos */}
      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
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
                  <div key={w.id} className="shrink-0">
                    <img
                      src={w.photo_url}
                      alt="Progress"
                      className="h-32 w-32 rounded-2xl object-cover"
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