do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'squad_blackjack_tables'
    ) then
      alter publication supabase_realtime drop table public.squad_blackjack_tables;
    end if;

    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'squad_blackjack_balances'
    ) then
      alter publication supabase_realtime drop table public.squad_blackjack_balances;
    end if;

    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'squad_blackjack_weekly_results'
    ) then
      alter publication supabase_realtime drop table public.squad_blackjack_weekly_results;
    end if;
  end if;
end $$;

drop table if exists public.squad_blackjack_weekly_results;
drop table if exists public.squad_blackjack_balances;
drop table if exists public.squad_blackjack_tables;
