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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
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
    if (hydrated && user && profileChecked && !profile) router.replace("/onboarding");
  }, [hydrated, user, profileChecked, profile, router]);

  if (loading || !hydrated || !user || !profile || !profileChecked)
    return <BrandSplash fullScreen />;

  return <AppShell>{children}</AppShell>;
}
