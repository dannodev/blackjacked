drop policy if exists "squads_select_member" on public.squads;
drop policy if exists "squads_select_by_invite_code" on public.squads;

create policy "squads_select_member_or_invite" on public.squads
  for select to authenticated
  using (
    invite_code is not null
    or (select auth.uid()) = owner_id
    or private.is_squad_member(id, (select auth.uid()))
  );

drop policy if exists "squad_members_insert_self" on public.squad_members;
drop policy if exists "squad_members_join_self_by_invite" on public.squad_members;

create policy "squad_members_insert_self" on public.squad_members
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      (
        role = 'owner'
        and exists (
          select 1
          from public.squads s
          where s.id = squad_id
            and s.owner_id = (select auth.uid())
        )
      )
      or
      (
        role = 'member'
        and private.squad_member_count(squad_id) < 6
        and exists (
          select 1
          from public.squads s
          where s.id = squad_id
            and s.invite_code is not null
        )
      )
    )
  );
