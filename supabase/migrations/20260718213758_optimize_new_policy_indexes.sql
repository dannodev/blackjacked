create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions(user_id);
create index if not exists idx_squad_message_reports_reporter
  on public.squad_message_reports(reporter_id);
create index if not exists idx_squad_message_reports_squad
  on public.squad_message_reports(squad_id);

drop policy if exists "squad_members_delete_self" on public.squad_members;
drop policy if exists "squad_members_owner_remove" on public.squad_members;
create policy "squad_members_delete_self_or_owner"
  on public.squad_members
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.squads
      where id = squad_id and owner_id = (select auth.uid())
    )
  );
