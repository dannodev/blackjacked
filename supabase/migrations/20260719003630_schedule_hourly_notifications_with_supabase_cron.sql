create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function private.invoke_blackjacked_notification_sender()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_get(
    url := 'https://blackjacked.vercel.app/api/notifications/send',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || coalesce((
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'blackjacked_cron_secret'
        limit 1
      ), '')
    ),
    timeout_milliseconds := 10000
  );
$$;

revoke all on function private.invoke_blackjacked_notification_sender()
  from public, anon, authenticated;

select cron.schedule(
  'blackjacked-hourly-notification-dispatch',
  '0 * * * *',
  $command$select private.invoke_blackjacked_notification_sender()$command$
);

select cron.schedule(
  'blackjacked-weekly-cron-history-cleanup',
  '20 4 * * 0',
  $command$delete from cron.job_run_details where end_time < now() - interval '14 days'$command$
);
