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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_OPTIONS, type MealSchedule } from "@/lib/types";
import { Bolt, Bell, BellOff, Clock3, Users } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { saveSupabaseProfile } from "@/lib/supabase/profile";

function emptySchedule(): Required<Record<keyof MealSchedule, string>> {
  return {
    breakfast_time: "",
    am_snack_time: "",
    lunch_time: "",
    pm_snack_time: "",
    dinner_time: "",
  };
}

function normalizeSchedule(schedule?: MealSchedule) {
  return {
    ...emptySchedule(),
    breakfast_time: schedule?.breakfast_time ?? "",
    am_snack_time: schedule?.am_snack_time ?? "",
    lunch_time: schedule?.lunch_time ?? "",
    pm_snack_time: schedule?.pm_snack_time ?? "",
    dinner_time: schedule?.dinner_time ?? "",
  };
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const profile = useStore((s) => s.profile)!;
  const updateProfile = useStore((s) => s.updateProfile);
  const streaks = useStore((s) => s.streaks);
  const resetAll = useStore((s) => s.resetAll);
  const router = useRouter();
  const [remindersOn, setRemindersOn] = useState(false);
  const [savingTimes, setSavingTimes] = useState(false);
  const [mealTimes, setMealTimes] = useState(() =>
    normalizeSchedule(profile.meal_schedule),
  );

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

  async function saveMealTimes() {
    const meal_schedule: MealSchedule = {
      breakfast_time: mealTimes.breakfast_time || null,
      am_snack_time: mealTimes.am_snack_time || null,
      lunch_time: mealTimes.lunch_time || null,
      pm_snack_time: mealTimes.pm_snack_time || null,
      dinner_time: mealTimes.dinner_time || null,
    };
    const nextProfile = { ...profile, meal_schedule };

    try {
      setSavingTimes(true);
      const saved = user
        ? await saveSupabaseProfile(user.id, nextProfile)
        : nextProfile;
      updateProfile({ meal_schedule: saved.meal_schedule });
      toast.success("Meal times saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save meal times");
    } finally {
      setSavingTimes(false);
    }
  }

  function handleReset() {
    resetAll();
    toast.success("All data reset");
    router.replace("/onboarding");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 font-heading text-xl font-extrabold text-[var(--rosso-light)]">
          {user?.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Profile</p>
          <h1 className="font-heading text-2xl font-extrabold">{user?.name}</h1>
          <p className="text-sm font-medium text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Day streak" value={`${streaks.current_streak}`} accent />
        <Stat label="Best streak" value={`${streaks.longest_streak}`} />
      </div>

      <Card className="carbon-card rounded-[1.5rem] border-white/7">
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

      <Card className="premium-panel rounded-[1.5rem]">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Bolt className="size-4 text-[var(--rosso-light)]" />
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

      <Card className="carbon-card rounded-[1.5rem] border-white/7">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Clock3 className="size-4 text-[var(--rosso-light)]" />
            Meal times
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            The dashboard uses these times to show breakfast, snack, lunch, or
            dinner options from your menu.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MealTimeInput
              id="profile-breakfast"
              label="Breakfast"
              value={mealTimes.breakfast_time}
              onChange={(value) =>
                setMealTimes((current) => ({ ...current, breakfast_time: value }))
              }
            />
            <MealTimeInput
              id="profile-am-snack"
              label="AM snack"
              value={mealTimes.am_snack_time}
              onChange={(value) =>
                setMealTimes((current) => ({ ...current, am_snack_time: value }))
              }
            />
            <MealTimeInput
              id="profile-lunch"
              label="Lunch"
              value={mealTimes.lunch_time}
              onChange={(value) =>
                setMealTimes((current) => ({ ...current, lunch_time: value }))
              }
            />
            <MealTimeInput
              id="profile-pm-snack"
              label="PM snack"
              value={mealTimes.pm_snack_time}
              onChange={(value) =>
                setMealTimes((current) => ({ ...current, pm_snack_time: value }))
              }
            />
            <MealTimeInput
              id="profile-dinner"
              label="Dinner"
              value={mealTimes.dinner_time}
              onChange={(value) =>
                setMealTimes((current) => ({ ...current, dinner_time: value }))
              }
            />
          </div>
          <Button
            className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
            onClick={saveMealTimes}
            disabled={savingTimes}
          >
            {savingTimes ? "Saving..." : "Save meal times"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <button
          onClick={toggleReminders}
          aria-label={remindersOn ? "Disable reminders" : "Enable reminders"}
          className="flex w-full items-center justify-between rounded-[1.35rem] border border-white/7 bg-white/[0.045] px-4 py-3 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            {remindersOn ? (
              <Bell className="size-4 text-[var(--rosso-light)]" />
            ) : (
              <BellOff className="size-4 text-muted-foreground" />
            )}
            <span className="text-sm">Daily reminders</span>
          </div>
          <span
            className={
              "rounded-full px-2 py-0.5 text-xs font-medium " +
              (remindersOn
                ? "bg-[var(--rosso)]/15 text-[var(--rosso-light)]"
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

function MealTimeInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
    <Card className="carbon-card rounded-[1.35rem] border-white/7">
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={
            "font-heading text-2xl font-extrabold " +
            (accent ? "text-[var(--rosso-light)]" : "")
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
