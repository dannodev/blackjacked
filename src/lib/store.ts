"use client";

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
} from "./types";
import { todayKey } from "./types";
import { FOODS } from "./foods-seed";

const DB_KEY = "blackjacked-store-v1";

export const SEED_FOODS: FoodItem[] = FOODS;

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const v = await idbGet(name);
    return v ?? null;
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
  profile: Profile | null;
  meals: Meal[];
  exerciseLogs: ExerciseLog[];
  weightLogs: WeightLog[];
  recipes: Recipe[];
  customFoods: FoodItem[];
  streaks: Streaks;
  waterToday: number;
  sleepToday: number;
  notesToday: string;
  aiTokenCount: number;
  setProfile: (p: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  addMeal: (m: Meal) => void;
  deleteMeal: (id: string) => void;
  addExerciseLog: (e: ExerciseLog) => void;
  deleteExerciseLog: (id: string) => void;
  addWeightLog: (w: WeightLog) => void;
  addCustomFood: (f: FoodItem) => void;
  addRecipe: (r: Recipe) => void;
  deleteRecipe: (id: string) => void;
  setWater: (ml: number) => void;
  setSleep: (h: number) => void;
  setNotes: (s: string) => void;
  bumpAiTokens: (n: number) => void;
  touchStreak: () => void;
  resetAll: () => void;
}

function emptyStreaks(): Streaks {
  return { current_streak: 0, longest_streak: 0, last_logged_date: null };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profile: null,
      meals: [],
      exerciseLogs: [],
      weightLogs: [],
      recipes: [],
      customFoods: [],
      streaks: emptyStreaks(),
      waterToday: 0,
      sleepToday: 0,
      notesToday: "",
      aiTokenCount: 0,

      setProfile: (p) => set({ profile: p }),
      updateProfile: (patch) =>
        set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : {})),

      addMeal: (m) => {
        set((s) => ({ meals: [...s.meals, m] }));
        get().touchStreak();
      },
      deleteMeal: (id) =>
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

      addExerciseLog: (e) => {
        set((s) => ({ exerciseLogs: [...s.exerciseLogs, e] }));
        get().touchStreak();
      },
      deleteExerciseLog: (id) =>
        set((s) => ({ exerciseLogs: s.exerciseLogs.filter((e) => e.id !== id) })),

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

      addRecipe: (r) => set((s) => ({ recipes: [...s.recipes, r] })),
      deleteRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      setWater: (ml) => set({ waterToday: ml }),
      setSleep: (h) => set({ sleepToday: h }),
      setNotes: (str) => set({ notesToday: str }),
      bumpAiTokens: (n) => set((s) => ({ aiTokenCount: s.aiTokenCount + n })),

      touchStreak: () => {
        const today = todayKey();
        set((s) => {
          if (s.streaks.last_logged_date === today) return {};
          const prev = s.streaks.last_logged_date;
          let current = 1;
          if (prev) {
            const diff = Math.round(
              (new Date(today).getTime() - new Date(prev).getTime()) /
                86_400_000,
            );
            current = diff === 1 ? s.streaks.current_streak + 1 : 1;
          }
          const longest = Math.max(current, s.streaks.longest_streak);
          return {
            streaks: {
              current_streak: current,
              longest_streak: longest,
              last_logged_date: today,
            },
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
          streaks: emptyStreaks(),
          waterToday: 0,
          sleepToday: 0,
          notesToday: "",
          aiTokenCount: 0,
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
  return useStore((s) => [...s.customFoods, ...SEED_FOODS]);
}