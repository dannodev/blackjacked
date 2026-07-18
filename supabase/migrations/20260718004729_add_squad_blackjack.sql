create table if not exists public.squad_blackjack_tables (
  squad_id uuid primary key references public.squads(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.squad_blackjack_balances (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chips integer not null default 1000 check (chips >= 0),
  last_daily_grant_date date,
  last_objective_bonus_date date,
  updated_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table if not exists public.squad_blackjack_weekly_results (
  squad_id uuid not null references public.squads(id) on delete cascade,
  week_start date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  chips integer not null check (chips >= 0),
  rank integer not null check (rank > 0),
  captured_at timestamptz not null default now(),
  primary key (squad_id, week_start, user_id)
);

create index if not exists idx_squad_blackjack_results_squad_week
  on public.squad_blackjack_weekly_results(squad_id, week_start, rank);

alter table public.squad_blackjack_tables enable row level security;
alter table public.squad_blackjack_balances enable row level security;
alter table public.squad_blackjack_weekly_results enable row level security;

alter table public.squad_blackjack_tables force row level security;
alter table public.squad_blackjack_balances force row level security;
alter table public.squad_blackjack_weekly_results force row level security;

create policy "blackjack_tables_same_squad_select"
  on public.squad_blackjack_tables
  for select to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())));

create policy "blackjack_tables_same_squad_insert"
  on public.squad_blackjack_tables
  for insert to authenticated
  with check (private.is_squad_member(squad_id, (select auth.uid())));

create policy "blackjack_tables_same_squad_update"
  on public.squad_blackjack_tables
  for update to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())))
  with check (private.is_squad_member(squad_id, (select auth.uid())));

create policy "blackjack_balances_same_squad_select"
  on public.squad_blackjack_balances
  for select to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())));

create policy "blackjack_balances_self_insert"
  on public.squad_blackjack_balances
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and private.is_squad_member(squad_id, (select auth.uid()))
  );

create policy "blackjack_balances_same_squad_update"
  on public.squad_blackjack_balances
  for update to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())))
  with check (private.is_squad_member(squad_id, (select auth.uid())));

create policy "blackjack_results_same_squad_select"
  on public.squad_blackjack_weekly_results
  for select to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())));

create policy "blackjack_results_same_squad_insert"
  on public.squad_blackjack_weekly_results
  for insert to authenticated
  with check (private.is_squad_member(squad_id, (select auth.uid())));

create policy "blackjack_results_same_squad_update"
  on public.squad_blackjack_weekly_results
  for update to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())))
  with check (private.is_squad_member(squad_id, (select auth.uid())));

grant select, insert, update on table public.squad_blackjack_tables to authenticated;
grant select, insert, update on table public.squad_blackjack_balances to authenticated;
grant select, insert, update on table public.squad_blackjack_weekly_results to authenticated;

alter publication supabase_realtime add table public.squad_blackjack_tables;
alter publication supabase_realtime add table public.squad_blackjack_balances;
alter publication supabase_realtime add table public.squad_blackjack_weekly_results;
