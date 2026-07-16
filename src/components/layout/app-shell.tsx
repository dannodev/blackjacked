"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, BarChart3, Utensils, Dumbbell, Users, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Wordmark } from "@/components/brand/wordmark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Today", icon: Home },
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
  const isLogPage = pathname === "/log" || pathname.startsWith("/log/");
  const hideQuickLog = isLogPage || pathname === "/stats";

  return (
    <div className="app-glow mx-auto flex min-h-[100dvh] max-w-md flex-col overflow-hidden bg-background shadow-[0_0_80px_rgba(0,0,0,0.55)] sm:border-x sm:border-white/8">
      {/* Sticky app bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-background/72 px-4 py-3 backdrop-blur-2xl">
        <Link href="/dashboard" className="flex items-center">
          <Wordmark size="text-lg" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            aria-label="Notifications"
            className="flex size-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.045] text-muted-foreground"
          >
            <Bell className="size-4" />
          </button>
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

      {/* Log FAB */}
      {!hideQuickLog && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[4.8rem] z-40 mx-auto flex max-w-md justify-end pr-5">
          <Link
            href="/log"
            className="group pointer-events-auto flex w-fit items-center"
            aria-label="Quick log"
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(145deg,var(--rosso-light),var(--rosso-dark))] text-white rosso-glow ring-4 ring-black/45 transition-transform active:scale-[0.88]"
              style={{ height: "3.5rem", width: "3.5rem" }}
            >
              <Plus className="size-7" strokeWidth={2.5} />
            </span>
          </Link>
        </div>
      )}

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
