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
import {
  ACTIVITY_OPTIONS,
  dateKey,
  normalizeGoal,
  type ActivityFactor,
  type MealSchedule,
  type Profile,
  type Sex,
} from "@/lib/types";
import { Bolt, Bell, BellOff, Camera, Clock3, Download, LogOut, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { saveSupabaseProfile } from "@/lib/supabase/profile";
import Link from "next/link";
import { trackProductEvent } from "@/lib/product-analytics";

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
  const [remindersOn, setRemindersOn] = useState(false);
  const [reminderTime, setReminderTime] = useState("19:00");
  const [savingTimes, setSavingTimes] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingStats, setSavingStats] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [managingAccount, setManagingAccount] = useState(false);
  const [editingSection, setEditingSection] = useState<
    "stats" | "goal" | "meals" | null
  >(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("blackjacked.reminders");
    setRemindersOn(stored === "true");
    setReminderTime(localStorage.getItem("blackjacked.reminderTime") ?? "19:00");
  }, []);

  useEffect(() => {
    if (!remindersOn) return;
    const timer = window.setTimeout(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      const json = subscription.toJSON();
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: json.keys,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          reminderTime,
        }),
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [reminderTime, remindersOn]);

  async function toggleReminders() {
    const next = !remindersOn;
    try {
      if (next) {
        if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("This browser does not support background reminders.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Notifications are blocked in browser settings.");
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) throw new Error("Push reminders are not configured yet.");
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
        const json = subscription.toJSON();
        const response = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint, keys: json.keys, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, reminderTime }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not enable reminders.");
        toast.success("Daily reminder enabled", { description: `Scheduled around ${reminderTime} in your timezone.` });
      } else {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        await subscription?.unsubscribe();
        await fetch("/api/notifications", { method: "DELETE" });
        toast.success("Reminders off");
      }
      setRemindersOn(next);
      localStorage.setItem("blackjacked.reminders", String(next));
    } catch (error) {
      setRemindersOn(false);
      localStorage.setItem("blackjacked.reminders", "false");
      toast.error(error instanceof Error ? error.message : "Could not change reminders");
    }
  }

  async function saveStatsAndTargets(draft: StatsTargetsDraft) {
    const nextProfile = {
      ...profile,
      sex: draft.sex,
      height_cm: draft.height_cm,
      current_weight_kg: draft.current_weight_kg,
      activity_factor: draft.activity_factor,
      calorie_goal: draft.calorie_goal,
      protein_goal: draft.protein_goal,
      carb_goal: draft.carb_goal,
      fat_goal: draft.fat_goal,
    };

    try {
      setSavingStats(true);
      const saved = user
        ? await saveSupabaseProfile(user.id, nextProfile)
        : nextProfile;
      updateProfile({
        sex: saved.sex,
        height_cm: saved.height_cm,
        current_weight_kg: saved.current_weight_kg,
        activity_factor: saved.activity_factor,
        calorie_goal: saved.calorie_goal,
        protein_goal: saved.protein_goal,
        carb_goal: saved.carb_goal,
        fat_goal: saved.fat_goal,
      });
      toast.success("Stats and targets saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save stats");
    } finally {
      setSavingStats(false);
    }
  }

  async function saveMealTimes(meal_schedule: MealSchedule) {
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

  async function saveGoal(goalDraft: GoalDraft) {
    const nextProfile = {
      ...profile,
      goal_mode: goalDraft.goal_mode,
      goal_start_weight_kg:
        profile.goal_start_weight_kg ?? profile.current_weight_kg,
      goal_target_weight_kg:
        goalDraft.goal_mode === "maintain"
          ? profile.current_weight_kg
          : goalDraft.goal_target_weight_kg,
      goal_start_date:
        profile.goal_start_date ?? dateKey(new Date()),
      goal_target_date: goalDraft.goal_target_date || undefined,
    };

    try {
      setSavingGoal(true);
      const saved = user
        ? await saveSupabaseProfile(user.id, nextProfile)
        : nextProfile;
      updateProfile({
        goal_mode: saved.goal_mode,
        goal_start_weight_kg: saved.goal_start_weight_kg,
        goal_target_weight_kg: saved.goal_target_weight_kg,
        goal_start_date: saved.goal_start_date,
        goal_target_date: saved.goal_target_date,
      });
      toast.success("Goal saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save goal");
    } finally {
      setSavingGoal(false);
    }
  }

  function handleReset() {
    resetAll();
    toast.success("Local setup cleared", {
      description: "Your cloud history is unchanged. Complete onboarding to continue.",
    });
    router.replace("/onboarding");
  }

  async function exportData() {
    try {
      setManagingAccount(true);
      const response = await fetch("/api/account");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not export data.");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `blackjacked-export-${dateKey(new Date())}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Data export downloaded");
      trackProductEvent("account_exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export data");
    } finally {
      setManagingAccount(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Permanently delete your account, logs, squad membership, and photos? This cannot be undone.")) return;
    if (!window.confirm("Final confirmation: permanently delete everything?")) return;
    try {
      setManagingAccount(true);
      const response = await fetch("/api/account", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not delete account.");
      resetAll();
      await signOut();
      router.replace("/signup");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete account");
      setManagingAccount(false);
    }
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

      {editingSection === "stats" ? (
        <StatsTargetsEditor
          profile={profile}
          saving={savingStats}
          onCancel={() => setEditingSection(null)}
          onSave={saveStatsAndTargets}
        />
      ) : (
        <StatsTargetsCard
          profile={profile}
          onEdit={() => setEditingSection("stats")}
        />
      )}

      {editingSection === "goal" ? (
        <GoalSettingsEditor
          currentWeight={profile.current_weight_kg}
          initialGoal={normalizeGoal(profile)}
          saving={savingGoal}
          onCancel={() => setEditingSection(null)}
          onSave={saveGoal}
        />
      ) : (
        <GoalSettingsCard
          initialGoal={normalizeGoal(profile)}
          onEdit={() => setEditingSection("goal")}
        />
      )}

      {editingSection === "meals" ? (
        <MealTimesSettingsEditor
          initialSchedule={profile.meal_schedule}
          saving={savingTimes}
          onCancel={() => setEditingSection(null)}
          onSave={saveMealTimes}
        />
      ) : (
        <MealTimesSettingsCard
          initialSchedule={profile.meal_schedule}
          onEdit={() => setEditingSection("meals")}
        />
      )}

      <div className="space-y-2">
        <button
          onClick={() => void toggleReminders()}
          aria-label={remindersOn ? "Disable reminders" : "Enable reminders"}
          className="flex w-full items-center justify-between rounded-[1.35rem] border border-white/7 bg-white/[0.045] px-4 py-3"
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
        <div className="flex items-center justify-between rounded-[1.35rem] border border-white/7 bg-white/[0.035] px-4 py-3">
          <Label htmlFor="reminder-time" className="text-sm">Reminder time</Label>
          <Input id="reminder-time" type="time" value={reminderTime} className="w-32" onChange={(event) => { setReminderTime(event.target.value); localStorage.setItem("blackjacked.reminderTime", event.target.value); }} />
        </div>
        <Button
          variant="outline"
          className="w-full"
          disabled={managingAccount}
          onClick={() => void exportData()}
        >
          <Download className="mr-2 size-4" />
          Export my data
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleReset}
        >
          <LogOut className="mr-2 size-4" />
          Restart onboarding locally
        </Button>
        <Button
          variant="ghost"
          className="w-full text-[var(--over)]"
          disabled={managingAccount}
          onClick={() => void deleteAccount()}
        >
          <Trash2 className="mr-2 size-4" />
          Permanently delete account
        </Button>
        <div className="flex justify-center gap-4 pt-2 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-white hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:text-white hover:underline">Terms</Link>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
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

type StatsTargetsDraft = {
  sex: Sex;
  height_cm: number;
  current_weight_kg: number;
  activity_factor: ActivityFactor;
  calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
};

const StatsTargetsCard = memo(function StatsTargetsCard({
  profile,
  onEdit,
}: {
  profile: Profile;
  onEdit: () => void;
}) {
  const activity = ACTIVITY_OPTIONS.find(
    (option) => option.value === profile.activity_factor,
  );
  return (
    <SummaryCard
      icon={<Bolt className="size-4 text-[var(--rosso-light)]" />}
      title="Stats & daily targets"
      onEdit={onEdit}
    >
      <div className="grid grid-cols-2 gap-3 text-sm">
        <SummaryItem label="Height" value={`${profile.height_cm} cm`} />
        <SummaryItem label="Weight" value={`${profile.current_weight_kg} kg`} />
        <SummaryItem label="Activity" value={activity?.label ?? "-"} />
        <SummaryItem label="Calories" value={`${profile.calorie_goal} kcal`} />
        <SummaryItem label="Protein" value={`${profile.protein_goal}g`} />
        <SummaryItem label="Carbs / Fat" value={`${profile.carb_goal}g / ${profile.fat_goal}g`} />
      </div>
    </SummaryCard>
  );
});

function StatsTargetsEditor({
  profile,
  saving,
  onCancel,
  onSave,
}: {
  profile: Profile;
  saving: boolean;
  onCancel: () => void;
  onSave: (draft: StatsTargetsDraft) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<StatsTargetsDraft>(() => ({
    sex: profile.sex,
    height_cm: profile.height_cm,
    current_weight_kg: profile.current_weight_kg,
    activity_factor: profile.activity_factor,
    calorie_goal: profile.calorie_goal,
    protein_goal: profile.protein_goal,
    carb_goal: profile.carb_goal,
    fat_goal: profile.fat_goal,
  }));

  function updateNumber(key: keyof StatsTargetsDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value === "" ? 0 : +value,
    }));
  }

  function save() {
    if (draft.height_cm < 120 || draft.height_cm > 230) {
      toast.error("Height should be between 120 and 230 cm.");
      return;
    }
    if (draft.current_weight_kg < 35 || draft.current_weight_kg > 300) {
      toast.error("Weight should be between 35 and 300 kg.");
      return;
    }
    if (draft.calorie_goal < 1200 || draft.calorie_goal > 6000) {
      toast.error("Calories should be between 1200 and 6000.");
      return;
    }
    void onSave({
      ...draft,
      height_cm: Math.round(draft.height_cm),
      current_weight_kg: +draft.current_weight_kg.toFixed(1),
      calorie_goal: Math.round(draft.calorie_goal),
      protein_goal: Math.max(0, Math.round(draft.protein_goal)),
      carb_goal: Math.max(0, Math.round(draft.carb_goal)),
      fat_goal: Math.max(0, Math.round(draft.fat_goal)),
    });
  }

  return (
    <Card className="profile-section premium-panel rounded-[1.5rem]">
      <CardHeader>
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <Bolt className="size-4 text-[var(--rosso-light)]" />
          Stats & daily targets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as const).map((sex) => (
            <button
              key={sex}
              type="button"
              onClick={() => setDraft((current) => ({ ...current, sex }))}
              className={
                "rounded-full border px-3 py-2 text-xs font-semibold capitalize transition-colors " +
                (draft.sex === sex
                  ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                  : "border-white/10 text-muted-foreground")
              }
            >
              {sex}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ProfileNumberInput
            id="profile-height"
            label="Height (cm)"
            value={draft.height_cm}
            onChange={(value) => updateNumber("height_cm", value)}
          />
          <ProfileNumberInput
            id="profile-weight"
            label="Weight (kg)"
            step="0.1"
            value={draft.current_weight_kg}
            onChange={(value) => updateNumber("current_weight_kg", value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-activity" className="text-xs">
            Activity level
          </Label>
          <select
            id="profile-activity"
            value={draft.activity_factor}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                activity_factor: +event.target.value as ActivityFactor,
              }))
            }
            className="h-11 w-full rounded-2xl border border-input bg-white/[0.045] px-3.5 text-base outline-none focus:border-[var(--rosso)]"
          >
            {ACTIVITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#111]">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <ProfileNumberInput
            id="profile-calories"
            label="Calorie goal (kcal/day)"
            step="10"
            value={draft.calorie_goal}
            onChange={(value) => updateNumber("calorie_goal", value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ProfileNumberInput
            id="profile-protein"
            label="Protein"
            value={draft.protein_goal}
            onChange={(value) => updateNumber("protein_goal", value)}
          />
          <ProfileNumberInput
            id="profile-carbs"
            label="Carbs"
            value={draft.carb_goal}
            onChange={(value) => updateNumber("carb_goal", value)}
          />
          <ProfileNumberInput
            id="profile-fat"
            label="Fat"
            value={draft.fat_goal}
            onChange={(value) => updateNumber("fat_goal", value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Use this if your first height, weight, or daily targets were just an estimate.
          Your squad still cannot see height or weight.
        </p>
        <Button
          className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save stats & targets"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileNumberInput({
  id,
  label,
  value,
  step = "1",
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        step={step}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type GoalDraft = {
  goal_mode: "lose" | "gain" | "maintain";
  goal_target_weight_kg?: number;
  goal_target_date: string;
};

const GoalSettingsCard = memo(function GoalSettingsCard({
  initialGoal,
  onEdit,
}: {
  initialGoal: ReturnType<typeof normalizeGoal>;
  onEdit: () => void;
}) {
  return (
    <SummaryCard
      icon={<Target className="size-4 text-[var(--rosso-light)]" />}
      title="Long-term goal"
      onEdit={onEdit}
    >
      <div className="grid grid-cols-2 gap-3 text-sm">
        <SummaryItem label="Mode" value={initialGoal.mode} cap />
        <SummaryItem
          label="Progress"
          value={`${Math.round(initialGoal.progress)}%`}
        />
        <SummaryItem
          label="Target"
          value={`${initialGoal.targetWeight.toFixed(1)} kg`}
        />
        <SummaryItem label="Date" value={initialGoal.targetDate ?? "Later"} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Squad sees goal type and progress, never your height or weight.
      </p>
    </SummaryCard>
  );
});

function GoalSettingsEditor({
  currentWeight,
  initialGoal,
  saving,
  onCancel,
  onSave,
}: {
  currentWeight: number;
  initialGoal: ReturnType<typeof normalizeGoal>;
  saving: boolean;
  onCancel: () => void;
  onSave: (draft: GoalDraft) => void | Promise<void>;
}) {
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(() => ({
    goal_mode: initialGoal.mode,
    goal_target_weight_kg: initialGoal.targetWeight,
    goal_target_date: initialGoal.targetDate ?? "",
  }));

  return (
    <Card className="profile-section carbon-card rounded-[1.5rem] border-white/7">
      <CardHeader>
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <Target className="size-4 text-[var(--rosso-light)]" />
          Long-term goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(["lose", "maintain", "gain"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() =>
                setGoalDraft((current) => ({
                  ...current,
                  goal_mode: mode,
                  goal_target_weight_kg:
                    mode === "maintain"
                      ? currentWeight
                      : current.goal_target_weight_kg,
                }))
              }
              className={
                "rounded-full border px-2 py-2 text-xs font-semibold capitalize transition-colors " +
                (goalDraft.goal_mode === mode
                  ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                  : "border-white/10 text-muted-foreground")
              }
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="profile-target-weight" className="text-xs">
              Target weight (kg)
            </Label>
            <Input
              id="profile-target-weight"
              type="number"
              step="0.1"
              value={goalDraft.goal_target_weight_kg ?? ""}
              disabled={goalDraft.goal_mode === "maintain"}
              onChange={(event) =>
                setGoalDraft((current) => ({
                  ...current,
                  goal_target_weight_kg: event.target.value
                    ? +event.target.value
                    : undefined,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-target-date" className="text-xs">
              Target date
            </Label>
            <Input
              id="profile-target-date"
              type="date"
              value={goalDraft.goal_target_date}
              onChange={(event) =>
                setGoalDraft((current) => ({
                  ...current,
                  goal_target_date: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Squad members only see your goal type and progress percentage,
          never your actual weight or height.
        </p>
        <Button
          className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
          onClick={() => void onSave(goalDraft)}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save goal"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}

const MealTimesSettingsCard = memo(function MealTimesSettingsCard({
  initialSchedule,
  onEdit,
}: {
  initialSchedule?: MealSchedule;
  onEdit: () => void;
}) {
  const schedule = normalizeSchedule(initialSchedule);
  return (
    <SummaryCard
      icon={<Clock3 className="size-4 text-[var(--rosso-light)]" />}
      title="Meal times"
      onEdit={onEdit}
    >
      <div className="grid grid-cols-2 gap-3 text-sm">
        <SummaryItem label="Breakfast" value={formatTime(schedule.breakfast_time)} />
        <SummaryItem label="AM snack" value={formatTime(schedule.am_snack_time)} />
        <SummaryItem label="Lunch" value={formatTime(schedule.lunch_time)} />
        <SummaryItem label="PM snack" value={formatTime(schedule.pm_snack_time)} />
        <SummaryItem label="Dinner" value={formatTime(schedule.dinner_time)} />
      </div>
    </SummaryCard>
  );
});

function MealTimesSettingsEditor({
  initialSchedule,
  saving,
  onCancel,
  onSave,
}: {
  initialSchedule?: MealSchedule;
  saving: boolean;
  onCancel: () => void;
  onSave: (schedule: MealSchedule) => void | Promise<void>;
}) {
  const [mealTimes, setMealTimes] = useState(() =>
    normalizeSchedule(initialSchedule),
  );

  function save() {
    void onSave({
      breakfast_time: mealTimes.breakfast_time || null,
      am_snack_time: mealTimes.am_snack_time || null,
      lunch_time: mealTimes.lunch_time || null,
      pm_snack_time: mealTimes.pm_snack_time || null,
      dinner_time: mealTimes.dinner_time || null,
    });
  }

  return (
    <Card className="profile-section carbon-card rounded-[1.5rem] border-white/7">
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
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save meal times"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  icon,
  title,
  children,
  onEdit,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <Card className="profile-section carbon-card rounded-[1.5rem] border-white/7">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={onEdit}
          >
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  cap,
}: {
  label: string;
  value: string;
  cap?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={"font-semibold " + (cap ? "capitalize" : "")}>{value}</p>
    </div>
  );
}

function formatTime(value?: string | null) {
  if (!value) return "Later";
  return value;
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
