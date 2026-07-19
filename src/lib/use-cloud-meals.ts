"use client";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";
import { enqueueCloudSyncOperation, flushCloudSyncQueue } from "@/lib/cloud-sync";
import { trackProductEvent } from "@/lib/product-analytics";

export function useCloudMeals() {
  const { user } = useAuth();
  const addLocalMeal = useStore((state) => state.addMeal);
  const deleteLocalMeal = useStore((state) => state.deleteMeal);

  async function addMeal(meal: Meal) {
    addLocalMeal(meal);
    trackProductEvent("meal_logged");
    if (!user) return;

    await enqueueCloudSyncOperation({
      userId: user.id,
      kind: "meal_upsert",
      recordId: meal.id,
      payload: meal,
    });
    const synced = await flushCloudSyncQueue(user.id);
    if (!synced) {
      toast.info("Meal saved locally", {
        description: "Queued securely and will retry when the connection returns.",
      });
    }
  }

  async function deleteMeal(mealId: string) {
    deleteLocalMeal(mealId);
    trackProductEvent("meal_deleted");
    if (!user) return;

    await enqueueCloudSyncOperation({
      userId: user.id,
      kind: "meal_delete",
      recordId: mealId,
    });
    const synced = await flushCloudSyncQueue(user.id);
    if (!synced) {
      toast.info("Meal removed locally", {
        description: "Deletion is queued and will retry automatically.",
      });
    }
  }

  return { addMeal, deleteMeal };
}
