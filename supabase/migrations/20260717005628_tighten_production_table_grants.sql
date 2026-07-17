-- Production privilege hardening.
-- RLS controls row access, but table-level grants should still be least-privilege.
-- In particular, TRUNCATE is not a normal app operation and should never be
-- available to browser-authenticated roles.

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
revoke all privileges on table public.squad_members from anon;
revoke all privileges on table public.squad_activity from anon;
revoke all privileges on table public.squad_messages from anon;

revoke truncate, references, trigger on table
  public.profiles,
  public.weight_logs,
  public.food_items,
  public.meals,
  public.meal_items,
  public.recipes,
  public.recipe_ingredients,
  public.weekly_menu,
  public.exercise_logs,
  public.daily_summary,
  public.streaks,
  public.notification_prefs,
  public.squads,
  public.squad_members,
  public.squad_activity,
  public.squad_messages
from authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.exercises
from authenticated;

grant select on table public.exercises to authenticated;
grant select, insert on table public.ai_logs to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.weight_logs,
  public.food_items,
  public.meals,
  public.meal_items,
  public.recipes,
  public.recipe_ingredients,
  public.weekly_menu,
  public.exercise_logs,
  public.daily_summary,
  public.streaks,
  public.notification_prefs,
  public.squads,
  public.squad_members,
  public.squad_activity
to authenticated;

grant select, insert, delete on table public.squad_messages to authenticated;
