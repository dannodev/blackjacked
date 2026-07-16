-- Avoid recursive RLS checks when policies need to ask whether the current
-- user belongs to a squad.
create schema if not exists private;

create or replace function private.is_squad_member(
  check_squad_id uuid,
  check_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.squad_members sm
    where sm.squad_id = check_squad_id
      and sm.user_id = check_user_id
  );
$$;

revoke all on function private.is_squad_member(uuid, uuid) from public;
revoke all on function private.is_squad_member(uuid, uuid) from anon;
grant execute on function private.is_squad_member(uuid, uuid) to authenticated;

drop policy if exists "squads_select_member" on public.squads;
drop policy if exists "squad_members_select_same_squad" on public.squad_members;
drop policy if exists "squad_activity_select_same_squad" on public.squad_activity;
drop policy if exists "squad_activity_insert_self" on public.squad_activity;
drop policy if exists "squad_messages_select_same_squad" on public.squad_messages;
drop policy if exists "squad_messages_insert_self" on public.squad_messages;

create policy "squads_select_member" on public.squads
  for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or private.is_squad_member(id, (select auth.uid()))
  );

create policy "squad_members_select_same_squad" on public.squad_members
  for select to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())));

create policy "squad_activity_select_same_squad" on public.squad_activity
  for select to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())));

create policy "squad_activity_insert_self" on public.squad_activity
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and private.is_squad_member(squad_id, (select auth.uid()))
  );

create policy "squad_messages_select_same_squad" on public.squad_messages
  for select to authenticated
  using (private.is_squad_member(squad_id, (select auth.uid())));

create policy "squad_messages_insert_self" on public.squad_messages
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and private.is_squad_member(squad_id, (select auth.uid()))
  );
