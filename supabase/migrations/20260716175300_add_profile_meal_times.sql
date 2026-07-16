alter table public.profiles
  add column if not exists breakfast_time time,
  add column if not exists lunch_time time,
  add column if not exists dinner_time time,
  add column if not exists am_snack_time time,
  add column if not exists pm_snack_time time;

alter table public.profiles
  drop constraint if exists profiles_meal_times_format;

alter table public.profiles
  add constraint profiles_meal_times_format
  check (
    (breakfast_time is null or breakfast_time between time '00:00' and time '23:59')
    and (lunch_time is null or lunch_time between time '00:00' and time '23:59')
    and (dinner_time is null or dinner_time between time '00:00' and time '23:59')
    and (am_snack_time is null or am_snack_time between time '00:00' and time '23:59')
    and (pm_snack_time is null or pm_snack_time between time '00:00' and time '23:59')
  );
