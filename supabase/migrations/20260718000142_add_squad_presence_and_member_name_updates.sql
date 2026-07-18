alter table public.squad_members
  add column if not exists last_seen_at timestamptz;

revoke update on table public.squads from authenticated;
grant update (name, updated_at) on table public.squads to authenticated;

drop policy if exists "squads_update_owner" on public.squads;
drop policy if exists "squads_update_same_squad_name" on public.squads;

create policy "squads_update_same_squad_name"
  on public.squads
  for update to authenticated
  using (private.is_squad_member(id, (select auth.uid())))
  with check (private.is_squad_member(id, (select auth.uid())));
