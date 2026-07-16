-- ═══════════════════════════════════════════════════════════════════════
-- BlackJacked — Full Database Schema + RLS
-- ═══════════════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL Editor after creating your project.
-- Every user-owned table has RLS scoped to user_id = auth.uid().
--
-- After running, go to:
--   Dashboard → Project Settings → Data API → confirm tables are exposed
--   (tables created via SQL may need explicit GRANT — see the GRANT block)
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- 1. PROFILES
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sex             text NOT NULL CHECK (sex IN ('male', 'female')),
  birthdate       date NOT NULL,
  height_cm       real NOT NULL,
  current_weight_kg real NOT NULL,
  activity_factor real NOT NULL,
  calorie_goal    int  NOT NULL,
  protein_goal    int  NOT NULL DEFAULT 0,
  fat_goal        int  NOT NULL DEFAULT 0,
  carb_goal       int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"  ON public.profiles
  FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated USING ((select auth.uid()) = id);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. WEIGHT_LOGS
-- ═══════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════
-- 6. WEEKLY_MENU
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.weekly_menu (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  jsonb_menu jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_menu_user ON public.weekly_menu(user_id);

ALTER TABLE public.weekly_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_menu FORCE ROW LEVEL SECURITY;

CREATE POLICY "weekly_menu_select_own"  ON public.weekly_menu
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "weekly_menu_insert_own" ON public.weekly_menu
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "weekly_menu_update_own" ON public.weekly_menu
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "weekly_menu_delete_own" ON public.weekly_menu
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. EXERCISES (seed library — public read)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.exercises (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  category       text NOT NULL CHECK (category IN ('cardio', 'gym', 'sports', 'daily', 'core')),
  mets           real NOT NULL,
  distance_based boolean NOT NULL DEFAULT false
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
-- No policies needed — all authenticated users can read seed data
CREATE POLICY "exercises_select_all" ON public.exercises
  FOR SELECT TO authenticated USING (true);
-- No INSERT/UPDATE/DELETE — admin managed only

-- ═══════════════════════════════════════════════════════════════════════
-- 8. EXERCISE_LOGS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id  text REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  category     text NOT NULL,
  mets         real NOT NULL,
  duration_min int  NOT NULL,
  distance_km  real,
  reps         int,
  sets         int,
  kcal_burned  real NOT NULL,
  logged_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user ON public.exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON public.exercise_logs(logged_at DESC);

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "exercise_logs_select_own"  ON public.exercise_logs
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "exercise_logs_insert_own" ON public.exercise_logs
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "exercise_logs_update_own" ON public.exercise_logs
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "exercise_logs_delete_own" ON public.exercise_logs
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 9. DAILY_SUMMARY
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.daily_summary (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               date NOT NULL,
  kcal_in            int  NOT NULL DEFAULT 0,
  kcal_out_activity  int  NOT NULL DEFAULT 0,
  bmr_kcal           int  NOT NULL DEFAULT 0,
  tdee_kcal          int  NOT NULL DEFAULT 0,
  deficit_kcal       int  NOT NULL DEFAULT 0,
  real_deficit_kcal  int  NOT NULL DEFAULT 0,
  water_ml           int  NOT NULL DEFAULT 0,
  sleep_hours        real NOT NULL DEFAULT 0,
  notes              text,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_user ON public.daily_summary(user_id);

ALTER TABLE public.daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summary FORCE ROW LEVEL SECURITY;

CREATE POLICY "daily_summary_select_own"  ON public.daily_summary
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "daily_summary_insert_own" ON public.daily_summary
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "daily_summary_update_own" ON public.daily_summary
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "daily_summary_delete_own" ON public.daily_summary
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 10. STREAKS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.streaks (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak    int  NOT NULL DEFAULT 0,
  longest_streak    int  NOT NULL DEFAULT 0,
  last_logged_date  date
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks FORCE ROW LEVEL SECURITY;

CREATE POLICY "streaks_select_own"  ON public.streaks
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "streaks_insert_own" ON public.streaks
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "streaks_update_own" ON public.streaks
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "streaks_delete_own" ON public.streaks
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 11. NOTIFICATION_PREFS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reminders_enabled boolean NOT NULL DEFAULT false,
  reminder_times    jsonb NOT NULL DEFAULT '[]',
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs FORCE ROW LEVEL SECURITY;

CREATE POLICY "notification_prefs_select_own"  ON public.notification_prefs
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "notification_prefs_insert_own" ON public.notification_prefs
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "notification_prefs_update_own" ON public.notification_prefs
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "notification_prefs_delete_own" ON public.notification_prefs
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 12. AI_LOGS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider   text NOT NULL,
  call_type  text NOT NULL,
  tokens     int  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON public.ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_date ON public.ai_logs(created_at DESC);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_select_own"  ON public.ai_logs
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "ai_logs_insert_own" ON public.ai_logs
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "ai_logs_delete_own" ON public.ai_logs
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 13. SQUADS + SQUAD_MEMBERS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.squads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  members    jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squads_user ON public.squads(user_id);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads FORCE ROW LEVEL SECURITY;

CREATE POLICY "squads_select_own"  ON public.squads
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "squads_insert_own" ON public.squads
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "squads_update_own" ON public.squads
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "squads_delete_own" ON public.squads
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- GRANT ACCESS TO DATA API (required since April 2026 breaking change)
-- ═══════════════════════════════════════════════════════════════════════
-- New tables are NOT exposed to the Data API by default.
-- These GRANTs make the tables accessible via the anon + authenticated roles.
-- RLS policies (above) control which rows each user can see.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_items            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_items            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_menu           TO authenticated;
GRANT SELECT ON                           public.exercises            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_logs         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_summary         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streaks               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs    TO authenticated;
GRANT SELECT, INSERT                      ON public.ai_logs          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squads                TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- SEED EXERCISES (~80 items)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO public.exercises (id, name, category, mets, distance_based) VALUES
-- Cardio
('run','Running','cardio',9.8,true),
('jog','Jogging','cardio',7.0,true),
('cycle','Cycling','cardio',7.5,true),
('walk','Walking','cardio',3.5,false),
('hike','Hiking','cardio',6.0,false),
('swim','Swimming','cardio',8.0,false),
('row','Rowing','cardio',8.5,false),
('jumprope','Jump rope','cardio',12.3,false),
('hiit','HIIT','cardio',10.0,false),
('stairs','Stairs','cardio',8.8,false),
('elliptical','Elliptical','cardio',5.0,false),
('skate','Skating','cardio',7.0,false),
('ski','Cross-country ski','cardio',8.0,false),
('pushbike','Push bike','cardio',5.0,false),
('treadmill','Treadmill walk (incline)','cardio',5.3,false),
('spin','Spin class','cardio',8.5,false),
-- Gym
('squat','Squats','gym',5.0,false),
('deadlift','Deadlift','gym',6.0,false),
('bench','Bench press','gym',5.0,false),
('pullup','Pull-ups','gym',8.0,false),
('pushup','Push-ups','gym',8.0,false),
('ohp','Overhead press','gym',5.0,false),
('lunge','Lunges','gym',5.5,false),
('curl','Bicep curl','gym',3.5,false),
('row_gym','Barbell row','gym',5.0,false),
('legpress','Leg press','gym',5.0,false),
('legcurl','Leg curl','gym',4.0,false),
('legext','Leg extension','gym',4.0,false),
('tricep','Tricep dip','gym',6.0,false),
('latpull','Lat pulldown','gym',4.5,false),
('calfraise','Calf raise','gym',3.5,false),
('hipthrust','Hip thrust','gym',5.0,false),
('kettlebell','Kettlebell swing','gym',9.8,false),
('bulgarian','Bulgarian split squat','gym',5.5,false),
('romanian','Romanian deadlift','gym',5.5,false),
('frontsquat','Front squat','gym',5.5,false),
('inclinebench','Incline bench','gym',5.0,false),
('boxjump','Box jump','gym',7.5,false),
-- Core
('plank','Plank','core',4.0,false),
('crunch','Crunch','core',4.5,false),
('situp','Sit-up','core',4.5,false),
('russian','Russian twist','core',5.0,false),
('mountainclimber','Mountain climber','core',8.0,false),
('legraise','Hanging leg raise','core',5.0,false),
('bicycle','Bicycle crunch','core',5.5,false),
('sideplank','Side plank','core',4.0,false),
('woodchop','Wood chop','core',5.0,false),
('flutterkick','Flutter kick','core',4.5,false),
-- Sports
('basketball','Basketball','sports',6.5,false),
('soccer','Soccer','sports',7.0,false),
('tennis','Tennis','sports',7.3,false),
('pingpong','Table tennis','sports',4.0,false),
('badminton','Badminton','sports',5.5,false),
('climb','Climbing','sports',8.0,false),
('yoga','Yoga','sports',3.0,false),
('pilates','Pilates','sports',3.0,false),
('dance','Dance','sports',5.0,false),
('box','Boxing','sports',9.0,false),
('mma','MMA','sports',10.0,false),
('volleyball','Volleyball','sports',6.0,false),
('surf','Surfing','sports',6.0,false),
('golf','Golf','sports',4.8,false),
('football','Flag football','sports',6.0,false),
('hockey','Hockey','sports',8.0,false),
('martialarts','Martial arts','sports',8.0,false),
-- Daily
('clean','House cleaning','daily',3.3,false),
('garden','Gardening','daily',4.0,false),
('walkdog','Walk the dog','daily',3.5,false),
('desk','Desk work','daily',1.5,false),
('cook','Cooking','daily',2.5,false),
('stand','Standing','daily',1.8,false),
('stretch','Stretching','daily',2.3,false),
('foamroll','Foam rolling','daily',2.5,false),
('meditate','Meditation','daily',1.0,false),
('sauna','Sauna','daily',1.5,false)
ON CONFLICT (id) DO NOTHING;