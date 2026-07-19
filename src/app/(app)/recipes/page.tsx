"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { makeId } from "@/lib/id";
import type { Recipe } from "@/lib/types";
import { useCloudMeals } from "@/lib/use-cloud-meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, ChefHat, ClipboardPlus, Trash2, X } from "lucide-react";

export default function RecipesPage() {
  const recipes = useStore((s) => s.recipes);
  const addRecipe = useStore((s) => s.addRecipe);
  const deleteRecipe = useStore((s) => s.deleteRecipe);
  const { addMeal } = useCloudMeals();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Kitchen</p>
          <h1 className="font-heading text-3xl font-extrabold">Recipes</h1>
          <p className="text-sm font-medium text-muted-foreground">
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
        <Card className="rounded-[1.6rem] border-dashed border-white/10 bg-white/[0.035]">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
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
              <Card className="carbon-card rounded-[1.45rem] border-white/7">
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
                      aria-label="Delete recipe"
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
                  {r.kcal_per_serving ? <Button variant="outline" size="sm" className="mt-3 w-full" onClick={async () => {
                    await addMeal({ id: makeId(), type: "lunch", loggedAt: new Date().toISOString(), total_kcal: r.kcal_per_serving ?? 0, p: r.protein_per_serving ?? 0, f: r.fat_per_serving ?? 0, c: r.carb_per_serving ?? 0, items: [{ food_item_id: r.id, name: r.name, quantity: 1, unit: "serving", kcal: r.kcal_per_serving ?? 0, protein_g: r.protein_per_serving ?? 0, fat_g: r.fat_per_serving ?? 0, carb_g: r.carb_per_serving ?? 0 }] });
                    toast.success(`${r.name} logged`);
                  }}><ClipboardPlus className="mr-1 size-4" />Log one serving · {r.kcal_per_serving} kcal</Button> : null}
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
  const [nutrition, setNutrition] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

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
      id: makeId(),
      name,
      servings,
      instructions,
      is_template: false,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          food_item_id: makeId(),
          name: i.name,
          qty: i.qty,
          unit: i.unit,
        })),
      kcal_per_serving: nutrition.kcal || undefined,
      protein_per_serving: nutrition.protein || undefined,
      carb_per_serving: nutrition.carbs || undefined,
      fat_per_serving: nutrition.fat || undefined,
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
      <Card className="premium-panel rounded-[1.6rem]">
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
                  aria-label={`Ingredient ${i + 1} name`}
                  placeholder="Ingredient"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  aria-label={`Ingredient ${i + 1} quantity`}
                  type="number"
                  value={ing.qty}
                  onChange={(e) => updateIngredient(i, { qty: +e.target.value })}
                  className="w-16"
                />
                <Input
                  aria-label={`Ingredient ${i + 1} unit`}
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                  className="w-14"
                />
                <button
                  onClick={() => removeIngredient(i)}
                  aria-label="Remove ingredient"
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
            <Label>Nutrition per serving</Label>
            <div className="grid grid-cols-4 gap-2">
              {([['kcal', 'Kcal'], ['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat']] as const).map(([key, label]) => <div key={key} className="space-y-1"><Label htmlFor={`recipe-${key}`} className="text-[10px]">{label}</Label><Input id={`recipe-${key}`} type="number" min="0" value={nutrition[key] || ""} onChange={(event) => setNutrition((current) => ({ ...current, [key]: +event.target.value }))} /></div>)}
            </div>
            <p className="text-xs text-muted-foreground">Enter label values so the recipe can be logged in one tap.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (optional)</Label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Marinate 15 min, grill…"
              className="min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm outline-none focus:border-[var(--rosso)]"
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
