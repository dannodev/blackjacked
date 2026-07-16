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
