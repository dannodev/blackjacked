"use client";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { ExerciseLog } from "@/lib/types";
import {
  deleteSupabaseExerciseLog,
  saveSupabaseExerciseLog,
} from "@/lib/supabase/exercise-logs";

export function useCloudExerciseLogs() {
  const { user } = useAuth();
  const addLocalExerciseLog = useStore((state) => state.addExerciseLog);
  const deleteLocalExerciseLog = useStore((state) => state.deleteExerciseLog);

  async function addExerciseLog(log: ExerciseLog) {
    addLocalExerciseLog(log);
    if (!user) return;

    try {
      await saveSupabaseExerciseLog(user.id, log);
    } catch {
      toast.info("Workout saved locally", {
        description: "Cloud sync will work again when the connection is healthy.",
      });
    }
  }

  async function deleteExerciseLog(logId: string) {
    deleteLocalExerciseLog(logId);
    if (!user) return;

    try {
      await deleteSupabaseExerciseLog(logId);
    } catch {
      toast.info("Workout removed locally", {
        description: "Could not remove it from cloud right now.",
      });
    }
  }

  return { addExerciseLog, deleteExerciseLog };
}
