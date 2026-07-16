"use client";

import { useStore } from "./store";
import { dateKey } from "./types";

export function useTodayData(date = new Date()) {
  const key = dateKey(date);
  const meals = useStore((s) =>
    s.meals.filter((m) => m.loggedAt.slice(0, 10) === key),
  );
  const exerciseLogs = useStore((s) =>
    s.exerciseLogs.filter((e) => e.loggedAt.slice(0, 10) === key),
  );
  return { meals, exerciseLogs, date: key };
}

export function sortToday<T extends { loggedAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt),
  );
}