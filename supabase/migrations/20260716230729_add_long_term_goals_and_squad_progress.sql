alter table public.profiles
  add column if not exists goal_mode text not null default 'lose',
  add column if not exists goal_start_weight_kg real,
  add column if not exists goal_target_weight_kg real,
  add column if not exists goal_start_date date,
  add column if not exists goal_target_date date;

alter table public.profiles
  drop constraint if exists profiles_goal_mode_valid;

alter table public.profiles
  add constraint profiles_goal_mode_valid
  check (goal_mode in ('lose', 'gain', 'maintain'));

alter table public.profiles
  drop constraint if exists profiles_goal_weights_valid;

alter table public.profiles
  add constraint profiles_goal_weights_valid
  check (
    goal_start_weight_kg is null
    or goal_start_weight_kg > 0
  );

alter table public.profiles
  drop constraint if exists profiles_goal_target_weight_valid;

alter table public.profiles
  add constraint profiles_goal_target_weight_valid
  check (
    goal_target_weight_kg is null
    or goal_target_weight_kg > 0
  );

alter table public.squad_activity
  add column if not exists goal_mode text,
  add column if not exists goal_progress_pct real not null default 0,
  add column if not exists goal_delta_kg real not null default 0,
  add column if not exists goal_target_delta_kg real not null default 0,
  add column if not exists calorie_target_met boolean not null default false,
  add column if not exists exercise_done boolean not null default false;

alter table public.squad_activity
  drop constraint if exists squad_activity_goal_mode_valid;

alter table public.squad_activity
  add constraint squad_activity_goal_mode_valid
  check (goal_mode is null or goal_mode in ('lose', 'gain', 'maintain'));
