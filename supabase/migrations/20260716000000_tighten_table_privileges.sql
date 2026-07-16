alter table public.exercises force row level security;

revoke insert, update, delete on table public.exercises from authenticated;
revoke update, delete on table public.ai_logs from authenticated;
