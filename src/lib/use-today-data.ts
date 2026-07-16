"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { dateKey } from "./types";

export function useTodayData(date = new Date()) {
  const key = dateKey(date);
  const allMeals = useStore((s) => s.meals);
  const allExerciseLogs = useStore((s) => s.exerciseLogs);

  const meals = useMemo(
    () => allMeals.filter((m) => m.loggedAt.slice(0, 10) === key),
    [allMeals, key],
  );
  const exerciseLogs = useMemo(
    () => allExerciseLogs.filter((e) => e.loggedAt.slice(0, 10) === key),
    [allExerciseLogs, key],
  );

  return { meals, exerciseLogs, date: key };
}

export function sortToday<T extends { loggedAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt),
  );
}