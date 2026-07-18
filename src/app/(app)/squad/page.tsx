"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  Banana,
  Copy,
  Crown,
  Dumbbell,
  Flame,
  Loader2,
  LogOut,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Target,
  Utensils,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { computeDay, normalizeGoal, sameDay, todayKey } from "@/lib/types";
import {
  createRemoteSquad,
  joinRemoteSquad,
  leaveRemoteSquad,
  loadMySquad,
  sendSquadMessage,
  subscribeToSquad,
  syncMySquadActivity,
  touchMySquadPresence,
  updateRemoteSquadName,
  type SquadActivityRow,
  type SquadMemberRow,
  type SquadMessageRow,
  type SquadRow,
  type SquadSnapshot,
} from "@/lib/supabase/squad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MemberWithActivity = SquadMemberRow & {
  activity?: SquadActivityRow;
};

type SquadRealtimeEvent = {
  table: "squads" | "squad_members" | "squad_activity" | "squad_messages";
  eventType: "INSERT" | "UPDATE" | "DELETE" | "*";
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

export default function SquadPage() {
  const { user } = useAuth();
  const meals = useStore((s) => s.meals);
  const exerciseLogs = useStore((s) => s.exerciseLogs);
  const streaks = useStore((s) => s.streaks);
  const noMasturbationStreaks = useStore((s) => s.noMasturbationStreaks);
  const profile = useStore((s) => s.profile)!;

  const [snapshot, setSnapshot] = useState<SquadSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [squadNameDraft, setSquadNameDraft] = useState("");
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const messagesListRef = useRef<HTMLDivElement | null>(null);

  const today = todayKey();
  const displayName = user?.name || user?.email?.split("@")[0] || "Racer";

  const publicActivity = useMemo(() => {
    const todayMeals = meals.filter((meal) => sameDay(meal.loggedAt, today));
    const todayExercises = exerciseLogs.filter((log) => sameDay(log.loggedAt, today));
    const day = computeDay(todayMeals, todayExercises, profile);
    const goal = normalizeGoal(profile);
    const publicNoMasturbationStreaks =
      profile.sex === "male"
        ? noMasturbationStreaks
        : { current_streak: 0, longest_streak: 0, last_logged_date: null };
    const calorieTargetMet =
      goal.mode === "gain"
        ? day.kcal_in >= profile.calorie_goal
        : goal.mode === "maintain"
          ? Math.abs(day.kcal_in - profile.calorie_goal) <= 150
          : day.kcal_in <= profile.calorie_goal && day.kcal_in > 0;

    return {
      date: today,
      kcalIn: todayMeals.reduce((sum, meal) => sum + meal.total_kcal, 0),
      kcalOutActivity: todayExercises.reduce(
        (sum, log) => sum + log.kcal_burned,
        0,
      ),
      mealsCount: todayMeals.length,
      workoutsCount: todayExercises.length,
      streaks,
      noMasturbationStreaks: publicNoMasturbationStreaks,
      noMasturbationLoggedToday: publicNoMasturbationStreaks.last_logged_date === today,
      goalMode: goal.mode,
      goalProgressPct: goal.progress,
      goalDeltaKg: goal.currentDelta,
      goalTargetDeltaKg: goal.targetDelta,
      calorieTargetMet,
      exerciseDone: todayExercises.length > 0,
    };
  }, [exerciseLogs, meals, noMasturbationStreaks, profile, streaks, today]);

  const refreshSquad = useCallback(async () => {
    const next = await loadMySquad();
    setSnapshot(next);
    setLoading(false);
  }, []);

  const applyRealtimeEvent = useCallback((event?: SquadRealtimeEvent) => {
    if (!event) return;
    setSnapshot((current) => patchSquadSnapshot(current, event));
  }, []);

  const patchOwnPublicActivity = useCallback(() => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const ownActivity: SquadActivityRow = {
      squad_id: snapshot?.squad.id ?? "",
      user_id: user.id,
      date: publicActivity.date,
      kcal_in: Math.round(publicActivity.kcalIn),
      kcal_out_activity: Math.round(publicActivity.kcalOutActivity),
      workouts_count: publicActivity.workoutsCount,
      meals_count: publicActivity.mealsCount,
      streak: publicActivity.streaks.current_streak,
      no_masturbation_streak:
        publicActivity.noMasturbationStreaks?.current_streak ?? 0,
      no_masturbation_longest_streak:
        publicActivity.noMasturbationStreaks?.longest_streak ?? 0,
      no_masturbation_logged_today:
        publicActivity.noMasturbationLoggedToday ?? false,
      goal_mode: publicActivity.goalMode ?? null,
      goal_progress_pct: publicActivity.goalProgressPct ?? 0,
      goal_delta_kg: publicActivity.goalDeltaKg ?? 0,
      goal_target_delta_kg: publicActivity.goalTargetDeltaKg ?? 0,
      calorie_target_met: publicActivity.calorieTargetMet ?? false,
      exercise_done: publicActivity.exerciseDone ?? publicActivity.workoutsCount > 0,
      updated_at: now,
    };

    setSnapshot((current) => {
      if (!current) return current;
      return {
        ...current,
        members: upsertBy(
          current.members,
          {
            squad_id: current.squad.id,
            user_id: user.id,
            display_name: displayName,
            avatar_url: profile.avatar_url ?? null,
            color:
              current.members.find((member) => member.user_id === user.id)?.color ??
              "#dc0000",
            role:
              current.members.find((member) => member.user_id === user.id)?.role ??
              "member",
            last_seen_at: now,
            joined_at:
              current.members.find((member) => member.user_id === user.id)?.joined_at ??
              now,
          },
          (member) => member.user_id,
        ),
        activity: upsertBy(
          current.activity,
          { ...ownActivity, squad_id: current.squad.id },
          (activity) => `${activity.user_id}:${activity.date}`,
        ),
      };
    });
  }, [displayName, profile.avatar_url, publicActivity, snapshot?.squad.id, user?.id]);

  useEffect(() => {
    refreshSquad().catch((error) => {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "Could not load squad");
    });
  }, [refreshSquad]);

  useEffect(() => {
    if (!snapshot?.squad.id) return;
    return subscribeToSquad(snapshot.squad.id, applyRealtimeEvent);
  }, [applyRealtimeEvent, snapshot?.squad.id]);

  useEffect(() => {
    if (!snapshot?.squad.id) return;

    syncMySquadActivity(snapshot.squad.id, publicActivity, {
      displayName,
      avatarUrl: profile.avatar_url ?? null,
    })
      .then(patchOwnPublicActivity)
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Could not sync squad stats",
        );
      });
  }, [displayName, patchOwnPublicActivity, profile.avatar_url, publicActivity, snapshot?.squad.id]);

  useEffect(() => {
    if (!snapshot?.squad.id) return;
    const touch = () => {
      if (document.visibilityState === "visible") {
        touchMySquadPresence(snapshot.squad.id).catch(() => undefined);
      }
    };

    touch();
    const interval = window.setInterval(touch, 60_000);
    document.addEventListener("visibilitychange", touch);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", touch);
    };
  }, [snapshot?.squad.id]);

  useEffect(() => {
    const list = messagesListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [snapshot?.messages.length]);

  const members = useMemo<MemberWithActivity[]>(() => {
    const activityByUser = new Map(
      snapshot?.activity
        .filter((activity) => activity.date === today)
        .map((activity) => [activity.user_id, activity]) ?? [],
    );

    return [...(snapshot?.members ?? [])]
      .filter((member) => member.user_id !== user?.id)
      .map((member) => ({
        ...member,
        activity: activityByUser.get(member.user_id),
      }))
      .sort((a, b) => {
        const aBurn = a.activity?.kcal_out_activity ?? 0;
        const bBurn = b.activity?.kcal_out_activity ?? 0;
        return bBurn - aBurn;
      });
  }, [snapshot?.activity, snapshot?.members, today, user?.id]);

  const handleCreate = async () => {
    const name = newSquadName.trim();
    if (!name) {
      toast.error("Name your squad");
      return;
    }

    setBusy(true);
    try {
      const next = await createRemoteSquad(name, displayName);
      setSnapshot(next);
      setNewSquadName("");
      toast.success("Squad created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create squad");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code) {
      toast.error("Enter a squad code");
      return;
    }

    setBusy(true);
    try {
      const next = await joinRemoteSquad(code, displayName);
      setSnapshot(next);
      setJoinCode("");
      toast.success("Joined squad");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join squad");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!snapshot) return;

    setBusy(true);
    try {
      await leaveRemoteSquad(snapshot.squad.id);
      setSnapshot(null);
      toast.success("Left squad");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not leave squad");
    } finally {
      setBusy(false);
    }
  };

  const handleRenameSquad = async () => {
    if (!snapshot) return;
    const cleanName = squadNameDraft.trim();
    if (!cleanName) {
      toast.error("Name your squad");
      return;
    }

    setBusy(true);
    try {
      const next = await updateRemoteSquadName(snapshot.squad.id, cleanName);
      if (next) setSnapshot(next);
      setEditingName(false);
      toast.success("Squad name updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename squad");
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async () => {
    if (!snapshot) return;
    const body = message.trim();
    if (!body) return;

    try {
      const sent = await sendSquadMessage(snapshot.squad.id, body);
      if (sent) {
        setSnapshot((current) =>
          patchSquadSnapshot(current, {
            table: "squad_messages",
            eventType: "INSERT",
            new: sent,
          }),
        );
      }
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-[var(--rosso-light)]" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="space-y-5">
        <SquadHeader
          eyebrow="Community"
          title="Squad"
          subtitle="Create a crew or join one with a code. Shared stats stay public; body data stays private."
        />

        <Card className="premium-panel rounded-[1.8rem]">
          <CardContent className="space-y-5 py-7">
            <div className="flex items-start gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
                <Users className="size-7" />
              </div>
              <div>
                <p className="font-heading text-lg font-bold">Start the beef</p>
                <p className="text-sm text-muted-foreground">
                  Create a squad and share the invite code with up to 5 friends.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="squad-name">Squad name</Label>
              <Input
                id="squad-name"
                placeholder="e.g. Ferrari Fam"
                value={newSquadName}
                onChange={(event) => setNewSquadName(event.target.value)}
              />
              <Button
                onClick={handleCreate}
                disabled={busy}
                className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
              >
                {busy ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 size-4" />
                )}
                Create squad
              </Button>
            </div>

            <div className="relative py-1 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              or join one
            </div>

            <div className="space-y-2">
              <Label htmlFor="join-code">Squad code</Label>
              <Input
                id="join-code"
                placeholder="A7K9Q2"
                value={joinCode}
                maxLength={6}
                className="uppercase tracking-[0.25em]"
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              />
              <Button
                variant="outline"
                onClick={handleJoin}
                disabled={busy}
                className="w-full"
              >
                Join squad
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">
                Rename squad
              </p>
              <Input
                value={squadNameDraft}
                maxLength={40}
                autoFocus
                onChange={(event) => setSquadNameDraft(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
                  disabled={busy}
                  onClick={handleRenameSquad}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setEditingName(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <SquadHeader
              eyebrow={`${members.length} teammate${members.length === 1 ? "" : "s"}`}
              title={snapshot.squad.name}
            />
          )}
        </div>
        {!editingName && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSquadNameDraft(snapshot.squad.name);
              setEditingName(true);
            }}
            disabled={busy}
            className="mt-1 shrink-0"
          >
            <Pencil className="mr-1 size-4" />
            Name
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmLeaveOpen(true)}
          disabled={busy}
          className="mt-1 shrink-0"
        >
          <LogOut className="mr-1 size-4" />
          Leave
        </Button>
      </div>

      {confirmLeaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm rounded-[1.6rem] border-white/10 bg-[#101013]">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="font-heading text-lg font-bold">Leave squad?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You will stop syncing with this squad. You can join again later with the invite code.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirmLeaveOpen(false)}
                >
                  Stay
                </Button>
                <Button
                  className="bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
                  disabled={busy}
                  onClick={async () => {
                    await handleLeave();
                    setConfirmLeaveOpen(false);
                  }}
                >
                  Leave
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <NoFapLeaderboard
        members={snapshot.members}
        activity={snapshot.activity.filter((item) => item.date === today)}
      />

      <div className="space-y-2">
        {members.length === 0 ? (
          <Card className="rounded-[1.5rem] border-dashed border-white/10 bg-white/[0.035]">
            <CardContent className="py-4 text-sm text-muted-foreground">
              No teammates to show yet. Share the invite code and bring the beef.
            </CardContent>
          </Card>
        ) : (
          members.map((member, index) => (
            <MemberCard
              key={member.user_id}
              member={member}
              rank={index + 1}
            />
          ))
        )}
      </div>

      <Card className="premium-panel rounded-[1.8rem]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <MessageCircle className="size-4 text-[var(--rosso-light)]" />
            Squad talk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={messagesListRef} className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {snapshot.messages.length === 0 ? (
              <p className="rounded-2xl border border-white/7 bg-white/[0.03] px-4 py-5 text-center text-sm text-muted-foreground">
                No messages yet. Be brave. Start the beef.
              </p>
            ) : (
              snapshot.messages.map((item) => (
                <MessageBubble
                  key={item.id}
                  message={item}
                  member={snapshot.members.find(
                    (member) => member.user_id === item.user_id,
                  )}
                  isYou={item.user_id === user?.id}
                />
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={message}
              maxLength={500}
              placeholder="Talk your trash..."
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSendMessage();
                }
              }}
            />
            <Button
              aria-label="Send squad message"
              className="bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
              onClick={handleSendMessage}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="premium-panel rounded-[1.35rem]">
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Invite code
            </p>
            <p className="font-heading text-2xl font-black tracking-[0.18em] text-[var(--rosso-light)]">
              {snapshot.squad.invite_code}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(snapshot.squad.invite_code);
              toast.success("Code copied");
            }}
          >
            <Copy className="mr-1 size-4" />
            Copy
          </Button>
        </CardContent>
      </Card>

      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/75">
        <ShieldCheck className="mr-1 inline size-3 text-[var(--rosso-light)]" />
        Squad shares meals, calories, workouts, streaks, goal progress, and messages.
        Height, weight, birthdate, and body measurements stay private. No height or weight is shared.
      </p>
    </div>
  );
}

function SquadHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">
        {eyebrow}
      </p>
      <h1 className="font-heading text-3xl font-extrabold">{title}</h1>
      {subtitle && (
        <p className="max-w-xl text-sm font-medium text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function dayWord(count: number) {
  return count === 1 ? "day" : "days";
}

function upsertBy<T>(
  items: T[],
  nextItem: T,
  getKey: (item: T) => string,
) {
  const nextKey = getKey(nextItem);
  let matched = false;
  const nextItems = items.map((item) => {
    if (getKey(item) !== nextKey) return item;
    matched = true;
    return { ...item, ...nextItem };
  });
  return matched ? nextItems : [...nextItems, nextItem];
}

function patchSquadSnapshot(
  current: SquadSnapshot | null,
  event: SquadRealtimeEvent,
) {
  if (!current) return current;

  if (event.table === "squads") {
    const row = (event.new ?? event.old) as Partial<SquadRow>;
    if (row.id !== current.squad.id) return current;
    if (event.eventType === "DELETE") return null;
    return { ...current, squad: { ...current.squad, ...row } as SquadRow };
  }

  if (event.table === "squad_members") {
    const row = (event.new ?? event.old) as Partial<SquadMemberRow>;
    if (row.squad_id !== current.squad.id || !row.user_id) return current;
    if (event.eventType === "DELETE") {
      return {
        ...current,
        members: current.members.filter((member) => member.user_id !== row.user_id),
      };
    }
    const members = upsertBy(
      current.members,
      row as SquadMemberRow,
      (member) => member.user_id,
    ).sort((a, b) => a.joined_at.localeCompare(b.joined_at));
    return { ...current, members };
  }

  if (event.table === "squad_activity") {
    const row = (event.new ?? event.old) as Partial<SquadActivityRow>;
    if (row.squad_id !== current.squad.id || !row.user_id || !row.date) {
      return current;
    }
    if (event.eventType === "DELETE") {
      return {
        ...current,
        activity: current.activity.filter(
          (activity) =>
            activity.user_id !== row.user_id || activity.date !== row.date,
        ),
      };
    }
    return {
      ...current,
      activity: upsertBy(
        current.activity,
        row as SquadActivityRow,
        (activity) => `${activity.user_id}:${activity.date}`,
      ),
    };
  }

  const row = (event.new ?? event.old) as Partial<SquadMessageRow>;
  if (row.squad_id !== current.squad.id || !row.id) return current;
  if (event.eventType === "DELETE") {
    return {
      ...current,
      messages: current.messages.filter((message) => message.id !== row.id),
    };
  }
  const messages = upsertBy(
    current.messages,
    row as SquadMessageRow,
    (message) => message.id,
  )
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-50);
  return { ...current, messages };
}

function NoFapLeaderboard({
  members,
  activity,
}: {
  members: SquadMemberRow[];
  activity: SquadActivityRow[];
}) {
  const activityByUser = new Map(activity.map((item) => [item.user_id, item]));
  const rows = members
    .map((member) => ({
      member,
      streak: activityByUser.get(member.user_id)?.no_masturbation_streak ?? 0,
      highestStreak:
        activityByUser.get(member.user_id)?.no_masturbation_longest_streak ?? 0,
    }))
    .sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      if (b.highestStreak !== a.highestStreak) return b.highestStreak - a.highestStreak;
      return a.member.display_name.localeCompare(b.member.display_name);
    });

  return (
    <Card className="rounded-[1.45rem] border-white/7 bg-white/[0.035]">
      <CardContent className="py-3">
        <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground">
          <Banana className="size-3 text-cyan-200" />
          No-fap leaderboard
        </p>
        <div className="grid grid-cols-2 gap-2">
          {rows.slice(0, 4).map((row, index) => (
            <div
              key={row.member.user_id}
              className="rounded-2xl border border-white/7 bg-black/20 px-3 py-2"
            >
              <p className="truncate text-xs font-bold">
                {index + 1}. {row.member.display_name}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <span className="font-bold text-cyan-200">{row.streak}</span>{" "}
                {dayWord(row.streak)} · highest streak {row.highestStreak}{" "}
                {dayWord(row.highestStreak)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MemberCard({
  member,
  rank,
}: {
  member: MemberWithActivity;
  rank: number;
}) {
  const activity = member.activity;
  const burned = activity?.kcal_out_activity ?? 0;
  const kcalIn = activity?.kcal_in ?? 0;
  const meals = activity?.meals_count ?? 0;
  const workouts = activity?.workouts_count ?? 0;
  const streak = activity?.streak ?? 0;
  const noMasturbationStreak = activity?.no_masturbation_streak ?? 0;
  const noMasturbationLongestStreak = activity?.no_masturbation_longest_streak ?? 0;
  const goalProgress = Math.round(activity?.goal_progress_pct ?? 0);
  const goalMode = activity?.goal_mode ?? "lose";
  const calorieTargetMet = activity?.calorie_target_met ?? false;
  const exerciseDone = activity?.exercise_done ?? workouts > 0;
  const online = isMemberOnline(member.last_seen_at);

  return (
    <div>
      <Card className="carbon-card rounded-[1.6rem] border-white/7">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-2xl font-heading text-lg font-bold text-white"
              style={{ background: member.color }}
            >
              {rank === 1 ? (
                <Crown className="size-6" />
              ) : (
                member.display_name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-base font-bold">
                    <span
                      className={
                        "mr-1.5 inline-block size-2 rounded-full align-middle " +
                        (online ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" : "bg-zinc-500")
                      }
                    />
                    {member.display_name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {online ? "Online now" : `Last seen ${formatLastSeen(member.last_seen_at)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center gap-1 text-[var(--rosso-light)]" title="Fitness streak">
                    <Flame className="size-3.5" />
                    <span className="text-xs font-semibold">{streak}</span>
                  </div>
                  <div className="flex items-center gap-1 text-cyan-200" title="No-fap streak">
                    <Banana className="size-3.5" />
                    <span className="text-xs font-semibold">{noMasturbationStreak}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <StatPill
                  icon={<Dumbbell className="size-3.5" />}
                  label="Burned"
                  value={`${Math.round(burned)} kcal`}
                />
                <StatPill
                  icon={<Utensils className="size-3.5" />}
                  label="Meals"
                  value={`${meals} / ${Math.round(kcalIn)} kcal`}
                />
                <StatPill
                  icon={<Banana className="size-3.5" />}
                  label="No-fap"
                  value={`${noMasturbationStreak} now / ${noMasturbationLongestStreak} best`}
                />
                <StatPill
                  icon={<Flame className="size-3.5" />}
                  label="Fit streak"
                  value={`${streak} days`}
                />
              </div>
              <div className="mt-3 rounded-2xl border border-white/7 bg-white/[0.035] p-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target className="size-3.5" />
                    <span className="capitalize">{goalMode} goal</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--rosso-light)]">
                    {goalProgress}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--rosso)]"
                    style={{ width: `${Math.min(100, goalProgress)}%` }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <StatusPill
                    label="Calories"
                    ok={calorieTargetMet}
                    good="target hit"
                    bad="pending"
                  />
                  <StatusPill
                    label="Exercise"
                    ok={exerciseDone}
                    good="done"
                    bad="not yet"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({
  label,
  ok,
  good,
  bad,
}: {
  label: string;
  ok: boolean;
  good: string;
  bad: string;
}) {
  return (
    <div
      className={
        "rounded-full px-2 py-1 " +
        (ok
          ? "bg-[var(--aqua)]/10 text-[var(--aqua)]"
          : "bg-white/[0.045] text-muted-foreground")
      }
    >
      {label}: {ok ? good : bad}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/7 bg-white/[0.035] px-2.5 py-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MessageBubble({
  message,
  member,
  isYou,
}: {
  message: SquadMessageRow;
  member?: SquadMemberRow;
  isYou: boolean;
}) {
  const fallback = (member?.display_name ?? "Racer").slice(0, 2).toUpperCase();
  return (
    <div className={isYou ? "flex items-end justify-end gap-2" : "flex items-end justify-start gap-2"}>
      {!isYou && (
        <Avatar
          key={member?.avatar_url ?? `${member?.user_id ?? "unknown"}-fallback`}
          className="size-8 shrink-0 border border-white/10"
        >
          <AvatarImage src={member?.avatar_url ?? undefined} alt={member?.display_name ?? "Racer"} />
          <AvatarFallback
            className="font-heading text-[11px] text-white"
            style={{ background: member?.color ?? "var(--rosso)" }}
          >
            {fallback}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={
          isYou
            ? "max-w-[82%] rounded-2xl bg-[var(--rosso)] px-4 py-3 text-white"
            : "max-w-[82%] rounded-2xl border border-white/7 bg-white/[0.045] px-4 py-3"
        }
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-70">
          {member?.display_name ?? "Racer"}
        </p>
        <p className="mt-1 text-sm">{message.body}</p>
      </div>
      {isYou && (
        <Avatar
          key={member?.avatar_url ?? `${member?.user_id ?? "you"}-fallback`}
          className="size-8 shrink-0 border border-white/10"
        >
          <AvatarImage src={member?.avatar_url ?? undefined} alt={member?.display_name ?? "You"} />
          <AvatarFallback
            className="font-heading text-[11px] text-white"
            style={{ background: member?.color ?? "var(--rosso)" }}
          >
            {fallback}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function isMemberOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}

function formatLastSeen(lastSeenAt?: string | null) {
  if (!lastSeenAt) return "a while ago";
  const elapsedMs = Math.max(0, Date.now() - new Date(lastSeenAt).getTime());
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
