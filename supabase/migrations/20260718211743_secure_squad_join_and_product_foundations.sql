-- Close invite-code enumeration and restore a narrowly-scoped join path.
drop policy if exists "squads_select_member_or_invite" on public.squads;
drop policy if exists "squads_select_by_invite_code" on public.squads;
drop policy if exists "squads_select_member" on public.squads;

create policy "squads_select_member"
  on public.squads
  for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or private.is_squad_member(id, (select auth.uid()))
  );

drop policy if exists "squads_update_same_squad_name" on public.squads;
drop policy if exists "squads_update_owner" on public.squads;

create policy "squads_update_owner"
  on public.squads
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "squad_members_insert_self" on public.squad_members;
drop policy if exists "squad_members_join_self_by_invite" on public.squad_members;

-- Direct inserts are only used when an owner creates a squad. Members join
-- through the validated function below, which prevents invite enumeration.
create policy "squad_members_insert_owner_self"
  on public.squad_members
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'owner'
    and exists (
      select 1
      from public.squads s
      where s.id = squad_id
        and s.owner_id = (select auth.uid())
    )
  );

create or replace function private.join_squad_by_code(
  invite_code_input text,
  display_name_input text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  found_squad_id uuid;
  member_count integer;
  clean_code text := upper(trim(invite_code_input));
  clean_name text := left(coalesce(nullif(trim(display_name_input), ''), 'Racer'), 40);
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if clean_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'Invalid squad code';
  end if;

  -- Lock the matching squad so concurrent joins cannot exceed the cap.
  select id into found_squad_id
  from public.squads
  where invite_code = clean_code
  for update;

  if found_squad_id is null then
    raise exception 'Invalid squad code';
  end if;

  if exists (
    select 1 from public.squad_members where user_id = caller_id
  ) then
    raise exception 'Leave your current squad before joining another';
  end if;

  select count(*)::integer into member_count
  from public.squad_members
  where squad_id = found_squad_id;

  if member_count >= 6 then
    raise exception 'This squad is full';
  end if;

  insert into public.squad_members (
    squad_id, user_id, display_name, color, role, last_seen_at
  ) values (
    found_squad_id,
    caller_id,
    clean_name,
    case (member_count % 6)
      when 0 then '#dc0000'
      when 1 then '#f5a524'
      when 2 then '#4cc2ff'
      when 3 then '#22c55e'
      when 4 then '#a855f7'
      else '#ec4899'
    end,
    'member',
    now()
  );

  return found_squad_id;
end;
$$;

revoke all on function private.join_squad_by_code(text, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.join_squad_by_code(text, text) to authenticated;

-- The public wrapper is visible to PostgREST but has no elevated privileges.
create or replace function public.join_squad_by_code(
  invite_code_input text,
  display_name_input text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.join_squad_by_code(invite_code_input, display_name_input);
$$;

revoke all on function public.join_squad_by_code(text, text) from public, anon;
grant execute on function public.join_squad_by_code(text, text) to authenticated;

-- Progress photos need a deletion handle in addition to their delivery URL.
alter table public.weight_logs
  add column if not exists photo_public_id text;

revoke update on table public.squads from authenticated;
grant update (name, updated_at) on table public.squads to authenticated;
grant select, insert, update, delete on table public.weight_logs to authenticated;

-- Private progress-photo storage. The first path segment is always the user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  1500000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "progress_photos_select_own" on storage.objects;
drop policy if exists "progress_photos_insert_own" on storage.objects;
drop policy if exists "progress_photos_delete_own" on storage.objects;

create policy "progress_photos_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "progress_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "progress_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  token_count integer not null default 0 check (token_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_daily_usage enable row level security;
alter table public.ai_daily_usage force row level security;
create policy "ai_daily_usage_select_own" on public.ai_daily_usage
  for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.ai_daily_usage to authenticated;

create or replace function private.consume_ai_quota(daily_limit integer default 30)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  next_count integer;
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  insert into public.ai_daily_usage (user_id, usage_date, request_count)
  values (caller_id, current_date, 1)
  on conflict (user_id, usage_date) do update
  set request_count = public.ai_daily_usage.request_count + 1,
      updated_at = now()
  returning request_count into next_count;
  return next_count <= greatest(1, least(daily_limit, 100));
end;
$$;

create or replace function private.record_ai_tokens(tokens_used integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_daily_usage
  set token_count = token_count + greatest(0, least(tokens_used, 100000)),
      updated_at = now()
  where user_id = auth.uid() and usage_date = current_date;
$$;

revoke all on function private.consume_ai_quota(integer) from public, anon;
revoke all on function private.record_ai_tokens(integer) from public, anon;
grant execute on function private.consume_ai_quota(integer) to authenticated;
grant execute on function private.record_ai_tokens(integer) to authenticated;

create or replace function public.consume_ai_quota(daily_limit integer default 30)
returns boolean language sql security invoker set search_path = ''
as $$ select private.consume_ai_quota(daily_limit); $$;
create or replace function public.record_ai_tokens(tokens_used integer)
returns void language sql security invoker set search_path = ''
as $$ select private.record_ai_tokens(tokens_used); $$;
revoke all on function public.consume_ai_quota(integer) from public, anon;
revoke all on function public.record_ai_tokens(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
grant execute on function public.record_ai_tokens(integer) to authenticated;

alter table public.exercise_logs
  add column if not exists load_kg real check (load_kg is null or load_kg >= 0),
  add column if not exists rpe real check (rpe is null or rpe between 1 and 10);

create table if not exists public.coach_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  recommendation text not null,
  previous_calorie_goal integer not null,
  suggested_calorie_goal integer,
  signals jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
alter table public.coach_recommendations enable row level security;
alter table public.coach_recommendations force row level security;
create policy "coach_recommendations_select_own" on public.coach_recommendations for select to authenticated using ((select auth.uid()) = user_id);
create policy "coach_recommendations_insert_own" on public.coach_recommendations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "coach_recommendations_update_own" on public.coach_recommendations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "coach_recommendations_delete_own" on public.coach_recommendations for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.coach_recommendations to authenticated;

create table if not exists public.squad_message_reports (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  message_id uuid not null references public.squad_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 300),
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);
alter table public.squad_message_reports enable row level security;
alter table public.squad_message_reports force row level security;
create policy "squad_reports_insert_member" on public.squad_message_reports
  for insert to authenticated with check (
    (select auth.uid()) = reporter_id
    and private.is_squad_member(squad_id, (select auth.uid()))
  );
create policy "squad_reports_select_own" on public.squad_message_reports
  for select to authenticated using ((select auth.uid()) = reporter_id);
grant select, insert on public.squad_message_reports to authenticated;

create policy "squad_members_owner_remove" on public.squad_members
  for delete to authenticated using (
    exists (select 1 from public.squads where id = squad_id and owner_id = (select auth.uid()))
  );

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'UTC',
  reminder_time time not null default '19:00',
  enabled boolean not null default true,
  last_sent_date date,
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "push_subscriptions_update_own" on public.push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.user_app_state enable row level security;
alter table public.user_app_state force row level security;
create policy "user_app_state_select_own" on public.user_app_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_app_state_insert_own" on public.user_app_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_app_state_update_own" on public.user_app_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_app_state_delete_own" on public.user_app_state for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.user_app_state to authenticated;

create or replace function private.delete_current_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := auth.uid();
begin
  if caller_id is null then raise exception 'Not authenticated'; end if;
  delete from auth.users where id = caller_id;
end;
$$;
revoke all on function private.delete_current_account() from public, anon;
grant execute on function private.delete_current_account() to authenticated;
create or replace function public.delete_current_account()
returns void language sql security invoker set search_path = ''
as $$ select private.delete_current_account(); $$;
revoke all on function public.delete_current_account() from public, anon;
grant execute on function public.delete_current_account() to authenticated;
