"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCloudExerciseLogs } from "@/lib/use-cloud-exercise-logs";
import { makeId } from "@/lib/id";
import { EXERCISES, CATEGORY_LABELS } from "@/lib/exercises-seed";
import type { Exercise, ExerciseCategory, ExerciseLog } from "@/lib/types";
import { exerciseKcal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Search, Plus, Sparkles, Loader2, Star } from "lucide-react";
import { aiExerciseMatch } from "@/lib/ai";

const CATEGORIES: (ExerciseCategory | "all")[] = [
  "all",
  "cardio",
  "gym",
  "calisthenics",
  "core",
  "sports",
  "daily",
];

export function ExerciseLogForm({ initialExerciseId }: { initialExerciseId?: string }) {
  const profile = useStore((s) => s.profile)!;
  const favoriteExerciseIds = useStore((s) => s.favoriteExerciseIds);
  const exerciseLogs = useStore((s) => s.exerciseLogs);
  const toggleFavoriteExercise = useStore((s) => s.toggleFavoriteExercise);
  const { addExerciseLog } = useCloudExerciseLogs();
  const [cat, setCat] = useState<ExerciseCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [duration, setDuration] = useState(30);
  const [distance, setDistance] = useState(0);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [loadKg, setLoadKg] = useState(0);
  const [rpe, setRpe] = useState(7);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(
      (e) =>
        (cat === "all" || e.category === cat) &&
        (!q || e.name.toLowerCase().includes(q)),
    );
  }, [cat, query]);

  const kcal = selected
    ? exerciseKcal(selected, profile.current_weight_kg, duration)
    : 0;
  const isTimedOnly = Boolean(selected?.timed_only || selected?.fixed_kcal_per_25_min);
  const favoriteExercises = favoriteExerciseIds
    .map((id) => EXERCISES.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is Exercise => Boolean(exercise));

  const chooseExercise = useCallback((exercise: Exercise) => {
    setSelected(exercise);
    setDuration(exercise.fixed_kcal_per_25_min ? 25 : 30);
    const previous = [...exerciseLogs]
      .filter((log) => log.exercise_id === exercise.id)
      .sort((a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt))[0];
    if (previous?.sets) setSets(previous.sets);
    if (previous?.reps) setReps(previous.reps);
    setLoadKg(previous?.load_kg ?? 0);
    setRpe(previous?.rpe ?? 7);
  }, [exerciseLogs]);

  useEffect(() => {
    if (!initialExerciseId) return;
    const exercise = EXERCISES.find((item) => item.id === initialExerciseId);
    if (exercise) chooseExercise(exercise);
  }, [chooseExercise, initialExerciseId]);

  async function log() {
    if (!selected) {
      toast.error("Pick an exercise");
      return;
    }
    if (duration <= 0) {
      toast.error("Enter duration");
      return;
    }
    const log: ExerciseLog = {
      id: makeId(),
      exercise_id: selected.id,
      exercise_name: selected.name,
      category: selected.category,
      mets: selected.mets,
      duration_min: duration,
      distance_km: selected.distance_based ? distance || undefined : undefined,
      reps: !isTimedOnly && (selected.category === "gym" || selected.category === "core" || selected.category === "calisthenics") ? reps : undefined,
      sets: !isTimedOnly && (selected.category === "gym" || selected.category === "core" || selected.category === "calisthenics") ? sets : undefined,
      load_kg: !isTimedOnly && selected.category === "gym" && loadKg > 0 ? loadKg : undefined,
      rpe: !isTimedOnly && ["gym", "core", "calisthenics"].includes(selected.category) ? rpe : undefined,
      kcal_burned: kcal,
      loggedAt: new Date().toISOString(),
    };
    await addExerciseLog(log);
    toast.success(`${selected.name} logged`, {
      description: `~${Math.round(kcal)} kcal burned`,
    });
    setSelected(null);
    setDuration(30);
    setDistance(0);
  }

  async function aiMatch() {
    if (!aiQuery.trim()) {
      toast.error("Describe your workout");
      return;
    }
    setAiLoading(true);
    try {
      const matches = await aiExerciseMatch(aiQuery);
      if (matches.length > 0) {
        const best = matches[0];
        const ex = EXERCISES.find((e) => e.id === best.exercise_id) ||
          EXERCISES.find((e) => e.name.toLowerCase() === best.name.toLowerCase());
        if (ex) {
          chooseExercise(ex);
          setCat(ex.category);
          toast.success(`Matched: ${ex.name}`, {
            description: `${(best.confidence * 100).toFixed(0)}% confidence`,
          });
        } else {
          toast.info(`AI suggested "${best.name}" — pick from the list below`);
        }
      }
      setAiQuery("");
    } catch {
      toast.error("AI match failed");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* categories */}
      {favoriteExercises.length > 0 && !selected && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Star className="size-4 fill-[var(--amber)] text-[var(--amber)]" />
            <h2 className="font-heading text-sm font-bold">Favorites</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favoriteExercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => chooseExercise(exercise)}
                className="flex w-36 shrink-0 flex-col gap-1 rounded-[1.25rem] border border-[var(--amber)]/25 bg-[var(--amber)]/10 p-3 text-left transition-colors hover:bg-[var(--amber)]/15"
              >
                <span className="text-[11px] font-semibold text-[var(--amber)]">
                  {CATEGORY_LABELS[exercise.category]}
                </span>
                <span className="text-sm font-bold leading-tight">{exercise.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {exercise.fixed_kcal_per_25_min
                    ? "25 min · 350 kcal"
                    : `${exercise.mets} MET`}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              cat === c
                ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                : "border-white/10 text-muted-foreground",
            )}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* AI free-text workout match */}
      {!selected && (
        <div className="flex gap-2">
          <Input
            placeholder="e.g. 30 min run on the treadmill"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aiMatch()}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={aiMatch}
            disabled={aiLoading}
            className="border-[var(--rosso)]/30 text-[var(--rosso-light)]"
          >
            {aiLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </Button>
        </div>
      )}

      {/* search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {selected ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="premium-panel rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {selected.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isTimedOnly && (selected.category === "gym" || selected.category === "core" || selected.category === "calisthenics") && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sets">
                    <Input
                      type="number"
                      value={sets}
                      onChange={(e) => setSets(+e.target.value)}
                    />
                  </Field>
                  <Field label="Reps">
                    <Input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(+e.target.value)}
                    />
                  </Field>
                  {selected.category === "gym" && <Field label="Load (kg)">
                    <Input type="number" min="0" step="0.5" value={loadKg || ""} placeholder="Bodyweight" onChange={(e) => setLoadKg(+e.target.value)} />
                  </Field>}
                  <Field label="Effort (RPE 1–10)">
                    <Input type="number" min="1" max="10" step="0.5" value={rpe} onChange={(e) => setRpe(Math.max(1, Math.min(10, +e.target.value)))} />
                  </Field>
                </div>
              )}
              {selected && (() => {
                const previous = [...exerciseLogs].filter((item) => item.exercise_id === selected.id).sort((a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt))[0];
                if (!previous) return null;
                const suggestion = previous.load_kg && (previous.rpe ?? 10) <= 8
                  ? `Try ${(previous.load_kg + 2.5).toFixed(1)} kg if form stays strong.`
                  : "Match your previous performance with clean form.";
                return <div className="rounded-2xl border border-[var(--aqua)]/20 bg-[var(--aqua)]/8 p-3 text-xs">
                  <p className="font-bold text-[var(--aqua)]">Last time: {previous.sets ?? "–"}×{previous.reps ?? "–"}{previous.load_kg ? ` at ${previous.load_kg} kg` : ""}</p>
                  <p className="mt-1 text-muted-foreground">{suggestion}</p>
                </div>;
              })()}
              <Field label="Duration (min)">
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(+e.target.value)}
                />
              </Field>
              {selected.distance_based && (
                <Field label="Distance (km) — enter min OR km">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="optional"
                    value={distance || ""}
                    onChange={(e) => setDistance(+e.target.value)}
                  />
                </Field>
              )}
              <div className="flex items-center justify-between rounded-2xl bg-[var(--rosso)]/12 px-3 py-2.5">
                <span className="text-sm">Estimated burn</span>
                <span className="font-heading text-lg font-bold text-[var(--rosso-light)]">
                  {Math.round(kcal)} kcal
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
                  onClick={log}
                >
                  Log it
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-1.5">
          {list.map((e) => (
            <div
              key={e.id}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/7 bg-white/[0.045] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.075]"
            >
              <button
                type="button"
                onClick={() => chooseExercise(e)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[e.category]} · {e.mets} MET
                </p>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={
                    favoriteExerciseIds.includes(e.id)
                      ? `Unstar ${e.name}`
                      : `Star ${e.name}`
                  }
                  className="flex size-8 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-[var(--amber)]/40 hover:text-[var(--amber)]"
                  onClick={() => {
                    toggleFavoriteExercise(e.id);
                  }}
                >
                  <Star
                    className={
                      favoriteExerciseIds.includes(e.id)
                        ? "size-4 fill-[var(--amber)] text-[var(--amber)]"
                        : "size-4"
                    }
                  />
                </button>
                <button
                  type="button"
                  onClick={() => chooseExercise(e)}
                  aria-label={`Select ${e.name}`}
                  className="flex size-8 items-center justify-center rounded-full text-[var(--rosso-light)]"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No exercises found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
