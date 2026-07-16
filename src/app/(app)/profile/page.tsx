"use client";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ACTIVITY_OPTIONS } from "@/lib/types";
import { Bolt, Bell, BellOff, Users } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const profile = useStore((s) => s.profile)!;
  const streaks = useStore((s) => s.streaks);
  const resetAll = useStore((s) => s.resetAll);
  const router = useRouter();
  const [remindersOn, setRemindersOn] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("blackjacked.reminders");
    setRemindersOn(stored === "true");
  }, []);

  function toggleReminders() {
    const next = !remindersOn;
    setRemindersOn(next);
    localStorage.setItem("blackjacked.reminders", String(next));
    if (next && "Notification" in window) {
      Notification.requestPermission().then((p) => {
        if (p === "granted") {
          toast.success("Reminders on", {
            description: "You'll get a daily nudge to log.",
          });
        } else {
          toast.info("Notifications blocked", {
            description: "Enable in browser settings to get reminders.",
          });
          setRemindersOn(false);
          localStorage.setItem("blackjacked.reminders", "false");
        }
      });
    } else if (next) {
      toast.info("This browser doesn't support notifications");
      setRemindersOn(false);
    } else {
      toast.success("Reminders off");
    }
  }

  const activity = ACTIVITY_OPTIONS.find(
    (o) => o.value === profile.activity_factor,
  );

  function handleReset() {
    resetAll();
    toast.success("All data reset");
    router.replace("/onboarding");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--rosso)]/10 text-[var(--rosso)] font-heading text-xl font-bold">
          {user?.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold">{user?.name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Day streak" value={`${streaks.current_streak}`} accent />
        <Stat label="Best streak" value={`${streaks.longest_streak}`} />
      </div>

      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base">Your stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Sex" value={profile.sex} cap />
          <Row label="Height" value={`${profile.height_cm} cm`} />
          <Row label="Weight" value={`${profile.current_weight_kg} kg`} />
          <Row label="Activity" value={activity?.label ?? "—"} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Bolt className="size-4 text-[var(--rosso)]" />
            Daily targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Calorie goal" value={`${profile.calorie_goal} kcal`} big />
          <Row label="Protein" value={`${profile.protein_goal} g`} />
          <Row label="Carbs" value={`${profile.carb_goal} g`} />
          <Row label="Fat" value={`${profile.fat_goal} g`} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <button
          onClick={toggleReminders}
          className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-card/60 px-4 py-3 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            {remindersOn ? (
              <Bell className="size-4 text-[var(--rosso)]" />
            ) : (
              <BellOff className="size-4 text-muted-foreground" />
            )}
            <span className="text-sm">Daily reminders</span>
          </div>
          <span
            className={
              "rounded-full px-2 py-0.5 text-xs font-medium " +
              (remindersOn
                ? "bg-[var(--rosso)]/15 text-[var(--rosso)]"
                : "bg-white/5 text-muted-foreground")
            }
          >
            {remindersOn ? "On" : "Off"}
          </span>
        </button>
        <Link href="/onboarding">
          <Button variant="outline" className="w-full">
            Edit profile & goals
          </Button>
        </Link>
        <Link href="/checkin">
          <Button variant="outline" className="w-full">
            Weekly check-in
          </Button>
        </Link>
        <Link href="/squad">
          <Button variant="outline" className="w-full">
            <Users className="mr-2 size-4" />
            Your squad
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full text-[var(--over)]"
          onClick={handleReset}
        >
          Reset all data
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={
            "font-heading text-2xl font-bold " +
            (accent ? "text-[var(--rosso)]" : "")
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  big,
  cap,
}: {
  label: string;
  value: string;
  big?: boolean;
  cap?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          (big ? "font-heading font-bold text-foreground " : "") +
          (cap ? "capitalize" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}