alter table public.squad_members
  add column if not exists avatar_url text;

alter table public.squad_members
  drop constraint if exists squad_members_avatar_url_cloudinary;

alter table public.squad_members
  add constraint squad_members_avatar_url_cloudinary
  check (
    avatar_url is null
    or avatar_url like 'https://res.cloudinary.com/%'
  );

drop policy if exists "squad_messages_delete_self" on public.squad_messages;

create policy "squad_messages_delete_self_or_expired_same_squad"
  on public.squad_messages
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or (
      created_at < now() - interval '7 days'
      and private.is_squad_member(squad_id, (select auth.uid()))
    )
  );
