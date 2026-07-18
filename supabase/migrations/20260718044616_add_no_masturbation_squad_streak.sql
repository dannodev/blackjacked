alter table public.squad_activity
  add column if not exists no_masturbation_streak int not null default 0 check (no_masturbation_streak >= 0),
  add column if not exists no_masturbation_logged_today boolean not null default false;
