revoke all privileges on table public.exercises from authenticated;
revoke all privileges on table public.ai_logs from authenticated;

grant select on table public.exercises to authenticated;
grant select, insert on table public.ai_logs to authenticated;
