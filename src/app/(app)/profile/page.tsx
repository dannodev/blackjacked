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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ACTIVITY_OPTIONS, type MealSchedule } from "@/lib/types";
import { Bolt, Bell, BellOff, Camera, Clock3, Trash2, Users } from "lucide-react";
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

function initials(name?: string) {
  return (name ?? "??").slice(0, 2).toUpperCase();
}

async function compressAvatar(file: File): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read that image."));
    };

    image.src = objectUrl;
  });

  const maxSize = 512;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Could not prepare that image.");
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.78),
  );

  if (!blob) throw new Error("Image compression failed.");
  return blob;
}

async function uploadAvatar(blob: Blob) {
  const formData = new FormData();
  formData.append("file", blob, `avatar-${Date.now()}.jpg`);

  const response = await fetch("/api/profile-avatar", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as {
    avatar_url?: string;
    avatar_public_id?: string;
    error?: string;
  };

  if (!response.ok || !result.avatar_url || !result.avatar_public_id) {
    throw new Error(result.error ?? "Could not upload profile picture.");
  }

  return {
    avatar_url: result.avatar_url,
    avatar_public_id: result.avatar_public_id,
  };
}

async function deleteAvatar() {
  const response = await fetch("/api/profile-avatar", { method: "DELETE" });
  const result = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "Could not remove profile picture.");
  }
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
  const [savingAvatar, setSavingAvatar] = useState(false);

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

  async function handleAvatarFile(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be under 5 MB");
      return;
    }

    try {
      setSavingAvatar(true);
      const compressed = await compressAvatar(file);
      const avatar = await uploadAvatar(compressed);
      updateProfile(avatar);
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update picture");
    } finally {
      setSavingAvatar(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="size-16 rounded-2xl border border-white/10 bg-[var(--rosso)]/12">
            {profile.avatar_url && (
              <AvatarImage
                src={profile.avatar_url}
                alt={`${user?.name ?? "User"} profile picture`}
                className="rounded-2xl"
              />
            )}
            <AvatarFallback className="rounded-2xl bg-transparent font-heading text-xl font-extrabold text-[var(--rosso-light)]">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <label
            htmlFor="profile-picture"
            className="absolute -bottom-1 -right-1 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[var(--rosso)] text-white shadow-lg transition-transform hover:scale-105"
            aria-label="Change profile picture"
          >
            <Camera className="size-4" />
          </label>
          <Input
            id="profile-picture"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={savingAvatar}
            onChange={(event) => {
              void handleAvatarFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Profile</p>
          <h1 className="font-heading text-2xl font-extrabold">{user?.name}</h1>
          <p className="text-sm font-medium text-muted-foreground">{user?.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {savingAvatar ? "Saving picture..." : "Tap the camera to change your picture"}
          </p>
        </div>
      </div>

      {profile.avatar_url && (
        <Button
          variant="outline"
          className="w-full"
          disabled={savingAvatar}
          onClick={async () => {
            try {
              setSavingAvatar(true);
              await deleteAvatar();
              updateProfile({ avatar_url: undefined, avatar_public_id: undefined });
              toast.success("Profile picture removed");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not remove picture");
            } finally {
              setSavingAvatar(false);
            }
          }}
        >
          <Trash2 className="mr-2 size-4" />
          Remove profile picture
        </Button>
      )}

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
