"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { makeId } from "@/lib/id";
import { MEAL_LABELS, type MealType } from "@/lib/types";
import { MENU_MEAL_PRESETS, type MenuMealPreset } from "@/lib/menu-meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChefHat,
  FileUp,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

type ImportedMenuMeal = Omit<MenuMealPreset, "id" | "day">;

function mealSlotFor(type: MealType) {
  if (type === "breakfast") return "Breakfast";
  if (type === "lunch") return "Lunch";
  if (type === "dinner") return "Dinner";
  return "Snack";
}

export default function MenuPage() {
  const profile = useStore((s) => s.profile)!;
  const customMenuMeals = useStore((s) => s.customMenuMeals);
  const useDefaultMenu = useStore((s) => s.useDefaultMenu);
  const setUseDefaultMenu = useStore((s) => s.setUseDefaultMenu);
  const addCustomMenuMeal = useStore((s) => s.addCustomMenuMeal);
  const deleteCustomMenuMeal = useStore((s) => s.deleteCustomMenuMeal);

  const [type, setType] = useState<MealType>("lunch");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedMeals, setImportedMeals] = useState<ImportedMenuMeal[]>([]);
  const [importModel, setImportModel] = useState<string | null>(null);

  const menuMeals = useMemo(
    () => [...(useDefaultMenu ? MENU_MEAL_PRESETS : []), ...customMenuMeals],
    [customMenuMeals, useDefaultMenu],
  );

  function addMealToMenu() {
    const nextKcal = Number(kcal);
    const nextProtein = Number(protein);
    const nextCarbs = Number(carbs);
    const nextFat = Number(fat);

    if (!name.trim() || !description.trim()) {
      toast.error("Add a meal name and recipe details");
      return;
    }

    if ([nextKcal, nextProtein, nextCarbs, nextFat].some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error("Macros must be valid positive numbers");
      return;
    }

    const meal: MenuMealPreset = {
      id: makeId(),
      name: name.trim(),
      description: description.trim(),
      type,
      kcal: Math.round(nextKcal),
      protein_g: +nextProtein.toFixed(1),
      carb_g: +nextCarbs.toFixed(1),
      fat_g: +nextFat.toFixed(1),
      day: "Custom",
      meal_slot: mealSlotFor(type),
      emoji: "🍽️",
    };

    addCustomMenuMeal(meal);
    setName("");
    setDescription("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    toast.success("Meal added to Your Menu");
  }

  function isImportedMeal(value: unknown): value is ImportedMenuMeal {
    const meal = value as Partial<ImportedMenuMeal>;
    return (
      Boolean(meal) &&
      typeof meal.name === "string" &&
      typeof meal.description === "string" &&
      MEAL_TYPES.includes(meal.type as MealType) &&
      typeof meal.kcal === "number" &&
      typeof meal.protein_g === "number" &&
      typeof meal.carb_g === "number" &&
      typeof meal.fat_g === "number" &&
      typeof meal.meal_slot === "string" &&
      typeof meal.emoji === "string"
    );
  }

  async function importMenu() {
    if (!importFile && !importText.trim()) {
      toast.error("Upload a menu or paste the menu text first");
      return;
    }

    setImporting(true);
    setImportedMeals([]);
    setImportModel(null);

    try {
      const formData = new FormData();
      if (importFile) formData.set("file", importFile);
      if (importText.trim()) formData.set("text", importText.trim());

      const response = await fetch("/api/menu-import", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        data?: { meals?: unknown[] };
        model?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Menu import failed");
      }

      const meals = (result.data?.meals ?? []).filter(isImportedMeal).slice(0, 80);
      if (meals.length === 0) {
        throw new Error("No meals were found in that menu.");
      }

      setImportedMeals(meals);
      setImportModel(result.model ?? null);
      toast.success(`Found ${meals.length} meals. Review before saving.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Menu import failed");
    } finally {
      setImporting(false);
    }
  }

  function saveImportedMeals() {
    if (importedMeals.length === 0) return;

    for (const meal of importedMeals) {
      addCustomMenuMeal({
        ...meal,
        id: makeId(),
        day: "Custom",
        kcal: Math.round(meal.kcal),
        protein_g: +meal.protein_g.toFixed(1),
        carb_g: +meal.carb_g.toFixed(1),
        fat_g: +meal.fat_g.toFixed(1),
      });
    }

    setImportedMeals([]);
    setImportText("");
    setImportFile(null);
    setImportModel(null);
    toast.success("Imported meals saved to Your Menu");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">
          Fuel plan
        </p>
        <h1 className="font-heading text-3xl font-extrabold">Your Menu</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Meals you can log fast · {profile.calorie_goal} kcal target
        </p>
      </div>

      <Link href="/recipes" className="block">
        <Card className="carbon-card rounded-[1.5rem] border-white/7">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
                <ChefHat className="size-5" />
              </div>
              <div>
                <p className="font-heading text-sm font-bold">Recipes</p>
                <p className="text-xs text-muted-foreground">
                  Save and reuse your go-to meals
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[var(--rosso-light)]">
              Open
            </span>
          </CardContent>
        </Card>
      </Link>

      <Card className="premium-panel rounded-[1.6rem]">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-base">
            <Utensils className="size-4 text-[var(--rosso-light)]" />
            Menu controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use the default menu you gave me, hide it, or add your own meals
            below.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={useDefaultMenu ? "default" : "outline"}
              className={useDefaultMenu ? "bg-[var(--rosso)] text-white" : ""}
              onClick={() => setUseDefaultMenu(!useDefaultMenu)}
            >
              {useDefaultMenu ? "Hide default menu" : "Use default menu"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setUseDefaultMenu(true);
                toast.success("Default menu restored");
              }}
            >
              <RotateCcw className="mr-1 size-4" />
              Restore
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="carbon-card rounded-[1.6rem] border-white/7">
        <CardHeader>
          <CardTitle className="font-heading text-base">Add a meal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((mealType) => (
              <button
                key={mealType}
                type="button"
                onClick={() => setType(mealType)}
                className={cn(
                  "rounded-full border px-1 py-2 text-xs font-semibold transition-colors",
                  type === mealType
                    ? "border-[var(--rosso)] bg-[var(--rosso)]/12 text-[var(--rosso-light)]"
                    : "border-white/10 text-muted-foreground",
                )}
              >
                {MEAL_LABELS[mealType]}
              </button>
            ))}
          </div>
          <Field label="Meal name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Recipe / details">
            <Input
              value={description}
              placeholder="e.g. 160g chicken, 3 tortillas, salsa"
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Kcal">
              <Input type="number" value={kcal} onChange={(event) => setKcal(event.target.value)} />
            </Field>
            <Field label="Protein">
              <Input type="number" value={protein} onChange={(event) => setProtein(event.target.value)} />
            </Field>
            <Field label="Carbs">
              <Input type="number" value={carbs} onChange={(event) => setCarbs(event.target.value)} />
            </Field>
            <Field label="Fat">
              <Input type="number" value={fat} onChange={(event) => setFat(event.target.value)} />
            </Field>
          </div>
          <Button
            className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
            onClick={addMealToMenu}
          >
            <Plus className="mr-1 size-4" />
            Add to Your Menu
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[1.6rem] border-dashed border-white/10 bg-white/[0.035]">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-base">
            <FileUp className="size-4 text-[var(--rosso-light)]" />
            Import Your Menu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a PDF, clear photo, or TXT menu. Gemini will extract meal
            options and estimate missing macros, then you review before saving.
          </p>
          <div className="space-y-2">
            <Label htmlFor="menu-import-file" className="text-xs">
              Menu file
            </Label>
            <label
              htmlFor="menu-import-file"
              className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm transition-colors hover:border-[var(--rosso)]/45 hover:bg-white/[0.07]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileUp className="size-4 shrink-0 text-[var(--rosso-light)]" />
                <span className="truncate">
                  {importFile ? importFile.name : "Tap here to upload your menu"}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-[var(--rosso)]/12 px-3 py-1 text-xs font-semibold text-[var(--rosso-light)]">
                Choose file
              </span>
            </label>
            <Input
              id="menu-import-file"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
              className="sr-only"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Works best with a clear PDF or photo under 8 MB.
            </p>
          </div>
          <Field label="Or paste menu text">
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste meals, ingredients, or macros here..."
              className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm outline-none focus:border-[var(--rosso)]"
            />
          </Field>
          <Button
            className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
            disabled={importing}
            onClick={importMenu}
          >
            {importing ? (
              <>
                <Loader2 className="mr-1 size-4 animate-spin" />
                Reading menu
              </>
            ) : (
              <>
                <Sparkles className="mr-1 size-4" />
                Extract meals
              </>
            )}
          </Button>

          {importedMeals.length > 0 && (
            <div className="space-y-3 rounded-[1.25rem] border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-sm font-bold">
                    Review imported meals
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {importedMeals.length} found
                    {importModel ? ` · ${importModel}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
                  onClick={saveImportedMeals}
                >
                  Save all
                </Button>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {importedMeals.map((meal, index) => (
                  <div
                    key={`${meal.name}-${index}`}
                    className="rounded-2xl bg-white/[0.05] px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">
                        {meal.emoji} {meal.name}
                      </p>
                      <p className="shrink-0 text-xs text-[var(--rosso-light)]">
                        {meal.kcal} kcal
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {meal.meal_slot} · {meal.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      P{meal.protein_g}g C{meal.carb_g}g F{meal.fat_g}g
                    </p>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setImportedMeals([]);
                  setImportModel(null);
                }}
              >
                Clear review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {menuMeals.map((meal) => (
          <Card key={meal.id} className="carbon-card rounded-[1.35rem] border-white/7">
            <CardContent className="flex items-center gap-3 py-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.055] text-xl">
                {meal.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{meal.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {meal.meal_slot} · {meal.description}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-heading font-bold text-[var(--rosso-light)]">
                    {meal.kcal}
                  </span>{" "}
                  kcal · P{meal.protein_g}g C{meal.carb_g}g F{meal.fat_g}g
                </p>
              </div>
              {meal.day === "Custom" && (
                <button
                  type="button"
                  aria-label={`Delete ${meal.name}`}
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-[var(--over)]/40 hover:text-[var(--over)]"
                  onClick={() => deleteCustomMenuMeal(meal.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
