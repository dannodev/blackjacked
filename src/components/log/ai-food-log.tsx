"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { aiFoodBreakdown, type AIFoodResult } from "@/lib/ai";
import { useCloudMeals } from "@/lib/use-cloud-meals";
import { makeId } from "@/lib/id";
import type { Meal, MealItem, MealType } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
  const { addMeal } = useCloudMeals();
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

  async function confirm() {
    if (!result) return;
    const items: MealItem[] = result.ingredients.map((ing) => ({
      food_item_id: makeId(),
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      kcal: Math.round(ing.kcal),
      protein_g: +ing.protein_g.toFixed(1),
      fat_g: +ing.fat_g.toFixed(1),
      carb_g: +ing.carb_g.toFixed(1),
    }));
    const meal: Meal = {
      id: makeId(),
      type: mealType,
      loggedAt: new Date().toISOString(),
      total_kcal: result.total_kcal,
      p: result.total_protein_g,
      f: result.total_fat_g,
      c: result.total_carb_g,
      items,
    };
    await addMeal(meal);
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
              "rounded-full border px-1 py-2 text-xs font-semibold capitalize transition-colors",
              mealType === mt
                ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                : "border-white/10 text-muted-foreground",
            )}
          >
            {MEAL_LABELS[mt]}
          </button>
        ))}
      </div>

      <Card className="premium-panel rounded-[1.6rem]">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-2 text-sm text-[var(--rosso-light)]">
            <Sparkles className="size-4" />
            <span className="font-medium">Describe your meal in plain words</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2 eggs with spinach and 2 tortillas, plus a banana"
            className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm outline-none focus:border-[var(--rosso)]"
          />
          <Button
            onClick={analyze}
            disabled={loading}
            className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
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
            <Card className="carbon-card rounded-[1.6rem] border-white/7">
              <CardHeader>
                <CardTitle className="font-heading flex items-center justify-between text-base">
                  <span>Confirm before saving</span>
                  <span className="font-heading text-xl font-bold text-[var(--rosso-light)]">
                    {result.total_kcal} kcal
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
                  {result.source === "gemini"
                    ? `Gemini estimate${result.model ? ` · ${result.model}` : ""}`
                    : "Backup estimate · Gemini was unavailable"}
                </p>
                {result.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-3 py-2 text-sm"
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
                    className="flex-1 bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
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
