"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore, useAllFoods } from "@/lib/store";
import { useCloudMeals } from "@/lib/use-cloud-meals";
import { makeId } from "@/lib/id";
import type { FoodItem, Meal, MealItem, MealType } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { MENU_MEAL_PRESETS, type MenuMealPreset } from "@/lib/menu-meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, X, Utensils, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function nowTime() {
  return new Date().toISOString();
}

function inferMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

type SubTab = "menu" | "search" | "custom";
const MENU_DAYS = ["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function FoodLog() {
  const [subtab, setSubtab] = useState<SubTab>("menu");

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 rounded-full border border-white/8 bg-black/35 p-1">
        <SubTabBtn active={subtab === "menu"} onClick={() => setSubtab("menu")} icon={<Utensils className="size-3.5" />}>
          Menu PDF
        </SubTabBtn>
        <SubTabBtn active={subtab === "search"} onClick={() => setSubtab("search")}>
          Search Foods
        </SubTabBtn>
      </div>

      {subtab === "menu" && <MenuMealsLog />}
      {subtab === "search" && <SearchFoodsLog />}
    </div>
  );
}

function SubTabBtn({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-all",
        active
          ? "bg-white text-black shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ============ Menu Meals (from PDF) ============ */
function MenuMealsLog() {
  const { addMeal } = useCloudMeals();
  const profile = useStore((s) => s.profile)!;
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [dayFilter, setDayFilter] = useState("All");
  const [mealFilter, setMealFilter] = useState<MealType | "all">("all");

  const menuMeals = useMemo(() => {
    return MENU_MEAL_PRESETS.filter((meal) => {
      const matchesDay = dayFilter === "All" || meal.day === dayFilter;
      const matchesMeal = mealFilter === "all" || meal.type === mealFilter;
      return matchesDay && matchesMeal;
    });
  }, [dayFilter, mealFilter]);

  async function logPreset(preset: MenuMealPreset) {
    const meal: Meal = {
      id: makeId(),
      type: preset.type,
      loggedAt: nowTime(),
      total_kcal: preset.kcal,
      p: preset.protein_g,
      f: preset.fat_g,
      c: preset.carb_g,
      items: [
        {
          food_item_id: preset.id,
          name: preset.name,
          quantity: 1,
          unit: "serving",
          kcal: preset.kcal,
          protein_g: preset.protein_g,
          fat_g: preset.fat_g,
          carb_g: preset.carb_g,
        },
      ],
    };
    await addMeal(meal);
    setLogged((s) => new Set([...s, preset.id]));
    toast.success(`${preset.name} logged`, {
      description: `${preset.kcal} kcal · P${preset.protein_g}g C${preset.carb_g}g F${preset.fat_g}g`,
    });
  }

  if (MENU_MEAL_PRESETS.length === 0) {
    return (
      <Card className="rounded-[1.6rem] border-dashed border-white/10 bg-white/[0.035]">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
            <Utensils className="size-6" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            No meals mapped from your weekly PDF yet. Use the Search tab for now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {dayFilter === "All" ? "All PDF meals" : dayFilter}
        </p>
        <p className="text-xs text-muted-foreground">
          Goal: {profile.calorie_goal} kcal
        </p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {MENU_DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setDayFilter(day)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              dayFilter === day
                ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                : "border-white/10 text-muted-foreground",
            )}
          >
            {day}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {(["all", ...MEAL_TYPES] as const).map((mealType) => (
          <button
            key={mealType}
            type="button"
            onClick={() => setMealFilter(mealType)}
            className={cn(
              "rounded-full border px-1 py-1.5 text-[10px] font-semibold transition-colors",
              mealFilter === mealType
                ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                : "border-white/10 text-muted-foreground",
            )}
          >
            {mealType === "all" ? "All" : MEAL_LABELS[mealType]}
          </button>
        ))}
      </div>
      {menuMeals.map((preset) => {
        const isLogged = logged.has(preset.id);
        return (
          <motion.div
            key={preset.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className={cn(
                "overflow-hidden rounded-[1.35rem] border-white/7 transition-all",
                isLogged
                  ? "bg-[var(--rosso)]/5 opacity-60"
                  : "carbon-card",
              )}
            >
              <CardContent className="flex items-center gap-3 py-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.055] text-2xl">
                  {preset.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{preset.name}</p>
                    {isLogged && <Check className="size-4 text-[var(--rosso-light)]" />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {preset.day} · {preset.meal_slot} · {preset.description}
                  </p>
                  <p className="mt-0.5 text-xs">
                    <span className="font-heading font-bold text-[var(--rosso-light)]">{preset.kcal}</span>
                    <span className="text-muted-foreground"> kcal · </span>
                    <span className="text-muted-foreground">P{preset.protein_g}g C{preset.carb_g}g F{preset.fat_g}g</span>
                  </p>
                </div>
                {!isLogged && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => logPreset(preset)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--rosso)] text-white rosso-glow"
                    aria-label="Log meal"
                  >
                    <Plus className="size-5" strokeWidth={2.5} />
                  </motion.button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
      {menuMeals.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No meals match those filters.
        </p>
      )}
    </div>
  );
}

/* ============ Search Foods ============ */
function SearchFoodsLog() {
  const foods = useAllFoods();
  const { addMeal } = useCloudMeals();
  const [query, setQuery] = useState("");
  const [mealType, setMealType] = useState<MealType>(inferMealType());
  const [cart, setCart] = useState<{ item: FoodItem; qty: number }[]>([]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = foods.filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.brand && f.brand.toLowerCase().includes(q)),
    );
    return list.slice(0, 30);
  }, [foods, query]);

  const cartTotals = useMemo(() => {
    return cart.reduce(
      (acc, { item, qty }) => {
        const factor = qty / item.serving_size;
        acc.kcal += item.kcal * factor;
        acc.p += item.protein_g * factor;
        acc.f += item.fat_g * factor;
        acc.c += item.carb_g * factor;
        return acc;
      },
      { kcal: 0, p: 0, f: 0, c: 0 },
    );
  }, [cart]);

  function add(item: FoodItem) {
    setCart((c) => {
      const found = c.find((x) => x.item.id === item.id);
      if (found)
        return c.map((x) =>
          x.item.id === item.id ? { ...x, qty: x.qty + item.serving_size } : x,
        );
      return [...c, { item, qty: item.serving_size }];
    });
  }

  function changeQty(id: string, qty: number) {
    setCart((c) =>
      c.map((x) => (x.item.id === id ? { ...x, qty: Math.max(0, qty) } : x)),
    );
  }

  function remove(id: string) {
    setCart((c) => c.filter((x) => x.item.id !== id));
  }

  async function save() {
    if (cart.length === 0) {
      toast.error("Add at least one food");
      return;
    }
    const items: MealItem[] = cart.map(({ item, qty }) => {
      const factor = qty / item.serving_size;
      return {
        food_item_id: item.id,
        name: item.name,
        quantity: qty,
        unit: item.serving_unit,
        kcal: Math.round(item.kcal * factor),
        protein_g: +round1(item.protein_g * factor),
        fat_g: +round1(item.fat_g * factor),
        carb_g: +round1(item.carb_g * factor),
      };
    });
    const meal: Meal = {
      id: makeId(),
      type: mealType,
      loggedAt: nowTime(),
      total_kcal: Math.round(cartTotals.kcal),
      p: +cartTotals.p.toFixed(1),
      f: +cartTotals.f.toFixed(1),
      c: +cartTotals.c.toFixed(1),
      items,
    };
    await addMeal(meal);
    setCart([]);
    toast.success(`${MEAL_LABELS[mealType]} logged`, {
      description: `${cartTotals.kcal.toFixed(0)} kcal added to the ring`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {MEAL_TYPES.map((mt) => (
          <button
            key={mt}
            type="button"
            onClick={() => setMealType(mt)}
            className={cn(
              "rounded-full border px-1 py-2 text-xs font-semibold transition-colors",
              mealType === mt
                ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                : "border-white/10 text-muted-foreground",
            )}
          >
            {MEAL_LABELS[mt]}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search foods…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-1.5">
        {results.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => add(f)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/7 bg-white/[0.045] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.075]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.serving_size}
                {f.serving_unit} · {f.kcal} kcal · P {f.protein_g} C {f.carb_g} F
                {f.fat_g}
              </p>
            </div>
            <Plus className="size-4 text-[var(--rosso-light)]" />
          </button>
        ))}
        {results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No foods found. Try another search or use the AI food tab.
          </p>
        )}
      </div>

      {cart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="premium-panel rounded-[1.6rem]">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {MEAL_LABELS[mealType]} · {Math.round(cartTotals.kcal)} kcal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cart.map(({ item, qty }) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-2xl bg-white/[0.05] px-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.name}</p>
                  </div>
                  <Input
                    type="number"
                    value={qty}
                    onChange={(e) =>
                      changeQty(item.id, parseFloat(e.target.value) || 0)
                    }
                    className="h-8 w-20"
                  />
                  <span className="w-8 text-xs text-muted-foreground">
                    {item.serving_unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="text-muted-foreground hover:text-[var(--over)]"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <Button
                onClick={save}
                className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
              >
                Log {MEAL_LABELS[mealType].toLowerCase()}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function round1(n: number) {
  return n.toFixed(1);
}
