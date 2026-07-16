create schema if not exists private;

create or replace function private.squad_member_count(check_squad_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.squad_members sm
  where sm.squad_id = check_squad_id;
$$;

revoke all on function private.squad_member_count(uuid) from public;
revoke all on function private.squad_member_count(uuid) from anon;
grant execute on function private.squad_member_count(uuid) to authenticated;

drop policy if exists "squads_select_by_invite_code" on public.squads;
create policy "squads_select_by_invite_code" on public.squads
  for select to authenticated
  using (invite_code is not null);

drop policy if exists "squad_members_join_self_by_invite" on public.squad_members;
create policy "squad_members_join_self_by_invite" on public.squad_members
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'member'
    and private.squad_member_count(squad_id) < 6
    and exists (
      select 1
      from public.squads s
      where s.id = squad_id
        and s.invite_code is not null
    )
  );

revoke execute on function public.join_squad_by_code(text, text) from authenticated;
revoke all on function public.join_squad_by_code(text, text) from public;
drop function if exists public.join_squad_by_code(text, text);
