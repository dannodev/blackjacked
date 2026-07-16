"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore, useAllFoods } from "@/lib/store";
import type { FoodItem, Meal, MealItem, MealType } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, X } from "lucide-react";
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

export function FoodLog() {
  const foods = useAllFoods();
  const addMeal = useStore((s) => s.addMeal);
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

  function save() {
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
      id: crypto.randomUUID(),
      type: mealType,
      loggedAt: nowTime(),
      total_kcal: Math.round(cartTotals.kcal),
      p: +cartTotals.p.toFixed(1),
      f: +cartTotals.f.toFixed(1),
      c: +cartTotals.c.toFixed(1),
      items,
    };
    addMeal(meal);
    setCart([]);
    toast.success(`${MEAL_LABELS[mealType]} logged`, {
      description: `${cartTotals.kcal.toFixed(0)} kcal added to the ring`,
    });
  }

  return (
    <div className="space-y-4">
      {/* meal type */}
      <div className="grid grid-cols-4 gap-2">
        {MEAL_TYPES.map((mt) => (
          <button
            key={mt}
            type="button"
            onClick={() => setMealType(mt)}
            className={cn(
              "rounded-xl border px-1 py-2 text-xs font-medium transition-colors",
              mealType === mt
                ? "border-[var(--lime)] bg-[var(--lime)]/10 text-[var(--lime)]"
                : "border-white/10 text-muted-foreground",
            )}
          >
            {MEAL_LABELS[mt]}
          </button>
        ))}
      </div>

      {/* search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search foods…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* results */}
      <div className="space-y-1.5">
        {results.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => add(f)}
            className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-card/50 px-3 py-2.5 text-left transition-colors hover:bg-card/80"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.serving_size}
                {f.serving_unit} · {f.kcal} kcal · P {f.protein_g} C {f.carb_g} F
                {f.fat_g}
              </p>
            </div>
            <Plus className="size-4 text-[var(--lime)]" />
          </button>
        ))}
        {results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No foods found. Try another search or add a custom food.
          </p>
        )}
      </div>

      {/* cart */}
      {cart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {MEAL_LABELS[mealType]} · {Math.round(cartTotals.kcal)} kcal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cart.map(({ item, qty }) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-2"
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
                className="w-full bg-[var(--lime)] text-[var(--ink)] font-semibold hover:bg-[var(--lime)]/90"
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