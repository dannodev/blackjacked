-- The service role bypasses RLS. Authenticated clients are explicitly denied,
-- in addition to having all table grants revoked in the original migration.
create policy "push_dispatches_deny_authenticated"
  on public.push_dispatches
  for all
  to authenticated
  using (false)
  with check (false);
