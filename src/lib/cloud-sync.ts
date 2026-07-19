"use client";

import { get as idbGet, set as idbSet } from "idb-keyval";
import type { ExerciseLog, Meal } from "@/lib/types";
import {
  deleteSupabaseExerciseLog,
  saveSupabaseExerciseLog,
} from "@/lib/supabase/exercise-logs";
import { deleteSupabaseMeal, saveSupabaseMeal } from "@/lib/supabase/meals";

const QUEUE_KEY = "blackjacked-cloud-sync-v1";
const STATUS_EVENT = "blackjacked:sync-status";

export type CloudSyncOperation =
  | { id: string; userId: string; kind: "meal_upsert"; recordId: string; payload: Meal; attempts: number; queuedAt: string }
  | { id: string; userId: string; kind: "meal_delete"; recordId: string; attempts: number; queuedAt: string }
  | { id: string; userId: string; kind: "exercise_upsert"; recordId: string; payload: ExerciseLog; attempts: number; queuedAt: string }
  | { id: string; userId: string; kind: "exercise_delete"; recordId: string; attempts: number; queuedAt: string };

type CloudSyncInput =
  | { userId: string; kind: "meal_upsert"; recordId: string; payload: Meal }
  | { userId: string; kind: "meal_delete"; recordId: string }
  | { userId: string; kind: "exercise_upsert"; recordId: string; payload: ExerciseLog }
  | { userId: string; kind: "exercise_delete"; recordId: string };

export type CloudSyncState = "idle" | "syncing" | "offline" | "error";

let currentState: CloudSyncState = "idle";
let activeFlush: Promise<boolean> | null = null;

function emitStatus(state: CloudSyncState) {
  currentState = state;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STATUS_EVENT));
}

async function readQueue(): Promise<CloudSyncOperation[]> {
  return (await idbGet<CloudSyncOperation[]>(QUEUE_KEY)) ?? [];
}

export async function enqueueCloudSyncOperation(
  operation: CloudSyncInput,
) {
  const id = `${operation.userId}:${operation.kind.split("_")[0]}:${operation.recordId}`;
  const queue = (await readQueue()).filter((item) => item.id !== id);
  queue.push({
    ...operation,
    id,
    attempts: 0,
    queuedAt: new Date().toISOString(),
  } as CloudSyncOperation);
  await idbSet(QUEUE_KEY, queue);
  emitStatus(navigator.onLine ? "syncing" : "offline");
}

export async function getPendingCloudSyncOperations(userId: string) {
  return (await readQueue()).filter((operation) => operation.userId === userId);
}

async function execute(operation: CloudSyncOperation) {
  if (operation.kind === "meal_upsert") {
    await saveSupabaseMeal(operation.userId, operation.payload);
  } else if (operation.kind === "meal_delete") {
    await deleteSupabaseMeal(operation.recordId);
  } else if (operation.kind === "exercise_upsert") {
    await saveSupabaseExerciseLog(operation.userId, operation.payload);
  } else {
    await deleteSupabaseExerciseLog(operation.recordId);
  }
}

export async function flushCloudSyncQueue(userId: string): Promise<boolean> {
  if (activeFlush) return activeFlush;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    emitStatus("offline");
    return false;
  }

  activeFlush = (async () => {
    emitStatus("syncing");
    const queue = await readQueue();
    const remaining: CloudSyncOperation[] = [];
    let succeeded = true;

    for (const operation of queue) {
      if (operation.userId !== userId) {
        remaining.push(operation);
        continue;
      }
      try {
        await execute(operation);
      } catch {
        succeeded = false;
        remaining.push({ ...operation, attempts: operation.attempts + 1 });
      }
    }

    await idbSet(QUEUE_KEY, remaining);
    emitStatus(succeeded ? "idle" : "error");
    return succeeded;
  })().finally(() => {
    activeFlush = null;
  });

  return activeFlush;
}

export function getCloudSyncState() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  return currentState;
}

export function subscribeCloudSyncState(callback: () => void) {
  window.addEventListener(STATUS_EVENT, callback);
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener(STATUS_EVENT, callback);
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
