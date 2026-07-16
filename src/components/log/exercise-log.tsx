"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { EXERCISES, CATEGORY_LABELS } from "@/lib/exercises-seed";
import type { Exercise, ExerciseCategory, ExerciseLog } from "@/lib/types";
import { activityKcal } from "@/lib/types";
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
import { Search, Plus } from "lucide-react";

const CATEGORIES: (ExerciseCategory | "all")[] = [
  "all",
  "cardio",
  "gym",
  "core",
  "sports",
  "daily",
];

export function ExerciseLogForm() {
  const profile = useStore((s) => s.profile)!;
  const addExerciseLog = useStore((s) => s.addExerciseLog);
  const [cat, setCat] = useState<ExerciseCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [duration, setDuration] = useState(30);
  const [distance, setDistance] = useState(0);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(
      (e) =>
        (cat === "all" || e.category === cat) &&
        (!q || e.name.toLowerCase().includes(q)),
    );
  }, [cat, query]);

  const kcal = selected
    ? activityKcal(selected.mets, profile.current_weight_kg, duration)
    : 0;

  function log() {
    if (!selected) {
      toast.error("Pick an exercise");
      return;
    }
    if (duration <= 0 && !(sets > 0)) {
      toast.error("Enter duration or sets");
      return;
    }
    const log: ExerciseLog = {
      id: crypto.randomUUID(),
      exercise_id: selected.id,
      exercise_name: selected.name,
      category: selected.category,
      mets: selected.mets,
      duration_min: duration,
      distance_km: selected.distance_based ? distance || undefined : undefined,
      reps: selected.category === "gym" || selected.category === "core" ? reps : undefined,
      sets: selected.category === "gym" || selected.category === "core" ? sets : undefined,
      kcal_burned: kcal,
      loggedAt: new Date().toISOString(),
    };
    addExerciseLog(log);
    toast.success(`${selected.name} logged`, {
      description: `~${Math.round(kcal)} kcal burned`,
    });
    setSelected(null);
    setDuration(30);
    setDistance(0);
  }

  return (
    <div className="space-y-4">
      {/* categories */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",
              cat === c
                ? "border-[var(--lime)] bg-[var(--lime)]/10 text-[var(--lime)]"
                : "border-white/10 text-muted-foreground",
            )}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

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
          <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {selected.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(selected.category === "gym" || selected.category === "core") && (
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
                </div>
              )}
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
              <div className="flex items-center justify-between rounded-xl bg-[var(--lime)]/10 px-3 py-2.5">
                <span className="text-sm">Estimated burn</span>
                <span className="font-heading text-lg font-bold text-[var(--lime)]">
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
                  className="flex-1 bg-[var(--lime)] text-[var(--ink)] font-semibold hover:bg-[var(--lime)]/90"
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
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(e)}
              className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-card/50 px-3 py-2.5 text-left transition-colors hover:bg-card/80"
            >
              <div>
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[e.category]} · {e.mets} MET
                </p>
              </div>
              <Plus className="size-4 text-[var(--lime)]" />
            </button>
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