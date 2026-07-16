"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  ACTIVITY_OPTIONS,
  type ActivityFactor,
  type Sex,
  mifflinBMR,
  ageFromBirthdate,
  computeTDEE,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { saveSupabaseProfile } from "@/lib/supabase/profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const basicsSchema = z.object({
  sex: z.enum(["male", "female"]),
  birthdate: z.string().min(1, "Required"),
  height_cm: z.coerce.number().min(120).max(230),
  current_weight_kg: z.coerce.number().min(35).max(300),
});
type Basics = z.infer<typeof basicsSchema>;

const goalSchema = z.object({
  activity_factor: z.coerce.number(),
  calorie_goal: z.coerce.number().min(800).max(6000),
  protein_goal: z.coerce.number().min(0),
  fat_goal: z.coerce.number().min(0),
  carb_goal: z.coerce.number().min(0),
});
type Goal = z.infer<typeof goalSchema>;

const STEPS = ["You", "Activity", "Goal"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const setProfile = useStore((s) => s.setProfile);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const basicsForm = useForm<Basics>({
    resolver: zodResolver(basicsSchema) as Resolver<Basics>,
  });
  const goalForm = useForm<Goal>({
    resolver: zodResolver(goalSchema) as Resolver<Goal>,
  });

  // Suggest goals when activity changes
  const watchActivity = goalForm.watch("activity_factor");
  const watchBasics = basicsForm.watch();
  const watchCalorieGoal = goalForm.watch("calorie_goal");
  const watchProtein = goalForm.watch("protein_goal");
  const watchFat = goalForm.watch("fat_goal");
  const watchCarb = goalForm.watch("carb_goal");
  const suggestion = useMemo(() => {
    if (!watchBasics?.height_cm || !watchBasics?.current_weight_kg || !watchBasics?.birthdate)
      return null;
    const age = ageFromBirthdate(watchBasics.birthdate);
    const bmr = mifflinBMR(
      watchBasics.sex as Sex,
      age,
      watchBasics.height_cm,
      watchBasics.current_weight_kg,
    );
    const tdee = computeTDEE(bmr, (watchActivity as ActivityFactor) || 1.55);
    const goalCal = Math.round((tdee - 450) / 10) * 10;
    const protein = Math.round(watchBasics.current_weight_kg * 1.6);
    const fat = Math.round((goalCal * 0.25) / 9);
    const carb = Math.round((goalCal - protein * 4 - fat * 9) / 4);
    return { goalCal: Math.max(1200, goalCal), protein, fat, carb, tdee };
  }, [watchBasics, watchActivity]);

  // Live-recalculate macros when the user edits the calorie goal on the goal step
  useEffect(() => {
    if (step !== 2) return;
    const cals = Number(watchCalorieGoal);
    if (!cals || cals < 800) return;
    // protein: at least 1.6g/kg body weight, or 30% of cals — whichever is higher
    const minProtein = watchBasics?.current_weight_kg
      ? Math.round(watchBasics.current_weight_kg * 1.6)
      : 0;
    const pctProtein = Math.round((cals * 0.3) / 4);
    const protein = Math.max(minProtein, pctProtein);
    const fat = Math.round((cals * 0.25) / 9);
    const carb = Math.round((cals - protein * 4 - fat * 9) / 4);
    goalForm.setValue("protein_goal", protein, { shouldDirty: true });
    goalForm.setValue("fat_goal", fat, { shouldDirty: true });
    goalForm.setValue("carb_goal", carb, { shouldDirty: true });
  }, [watchCalorieGoal, step, watchBasics?.current_weight_kg, goalForm]);

  const onBasicsSubmit = () => {
    basicsForm.clearErrors();
    setStep(1);
    goalForm.setValue("activity_factor", 1.55);
  };

  const onActivityNext = () => {
    if (suggestion) {
      goalForm.setValue("calorie_goal", suggestion.goalCal);
      goalForm.setValue("protein_goal", suggestion.protein);
      goalForm.setValue("fat_goal", suggestion.fat);
      goalForm.setValue("carb_goal", suggestion.carb);
    }
    setStep(2);
  };

  const onGoalSubmit = async (values: Goal) => {
    const b = basicsForm.getValues();
    const profile = {
      sex: b.sex,
      birthdate: b.birthdate,
      height_cm: b.height_cm,
      current_weight_kg: b.current_weight_kg,
      activity_factor: values.activity_factor as ActivityFactor,
      calorie_goal: values.calorie_goal,
      protein_goal: values.protein_goal,
      fat_goal: values.fat_goal,
      carb_goal: values.carb_goal,
      createdAt: new Date().toISOString(),
    };

    try {
      setSaving(true);
      const savedProfile = user
        ? await saveSupabaseProfile(user.id, profile)
        : profile;
      setProfile(savedProfile);
      toast.success("Profile saved. Let's burn.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* progress */}
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-[var(--rosso)]" : "bg-white/10",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.form
            key="basics"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            onSubmit={basicsForm.handleSubmit(onBasicsSubmit)}
            className="space-y-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Start</p>
            <h1 className="font-heading text-3xl font-extrabold">Set up</h1>
            <p className="text-sm font-medium text-muted-foreground">
              We use these to power your BMR, TDEE, and deficit math.
            </p>
            <Card className="premium-panel rounded-[1.6rem]">
              <CardContent className="space-y-4 py-5">
                <div className="space-y-2">
                  <Label>Sex (biological)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["male", "female"] as const).map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => basicsForm.setValue("sex", s)}
                        className={cn(
                          "rounded-full border px-3 py-2.5 text-sm font-semibold capitalize transition-colors",
                          basicsForm.watch("sex") === s
                            ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                            : "border-white/10 text-muted-foreground",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {basicsForm.formState.errors.sex && (
                    <p className="text-sm text-[var(--over)]">
                      {basicsForm.formState.errors.sex.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthdate">Birthdate</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    {...basicsForm.register("birthdate")}
                  />
                  {basicsForm.formState.errors.birthdate && (
                    <p className="text-sm text-[var(--over)]">
                      {basicsForm.formState.errors.birthdate.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="height_cm">Height (cm)</Label>
                    <Input
                      id="height_cm"
                      type="number"
                      placeholder="175"
                      {...basicsForm.register("height_cm")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_weight_kg">Weight (kg)</Label>
                    <Input
                      id="current_weight_kg"
                      type="number"
                      step="0.1"
                      placeholder="78"
                      {...basicsForm.register("current_weight_kg")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button
              type="submit"
              className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
            >
              Continue
            </Button>
          </motion.form>
        )}

        {step === 1 && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Pace</p>
            <h1 className="font-heading text-3xl font-extrabold">Activity</h1>
            <p className="text-sm font-medium text-muted-foreground">
              How active are you day to day?
            </p>
            <div className="space-y-2">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    goalForm.setValue("activity_factor", opt.value);
                    goalForm.trigger("activity_factor");
                  }}
                  className={cn(
                    "w-full rounded-[1.35rem] border px-4 py-3 text-left transition-colors",
                    goalForm.watch("activity_factor") === opt.value
                      ? "border-[var(--rosso)] bg-[var(--rosso)]/10"
                      : "border-white/10 bg-white/[0.035]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{opt.label}</span>
                    <span className="font-heading text-sm text-[var(--rosso-light)]">
                      ×{opt.value}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setStep(0)}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
                onClick={onActivityNext}
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.form
            key="goal"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            onSubmit={goalForm.handleSubmit(onGoalSubmit)}
            className="space-y-4"
          >
            <Card className="premium-panel rounded-[1.6rem]">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Your targets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestion && (
                  <div className="rounded-2xl bg-[var(--rosso)]/12 px-3 py-2 text-xs text-[var(--rosso-light)]">
                    Suggested from your TDEE ≈{" "}
                    <span className="font-heading">
                      {Math.round(suggestion.tdee)}
                    </span>{" "}
                    kcal/day at a ~450 deficit.
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="calorie_goal">Calorie goal (kcal/day)</Label>
                  <Input
                    id="calorie_goal"
                    type="number"
                    step="10"
                    {...goalForm.register("calorie_goal")}
                  />
                  {goalForm.formState.errors.calorie_goal && (
                    <p className="text-sm text-[var(--over)]">
                      {goalForm.formState.errors.calorie_goal.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Macros below auto-update when you change calories.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "protein_goal", val: watchProtein },
                    { key: "fat_goal", val: watchFat },
                    { key: "carb_goal", val: watchCarb },
                  ] as const).map(({ key, val }) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key} className="text-xs">
                        {key.replace("_goal", "")} (g)
                      </Label>
                      <Input
                        id={key}
                        type="number"
                        value={val ?? 0}
                        onChange={(e) =>
                          goalForm.setValue(key, +e.target.value, {
                            shouldDirty: true,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
                disabled={saving}
              >
                {saving ? "Saving..." : "Finish"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
