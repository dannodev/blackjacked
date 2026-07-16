import type { MealType } from "./types";

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

export function getTodayMeals(): MenuMealPreset[] {
  const today = DAYS_OF_WEEK[new Date().getDay()];
  return MENU_MEAL_PRESETS.filter((m) => m.day === today);
}

export function getNextMealToLog(remainingKcal: number): MenuMealPreset | null {
  const today = getTodayMeals();
  if (today.length === 0) return null;

  const hour = new Date().getHours();
  let targetSlot: string;
  if (hour < 11) targetSlot = "Breakfast";
  else if (hour < 12) targetSlot = "AM snack";
  else if (hour < 15) targetSlot = "Lunch";
  else if (hour < 18) targetSlot = "PM snack";
  else targetSlot = "Dinner";

  const target = today.find((m) => m.meal_slot === targetSlot);
  if (target && target.kcal <= remainingKcal + 50) return target;

  const firstNotLogged = today.find((m) => m.kcal <= remainingKcal + 100);
  return firstNotLogged ?? today[0];
}