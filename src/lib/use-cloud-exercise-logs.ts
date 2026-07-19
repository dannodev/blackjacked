"use client";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { ExerciseLog } from "@/lib/types";
import { enqueueCloudSyncOperation, flushCloudSyncQueue } from "@/lib/cloud-sync";
import { trackProductEvent } from "@/lib/product-analytics";

export function useCloudExerciseLogs() {
  const { user } = useAuth();
  const addLocalExerciseLog = useStore((state) => state.addExerciseLog);
  const deleteLocalExerciseLog = useStore((state) => state.deleteExerciseLog);

  async function addExerciseLog(log: ExerciseLog) {
    addLocalExerciseLog(log);
    trackProductEvent("workout_logged");
    if (!user) return;

    await enqueueCloudSyncOperation({
      userId: user.id,
      kind: "exercise_upsert",
      recordId: log.id,
      payload: log,
    });
    const synced = await flushCloudSyncQueue(user.id);
    if (!synced) {
      toast.info("Workout saved locally", {
        description: "Queued securely and will retry when the connection returns.",
      });
    }
  }

  async function deleteExerciseLog(logId: string) {
    deleteLocalExerciseLog(logId);
    trackProductEvent("workout_deleted");
    if (!user) return;

    await enqueueCloudSyncOperation({
      userId: user.id,
      kind: "exercise_delete",
      recordId: logId,
    });
    const synced = await flushCloudSyncQueue(user.id);
    if (!synced) {
      toast.info("Workout removed locally", {
        description: "Deletion is queued and will retry automatically.",
      });
    }
  }

  return { addExerciseLog, deleteExerciseLog };
}
