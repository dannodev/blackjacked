"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BarChart3, Utensils, Dumbbell, Users, Bell, ClipboardList, CheckCircle2, Cloud, CloudOff, LoaderCircle, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Wordmark } from "@/components/brand/wordmark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  loadMySquad,
  subscribeToSquad,
  touchMySquadPresence,
  updateMySquadMemberProfile,
  type SquadSnapshot,
} from "@/lib/supabase/squad";
import { toast } from "sonner";
import { getCloudSyncState, subscribeCloudSyncState } from "@/lib/cloud-sync";

const nav = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/menu", label: "Menu", icon: Utensils },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/squad", label: "Squad", icon: Users },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
];
const mobileNav = nav.filter((item) => !["/log", "/squad"].includes(item.href));

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profile = useStore((s) => s.profile);
  const waterToday = useStore((s) => s.waterToday);
  const sleepToday = useStore((s) => s.sleepToday);
  const meals = useStore((s) => s.meals);
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [squadSnapshot, setSquadSnapshot] = useState<SquadSnapshot | null>(null);
  const [messageSenderIds, setMessageSenderIds] = useState<string[]>([]);
  const syncState = useSyncExternalStore(subscribeCloudSyncState, getCloudSyncState, () => "idle");
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const initializedSquadRef = useRef(false);
  const squadMembersRef = useRef<SquadSnapshot["members"]>([]);
  const squadRefreshTimerRef = useRef<number | null>(null);
  const notificationItems = useMemo(
    () =>
      buildNotifications(
        waterToday,
        sleepToday,
        meals.length,
        messageSenderIds.map((senderId) => {
          const member = squadSnapshot?.members.find(
            (item) => item.user_id === senderId,
          );
          return member?.display_name ?? "Someone";
        }),
        language,
      ),
    [language, meals.length, messageSenderIds, sleepToday, squadSnapshot?.members, waterToday],
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        profileMenuOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [notificationsOpen, profileMenuOpen]);

  useEffect(() => {
    if (pathname.startsWith("/squad")) setMessageSenderIds([]);
  }, [pathname]);

  useEffect(() => {
    squadMembersRef.current = squadSnapshot?.members ?? [];
  }, [squadSnapshot?.members]);

  const scheduleSquadSnapshotReload = useCallback(() => {
    if (squadRefreshTimerRef.current) window.clearTimeout(squadRefreshTimerRef.current);
    squadRefreshTimerRef.current = window.setTimeout(() => {
      squadRefreshTimerRef.current = null;
      loadMySquad()
        .then(setSquadSnapshot)
        .catch(() => undefined);
    }, 450);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (!user?.id) {
      setSquadSnapshot(null);
      initializedSquadRef.current = true;
      return;
    }

    if (pathname.startsWith("/squad")) {
      initializedSquadRef.current = true;
      return;
    }

    const load = () => {
      loadMySquad()
        .then((snapshot) => {
          if (cancelled) return;
          setSquadSnapshot(snapshot);
          initializedSquadRef.current = true;
        })
        .catch(() => {
          initializedSquadRef.current = true;
        });
    };

    const handle = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(load, { timeout: 1200 })
      : window.setTimeout(load, 250);

    return () => {
      cancelled = true;
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [pathname, user?.id]);

  useEffect(() => {
    if (!squadSnapshot?.squad.id || !user?.id || pathname.startsWith("/squad")) {
      return;
    }

    const unsubscribe = subscribeToSquad(squadSnapshot.squad.id, (event) => {
      let shouldReloadSnapshot = false;
      if (
        event?.table === "squad_messages" &&
        event.eventType === "INSERT" &&
        typeof event.new?.user_id === "string" &&
        event.new.user_id !== user.id &&
        initializedSquadRef.current
      ) {
        const senderId = event.new.user_id;
        setMessageSenderIds((current) =>
          current.includes(senderId) ? current : [...current, senderId],
        );
        const sender = squadMembersRef.current.find(
          (member) => member.user_id === senderId,
        );
        toast.info(t(language, `${sender?.display_name ?? "Someone"} sent a message`), {
          description: t(language, "Open Squad to read it."),
        });
      }

      if (
        event?.table === "squads" ||
        event?.table === "squad_members"
      ) {
        shouldReloadSnapshot = true;
      }

      if (shouldReloadSnapshot) scheduleSquadSnapshotReload();
    });
    return () => {
      if (squadRefreshTimerRef.current) {
        window.clearTimeout(squadRefreshTimerRef.current);
        squadRefreshTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [language, pathname, scheduleSquadSnapshotReload, squadSnapshot?.squad.id, user?.id]);

  useEffect(() => {
    if (!squadSnapshot?.squad.id || pathname.startsWith("/squad")) return;

    const touch = () => {
      if (document.visibilityState === "visible") {
        touchMySquadPresence(squadSnapshot.squad.id).catch(() => undefined);
      }
    };

    touch();
    const interval = window.setInterval(touch, 60_000);
    document.addEventListener("visibilitychange", touch);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", touch);
    };
  }, [pathname, squadSnapshot?.squad.id]);

  useEffect(() => {
    if (!squadSnapshot?.squad.id || !user?.id) return;
    updateMySquadMemberProfile(
      squadSnapshot.squad.id,
      user.name || user.email?.split("@")[0] || "Racer",
      profile?.avatar_url ?? null,
    ).catch(() => undefined);
  }, [profile?.avatar_url, squadSnapshot?.squad.id, user?.email, user?.id, user?.name]);

  return (
    <div className="app-glow mx-auto flex min-h-[100dvh] max-w-7xl overflow-hidden bg-background pt-[env(safe-area-inset-top)] shadow-[0_0_80px_rgba(0,0,0,0.55)] sm:border-x sm:border-white/8">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/7 px-4 py-5 md:flex">
        <Wordmark size="text-xl" />
        <nav className="mt-8 space-y-1" aria-label="Primary navigation">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} className={cn(
              "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors",
              active ? "bg-[var(--rosso)] text-white" : "text-muted-foreground hover:bg-white/[0.06] hover:text-white",
            )}><Icon className="size-4" />{t(language, label)}</Link>;
          })}
        </nav>
        <Link href="/profile" className="mt-auto flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-muted-foreground hover:bg-white/[0.06] hover:text-white">
          <Settings className="size-4" />{t(language, "My profile")}
        </Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Sticky app bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-background/94 px-4 py-3 md:bg-background/72 md:backdrop-blur-2xl">
        <Link href="/dashboard" className="flex items-center">
          <Wordmark size="text-lg" />
        </Link>
        <div className="flex items-center gap-2">
          {syncState !== "idle" && <div className="hidden items-center gap-1 rounded-full border border-white/8 px-2 py-1 text-[10px] text-muted-foreground sm:flex" role="status">
            {syncState === "syncing" ? <LoaderCircle className="size-3 animate-spin" /> : syncState === "offline" ? <CloudOff className="size-3" /> : <Cloud className="size-3 text-[var(--amber)]" />}
            {syncState === "syncing" ? "Syncing" : syncState === "offline" ? "Offline · queued" : "Sync retrying"}
          </div>}
          <button
            type="button"
            aria-label={t(language, "Language")}
            title={language === "en" ? "Cambiar a español" : "Switch to English"}
            data-no-translate
            className="flex h-9 min-w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.045] px-2 text-xs font-black uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-[var(--rosso)]/35 hover:text-foreground"
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
          >
            {language === "en" ? "ES" : "EN"}
          </button>
          <div ref={notificationsRef} className="relative">
            <button
              aria-label={t(language, "Notifications")}
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
                  <p className="font-heading text-sm font-bold">{t(language, "Today reminders")}</p>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted-foreground">
                    {notificationItems.length || t(language, "clear")}
                  </span>
                </div>
                {notificationItems.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] p-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-[var(--aqua)]" />
                    {t(language, "You are caught up for now.")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notificationItems.map((item) => (
                      <Link
                        key={item.href + item.title}
                        href={item.href}
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (item.kind === "squad-message") setMessageSenderIds([]);
                        }}
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
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              aria-label={t(language, "Open profile menu")}
              aria-expanded={profileMenuOpen}
              className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.045] py-1 pl-1 pr-2 transition-colors hover:border-[var(--rosso)]/35 hover:bg-white/[0.07]"
              onClick={() => {
                setProfileMenuOpen((open) => !open);
                setNotificationsOpen(false);
              }}
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
                {user?.name ?? t(language, "Profile")}
              </span>
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-11 z-50 w-48 rounded-[1.25rem] border border-white/10 bg-[#101013] p-2 shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
                <Link
                  href="/profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/[0.06]"
                >
                  <Settings className="size-4 text-[var(--rosso-light)]" />
                  {t(language, "My profile")}
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-[var(--over)] transition-colors hover:bg-white/[0.06]"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await signOut();
                    router.replace("/login");
                  }}
                >
                  <LogOut className="size-4" />
                  {t(language, "Log out")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-28 pt-4 md:px-8 md:pb-10 lg:px-10">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-3 md:hidden">
        <ul className="flex items-stretch justify-around rounded-[1.6rem] border border-white/8 bg-black/94 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_18px_50px_rgba(0,0,0,0.5)] md:bg-black/72 md:backdrop-blur-2xl">
          {mobileNav.map(({ href, label, icon: Icon }) => {
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
                  {t(language, label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      </div>
    </div>
  );
}

function buildNotifications(
  waterMl: number,
  sleepHours: number,
  mealCount: number,
  messageSenderNames: string[],
  language: "en" | "es",
) {
  const items: {
    title: string;
    description: string;
    href: string;
    kind?: "squad-message";
  }[] = [];
  if (messageSenderNames.length > 0) {
    items.push({
      title: t(language, formatMessageSenderTitle(messageSenderNames)),
      description: t(language, "Open Squad to read the latest chat."),
      href: "/squad",
      kind: "squad-message",
    });
  }
  if (mealCount === 0) {
    items.push({
      title: t(language, "Log your first meal"),
      description: t(language, "Your calorie and macro graphs need today's meals."),
      href: "/log",
    });
  }
  if (waterMl < 2000) {
    items.push({
      title: t(language, "Hydration check"),
      description: `${(waterMl / 1000).toFixed(1)}L ${language === "es" ? "registrados hoy. Agrega agua desde Hoy." : "logged today. Add water from Today."}`,
      href: "/dashboard#hydration",
    });
  }
  if (sleepHours === 0) {
    items.push({
      title: t(language, "Add sleep"),
      description: t(language, "Log last night's sleep so Stats can build your trend."),
      href: "/dashboard#sleep",
    });
  }
  return items.slice(0, 3);
}

function formatMessageSenderTitle(names: string[]) {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (uniqueNames.length === 1) return `${uniqueNames[0]} sent a message`;
  if (uniqueNames.length === 2) return `${uniqueNames[0]} and ${uniqueNames[1]} sent messages`;
  return `${uniqueNames.slice(0, -1).join(", ")} and ${uniqueNames.at(-1)} sent messages`;
}
