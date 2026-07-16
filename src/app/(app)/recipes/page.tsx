"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Recipe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, ChefHat, Trash2, X } from "lucide-react";

export default function RecipesPage() {
  const recipes = useStore((s) => s.recipes);
  const addRecipe = useStore((s) => s.addRecipe);
  const deleteRecipe = useStore((s) => s.deleteRecipe);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Recipes</h1>
          <p className="text-sm text-muted-foreground">
            Save and reuse your go-to meals
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-[var(--rosso)] text-white font-semibold hover:bg-[var(--rosso)]/90"
        >
          <Plus className="mr-1 size-4" />
          New
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <RecipeForm
            onSave={(r) => {
              addRecipe(r);
              toast.success("Recipe saved");
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {recipes.length === 0 && !showForm ? (
        <Card className="rounded-2xl border-dashed border-white/10 bg-card/40">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--rosso)]/10 text-[var(--rosso)]">
              <ChefHat className="size-6" />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              No recipes yet. Save your favorite meal formulas to log them faster.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recipes.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.servings} servings · {r.ingredients.length} ingredients
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        deleteRecipe(r.id);
                        toast.success("Recipe deleted");
                      }}
                      className="text-muted-foreground hover:text-[var(--over)]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {r.ingredients.map((ing, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        · {ing.qty}
                        {ing.unit} {ing.name}
                      </p>
                    ))}
                  </div>
                  {r.instructions && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.instructions}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeForm({
  onSave,
  onCancel,
}: {
  onSave: (r: Recipe) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<
    { name: string; qty: number; unit: string }[]
  >([]);

  function addIngredient() {
    setIngredients([...ingredients, { name: "", qty: 100, unit: "g" }]);
  }

  function updateIngredient(i: number, patch: Partial<{ name: string; qty: number; unit: string }>) {
    setIngredients((arr) =>
      arr.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)),
    );
  }

  function removeIngredient(i: number) {
    setIngredients((arr) => arr.filter((_, idx) => idx !== i));
  }

  function save() {
    if (!name.trim()) {
      toast.error("Name your recipe");
      return;
    }
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      name,
      servings,
      instructions,
      is_template: false,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          food_item_id: crypto.randomUUID(),
          name: i.name,
          qty: i.qty,
          unit: i.unit,
        })),
      createdAt: new Date().toISOString(),
    };
    onSave(recipe);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base">New recipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rname">Name</Label>
            <Input
              id="rname"
              placeholder="Garlic-lime chicken"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Servings</Label>
            <Input
              id="servings"
              type="number"
              value={servings}
              onChange={(e) => setServings(+e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ingredients</Label>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-1">
                <Input
                  placeholder="Ingredient"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={ing.qty}
                  onChange={(e) => updateIngredient(i, { qty: +e.target.value })}
                  className="w-16"
                />
                <Input
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                  className="w-14"
                />
                <button
                  onClick={() => removeIngredient(i)}
                  className="text-muted-foreground hover:text-[var(--over)]"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addIngredient}>
              <Plus className="mr-1 size-3" /> Add ingredient
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (optional)</Label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Marinate 15 min, grill…"
              className="min-h-16 w-full resize-none rounded-xl border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none focus:border-[var(--rosso)]"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[var(--rosso)] text-white font-semibold hover:bg-[var(--rosso)]/90"
              onClick={save}
            >
              Save recipe
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}