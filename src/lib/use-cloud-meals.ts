"use client";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";
import { deleteSupabaseMeal, saveSupabaseMeal } from "@/lib/supabase/meals";

export function useCloudMeals() {
  const { user } = useAuth();
  const addLocalMeal = useStore((state) => state.addMeal);
  const deleteLocalMeal = useStore((state) => state.deleteMeal);

  async function addMeal(meal: Meal) {
    addLocalMeal(meal);
    if (!user) return;

    try {
      await saveSupabaseMeal(user.id, meal);
    } catch {
      toast.info("Meal saved locally", {
        description: "Cloud sync will work again when the connection is healthy.",
      });
    }
  }

  async function deleteMeal(mealId: string) {
    deleteLocalMeal(mealId);
    if (!user) return;

    try {
      await deleteSupabaseMeal(mealId);
    } catch {
      toast.info("Meal removed locally", {
        description: "Could not remove it from cloud right now.",
      });
    }
  }

  return { addMeal, deleteMeal };
}
