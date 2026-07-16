"use client";

import { Dumbbell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ExerciseLogForm } from "@/components/log/exercise-log";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export default function WorkoutsPage() {
  const exerciseLogs = useStore((s) => s.exerciseLogs);
  const deleteExerciseLog = useStore((s) => s.deleteExerciseLog);
  const logs = [...exerciseLogs].sort(
    (a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt),
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">
          Training
        </p>
        <h1 className="font-heading text-3xl font-extrabold">Workouts</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Log training and remove mistaken entries.
        </p>
      </div>

      <ExerciseLogForm />

      <div className="space-y-2">
        <h2 className="font-heading text-sm font-bold">Recent workouts</h2>
        {logs.length === 0 ? (
          <Card className="rounded-[1.6rem] border-dashed border-white/10 bg-white/[0.035]">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
                <Dumbbell className="size-6" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                No workouts logged yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="carbon-card rounded-[1.35rem] border-white/7">
              <CardContent className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{log.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.loggedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {log.duration_min} min
                    {log.distance_km ? ` · ${log.distance_km} km` : ""}
                    {log.sets ? ` · ${log.sets}x${log.reps} reps` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-heading text-sm font-bold text-[var(--rosso-light)]">
                    -{Math.round(log.kcal_burned)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete ${log.exercise_name}`}
                    className="flex size-9 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-[var(--over)]/40 hover:text-[var(--over)]"
                    onClick={() => {
                      deleteExerciseLog(log.id);
                      toast.success("Workout removed");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
