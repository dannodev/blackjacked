"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandSplash } from "@/components/brand/splash";
import { useHydrated } from "@/lib/use-hydrated";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { loadSupabaseProfile } from "@/lib/supabase/profile";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    if (hydrated && profileChecked && profile) router.replace("/dashboard");
  }, [hydrated, profileChecked, profile, router]);

  if (loading || !hydrated || !user || !profileChecked || profile) {
    return <BrandSplash fullScreen />;
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 py-10">
      {children}
    </main>
  );
}
