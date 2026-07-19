"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, Dumbbell, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useCloudExerciseLogs } from "@/lib/use-cloud-exercise-logs";
import { EXERCISES } from "@/lib/exercises-seed";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { makeId } from "@/lib/id";

const ExerciseLogForm = dynamic(
  () => import("@/components/log/exercise-log").then((module) => module.ExerciseLogForm),
  { loading: () => <WorkoutFormSkeleton />, ssr: false },
);

export default function WorkoutsPage() {
  const searchParams = useSearchParams();
  const requestedExerciseId = searchParams.get("exercise") ?? undefined;
  const exerciseLogs = useStore((s) => s.exerciseLogs);
  const { deleteExerciseLog } = useCloudExerciseLogs();
  const favoriteExerciseIds = useStore((s) => s.favoriteExerciseIds);
  const workoutRoutines = useStore((s) => s.workoutRoutines);
  const addWorkoutRoutine = useStore((s) => s.addWorkoutRoutine);
  const deleteWorkoutRoutine = useStore((s) => s.deleteWorkoutRoutine);
  const [routineName, setRoutineName] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | undefined>(requestedExerciseId);
  const [restSeconds, setRestSeconds] = useState(0);
  const logs = [...exerciseLogs].sort(
    (a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt),
  );
  const strengthLogs = logs.filter((log) => log.sets && log.reps);
  const weeklyVolume = strengthLogs
    .filter((log) => Date.now() - +new Date(log.loggedAt) <= 7 * 86_400_000)
    .reduce((sum, log) => sum + (log.sets ?? 0) * (log.reps ?? 0) * (log.load_kg ?? 1), 0);
  const personalBest = strengthLogs.reduce((best, log) => Math.max(best, log.load_kg ?? 0), 0);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => setRestSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  useEffect(() => {
    if (requestedExerciseId && EXERCISES.some((exercise) => exercise.id === requestedExerciseId)) {
      setSelectedExerciseId(requestedExerciseId);
    }
  }, [requestedExerciseId]);

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

      <Card className="premium-panel rounded-[1.5rem]"><CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between"><div><p className="font-heading text-sm font-bold">Routines</p><p className="text-xs text-muted-foreground">Create a reusable routine from starred exercises.</p></div><Dumbbell className="size-5 text-[var(--rosso-light)]" /></div>
        <div className="flex gap-2"><Input aria-label="Routine name" placeholder="Upper body A" value={routineName} onChange={(event) => setRoutineName(event.target.value)} /><Button variant="outline" disabled={!routineName.trim() || favoriteExerciseIds.length === 0} onClick={() => { addWorkoutRoutine({ id: makeId(), name: routineName.trim(), exercise_ids: favoriteExerciseIds, createdAt: new Date().toISOString() }); setRoutineName(""); toast.success("Routine created from favorites"); }}><Plus className="size-4" /></Button></div>
        {workoutRoutines.map((routine) => <div key={routine.id} className="rounded-2xl border border-white/7 bg-white/[0.035] p-3"><div className="flex items-center justify-between"><p className="text-sm font-bold">{routine.name}</p><button aria-label={`Delete ${routine.name}`} onClick={() => deleteWorkoutRoutine(routine.id)}><Trash2 className="size-3.5 text-muted-foreground" /></button></div><div className="mt-2 flex flex-wrap gap-1.5">{routine.exercise_ids.map((id) => { const exercise = EXERCISES.find((item) => item.id === id); return exercise ? <button key={id} onClick={() => setSelectedExerciseId(id)} className="rounded-full border border-white/10 px-2 py-1 text-[11px] hover:border-[var(--rosso)]/40"><Play className="mr-1 inline size-3" />{exercise.name}</button> : null; })}</div></div>)}
      </CardContent></Card>

      <ExerciseLogForm key={selectedExerciseId ?? "manual"} initialExerciseId={selectedExerciseId} />

      <Card className="rounded-[1.3rem] border-white/7"><CardContent className="flex items-center justify-between gap-3 py-3"><div className="flex items-center gap-2"><Clock3 className="size-4 text-[var(--aqua)]" /><div><p className="text-xs font-bold">Rest timer</p><p className="font-heading text-xl font-extrabold tabular-nums">{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")}</p></div></div><div className="flex gap-1">{[60, 90, 120].map((seconds) => <Button key={seconds} size="sm" variant="outline" onClick={() => setRestSeconds(seconds)}>{seconds}s</Button>)}</div></CardContent></Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-[1.3rem] border-white/7"><CardContent className="py-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">7-day volume</p><p className="font-heading text-xl font-extrabold">{Math.round(weeklyVolume).toLocaleString()}<span className="ml-1 text-xs text-muted-foreground">kg-reps</span></p></CardContent></Card>
        <Card className="rounded-[1.3rem] border-white/7"><CardContent className="py-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Top load</p><p className="font-heading text-xl font-extrabold">{personalBest || "–"}<span className="ml-1 text-xs text-muted-foreground">kg</span></p></CardContent></Card>
      </div>

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
                    {log.load_kg ? ` · ${log.load_kg} kg` : ""}
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
                      void deleteExerciseLog(log.id);
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

function WorkoutFormSkeleton() {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="flex gap-2 overflow-hidden">
        <div className="h-8 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="h-11 animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-3xl bg-white/[0.06]" />
        <div className="h-24 animate-pulse rounded-3xl bg-white/[0.06]" />
      </div>
    </div>
  );
}
