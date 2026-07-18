import type { MealSchedule, MealType } from "./types";

export interface MenuMealPreset {
  id: string;
  name: string;
  description: string;
  type: MealType;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  day: string;
  meal_slot: string;
  emoji: string;
}

export type MenuMealOption = MenuMealPreset;
type MenuLanguage = "en" | "es";

const MEAL_SLOT_ES: Record<string, string> = {
  Breakfast: "Desayuno",
  Lunch: "Comida",
  Dinner: "Cena",
  Snack: "Snack",
  "AM snack": "Snack AM",
  "PM snack": "Snack PM",
};

const DAY_ES: Record<string, string> = {
  Sunday: "Domingo",
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Custom: "Personalizado",
};

const MENU_MEAL_PRESET_ES: Record<string, Pick<MenuMealPreset, "name" | "description">> = {
  "mon-breakfast": {
    name: "Avena con manzana y canela",
    description: "40 g de avena cocida en agua, 170 g de yogur griego natural y 1/2 manzana.",
  },
  "mon-snack1": {
    name: "Pepino y jícama",
    description: "Pepino y jícama con limón y chile.",
  },
  "mon-lunch": {
    name: "Pollo al ajo y limón",
    description: "180 g de pollo, calabacita/jitomate/cebolla y 1/2 taza de arroz integral.",
  },
  "mon-snack2": {
    name: "Manzana",
    description: "1 manzana mediana.",
  },
  "mon-dinner": {
    name: "Tostadas de atún",
    description: "1 lata de atún, 3 tostadas horneadas, lechuga, pico de gallo y salsa de yogur con limón.",
  },
  "tue-breakfast": {
    name: "Huevos a la mexicana",
    description: "2 huevos con jitomate, cebolla, salsa y 2 tortillas de maíz.",
  },
  "tue-snack1": {
    name: "Plátano",
    description: "1 plátano mediano.",
  },
  "tue-lunch": {
    name: "Bowl de pollo y frijoles",
    description: "150 g de pollo, 1/2 taza de frijoles, lechuga, pepino, jitomate, salsa y 2 tortillas.",
  },
  "tue-snack2": {
    name: "Yogur griego",
    description: "170 g de yogur griego natural.",
  },
  "tue-dinner": {
    name: "Sopa rápida de pollo",
    description: "160 g de pollo, 300 g de verduras congeladas, ajo, cebolla, limón y 1 papa chica.",
  },
  "wed-breakfast": {
    name: "Bowl de yogur",
    description: "200 g de yogur griego, 30 g de avena, 1/2 manzana y canela.",
  },
  "wed-snack1": {
    name: "Pepino y jícama",
    description: "Pepino y jícama con limón.",
  },
  "wed-lunch": {
    name: "Tacos de pollo",
    description: "160 g de pollo deshebrado, lechuga, salsa, cebolla y 3 tortillas de maíz.",
  },
  "wed-snack2": {
    name: "Huevo cocido",
    description: "1 huevo cocido.",
  },
  "wed-dinner": {
    name: "Ensalada de atún y frijoles",
    description: "1 lata de atún, 1/2 taza de frijoles, pepino, jitomate, cebolla, limón y 2 tostadas horneadas.",
  },
  "thu-breakfast": {
    name: "Huevos con espinaca",
    description: "2 huevos con espinaca, 2 tortillas y salsa.",
  },
  "thu-snack1": {
    name: "Manzana",
    description: "1 manzana mediana.",
  },
  "thu-lunch": {
    name: "Bowl de pollo, arroz y frijoles",
    description: "170 g de pollo, 1/2 taza de arroz, 1/2 taza de frijoles, lechuga, salsa y pepino.",
  },
  "thu-snack2": {
    name: "Yogur griego",
    description: "170 g de yogur griego natural.",
  },
  "thu-dinner": {
    name: "Tostadas de pollo deshebrado",
    description: "150 g de pollo, 3 tostadas horneadas, lechuga, pico de gallo y limón.",
  },
  "fri-breakfast": {
    name: "Avena nocturna",
    description: "40 g de avena, 150 g de yogur, canela, 1/2 manzana y un chorrito de leche.",
  },
  "fri-snack1": {
    name: "Plátano",
    description: "1 plátano mediano.",
  },
  "fri-lunch": {
    name: "Tacos de pollo",
    description: "160 g de pollo deshebrado, lechuga, salsa, cebolla y 3 tortillas de maíz.",
  },
  "fri-snack2": {
    name: "Huevo cocido",
    description: "1 huevo cocido.",
  },
  "fri-dinner": {
    name: "Ensalada de atún y frijoles",
    description: "1 lata de atún, 1/2 taza de frijoles, pepino, jitomate, cebolla, limón y 2 tostadas horneadas.",
  },
  "sat-breakfast": {
    name: "Yogur con avena y fruta",
    description: "200 g de yogur, 30 g de avena y 1 plátano chico o 1/2 manzana.",
  },
  "sat-snack1": {
    name: "Palomitas naturales",
    description: "3 tazas de palomitas hechas con aire, sin mantequilla.",
  },
  "sat-lunch": {
    name: "Sartén de pollo con verduras",
    description: "180 g de pollo, mezcla California congelada, ajo, limón y 1 papa mediana.",
  },
  "sat-snack2": {
    name: "Pepino y jícama",
    description: "Pepino y jícama con limón.",
  },
  "sat-dinner": {
    name: "Cena de huevo y frijoles",
    description: "2 huevos, 1/2 taza de frijoles, salsa, 2 tortillas y ensalada.",
  },
  "sun-breakfast": {
    name: "Huevos con espinaca",
    description: "2 huevos con espinaca, cebolla, salsa y 2 tortillas.",
  },
  "sun-snack1": {
    name: "Manzana",
    description: "1 manzana mediana.",
  },
  "sun-lunch": {
    name: "Bowl de pollo, arroz y frijoles",
    description: "170 g de pollo, 1/2 taza de arroz, 1/2 taza de frijoles, lechuga, salsa y pepino.",
  },
  "sun-snack2": {
    name: "Yogur griego",
    description: "170 g de yogur griego natural.",
  },
  "sun-dinner": {
    name: "Tostadas de pollo deshebrado con panela",
    description: "150 g de pollo, 3 tostadas horneadas, lechuga, pico de gallo, limón y 30 g de queso panela.",
  },
};

export function localizeMenuMeal(
  meal: MenuMealPreset,
  language: MenuLanguage,
): MenuMealPreset {
  if (language !== "es") return meal;
  const translated = MENU_MEAL_PRESET_ES[meal.id];
  return {
    ...meal,
    name: translated?.name ?? meal.name,
    description: translated?.description ?? meal.description,
    day: DAY_ES[meal.day] ?? meal.day,
    meal_slot: MEAL_SLOT_ES[meal.meal_slot] ?? meal.meal_slot,
  };
}

export const MENU_MEAL_PRESETS: MenuMealPreset[] = [
  // Monday
  {
    id: "mon-breakfast",
    name: "Oats with apple & cinnamon",
    description: "40g oats in water, 170g Greek yogurt, 1/2 apple",
    type: "breakfast",
    kcal: 310, protein_g: 18, fat_g: 5, carb_g: 48,
    day: "Monday", meal_slot: "Breakfast", emoji: "🥣",
  },
  {
    id: "mon-snack1",
    name: "Cucumber & jicama",
    description: "With lime and chile",
    type: "snack",
    kcal: 45, protein_g: 1, fat_g: 0, carb_g: 10,
    day: "Monday", meal_slot: "AM snack", emoji: "🥒",
  },
  {
    id: "mon-lunch",
    name: "Garlic-lime chicken",
    description: "180g chicken, calabacita/jitomate/onion, 1/2 cup brown rice",
    type: "lunch",
    kcal: 480, protein_g: 45, fat_g: 10, carb_g: 45,
    day: "Monday", meal_slot: "Lunch", emoji: "🍗",
  },
  {
    id: "mon-snack2",
    name: "Apple",
    description: "1 medium apple",
    type: "snack",
    kcal: 95, protein_g: 0.5, fat_g: 0.3, carb_g: 25,
    day: "Monday", meal_slot: "PM snack", emoji: "🍎",
  },
  {
    id: "mon-dinner",
    name: "Tuna tostadas",
    description: "1 can tuna, 3 baked tostadas, lettuce, pico de gallo, yogurt-lime sauce",
    type: "dinner",
    kcal: 380, protein_g: 28, fat_g: 12, carb_g: 38,
    day: "Monday", meal_slot: "Dinner", emoji: "🐟",
  },
  // Tuesday
  {
    id: "tue-breakfast",
    name: "Huevos a la mexicana",
    description: "2 eggs, jitomate, onion, salsa, 2 corn tortillas",
    type: "breakfast",
    kcal: 320, protein_g: 16, fat_g: 14, carb_g: 30,
    day: "Tuesday", meal_slot: "Breakfast", emoji: "🥚",
  },
  {
    id: "tue-snack1",
    name: "Banana",
    description: "1 medium banana",
    type: "snack",
    kcal: 105, protein_g: 1.3, fat_g: 0.4, carb_g: 27,
    day: "Tuesday", meal_slot: "AM snack", emoji: "🍌",
  },
  {
    id: "tue-lunch",
    name: "Chicken & bean bowl",
    description: "150g chicken, 1/2 cup beans, lettuce, cucumber, tomato, salsa, 2 tortillas",
    type: "lunch",
    kcal: 450, protein_g: 38, fat_g: 10, carb_g: 48,
    day: "Tuesday", meal_slot: "Lunch", emoji: "🌯",
  },
  {
    id: "tue-snack2",
    name: "Greek yogurt",
    description: "Plain Greek yogurt, 170g",
    type: "snack",
    kcal: 100, protein_g: 17, fat_g: 0.7, carb_g: 6,
    day: "Tuesday", meal_slot: "PM snack", emoji: "🥛",
  },
  {
    id: "tue-dinner",
    name: "Quick chicken soup",
    description: "160g chicken, 300g frozen veg, garlic, onion, lime, 1 small potato",
    type: "dinner",
    kcal: 350, protein_g: 30, fat_g: 6, carb_g: 38,
    day: "Tuesday", meal_slot: "Dinner", emoji: "🍜",
  },
  // Wednesday
  {
    id: "wed-breakfast",
    name: "Yogurt bowl",
    description: "200g Greek yogurt, 30g oats, 1/2 apple, cinnamon",
    type: "breakfast",
    kcal: 290, protein_g: 22, fat_g: 5, carb_g: 40,
    day: "Wednesday", meal_slot: "Breakfast", emoji: "🥣",
  },
  {
    id: "wed-snack1",
    name: "Cucumber & jicama",
    description: "With lime",
    type: "snack",
    kcal: 45, protein_g: 1, fat_g: 0, carb_g: 10,
    day: "Wednesday", meal_slot: "AM snack", emoji: "🥒",
  },
  {
    id: "wed-lunch",
    name: "Chicken tacos",
    description: "160g shredded chicken, lettuce, salsa, onion, 3 corn tortillas",
    type: "lunch",
    kcal: 420, protein_g: 35, fat_g: 12, carb_g: 42,
    day: "Wednesday", meal_slot: "Lunch", emoji: "🌮",
  },
  {
    id: "wed-snack2",
    name: "Boiled egg",
    description: "1 boiled egg",
    type: "snack",
    kcal: 78, protein_g: 6.3, fat_g: 5.3, carb_g: 0.6,
    day: "Wednesday", meal_slot: "PM snack", emoji: "🥚",
  },
  {
    id: "wed-dinner",
    name: "Tuna & bean salad",
    description: "1 can tuna, 1/2 cup beans, cucumber, tomato, onion, lime, 2 baked tostadas",
    type: "dinner",
    kcal: 360, protein_g: 30, fat_g: 8, carb_g: 38,
    day: "Wednesday", meal_slot: "Dinner", emoji: "🥗",
  },
  // Thursday
  {
    id: "thu-breakfast",
    name: "Eggs with spinach",
    description: "2 eggs, spinach, 2 tortillas, salsa",
    type: "breakfast",
    kcal: 280, protein_g: 16, fat_g: 13, carb_g: 26,
    day: "Thursday", meal_slot: "Breakfast", emoji: "🥚",
  },
  {
    id: "thu-snack1",
    name: "Apple",
    description: "1 medium apple",
    type: "snack",
    kcal: 95, protein_g: 0.5, fat_g: 0.3, carb_g: 25,
    day: "Thursday", meal_slot: "AM snack", emoji: "🍎",
  },
  {
    id: "thu-lunch",
    name: "Chicken rice & bean bowl",
    description: "170g chicken, 1/2 cup rice, 1/2 cup beans, lettuce, salsa, cucumber",
    type: "lunch",
    kcal: 520, protein_g: 42, fat_g: 10, carb_g: 58,
    day: "Thursday", meal_slot: "Lunch", emoji: "🍚",
  },
  {
    id: "thu-snack2",
    name: "Greek yogurt",
    description: "Plain Greek yogurt, 170g",
    type: "snack",
    kcal: 100, protein_g: 17, fat_g: 0.7, carb_g: 6,
    day: "Thursday", meal_slot: "PM snack", emoji: "🥛",
  },
  {
    id: "thu-dinner",
    name: "Shredded chicken tostadas",
    description: "150g chicken, 3 baked tostadas, lettuce, pico de gallo, lime",
    type: "dinner",
    kcal: 380, protein_g: 30, fat_g: 10, carb_g: 38,
    day: "Thursday", meal_slot: "Dinner", emoji: "🍗",
  },
  // Friday
  {
    id: "fri-breakfast",
    name: "Overnight oats",
    description: "40g oats, 150g yogurt, cinnamon, 1/2 apple, splash milk",
    type: "breakfast",
    kcal: 310, protein_g: 16, fat_g: 5, carb_g: 48,
    day: "Friday", meal_slot: "Breakfast", emoji: "🥣",
  },
  {
    id: "fri-snack1",
    name: "Banana",
    description: "1 medium banana",
    type: "snack",
    kcal: 105, protein_g: 1.3, fat_g: 0.4, carb_g: 27,
    day: "Friday", meal_slot: "AM snack", emoji: "🍌",
  },
  {
    id: "fri-lunch",
    name: "Chicken tacos",
    description: "160g shredded chicken, lettuce, salsa, onion, 3 corn tortillas",
    type: "lunch",
    kcal: 420, protein_g: 35, fat_g: 12, carb_g: 42,
    day: "Friday", meal_slot: "Lunch", emoji: "🌮",
  },
  {
    id: "fri-snack2",
    name: "Boiled egg",
    description: "1 boiled egg",
    type: "snack",
    kcal: 78, protein_g: 6.3, fat_g: 5.3, carb_g: 0.6,
    day: "Friday", meal_slot: "PM snack", emoji: "🥚",
  },
  {
    id: "fri-dinner",
    name: "Tuna & bean salad",
    description: "1 can tuna, 1/2 cup beans, cucumber, tomato, onion, lime, 2 baked tostadas",
    type: "dinner",
    kcal: 360, protein_g: 30, fat_g: 8, carb_g: 38,
    day: "Friday", meal_slot: "Dinner", emoji: "🥗",
  },
  // Saturday
  {
    id: "sat-breakfast",
    name: "Yogurt + oats + fruit",
    description: "200g yogurt, 30g oats, 1 small banana or 1/2 apple",
    type: "breakfast",
    kcal: 320, protein_g: 20, fat_g: 5, carb_g: 48,
    day: "Saturday", meal_slot: "Breakfast", emoji: "🥣",
  },
  {
    id: "sat-snack1",
    name: "Air-popped popcorn",
    description: "3 cups, no butter",
    type: "snack",
    kcal: 90, protein_g: 3, fat_g: 1, carb_g: 18,
    day: "Saturday", meal_slot: "AM snack", emoji: "🍿",
  },
  {
    id: "sat-lunch",
    name: "Chicken veggie skillet",
    description: "180g chicken, frozen California mix, garlic, lime, 1 medium potato",
    type: "lunch",
    kcal: 420, protein_g: 38, fat_g: 8, carb_g: 40,
    day: "Saturday", meal_slot: "Lunch", emoji: "🍳",
  },
  {
    id: "sat-snack2",
    name: "Cucumber & jicama",
    description: "With lime",
    type: "snack",
    kcal: 45, protein_g: 1, fat_g: 0, carb_g: 10,
    day: "Saturday", meal_slot: "PM snack", emoji: "🥒",
  },
  {
    id: "sat-dinner",
    name: "Egg & bean dinner",
    description: "2 eggs, 1/2 cup beans, salsa, 2 tortillas, side salad",
    type: "dinner",
    kcal: 350, protein_g: 20, fat_g: 12, carb_g: 38,
    day: "Saturday", meal_slot: "Dinner", emoji: "🥚",
  },
  // Sunday
  {
    id: "sun-breakfast",
    name: "Eggs with spinach",
    description: "2 eggs, spinach, onion, salsa, 2 tortillas",
    type: "breakfast",
    kcal: 280, protein_g: 16, fat_g: 13, carb_g: 26,
    day: "Sunday", meal_slot: "Breakfast", emoji: "🥚",
  },
  {
    id: "sun-snack1",
    name: "Apple",
    description: "1 medium apple",
    type: "snack",
    kcal: 95, protein_g: 0.5, fat_g: 0.3, carb_g: 25,
    day: "Sunday", meal_slot: "AM snack", emoji: "🍎",
  },
  {
    id: "sun-lunch",
    name: "Chicken rice & bean bowl",
    description: "170g chicken, 1/2 cup rice, 1/2 cup beans, lettuce, salsa, cucumber",
    type: "lunch",
    kcal: 520, protein_g: 42, fat_g: 10, carb_g: 58,
    day: "Sunday", meal_slot: "Lunch", emoji: "🍚",
  },
  {
    id: "sun-snack2",
    name: "Greek yogurt",
    description: "Plain Greek yogurt, 170g",
    type: "snack",
    kcal: 100, protein_g: 17, fat_g: 0.7, carb_g: 6,
    day: "Sunday", meal_slot: "PM snack", emoji: "🥛",
  },
  {
    id: "sun-dinner",
    name: "Shredded chicken tostadas",
    description: "150g chicken, 3 baked tostadas, lettuce, pico de gallo, lime, 30g panela",
    type: "dinner",
    kcal: 420, protein_g: 36, fat_g: 14, carb_g: 38,
    day: "Sunday", meal_slot: "Dinner", emoji: "🍗",
  },
];

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type MealWindow = {
  key: keyof MealSchedule;
  type: MealType;
  label: string;
  slot: string;
  fallbackTime: string;
  beforeMinutes: number;
  afterMinutes: number;
};

const MEAL_WINDOWS: MealWindow[] = [
  {
    key: "breakfast_time",
    type: "breakfast",
    label: "Breakfast",
    slot: "Breakfast",
    fallbackTime: "07:30",
    beforeMinutes: 90,
    afterMinutes: 90,
  },
  {
    key: "am_snack_time",
    type: "snack",
    label: "AM snack",
    slot: "AM snack",
    fallbackTime: "10:30",
    beforeMinutes: 45,
    afterMinutes: 45,
  },
  {
    key: "lunch_time",
    type: "lunch",
    label: "Lunch",
    slot: "Lunch",
    fallbackTime: "13:30",
    beforeMinutes: 90,
    afterMinutes: 90,
  },
  {
    key: "pm_snack_time",
    type: "snack",
    label: "PM snack",
    slot: "PM snack",
    fallbackTime: "16:30",
    beforeMinutes: 45,
    afterMinutes: 45,
  },
  {
    key: "dinner_time",
    type: "dinner",
    label: "Dinner",
    slot: "Dinner",
    fallbackTime: "20:00",
    beforeMinutes: 120,
    afterMinutes: 120,
  },
];

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesNow(at: Date) {
  return at.getHours() * 60 + at.getMinutes();
}

export function getActiveMealWindow(
  schedule?: MealSchedule,
  at = new Date(),
) {
  const now = minutesNow(at);
  const windows = MEAL_WINDOWS.map((window) => {
    const time = schedule?.[window.key] || window.fallbackTime;
    const center = minutesFromTime(time);
    return { ...window, time, center };
  });

  const active = windows.find(
    (window) =>
      now >= window.center - window.beforeMinutes &&
      now <= window.center + window.afterMinutes,
  );

  if (active) return active;

  return windows.reduce((closest, window) => {
    const currentDistance = Math.abs(now - window.center);
    const closestDistance = Math.abs(now - closest.center);
    return currentDistance < closestDistance ? window : closest;
  }, windows[0]);
}

export function getTodayMeals(language: MenuLanguage = "en"): MenuMealPreset[] {
  const today = DAYS_OF_WEEK[new Date().getDay()];
  return MENU_MEAL_PRESETS
    .filter((m) => m.day === today)
    .map((meal) => localizeMenuMeal(meal, language));
}

export function getCurrentMealOptions(
  schedule?: MealSchedule,
  at = new Date(),
  meals = MENU_MEAL_PRESETS,
  language: MenuLanguage = "en",
): {
  label: string;
  time: string;
  options: MenuMealOption[];
} {
  const active = getActiveMealWindow(schedule, at);
  return {
    label: language === "es" ? MEAL_SLOT_ES[active.label] ?? active.label : active.label,
    time: active.time,
    options: meals
      .filter((meal) => meal.type === active.type || meal.meal_slot === active.slot)
      .map((meal) => localizeMenuMeal(meal, language)),
  };
}

export function getNextMealToLog(
  remainingKcal: number,
  schedule?: MealSchedule,
): MenuMealPreset | null {
  const today = getTodayMeals();
  if (today.length === 0) return null;

  const target = today.find(
    (m) => m.meal_slot === getActiveMealWindow(schedule).slot,
  );
  if (target && target.kcal <= remainingKcal + 50) return target;

  const firstNotLogged = today.find((m) => m.kcal <= remainingKcal + 100);
  return firstNotLogged ?? today[0];
}
