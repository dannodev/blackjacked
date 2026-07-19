create table if not exists public.coach_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  focus_items text[] not null default array['water', 'meals', 'fitness_streak']::text[],
  updated_at timestamptz not null default now(),
  constraint coach_preferences_max_five check (
    coalesce(cardinality(focus_items), 0) between 0 and 5
  )
);

alter table public.coach_preferences enable row level security;
alter table public.coach_preferences force row level security;

create policy "coach_preferences_select_own"
  on public.coach_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "coach_preferences_insert_own"
  on public.coach_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "coach_preferences_update_own"
  on public.coach_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "coach_preferences_delete_own"
  on public.coach_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.coach_preferences to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'coach_preferences'
    )
  then
    alter publication supabase_realtime add table public.coach_preferences;
  end if;
end
$$;

-- Service-role-only idempotency ledger. It prevents a client from replaying
-- the same message event to send duplicate push notifications.
create table if not exists public.push_dispatches (
  event_key text primary key,
  created_at timestamptz not null default now()
);
alter table public.push_dispatches enable row level security;
alter table public.push_dispatches force row level security;
revoke all on public.push_dispatches from public, anon, authenticated;

create index if not exists push_dispatches_created_at_idx
  on public.push_dispatches (created_at);
