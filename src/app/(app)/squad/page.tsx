"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Crown,
  Dumbbell,
  Flame,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Utensils,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { sameDay, todayKey } from "@/lib/types";
import {
  createRemoteSquad,
  joinRemoteSquad,
  leaveRemoteSquad,
  loadMySquad,
  sendSquadMessage,
  subscribeToSquad,
  syncMySquadActivity,
  type SquadActivityRow,
  type SquadMemberRow,
  type SquadMessageRow,
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

type MemberWithActivity = SquadMemberRow & {
  activity?: SquadActivityRow;
};

export default function SquadPage() {
  const { user } = useAuth();
  const meals = useStore((s) => s.meals);
  const exerciseLogs = useStore((s) => s.exerciseLogs);
  const streaks = useStore((s) => s.streaks);

  const [snapshot, setSnapshot] = useState<SquadSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");

  const today = todayKey();
  const displayName = user?.name || user?.email?.split("@")[0] || "Racer";

  const publicActivity = useMemo(() => {
    const todayMeals = meals.filter((meal) => sameDay(meal.loggedAt, today));
    const todayExercises = exerciseLogs.filter((log) => sameDay(log.loggedAt, today));

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
    };
  }, [exerciseLogs, meals, streaks, today]);

  const refreshSquad = useCallback(async () => {
    const next = await loadMySquad();
    setSnapshot(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshSquad().catch((error) => {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "Could not load squad");
    });
  }, [refreshSquad]);

  useEffect(() => {
    if (!snapshot?.squad.id) return;
    return subscribeToSquad(snapshot.squad.id, () => {
      refreshSquad().catch(() => {
        toast.error("Could not refresh squad");
      });
    });
  }, [refreshSquad, snapshot?.squad.id]);

  useEffect(() => {
    if (!snapshot?.squad.id) return;

    syncMySquadActivity(snapshot.squad.id, publicActivity)
      .then(refreshSquad)
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Could not sync squad stats",
        );
      });
  }, [publicActivity, refreshSquad, snapshot?.squad.id]);

  const members = useMemo<MemberWithActivity[]>(() => {
    const activityByUser = new Map(
      snapshot?.activity
        .filter((activity) => activity.date === today)
        .map((activity) => [activity.user_id, activity]) ?? [],
    );

    return [...(snapshot?.members ?? [])]
      .map((member) => ({
        ...member,
        activity: activityByUser.get(member.user_id),
      }))
      .sort((a, b) => {
        const aBurn = a.activity?.kcal_out_activity ?? 0;
        const bBurn = b.activity?.kcal_out_activity ?? 0;
        return bBurn - aBurn;
      });
  }, [snapshot?.activity, snapshot?.members, today]);

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

  const handleSendMessage = async () => {
    if (!snapshot) return;
    const body = message.trim();
    if (!body) return;

    try {
      await sendSquadMessage(snapshot.squad.id, body);
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
        <SquadHeader
          eyebrow={`${members.length} racer${members.length === 1 ? "" : "s"}`}
          title={snapshot.squad.name}
          subtitle="Live workouts, meals, calories burned, and messages. No height or weight is shared."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleLeave}
          disabled={busy}
          className="mt-1 shrink-0"
        >
          <LogOut className="mr-1 size-4" />
          Leave
        </Button>
      </div>

      <Card className="premium-panel rounded-[1.6rem]">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Invite code
            </p>
            <p className="font-heading text-3xl font-black tracking-[0.18em] text-[var(--rosso-light)]">
              {snapshot.squad.invite_code}
            </p>
          </div>
          <Button
            variant="outline"
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

      <Card className="premium-panel rounded-[1.6rem]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <ShieldCheck className="size-4 text-[var(--rosso-light)]" />
            Privacy line
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Squad members only see today&apos;s meals count, calories in, calories
          burned from workouts, workout count, and streak. Height, weight,
          birthdate, and body measurements never sync to the squad.
        </CardContent>
      </Card>

      <div className="space-y-2">
        <AnimatePresence>
          {members.map((member, index) => (
            <MemberCard
              key={member.user_id}
              member={member}
              rank={index + 1}
              isYou={member.user_id === user?.id}
            />
          ))}
        </AnimatePresence>
      </div>

      <Card className="premium-panel rounded-[1.8rem]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <MessageCircle className="size-4 text-[var(--rosso-light)]" />
            Squad talk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
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
              className="bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
              onClick={handleSendMessage}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
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
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">
        {eyebrow}
      </p>
      <h1 className="font-heading text-3xl font-extrabold">{title}</h1>
      <p className="max-w-xl text-sm font-medium text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}

function MemberCard({
  member,
  rank,
  isYou,
}: {
  member: MemberWithActivity;
  rank: number;
  isYou: boolean;
}) {
  const activity = member.activity;
  const burned = activity?.kcal_out_activity ?? 0;
  const kcalIn = activity?.kcal_in ?? 0;
  const meals = activity?.meals_count ?? 0;
  const workouts = activity?.workouts_count ?? 0;
  const streak = activity?.streak ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
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
                <p className="truncate font-heading text-base font-bold">
                  {member.display_name}
                  {isYou && (
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      you
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1 text-[var(--rosso-light)]">
                  <Flame className="size-3.5" />
                  <span className="text-xs font-semibold">{streak}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
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
                  icon={<Flame className="size-3.5" />}
                  label="Workouts"
                  value={String(workouts)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
  return (
    <div className={isYou ? "flex justify-end" : "flex justify-start"}>
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
    </div>
  );
}
