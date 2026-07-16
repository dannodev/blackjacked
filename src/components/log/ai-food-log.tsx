"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { aiFoodBreakdown, type AIFoodResult } from "@/lib/ai";
import { useStore } from "@/lib/store";
import type { Meal, MealItem, MealType } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function AiFoodLog() {
  const addMeal = useStore((s) => s.addMeal);
  const [text, setText] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIFoodResult | null>(null);

  async function analyze() {
    if (!text.trim()) {
      toast.error("Describe your food first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await aiFoodBreakdown(text);
      setResult(r);
    } catch {
      toast.error("AI failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    if (!result) return;
    const items: MealItem[] = result.ingredients.map((ing) => ({
      food_item_id: crypto.randomUUID(),
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      kcal: Math.round(ing.kcal),
      protein_g: +ing.protein_g.toFixed(1),
      fat_g: +ing.fat_g.toFixed(1),
      carb_g: +ing.carb_g.toFixed(1),
    }));
    const meal: Meal = {
      id: crypto.randomUUID(),
      type: mealType,
      loggedAt: new Date().toISOString(),
      total_kcal: result.total_kcal,
      p: result.total_protein_g,
      f: result.total_fat_g,
      c: result.total_carb_g,
      items,
    };
    addMeal(meal);
    toast.success(`${MEAL_LABELS[mealType]} logged`, {
      description: `${result.total_kcal} kcal · ${result.summary}`,
    });
    setResult(null);
    setText("");
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
              "rounded-xl border px-1 py-2 text-xs font-medium capitalize transition-colors",
              mealType === mt
                ? "border-[var(--lime)] bg-[var(--lime)]/10 text-[var(--lime)]"
                : "border-white/10 text-muted-foreground",
            )}
          >
            {MEAL_LABELS[mt]}
          </button>
        ))}
      </div>

      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-2 text-sm text-[var(--lime)]">
            <Sparkles className="size-4" />
            <span className="font-medium">Describe your meal in plain words</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2 eggs with spinach and 2 tortillas, plus a banana"
            className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-[var(--lime)]"
          />
          <Button
            onClick={analyze}
            disabled={loading}
            className="w-full bg-[var(--lime)] text-[var(--ink)] font-semibold hover:bg-[var(--lime)]/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Analyze macros
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center justify-between">
                  <span>Confirm before saving</span>
                  <span className="font-heading text-xl font-bold text-[var(--lime)]">
                    {result.total_kcal} kcal
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                  >
                    <span>{ing.name}</span>
                    <span className="text-muted-foreground">
                      {ing.quantity}
                      {ing.unit} · {ing.kcal} kcal · P{ing.protein_g} C{ing.carb_g} F{ing.fat_g}
                    </span>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setResult(null)}
                  >
                    <X className="mr-1 size-4" />
                    Discard
                  </Button>
                  <Button
                    className="flex-1 bg-[var(--lime)] text-[var(--ink)] font-semibold hover:bg-[var(--lime)]/90"
                    onClick={confirm}
                  >
                    <Check className="mr-1 size-4" />
                    Confirm & log
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}