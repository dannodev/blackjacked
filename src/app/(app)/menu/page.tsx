"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { aiMenuPlan, type AIMenuPlan } from "@/lib/ai";
import { MENU_PDF_TEXT } from "@/lib/menu-data";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Loader2, Utensils } from "lucide-react";

export default function MenuPage() {
  const profile = useStore((s) => s.profile)!;
  const aiTokens = useStore((s) => s.aiTokenCount);
  const [plan, setPlan] = useState<AIMenuPlan | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setPlan(null);
    try {
      const result = await aiMenuPlan(MENU_PDF_TEXT, {
        calorie_goal: profile.calorie_goal,
        protein_goal: profile.protein_goal,
        no_repeat_two_days: true,
        dinner_ne_lunch: true,
      });
      setPlan(result);
      toast.success("Menu generated");
    } catch {
      toast.error("Failed to generate menu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Weekly menu</h1>
          <p className="text-sm text-muted-foreground">
            From your Mexican PDF menu · {profile.calorie_goal} kcal target
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">AI tokens today</p>
          <p className="font-heading text-sm font-bold text-[var(--rosso)]">
            {aiTokens}
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardContent className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            Gemini builds a 7-day plan from your menu PDF with these rules:
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>· No same meal 2 days in a row</li>
            <li>· Dinner ≠ lunch of the same day</li>
            <li>· Macro-balanced toward {profile.protein_goal}g protein</li>
            <li>· Uses affordable Mexican-friendly ingredients</li>
          </ul>
          <Button
            onClick={generate}
            disabled={loading}
            className="w-full bg-[var(--rosso)] text-white font-semibold hover:bg-[var(--rosso)]/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Planning your week…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Generate weekly menu
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {plan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {plan.days.map((day, i) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-base flex items-center justify-between">
                      <span>{day.day}</span>
                      <span className="text-sm font-bold text-[var(--rosso)]">
                        ~{day.est_kcal} kcal
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 py-2 text-sm">
                    <Row meal="Breakfast" desc={day.breakfast} />
                    <Row meal="Snack" desc={day.am_snack} />
                    <Row meal="Lunch" desc={day.lunch} />
                    <Row meal="Snack" desc={day.pm_snack} />
                    <Row meal="Dinner" desc={day.dinner} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {plan.notes && (
              <p className="px-4 text-center text-xs text-muted-foreground">
                <Utensils className="mr-1 inline size-3" />
                {plan.notes}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ meal, desc }: { meal: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {meal}
      </span>
      <span className="flex-1">{desc}</span>
    </div>
  );
}