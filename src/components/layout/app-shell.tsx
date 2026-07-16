"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Utensils, Dumbbell, Users, Bell, ClipboardList, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Wordmark } from "@/components/brand/wordmark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/menu", label: "Menu", icon: Utensils },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/squad", label: "Squad", icon: Users },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
];

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const profile = useStore((s) => s.profile);
  const waterToday = useStore((s) => s.waterToday);
  const sleepToday = useStore((s) => s.sleepToday);
  const meals = useStore((s) => s.meals);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationItems = useMemo(
    () => buildNotifications(waterToday, sleepToday, meals.length),
    [meals.length, sleepToday, waterToday],
  );

  return (
    <div className="app-glow mx-auto flex min-h-[100dvh] max-w-md flex-col overflow-hidden bg-background shadow-[0_0_80px_rgba(0,0,0,0.55)] sm:border-x sm:border-white/8">
      {/* Sticky app bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-background/72 px-4 py-3 backdrop-blur-2xl">
        <Link href="/dashboard" className="flex items-center">
          <Wordmark size="text-lg" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              className="relative flex size-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.045] text-muted-foreground transition-colors hover:border-[var(--rosso)]/35 hover:text-foreground"
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell className="size-4" />
              {notificationItems.length > 0 && (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-[var(--rosso)]" />
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-11 z-50 w-72 rounded-[1.35rem] border border-white/10 bg-[#101013] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-heading text-sm font-bold">Today reminders</p>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted-foreground">
                    {notificationItems.length || "clear"}
                  </span>
                </div>
                {notificationItems.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] p-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-[var(--aqua)]" />
                    You are caught up for now.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notificationItems.map((item) => (
                      <Link
                        key={item.href + item.title}
                        href={item.href}
                        onClick={() => setNotificationsOpen(false)}
                        className="block rounded-2xl border border-white/7 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.07]"
                      >
                        <p className="text-sm font-bold">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <Link
            href="/profile"
            aria-label="Open profile"
            className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.045] py-1 pl-1 pr-2 transition-colors hover:border-[var(--rosso)]/35 hover:bg-white/[0.07]"
          >
            <Avatar className="size-8 border border-white/10 bg-[var(--rosso)]/12 shadow-[0_0_24px_rgba(244,63,63,0.12)]">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={`${user?.name ?? "User"} profile`} />
              )}
                <AvatarFallback className="bg-transparent text-sm font-bold text-[var(--rosso-light)]">
                  {user ? initials(user.name) : "??"}
                </AvatarFallback>
              </Avatar>
            <span className="max-w-20 truncate text-xs font-semibold text-muted-foreground">
              {user?.name ?? "Profile"}
            </span>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-3">
        <ul className="flex items-stretch justify-around rounded-[1.6rem] border border-white/8 bg-black/72 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition-colors",
                    active ? "text-white" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full transition-colors",
                      active && "bg-[var(--rosso)] text-white shadow-[0_8px_22px_rgba(244,63,63,0.32)]",
                    )}
                  >
                    <Icon className="size-[16px]" strokeWidth={active ? 2.5 : 2} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function buildNotifications(waterMl: number, sleepHours: number, mealCount: number) {
  const items: { title: string; description: string; href: string }[] = [];
  if (mealCount === 0) {
    items.push({
      title: "Log your first meal",
      description: "Your calorie and macro graphs need today's meals.",
      href: "/log",
    });
  }
  if (waterMl < 2000) {
    items.push({
      title: "Hydration check",
      description: `${(waterMl / 1000).toFixed(1)}L logged today. Add water from Today.`,
      href: "/dashboard",
    });
  }
  if (sleepHours === 0) {
    items.push({
      title: "Add sleep",
      description: "Log last night's sleep so Stats can build your trend.",
      href: "/dashboard",
    });
  }
  return items.slice(0, 3);
}
