CREATE TABLE IF NOT EXISTS public.weight_logs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg real NOT NULL,
  waist_cm real,
  chest_cm real,
  hip_cm  real,
  arm_cm  real,
  photo_url text,
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON public.weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date  ON public.weight_logs(logged_at DESC);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "weight_logs_select_own"  ON public.weight_logs
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "weight_logs_insert_own" ON public.weight_logs
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "weight_logs_update_own" ON public.weight_logs
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "weight_logs_delete_own" ON public.weight_logs
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. FOOD_ITEMS (seed library + custom foods)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.food_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source        text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'ai', 'custom')),
  name          text NOT NULL,
  brand         text,
  serving_size real NOT NULL,
  serving_unit  text NOT NULL,
  kcal          int  NOT NULL,
  protein_g     real NOT NULL DEFAULT 0,
  fat_g         real NOT NULL DEFAULT 0,
  carb_g        real NOT NULL DEFAULT 0,
  barcode       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_items_name ON public.food_items(name);
CREATE INDEX IF NOT EXISTS idx_food_items_user ON public.food_items(user_id);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items FORCE ROW LEVEL SECURITY;

-- Seed items: readable by all authenticated users
-- Custom items: only by owner
CREATE POLICY "food_items_select" ON public.food_items
  FOR SELECT TO authenticated
  USING (source = 'seed' OR (select auth.uid()) = user_id);
CREATE POLICY "food_items_insert_own" ON public.food_items
  FOR INSERT TO authenticated
  WITH CHECK (source != 'seed' AND (select auth.uid()) = user_id);
CREATE POLICY "food_items_update_own" ON public.food_items
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "food_items_delete_own" ON public.food_items
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. MEALS + MEAL_ITEMS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.meals (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at  timestamptz NOT NULL DEFAULT now(),
  total_kcal int  NOT NULL,
  p          real NOT NULL DEFAULT 0,
  f          real NOT NULL DEFAULT 0,
  c          real NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meals_user ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON public.meals(logged_at DESC);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals FORCE ROW LEVEL SECURITY;

CREATE POLICY "meals_select_own"  ON public.meals
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "meals_insert_own" ON public.meals
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "meals_update_own" ON public.meals
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "meals_delete_own" ON public.meals
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Meal items inherit security through meals FK
CREATE TABLE IF NOT EXISTS public.meal_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id        uuid NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  food_item_id   uuid REFERENCES public.food_items(id) ON DELETE SET NULL,
  name           text NOT NULL,
  quantity       real NOT NULL,
  unit           text NOT NULL,
  kcal           int  NOT NULL,
  protein_g      real NOT NULL DEFAULT 0,
  fat_g          real NOT NULL DEFAULT 0,
  carb_g         real NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON public.meal_items(meal_id);

ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "meal_items_all_own" ON public.meal_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meals
      WHERE public.meals.id = public.meal_items.meal_id
      AND public.meals.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meals
      WHERE public.meals.id = public.meal_items.meal_id
      AND public.meals.user_id = (select auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 5. RECIPES + RECIPE_INGREDIENTS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.recipes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  servings     int  NOT NULL DEFAULT 1,
  instructions text NOT NULL DEFAULT '',
  is_template  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user ON public.recipes(user_id);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes FORCE ROW LEVEL SECURITY;

CREATE POLICY "recipes_select_own"  ON public.recipes
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "recipes_insert_own" ON public.recipes
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "recipes_update_own" ON public.recipes
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "recipes_delete_own" ON public.recipes
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_item_id  uuid REFERENCES public.food_items(id) ON DELETE SET NULL,
  name          text NOT NULL,
  qty           real NOT NULL,
  unit          text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients FORCE ROW LEVEL SECURITY;

CREATE POLICY "recipe_ingredients_all_own" ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE public.recipes.id = public.recipe_ingredients.recipe_id
      AND public.recipes.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE public.recipes.id = public.recipe_ingredients.recipe_id
      AND public.recipes.user_id = (select auth.uid())
    )
  );
