"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Meal, MealItem, MealType } from "@/lib/types";

const RECENT_MEAL_LIMIT = 250;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MealRow = {
  id: string;
  user_id: string;
  type: MealType;
  logged_at: string;
  total_kcal: number;
  p: number;
  f: number;
  c: number;
};

type MealItemRow = {
  id: string;
  meal_id: string;
  food_item_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
};

type MealWithItemsRow = MealRow & {
  meal_items?: MealItemRow[];
};

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function fromRow(row: MealWithItemsRow): Meal {
  return {
    id: row.id,
    type: row.type,
    loggedAt: row.logged_at,
    total_kcal: row.total_kcal,
    p: row.p,
    f: row.f,
    c: row.c,
    items: (row.meal_items ?? []).map((item) => ({
      food_item_id: item.food_item_id ?? item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      kcal: item.kcal,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      carb_g: item.carb_g,
    })),
  };
}

function mealToRow(userId: string, meal: Meal) {
  return {
    id: meal.id,
    user_id: userId,
    type: meal.type,
    logged_at: meal.loggedAt,
    total_kcal: Math.round(meal.total_kcal),
    p: meal.p,
    f: meal.f,
    c: meal.c,
  };
}

function itemToRow(mealId: string, item: MealItem, index: number) {
  return {
    id: crypto.randomUUID?.() ?? `${mealId}-${index}`,
    meal_id: mealId,
    food_item_id: isUuid(item.food_item_id) ? item.food_item_id : null,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    kcal: Math.round(item.kcal),
    protein_g: item.protein_g,
    fat_g: item.fat_g,
    carb_g: item.carb_g,
  };
}

export async function loadSupabaseMeals(userId: string): Promise<Meal[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("meals")
    .select(
      "id, user_id, type, logged_at, total_kcal, p, f, c, meal_items(id, meal_id, food_item_id, name, quantity, unit, kcal, protein_g, fat_g, carb_g)",
    )
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(RECENT_MEAL_LIMIT);

  if (error) throw error;
  return ((data ?? []) as MealWithItemsRow[]).map(fromRow);
}

export async function saveSupabaseMeal(
  userId: string,
  meal: Meal,
): Promise<Meal | null> {
  if (!isSupabaseConfigured()) return meal;
  if (!isUuid(meal.id)) return null;

  const supabase = getSupabaseBrowser();
  const { error: mealError } = await supabase
    .from("meals")
    .upsert(mealToRow(userId, meal), { onConflict: "id" });

  if (mealError) throw mealError;

  const { error: deleteItemsError } = await supabase
    .from("meal_items")
    .delete()
    .eq("meal_id", meal.id);

  if (deleteItemsError) throw deleteItemsError;

  if (meal.items.length > 0) {
    const { error: itemError } = await supabase
      .from("meal_items")
      .insert(meal.items.map((item, index) => itemToRow(meal.id, item, index)));

    if (itemError) throw itemError;
  }

  return meal;
}

export async function deleteSupabaseMeal(mealId: string) {
  if (!isSupabaseConfigured() || !isUuid(mealId)) return;

  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from("meals").delete().eq("id", mealId);
  if (error) throw error;
}
