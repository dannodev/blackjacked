"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type {
  Profile,
  Meal,
  ExerciseLog,
  WeightLog,
  Recipe,
  Streaks,
  FoodItem,
  Squad,
  SquadMember,
  DailySummary,
} from "./types";
import { computeDay, normalizeGoal, sameDay, todayKey } from "./types";
import { FOODS } from "./foods-seed";
import { makeId } from "./id";
import type { MenuMealPreset } from "./menu-meals";

const DB_KEY = "blackjacked-store-v1";

export const SEED_FOODS: FoodItem[] = FOODS;
export type Language = "en" | "es";

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const v = await idbGet(name);
    if (typeof v !== "string" || !v.trim()) return null;
    try {
      JSON.parse(v);
      return v;
    } catch {
      await idbDel(name);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name);
  },
};

interface State {
  hydrated: boolean;
  language: Language;
  profile: Profile | null;
  meals: Meal[];
  exerciseLogs: ExerciseLog[];
  weightLogs: WeightLog[];
  recipes: Recipe[];
  customFoods: FoodItem[];
  customMenuMeals: MenuMealPreset[];
  favoriteExerciseIds: string[];
  useDefaultMenu: boolean;
  dailySummaries: DailySummary[];
  streaks: Streaks;
  streakDates: string[];
  noMasturbationStreaks: Streaks;
  noMasturbationDates: string[];
  waterToday: number;
  sleepToday: number;
  notesToday: string;
  aiTokenCount: number;
  squad: Squad | null;
  setLanguage: (language: Language) => void;
  setProfile: (p: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  setMeals: (meals: Meal[]) => void;
  addMeal: (m: Meal) => void;
  deleteMeal: (id: string) => void;
  setExerciseLogs: (logs: ExerciseLog[]) => void;
  addExerciseLog: (e: ExerciseLog) => void;
  deleteExerciseLog: (id: string) => void;
  toggleFavoriteExercise: (id: string) => void;
  setWeightLogs: (logs: WeightLog[]) => void;
  addWeightLog: (w: WeightLog) => void;
  addCustomFood: (f: FoodItem) => void;
  addCustomMenuMeal: (meal: MenuMealPreset) => void;
  deleteCustomMenuMeal: (id: string) => void;
  setUseDefaultMenu: (enabled: boolean) => void;
  setDailySummaries: (summaries: DailySummary[]) => void;
  upsertDailySummary: (summary: DailySummary) => void;
  addRecipe: (r: Recipe) => void;
  deleteRecipe: (id: string) => void;
  setWater: (ml: number) => void;
  setSleep: (h: number) => void;
  setNotes: (s: string) => void;
  bumpAiTokens: (n: number) => void;
  refreshQualifiedStreak: () => void;
  logNoMasturbationDay: () => void;
  createSquad: (name: string) => void;
  addSquadMember: (m: Omit<SquadMember, "id">) => void;
  updateSquadMember: (id: string, patch: Partial<SquadMember>) => void;
  removeSquadMember: (id: string) => void;
  leaveSquad: () => void;
  resetAll: () => void;
}

function emptyStreaks(): Streaks {
  return { current_streak: 0, longest_streak: 0, last_logged_date: null };
}

function computeStreaksFromDates(dates: string[], at = todayKey()): Streaks {
  const uniqueDates = [...new Set(dates)].sort();
  if (uniqueDates.length === 0) return emptyStreaks();

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of uniqueDates) {
    if (!previous) {
      run = 1;
    } else {
      const diff = Math.round(
        (new Date(date).getTime() - new Date(previous).getTime()) / 86_400_000,
      );
      run = diff === 1 ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
    previous = date;
  }

  const latest = uniqueDates[uniqueDates.length - 1];
  const daysSinceLatest = Math.round(
    (new Date(at).getTime() - new Date(latest).getTime()) / 86_400_000,
  );
  let current = 0;
  if (daysSinceLatest <= 1) {
    current = 1;
    const cursor = new Date(`${latest}T00:00:00`);
    while (true) {
      cursor.setDate(cursor.getDate() - 1);
      const key = todayKey(cursor);
      if (!uniqueDates.includes(key)) break;
      current += 1;
    }
  }

  return {
    current_streak: current,
    longest_streak: longest,
    last_logged_date: latest,
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      language: "en",
      profile: null,
      meals: [],
      exerciseLogs: [],
      weightLogs: [],
      recipes: [],
      customFoods: [],
      customMenuMeals: [],
      favoriteExerciseIds: [],
      useDefaultMenu: true,
      dailySummaries: [],
      streaks: emptyStreaks(),
      streakDates: [],
      noMasturbationStreaks: emptyStreaks(),
      noMasturbationDates: [],
      waterToday: 0,
      sleepToday: 0,
      notesToday: "",
      aiTokenCount: 0,
      squad: null,
      setLanguage: (language) => set({ language }),

      setProfile: (p) => {
        set({ profile: p });
        get().refreshQualifiedStreak();
      },
      updateProfile: (patch) => {
        set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : {}));
        get().refreshQualifiedStreak();
      },

      setMeals: (meals) =>
        {
        set((s) => {
          const localById = new Map(s.meals.map((meal) => [meal.id, meal]));
          const mergedById = new Map(localById);
          for (const meal of meals) mergedById.set(meal.id, meal);
          return { meals: [...mergedById.values()] };
        });
        get().refreshQualifiedStreak();
      },

      addMeal: (m) => {
        set((s) => ({ meals: [...s.meals, m] }));
        get().refreshQualifiedStreak();
      },
      deleteMeal: (id) => {
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }));
        get().refreshQualifiedStreak();
      },

      setExerciseLogs: (logs) =>
        {
        set((s) => {
          const localById = new Map(s.exerciseLogs.map((log) => [log.id, log]));
          const mergedById = new Map(localById);
          for (const log of logs) mergedById.set(log.id, log);
          return { exerciseLogs: [...mergedById.values()] };
        });
        get().refreshQualifiedStreak();
      },

      addExerciseLog: (e) => {
        set((s) => ({ exerciseLogs: [...s.exerciseLogs, e] }));
        get().refreshQualifiedStreak();
      },
      deleteExerciseLog: (id) => {
        set((s) => ({ exerciseLogs: s.exerciseLogs.filter((e) => e.id !== id) }));
        get().refreshQualifiedStreak();
      },
      toggleFavoriteExercise: (id) =>
        set((s) => ({
          favoriteExerciseIds: s.favoriteExerciseIds.includes(id)
            ? s.favoriteExerciseIds.filter((exerciseId) => exerciseId !== id)
            : [...s.favoriteExerciseIds, id],
        })),

      setWeightLogs: (logs) =>
        set((s) => {
          const latestWeight = [...logs].reverse().find((log) => log.weight_kg);
          return {
            weightLogs: logs,
            profile:
              s.profile && latestWeight
                ? { ...s.profile, current_weight_kg: latestWeight.weight_kg }
                : s.profile,
          };
        }),

      addWeightLog: (w) =>
        set((s) => {
          const logs = [...s.weightLogs, w];
          const patch: Partial<State> = { weightLogs: logs };
          if (s.profile) {
            patch.profile = { ...s.profile, current_weight_kg: w.weight_kg };
          }
          return patch;
        }),

      addCustomFood: (f) =>
        set((s) => ({ customFoods: [...s.customFoods, f] })),

      addCustomMenuMeal: (meal) =>
        set((s) => ({ customMenuMeals: [...s.customMenuMeals, meal] })),
      deleteCustomMenuMeal: (id) =>
        set((s) => ({
          customMenuMeals: s.customMenuMeals.filter((meal) => meal.id !== id),
        })),
      setUseDefaultMenu: (enabled) => set({ useDefaultMenu: enabled }),
      setDailySummaries: (summaries) =>
        set((s) => {
          const merged = new Map(s.dailySummaries.map((summary) => [summary.date, summary]));
          for (const summary of summaries) merged.set(summary.date, summary);
          return {
            dailySummaries: [...merged.values()].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          };
        }),
      upsertDailySummary: (summary) =>
        set((s) => {
          const existing = s.dailySummaries.filter((item) => item.date !== summary.date);
          return {
            dailySummaries: [...existing, summary].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          };
        }),

      addRecipe: (r) => set((s) => ({ recipes: [...s.recipes, r] })),
      deleteRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      setWater: (ml) => set({ waterToday: ml }),
      setSleep: (h) => set({ sleepToday: h }),
      setNotes: (str) => set({ notesToday: str }),
      bumpAiTokens: (n) => set((s) => ({ aiTokenCount: s.aiTokenCount + n })),

      createSquad: (name) =>
        set({
          squad: {
            id: makeId(),
            name,
            members: [],
            createdAt: new Date().toISOString(),
          },
        }),

      addSquadMember: (m) =>
        set((s) => {
          if (!s.squad) return {};
          if (s.squad.members.length >= 6) return {};
          const member: SquadMember = { ...m, id: makeId() };
          return { squad: { ...s.squad, members: [...s.squad.members, member] } };
        }),

      updateSquadMember: (id, patch) =>
        set((s) => {
          if (!s.squad) return {};
          return {
            squad: {
              ...s.squad,
              members: s.squad.members.map((m) =>
                m.id === id ? { ...m, ...patch } : m,
              ),
            },
          };
        }),

      removeSquadMember: (id) =>
        set((s) => {
          if (!s.squad) return {};
          return {
            squad: {
              ...s.squad,
              members: s.squad.members.filter((m) => m.id !== id),
            },
          };
        }),

      leaveSquad: () => set({ squad: null }),

      refreshQualifiedStreak: () => {
        const today = todayKey();
        set((s) => {
          if (!s.profile) return {};
          const todayMeals = s.meals.filter((meal) => sameDay(meal.loggedAt, today));
          const todayExercises = s.exerciseLogs.filter((log) => sameDay(log.loggedAt, today));
          const day = computeDay(todayMeals, todayExercises, s.profile);
          const goal = normalizeGoal(s.profile);
          const calorieTargetMet =
            goal.mode === "gain"
              ? day.kcal_in >= s.profile.calorie_goal
              : goal.mode === "maintain"
                ? Math.abs(day.kcal_in - s.profile.calorie_goal) <= 150
                : day.kcal_in <= s.profile.calorie_goal && day.kcal_in > 0;
          const qualifies = calorieTargetMet && todayExercises.length > 0;
          const existingDates = s.streakDates ?? [];
          const nextDates = qualifies
            ? [...new Set([...existingDates, today])].sort()
            : existingDates.filter((date) => date !== today);
          return {
            streakDates: nextDates,
            streaks: computeStreaksFromDates(nextDates, today),
          };
        });
      },

      logNoMasturbationDay: () => {
        const today = todayKey();
        set((s) => {
          const nextDates = [...new Set([...(s.noMasturbationDates ?? []), today])].sort();
          return {
            noMasturbationDates: nextDates,
            noMasturbationStreaks: computeStreaksFromDates(nextDates, today),
          };
        });
      },

      resetAll: () =>
        set({
          profile: null,
          meals: [],
          exerciseLogs: [],
          weightLogs: [],
          recipes: [],
          customFoods: [],
          customMenuMeals: [],
          favoriteExerciseIds: [],
          useDefaultMenu: true,
          dailySummaries: [],
          streaks: emptyStreaks(),
          streakDates: [],
          noMasturbationStreaks: emptyStreaks(),
          noMasturbationDates: [],
          waterToday: 0,
          sleepToday: 0,
          notesToday: "",
          aiTokenCount: 0,
          squad: null,
          language: "en",
        }),
    }),
    {
      name: DB_KEY,
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function useAllFoods(): FoodItem[] {
  const customFoods = useStore((s) => s.customFoods);
  return useMemo(() => [...customFoods, ...SEED_FOODS], [customFoods]);
}
