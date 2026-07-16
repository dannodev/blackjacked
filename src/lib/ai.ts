"use client";

import { useStore } from "./store";

export const AI_PROVIDER = "gemini-3.5-flash";
export const FREE_TIER_DAILY_CAP = 1500;

export function hasGeminiKey(): boolean {
  return true;
}

function trackTokens(n: number) {
  useStore.getState().bumpAiTokens(n);
}

async function requestAiJson<T>(
  action: "food" | "menu" | "exercise" | "insight",
  prompt: string,
): Promise<T> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, prompt }),
  });
  const result = (await response.json()) as {
    data?: unknown;
    tokens?: number;
    error?: string;
  };

  if (!response.ok || result.data === undefined) {
    throw new Error(result.error ?? "AI request failed");
  }

  if (result.tokens) trackTokens(Math.ceil(result.tokens));
  return result.data as T;
}

/* ============ Types ============ */

export interface AIFoodResult {
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    kcal: number;
    protein_g: number;
    fat_g: number;
    carb_g: number;
  }[];
  total_kcal: number;
  total_protein_g: number;
  total_fat_g: number;
  total_carb_g: number;
  summary: string;
}

export interface AIMenuDay {
  day: string;
  breakfast: string;
  am_snack: string;
  lunch: string;
  pm_snack: string;
  dinner: string;
  est_kcal: number;
}

export interface AIMenuPlan {
  days: AIMenuDay[];
  notes: string;
}

export interface AIExerciseMatch {
  exercise_id: string;
  name: string;
  mets: number;
  category: string;
  confidence: number;
}

export interface AIInsight {
  insight: string;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

function assertFoodResult(value: unknown): AIFoodResult {
  const data = value as Partial<AIFoodResult>;
  if (
    !data ||
    !Array.isArray(data.ingredients) ||
    data.ingredients.length === 0 ||
    !isNonNegativeNumber(data.total_kcal) ||
    !isNonNegativeNumber(data.total_protein_g) ||
    !isNonNegativeNumber(data.total_fat_g) ||
    !isNonNegativeNumber(data.total_carb_g) ||
    typeof data.summary !== "string"
  ) {
    throw new Error("Gemini returned an invalid food macro shape.");
  }

  for (const ingredient of data.ingredients) {
    if (
      !ingredient ||
      typeof ingredient.name !== "string" ||
      typeof ingredient.unit !== "string" ||
      !isNonNegativeNumber(ingredient.quantity) ||
      !isNonNegativeNumber(ingredient.kcal) ||
      !isNonNegativeNumber(ingredient.protein_g) ||
      !isNonNegativeNumber(ingredient.fat_g) ||
      !isNonNegativeNumber(ingredient.carb_g)
    ) {
      throw new Error("Gemini returned an invalid ingredient macro shape.");
    }
  }

  return data as AIFoodResult;
}

/* ============ Food breakdown ============ */

export async function aiFoodBreakdown(text: string): Promise<AIFoodResult> {
  const prompt = `You are a nutrition expert. Break down this food description into ingredients with macro estimates.
Return ONLY valid JSON (no markdown, no code fences) matching this TypeScript type:
{ ingredients: { name: string; quantity: number; unit: string; kcal: number; protein_g: number; fat_g: number; carb_g: number }[]; total_kcal: number; total_protein_g: number; total_fat_g: number; total_carb_g: number; summary: string }

Food description: "${text}"`;

  try {
    const result = await requestAiJson<unknown>("food", prompt);
    return assertFoodResult(result);
  } catch (e) {
    console.warn("Gemini food call failed, using mock", e);
    void e;
    return mockFoodBreakdown(text);
  }
}

/* ============ Weekly menu planner ============ */

export async function aiMenuPlan(
  menuText: string,
  constraints: {
    calorie_goal: number;
    protein_goal: number;
    no_repeat_two_days: boolean;
    dinner_ne_lunch: boolean;
  },
): Promise<AIMenuPlan> {
  const conds = [
    `Target ${constraints.calorie_goal} kcal/day`,
    `Protein goal ${constraints.protein_goal}g/day`,
    constraints.no_repeat_two_days && "No same meal 2 days in a row",
    constraints.dinner_ne_lunch && "Dinner must differ from lunch",
  ].filter(Boolean);

  const prompt = `You are a meal planner. Create a 7-day menu using the foods/meals from the provided reference menu as inspiration.
Constraints: ${conds.join(", ")}.
Return ONLY valid JSON (no markdown) matching:
{ days: { day: string; breakfast: string; am_snack: string; lunch: string; pm_snack: string; dinner: string; est_kcal: number }[]; notes: string }

Reference menu:\n${menuText}`;

  try {
    return await requestAiJson<AIMenuPlan>("menu", prompt);
  } catch (e) {
    console.warn("Gemini menu call failed, using mock", e);
    return mockMenuPlan(menuText, constraints);
  }
}

/* ============ Exercise match ============ */

export async function aiExerciseMatch(
  text: string,
): Promise<AIExerciseMatch[]> {
  const prompt = `Match this workout description to exercises from a library. Return ONLY JSON (no markdown) array matching:
{ exercise_id: string; name: string; mets: number; category: string; confidence: number }[]

Library: ${JSON.stringify(EXERCISES_FOR_MATCH)}

Workout: "${text}"`;

  try {
    return await requestAiJson<AIExerciseMatch[]>("exercise", prompt);
  } catch (e) {
    console.warn("Gemini match failed, using mock", e);
    return mockExerciseMatch(text);
  }
}

/* ============ Nightly insight ============ */

export async function aiInsight(
  ctx: string,
): Promise<AIInsight> {
  const prompt = `You are a friendly fitness coach. Given today's data, write ONE short encouraging sentence (max 15 words). Return ONLY JSON: { insight: string }

Data: ${ctx}`;

  try {
    return await requestAiJson<AIInsight>("insight", prompt);
  } catch (error) {
    console.warn("Gemini insight call failed, using mock", error);
    return { insight: mockInsight(ctx) };
  }
}

/* ============ Mock fallbacks ============ */

const PORTIONS: Record<string, { kcal: number; p: number; f: number; c: number; unit: string; qty: number }> = {
  egg: { kcal: 78, p: 6.3, f: 5.3, c: 0.6, unit: "egg", qty: 1 },
  chicken: { kcal: 165, p: 31, f: 3.6, c: 0, unit: "g", qty: 100 },
  rice: { kcal: 130, p: 2.7, f: 0.3, c: 28, unit: "g", qty: 100 },
  oats: { kcal: 150, p: 5.4, f: 2.7, c: 27, unit: "g", qty: 40 },
  yogurt: { kcal: 100, p: 17, f: 0.7, c: 6, unit: "g", qty: 170 },
  banana: { kcal: 105, p: 1.3, f: 0.4, c: 27, unit: "medium", qty: 1 },
  apple: { kcal: 95, p: 0.5, f: 0.3, c: 25, unit: "medium", qty: 1 },
  tuna: { kcal: 116, p: 26, f: 1, c: 0, unit: "g", qty: 100 },
  tortilla: { kcal: 144, p: 4, f: 3.7, c: 24, unit: "medium", qty: 1 },
  beans: { kcal: 132, p: 9, f: 0.5, c: 24, unit: "g", qty: 100 },
  potato: { kcal: 93, p: 2.5, f: 0.1, c: 21, unit: "g", qty: 100 },
  bread: { kcal: 80, p: 4, f: 1.1, c: 14, unit: "slice", qty: 1 },
  avocado: { kcal: 160, p: 2, f: 15, c: 9, unit: "g", qty: 100 },
  salad: { kcal: 60, p: 2, f: 3, c: 6, unit: "serving", qty: 1 },
};

function mockFoodBreakdown(text: string): AIFoodResult {
  const lower = text.toLowerCase();
  const found: AIFoodResult["ingredients"] = [];
  for (const [key, p] of Object.entries(PORTIONS)) {
    if (lower.includes(key)) {
      found.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        quantity: p.qty,
        unit: p.unit,
        kcal: p.kcal,
        protein_g: p.p,
        fat_g: p.f,
        carb_g: p.c,
      });
    }
  }
  if (found.length === 0) {
    found.push({
      name: text.slice(0, 40),
      quantity: 1,
      unit: "serving",
      kcal: 350,
      protein_g: 20,
      fat_g: 12,
      carb_g: 35,
    });
  }
  const total = found.reduce(
    (a, i) => ({
      kcal: a.kcal + i.kcal,
      p: a.p + i.protein_g,
      f: a.f + i.fat_g,
      c: a.c + i.carb_g,
    }),
    { kcal: 0, p: 0, f: 0, c: 0 },
  );
  return {
    ingredients: found,
    total_kcal: Math.round(total.kcal),
    total_protein_g: +total.p.toFixed(1),
    total_fat_g: +total.f.toFixed(1),
    total_carb_g: +total.c.toFixed(1),
    summary: `${found.length} ingredient(s) · ~${Math.round(total.kcal)} kcal`,
  };
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BREAKFASTS = [
  "Oats with apple and cinnamon: 40g oats, 170g Greek yogurt, 1/2 apple",
  "Huevos a la mexicana: 2 eggs, jitomate, onion, salsa, 2 tortillas",
  "Yogurt bowl: 200g Greek yogurt, 30g oats, 1/2 apple, cinnamon",
  "2 eggs with spinach, 2 tortillas, salsa",
  "Overnight oats: 40g oats, 150g yogurt, cinnamon, 1/2 apple",
  "Yogurt + oats + fruit: 200g yogurt, 30g oats, 1 banana",
  "Eggs with spinach: 2 eggs, spinach, onion, salsa, 2 tortillas",
];
const SNACKS = ["Cucumber + jicama with lime", "1 banana", "1 apple", "Plain Greek yogurt", "1 boiled egg", "3 cups popcorn"];
const LUNCHES = [
  "Garlic-lime chicken: 180g chicken, calabacita, 1/2 cup brown rice",
  "Chicken and bean bowl: 150g chicken, beans, lettuce, salsa, 2 tortillas",
  "Chicken tacos: 160g shredded chicken, lettuce, salsa, 3 tortillas",
  "Chicken rice bowl: 170g chicken, 1/2 cup rice, 1/2 cup beans, salad",
  "Chicken veggie skillet: 180g chicken, frozen veg, 1 potato",
];
const DINNERS = [
  "Tuna tostadas: 1 can tuna, 3 tostadas, lettuce, pico de gallo",
  "Quick chicken soup: 160g chicken, 300g frozen veg, lime",
  "Tuna and bean salad: 1 can tuna, beans, cucumber, lime, 2 tostadas",
  "Shredded chicken tostadas: 150g chicken, 3 tostadas, lettuce",
  "Egg and bean dinner: 2 eggs, 1/2 cup beans, salsa, 2 tortillas",
];

function mockMenuPlan(
  _menuText: string,
  c: { calorie_goal: number },
): AIMenuPlan {
  const days = DAY_NAMES.map((day, i) => {
    const lunch = LUNCHES[i % LUNCHES.length];
    const dinner = DINNERS[(i + 2) % DINNERS.length];
    return {
      day,
      breakfast: BREAKFASTS[i % BREAKFASTS.length],
      am_snack: SNACKS[i % SNACKS.length],
      lunch,
      pm_snack: SNACKS[(i + 3) % SNACKS.length],
      dinner,
      est_kcal: c.calorie_goal + (Math.random() * 200 - 100) | 0,
    };
  });
  return { days, notes: "Mock plan based on your PDF menu. Add GEMINI_API_KEY for AI-generated variety." };
}

const EXERCISES_FOR_MATCH = [
  { name: "running", id: "run", category: "cardio", mets: 9.8 },
  { name: "cycling", id: "cycle", category: "cardio", mets: 7.5 },
  { name: "walking", id: "walk", category: "cardio", mets: 3.5 },
  { name: "swimming", id: "swim", category: "cardio", mets: 8.0 },
  { name: "squats", id: "squat", category: "gym", mets: 5.0 },
  { name: "push-ups", id: "pushup", category: "gym", mets: 8.0 },
  { name: "pull-ups", id: "pullup", category: "gym", mets: 8.0 },
  { name: "yoga", id: "yoga", category: "sports", mets: 3.0 },
  { name: "basketball", id: "basketball", category: "sports", mets: 6.5 },
  { name: "soccer", id: "soccer", category: "sports", mets: 7.0 },
  { name: "tennis", id: "tennis", category: "sports", mets: 7.3 },
  { name: "boxing", id: "box", category: "sports", mets: 9.0 },
  { name: "plank", id: "plank", category: "core", mets: 4.0 },
  { name: "jump rope", id: "jumprope", category: "cardio", mets: 12.3 },
];

function mockExerciseMatch(text: string): AIExerciseMatch[] {
  const lower = text.toLowerCase();
  const matches: AIExerciseMatch[] = [];
  for (const e of EXERCISES_FOR_MATCH) {
    if (lower.includes(e.name)) {
      matches.push({ exercise_id: e.id, name: e.name, mets: e.mets, category: e.category, confidence: 0.85 });
    }
  }
  if (matches.length === 0) {
    matches.push({ exercise_id: "walk", name: "Walking", mets: 3.5, category: "cardio", confidence: 0.4 });
  }
  return matches;
}

function mockInsight(ctx: string): string {
  const data = ctx.toLowerCase();
  if (data.includes("over") || data.includes("surplus")) return "Tomorrow, a short walk can flip the deficit back. Keep going.";
  if (data.includes("streak")) return "Streak intact. Consistency compounds — you're proving it.";
  return "Solid day. Hydrate, sleep well, and burn again tomorrow.";
}
