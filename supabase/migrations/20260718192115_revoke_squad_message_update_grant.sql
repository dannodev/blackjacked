-- Messages are append/delete-only in the app. Realtime does not require UPDATE.
revoke update on table public.squad_messages from authenticated;
