-- Real squad collaboration model.
-- Privacy rule: squad-visible tables only store public activity totals. Profile
-- fields such as height, weight, birthdate, and body measurements stay private.

drop policy if exists "squads_select_own" on public.squads;
drop policy if exists "squads_insert_own" on public.squads;
drop policy if exists "squads_update_own" on public.squads;
drop policy if exists "squads_delete_own" on public.squads;

alter table public.squads
  rename column user_id to owner_id;

alter table public.squads
  drop column if exists members,
  add column if not exists invite_code text,
  add column if not exists updated_at timestamptz not null default now();

update public.squads
set invite_code = upper(substr(replace(id::text, '-', ''), 1, 6))
where invite_code is null;

alter table public.squads
  alter column invite_code set not null;

alter table public.squads
  drop constraint if exists squads_invite_code_key;

alter table public.squads
  add constraint squads_invite_code_key unique (invite_code);

alter table public.squads
  drop constraint if exists squads_invite_code_format;

alter table public.squads
  add constraint squads_invite_code_format
  check (invite_code ~ '^[A-Z0-9]{6}$');

create table if not exists public.squad_members (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  color text not null default '#dc0000',
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table if not exists public.squad_activity (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  kcal_in int not null default 0 check (kcal_in >= 0),
  kcal_out_activity int not null default 0 check (kcal_out_activity >= 0),
  workouts_count int not null default 0 check (workouts_count >= 0),
  meals_count int not null default 0 check (meals_count >= 0),
  streak int not null default 0 check (streak >= 0),
  updated_at timestamptz not null default now(),
  primary key (squad_id, user_id, date),
  foreign key (squad_id, user_id)
    references public.squad_members(squad_id, user_id)
    on delete cascade
);

create table if not exists public.squad_messages (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  foreign key (squad_id, user_id)
    references public.squad_members(squad_id, user_id)
    on delete cascade
);

insert into public.squad_members (squad_id, user_id, display_name, role)
select id, owner_id, 'Owner', 'owner'
from public.squads
on conflict (squad_id, user_id) do nothing;

create index if not exists idx_squads_owner on public.squads(owner_id);
drop index if exists public.idx_squads_user;
create index if not exists idx_squad_members_user on public.squad_members(user_id);
create index if not exists idx_squad_activity_squad_date on public.squad_activity(squad_id, date desc);
create index if not exists idx_squad_activity_user on public.squad_activity(user_id);
create index if not exists idx_squad_messages_squad_created on public.squad_messages(squad_id, created_at desc);
create index if not exists idx_squad_messages_squad_user on public.squad_messages(squad_id, user_id);
create index if not exists idx_squad_messages_user on public.squad_messages(user_id);

alter table public.squad_members enable row level security;
alter table public.squad_members force row level security;
alter table public.squad_activity enable row level security;
alter table public.squad_activity force row level security;
alter table public.squad_messages enable row level security;
alter table public.squad_messages force row level security;

create policy "squads_select_member" on public.squads
  for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or
    exists (
      select 1
      from public.squad_members sm
      where sm.squad_id = public.squads.id
        and sm.user_id = (select auth.uid())
    )
  );

create policy "squads_insert_owner" on public.squads
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "squads_update_owner" on public.squads
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "squads_delete_owner" on public.squads
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "squad_members_select_same_squad" on public.squad_members
  for select to authenticated
  using (
    exists (
      select 1
      from public.squad_members me
      where me.squad_id = public.squad_members.squad_id
        and me.user_id = (select auth.uid())
    )
  );

create policy "squad_members_insert_self" on public.squad_members
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.squads s
      where s.id = squad_id
        and s.owner_id = (select auth.uid())
    )
  );

create policy "squad_members_update_self" on public.squad_members
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "squad_members_delete_self" on public.squad_members
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "squad_activity_select_same_squad" on public.squad_activity
  for select to authenticated
  using (
    exists (
      select 1
      from public.squad_members me
      where me.squad_id = public.squad_activity.squad_id
        and me.user_id = (select auth.uid())
    )
  );

create policy "squad_activity_insert_self" on public.squad_activity
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.squad_members me
      where me.squad_id = public.squad_activity.squad_id
        and me.user_id = (select auth.uid())
    )
  );

create policy "squad_activity_update_self" on public.squad_activity
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "squad_activity_delete_self" on public.squad_activity
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "squad_messages_select_same_squad" on public.squad_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.squad_members me
      where me.squad_id = public.squad_messages.squad_id
        and me.user_id = (select auth.uid())
    )
  );

create policy "squad_messages_insert_self" on public.squad_messages
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.squad_members me
      where me.squad_id = public.squad_messages.squad_id
        and me.user_id = (select auth.uid())
    )
  );

create policy "squad_messages_delete_self" on public.squad_messages
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.join_squad_by_code(
  invite_code_input text,
  display_name_input text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  found_squad_id uuid;
  member_count int;
  clean_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  clean_code := upper(trim(invite_code_input));

  select id
  into found_squad_id
  from public.squads
  where invite_code = clean_code;

  if found_squad_id is null then
    raise exception 'Invalid squad code';
  end if;

  select count(*)
  into member_count
  from public.squad_members
  where squad_id = found_squad_id;

  if member_count >= 6 then
    raise exception 'This squad is full';
  end if;

  insert into public.squad_members (squad_id, user_id, display_name, color, role)
  values (
    found_squad_id,
    auth.uid(),
    coalesce(nullif(trim(display_name_input), ''), 'Racer'),
    case (member_count % 6)
      when 0 then '#dc0000'
      when 1 then '#f5a524'
      when 2 then '#4cc2ff'
      when 3 then '#22c55e'
      when 4 then '#a855f7'
      else '#ec4899'
    end,
    'member'
  )
  on conflict (squad_id, user_id) do update
  set display_name = excluded.display_name;

  return found_squad_id;
end;
$$;

revoke all on function public.join_squad_by_code(text, text) from public;
revoke execute on function public.join_squad_by_code(text, text) from anon;
grant execute on function public.join_squad_by_code(text, text) to authenticated;

grant select, insert, update, delete on table public.squads to authenticated;
grant select, insert, update, delete on table public.squad_members to authenticated;
grant select, insert, update, delete on table public.squad_activity to authenticated;
grant select, insert, delete on table public.squad_messages to authenticated;

alter publication supabase_realtime add table public.squads;
alter publication supabase_realtime add table public.squad_members;
alter publication supabase_realtime add table public.squad_activity;
alter publication supabase_realtime add table public.squad_messages;
