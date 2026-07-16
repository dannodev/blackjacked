"use client";

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

type WeightPoint = {
  date: string;
  weight: number;
};

type DeficitPoint = {
  date: string;
  label: string;
  goal_deficit: number;
  real_deficit: number;
  kcal_in: number;
};

type WellnessPoint = {
  label: string;
  water_l: number;
  water_goal_l: number;
  sleep_hours: number;
  sleep_goal_hours: number;
};

export function WeightTrendChart({ data }: { data: WeightPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--rosso)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--rosso)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            background: "var(--panel-soft)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="weight"
          stroke="var(--rosso)"
          strokeWidth={2}
          fill="url(#weightGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DeficitChart({ data }: { data: DeficitPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: "var(--panel-soft)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="goal_deficit"
          fill="var(--rosso)"
          radius={[8, 8, 0, 0]}
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
  );
}

export function WellnessChart({ data }: { data: WellnessPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: "var(--panel-soft)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="water_l"
          fill="var(--aqua)"
          radius={[8, 8, 0, 0]}
          opacity={0.65}
          name="Water (L)"
        />
        <Line
          type="monotone"
          dataKey="water_goal_l"
          stroke="var(--aqua)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          name="Water goal (L)"
        />
        <Line
          type="monotone"
          dataKey="sleep_hours"
          stroke="var(--violet)"
          strokeWidth={2}
          dot={{ fill: "var(--violet)", r: 3 }}
          name="Sleep (h)"
        />
        <Line
          type="monotone"
          dataKey="sleep_goal_hours"
          stroke="var(--amber)"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
          name="Sleep goal (h)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
