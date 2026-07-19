"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandSplash } from "@/components/brand/splash";
import { AppShell } from "@/components/layout/app-shell";
import { useHydrated } from "@/lib/use-hydrated";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { loadSupabaseProfile } from "@/lib/supabase/profile";
import { loadSupabaseWeightLogs } from "@/lib/supabase/weight-logs";
import { loadSupabaseMeals } from "@/lib/supabase/meals";
import { loadSupabaseExerciseLogs } from "@/lib/supabase/exercise-logs";
import { loadSupabaseDailySummaries } from "@/lib/supabase/daily-summary";
import { dateKey } from "@/lib/types";
import {
  flushCloudSyncQueue,
  getPendingCloudSyncOperations,
} from "@/lib/cloud-sync";
import { loadCloudAppState, saveCloudAppState, type CloudAppState } from "@/lib/supabase/app-state";
import {
  DEFAULT_COACH_FOCUS,
  loadCoachPreferences,
  saveCoachPreferences,
  subscribeCoachPreferences,
} from "@/lib/supabase/coach-preferences";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const setMeals = useStore((s) => s.setMeals);
  const setExerciseLogs = useStore((s) => s.setExerciseLogs);
  const setWeightLogs = useStore((s) => s.setWeightLogs);
  const setDailySummaries = useStore((s) => s.setDailySummaries);
  const setWater = useStore((s) => s.setWater);
  const setSleep = useStore((s) => s.setSleep);
  const [profileChecked, setProfileChecked] = useState(false);
  const [appStateChecked, setAppStateChecked] = useState(false);

  useEffect(() => {
    if (!hydrated || !user || !isSupabaseConfigured()) return;
    let cancelled = false;
    loadCoachPreferences(user.id)
      .then(async (remote) => {
        if (cancelled) return;
        if (remote) useStore.getState().setCoachFocusItems(remote);
        else await saveCoachPreferences(
          user.id,
          useStore.getState().coachFocusItems.length
            ? useStore.getState().coachFocusItems
            : DEFAULT_COACH_FOCUS,
        );
      })
      .catch(() => undefined);
    const unsubscribe = subscribeCoachPreferences(user.id, (items) => {
      useStore.getState().setCoachFocusItems(items);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hydrated, user]);

  useEffect(() => {
    let cancelled = false;
    async function syncAppState() {
      if (!hydrated || !user || !isSupabaseConfigured()) return;
      try {
        const remote = await loadCloudAppState(user.id);
        if (cancelled) return;
        if (remote) useStore.getState().applyCloudAppState(remote);
        else await saveCloudAppState(user.id, pickCloudAppState(useStore.getState()));
      } catch {
        // Local preferences remain available while offline.
      } finally {
        if (!cancelled) setAppStateChecked(true);
      }
    }
    if (!isSupabaseConfigured()) setAppStateChecked(true);
    void syncAppState();
    return () => { cancelled = true; };
  }, [hydrated, user]);

  useEffect(() => {
    if (!appStateChecked || !user || !isSupabaseConfigured()) return;
    let timer: number | undefined;
    let previous = JSON.stringify(pickCloudAppState(useStore.getState()));
    return useStore.subscribe((state) => {
      const nextState = pickCloudAppState(state);
      const next = JSON.stringify(nextState);
      if (next === previous) return;
      previous = next;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void saveCloudAppState(user.id, nextState).catch(() => undefined);
      }, 800);
    });
  }, [appStateChecked, user]);

  useEffect(() => {
    if (!hydrated || !user || !isSupabaseConfigured()) return;
    const flush = () => void flushCloudSyncQueue(user.id);
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [hydrated, user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    let cancelled = false;

    async function syncProfile() {
      if (!hydrated || !user) return;
      if (!isSupabaseConfigured()) {
        setProfileChecked(true);
        return;
      }

      try {
        const remoteProfile = await loadSupabaseProfile(user.id);
        if (cancelled) return;
        if (remoteProfile) setProfile(remoteProfile);
      } finally {
        if (!cancelled) setProfileChecked(true);
      }
    }

    void syncProfile();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user, setProfile]);

  useEffect(() => {
    let cancelled = false;

    async function syncWeightLogs() {
      if (!hydrated || !user || !profile || !isSupabaseConfigured()) return;

      try {
        const remoteLogs = await loadSupabaseWeightLogs(user.id);
        if (!cancelled && remoteLogs.length > 0) setWeightLogs(remoteLogs);
      } catch {
        // Local check-ins still work if cloud sync is temporarily unavailable.
      }
    }

    void syncWeightLogs();
    return () => {
      cancelled = true;
    };
  }, [hydrated, profile, setWeightLogs, user]);

  useEffect(() => {
    let cancelled = false;

    async function syncMeals() {
      if (!hydrated || !user || !profile || !isSupabaseConfigured()) return;

      try {
        await flushCloudSyncQueue(user.id);
        const remoteMeals = await loadSupabaseMeals(user.id);
        const pending = await getPendingCloudSyncOperations(user.id);
        const deleted = new Set(
          pending.filter((item) => item.kind === "meal_delete").map((item) => item.recordId),
        );
        const reconciled = new Map(
          remoteMeals.filter((meal) => !deleted.has(meal.id)).map((meal) => [meal.id, meal]),
        );
        for (const item of pending) {
          if (item.kind === "meal_upsert") reconciled.set(item.recordId, item.payload);
        }
        if (!cancelled) setMeals([...reconciled.values()]);
      } catch {
        // Local meal logging still works if cloud sync is temporarily unavailable.
      }
    }

    void syncMeals();
    return () => {
      cancelled = true;
    };
  }, [hydrated, profile, setMeals, user]);

  useEffect(() => {
    let cancelled = false;

    async function syncExerciseLogs() {
      if (!hydrated || !user || !profile || !isSupabaseConfigured()) return;

      try {
        await flushCloudSyncQueue(user.id);
        const remoteLogs = await loadSupabaseExerciseLogs(user.id);
        const pending = await getPendingCloudSyncOperations(user.id);
        const deleted = new Set(
          pending.filter((item) => item.kind === "exercise_delete").map((item) => item.recordId),
        );
        const reconciled = new Map(
          remoteLogs.filter((log) => !deleted.has(log.id)).map((log) => [log.id, log]),
        );
        for (const item of pending) {
          if (item.kind === "exercise_upsert") reconciled.set(item.recordId, item.payload);
        }
        if (!cancelled) setExerciseLogs([...reconciled.values()]);
      } catch {
        // Local workout logging still works if cloud sync is temporarily unavailable.
      }
    }

    void syncExerciseLogs();
    return () => {
      cancelled = true;
    };
  }, [hydrated, profile, setExerciseLogs, user]);

  useEffect(() => {
    let cancelled = false;

    async function syncDailySummaries() {
      if (!hydrated || !user || !profile || !isSupabaseConfigured()) return;

      try {
        const remoteSummaries = await loadSupabaseDailySummaries(user.id);
        if (!cancelled && remoteSummaries.length > 0) {
          setDailySummaries(remoteSummaries);
          const todaySummary = remoteSummaries.find(
            (summary) => summary.date === dateKey(new Date()),
          );
          if (todaySummary) {
            setWater(todaySummary.water_ml);
            setSleep(todaySummary.sleep_hours);
          }
        }
      } catch {
        // Local hydration/sleep tracking still works if cloud sync is temporarily unavailable.
      }
    }

    void syncDailySummaries();
    return () => {
      cancelled = true;
    };
  }, [hydrated, profile, setDailySummaries, setSleep, setWater, user]);

  useEffect(() => {
    if (hydrated && user && profileChecked && !profile) router.replace("/onboarding");
  }, [hydrated, user, profileChecked, profile, router]);

  if (loading || !hydrated || !user || !profile || !profileChecked)
    return <BrandSplash fullScreen />;

  return <AppShell>{children}</AppShell>;
}

function pickCloudAppState(state: ReturnType<typeof useStore.getState>): CloudAppState {
  return {
    language: state.language,
    recipes: state.recipes,
    customFoods: state.customFoods,
    customMenuMeals: state.customMenuMeals,
    favoriteExerciseIds: state.favoriteExerciseIds,
    favoriteFoodIds: state.favoriteFoodIds,
    workoutRoutines: state.workoutRoutines,
    useDefaultMenu: state.useDefaultMenu,
    streakDates: state.streakDates,
    noMasturbationDates: state.noMasturbationDates,
  };
}
