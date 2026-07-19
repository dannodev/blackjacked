import type { DailySummary, Profile, WeightLog } from "@/lib/types";

export type CoachRecommendation = {
  title: string;
  explanation: string;
  suggestedCalorieGoal: number | null;
  adherence: number;
  weeklyWeightChangeKg: number | null;
  ready: boolean;
};

export function buildWeeklyCoachRecommendation(
  profile: Profile,
  weightLogs: WeightLog[],
  summaries: DailySummary[],
  now = new Date(),
): CoachRecommendation {
  const cutoff = +now - 21 * 86_400_000;
  const weights = [...weightLogs]
    .filter((log) => +new Date(log.loggedAt) >= cutoff)
    .sort((a, b) => +new Date(a.loggedAt) - +new Date(b.loggedAt));
  const recentDays = summaries.filter((summary) => {
    const date = new Date(`${summary.date}T12:00:00`);
    return +date >= +now - 14 * 86_400_000 && summary.kcal_in > 0;
  });
  const adherence = recentDays.length
    ? recentDays.filter((day) => Math.abs(day.kcal_in - profile.calorie_goal) <= profile.calorie_goal * 0.15).length / recentDays.length
    : 0;

  if (weights.length < 2 || recentDays.length < 4) {
    return {
      title: "Build your baseline",
      explanation: "Log at least two weigh-ins and four complete food days. Your coach will wait for enough signal instead of guessing.",
      suggestedCalorieGoal: null,
      adherence,
      weeklyWeightChangeKg: null,
      ready: false,
    };
  }

  const first = weights[0];
  const last = weights[weights.length - 1];
  const days = Math.max(1, (+new Date(last.loggedAt) - +new Date(first.loggedAt)) / 86_400_000);
  const pace = ((last.weight_kg - first.weight_kg) / days) * 7;
  const minimum = profile.sex === "male" ? 1500 : 1200;

  if (adherence < 0.7) {
    return {
      title: "Keep the target steady",
      explanation: `Your logged-day adherence is ${Math.round(adherence * 100)}%. Improve consistency before changing calories so the adjustment is based on your body—not missing data.`,
      suggestedCalorieGoal: null,
      adherence,
      weeklyWeightChangeKg: pace,
      ready: true,
    };
  }

  let delta = 0;
  if (profile.goal_mode === "lose") {
    if (pace > -0.1) delta = -100;
    else if (pace < -1) delta = 100;
  } else if (profile.goal_mode === "gain") {
    if (pace < 0.1) delta = 100;
    else if (pace > 0.5) delta = -100;
  } else if (Math.abs(pace) > 0.25) {
    delta = pace > 0 ? -100 : 100;
  }

  const suggested = delta ? Math.max(minimum, profile.calorie_goal + delta) : null;
  return {
    title: suggested ? "A small adjustment is ready" : "Your plan is working",
    explanation: suggested
      ? `Your trend is ${pace > 0 ? "+" : ""}${pace.toFixed(2)} kg/week with ${Math.round(adherence * 100)}% adherence. A ${Math.abs(delta)} kcal change is intentionally small and can be undone.`
      : `Your trend is ${pace > 0 ? "+" : ""}${pace.toFixed(2)} kg/week with ${Math.round(adherence * 100)}% adherence. Keep your current target for another week.`,
    suggestedCalorieGoal: suggested,
    adherence,
    weeklyWeightChangeKg: pace,
    ready: true,
  };
}

export function currentWeekStart(now = new Date()) {
  const date = new Date(now);
  const weekday = date.getDay() || 7;
  date.setDate(date.getDate() - weekday + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
