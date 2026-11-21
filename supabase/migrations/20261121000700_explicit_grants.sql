-- Grants that 000100 and 000500 left to the project's default privileges.
-- Newer Supabase projects grant nothing on new tables, so anonymous visitors could not
-- read system_meta and /api/health failed. Older projects grant everything, so the
-- service role could update signal_events (the append-only trigger still refused it).
-- tests/db/grants.test.ts checks the full privilege matrix in both kinds of project.

revoke all on public.system_meta from anon, authenticated;
grant select on public.system_meta to anon, authenticated;
grant all on public.system_meta to service_role;

revoke all on public.signal_events from service_role;
grant select, insert, delete on public.signal_events to service_role;

update public.system_meta set schema_version = 7, updated_at = now();
