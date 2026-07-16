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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    let cancelled = false;

    async function syncProfile() {
      if (!hydrated || !user) return;
      if (profile || !isSupabaseConfigured()) {
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
  }, [hydrated, user, profile, setProfile]);

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
        const remoteMeals = await loadSupabaseMeals(user.id);
        if (!cancelled && remoteMeals.length > 0) setMeals(remoteMeals);
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
        const remoteLogs = await loadSupabaseExerciseLogs(user.id);
        if (!cancelled && remoteLogs.length > 0) setExerciseLogs(remoteLogs);
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
