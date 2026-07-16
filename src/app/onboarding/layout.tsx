"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandSplash } from "@/components/brand/splash";
import { useHydrated } from "@/lib/use-hydrated";
import { useStore } from "@/lib/store";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useStore((s) => s.profile);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (hydrated && profile) router.replace("/dashboard");
  }, [hydrated, profile, router]);

  if (loading || !hydrated || !user) return <BrandSplash fullScreen />;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 py-10">
      {children}
    </main>
  );
}