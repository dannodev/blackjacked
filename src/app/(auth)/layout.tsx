"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandSplash } from "@/components/brand/splash";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || user) {
    return <BrandSplash fullScreen />;
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(212,0,0,0.08), transparent 60%)",
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-5 py-12">
        <div className="auth-rise-in mb-8">
          <BrandSplash />
        </div>
        <div className="auth-rise-in auth-rise-in-delayed w-full">
          {children}
        </div>
      </div>
    </main>
  );
}
