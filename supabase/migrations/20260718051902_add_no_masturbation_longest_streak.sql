alter table public.squad_activity
  add column if not exists no_masturbation_longest_streak int not null default 0 check (no_masturbation_longest_streak >= 0);
