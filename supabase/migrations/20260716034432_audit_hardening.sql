-- Remove anonymous table access. Current RLS policies only target authenticated,
-- but explicit revokes avoid future anon policies accidentally exposing data.
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.weight_logs from anon;
revoke all privileges on table public.food_items from anon;
revoke all privileges on table public.meals from anon;
revoke all privileges on table public.meal_items from anon;
revoke all privileges on table public.recipes from anon;
revoke all privileges on table public.recipe_ingredients from anon;
revoke all privileges on table public.weekly_menu from anon;
revoke all privileges on table public.exercises from anon;
revoke all privileges on table public.exercise_logs from anon;
revoke all privileges on table public.daily_summary from anon;
revoke all privileges on table public.streaks from anon;
revoke all privileges on table public.notification_prefs from anon;
revoke all privileges on table public.ai_logs from anon;
revoke all privileges on table public.squads from anon;

-- Cover foreign keys flagged by Supabase performance advisors.
create index if not exists idx_exercise_logs_exercise
  on public.exercise_logs(exercise_id);

create index if not exists idx_meal_items_food_item
  on public.meal_items(food_item_id);

create index if not exists idx_recipe_ingredients_food_item
  on public.recipe_ingredients(food_item_id);

-- Keep the database category enum in sync with the app's ExerciseCategory type.
alter table public.exercises
  drop constraint if exists exercises_category_check;

alter table public.exercises
  add constraint exercises_category_check
  check (category in ('cardio', 'gym', 'calisthenics', 'sports', 'daily', 'core'));
