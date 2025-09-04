-- Clear the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Also clear the Supabase cache
SELECT pg_notify('supabase_realtime', '{"type":"broadcast", "event":"postgres_changes", "payload":{"schema":"public", "table":"*"}}');
