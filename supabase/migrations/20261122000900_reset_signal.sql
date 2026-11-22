-- 0009 Reset one molecule's signal state: its alerts, its event log and its signal row.
-- For the scenario reset (session 4) and for removing the data of a verification run.
-- The only place signal_events rows may be deleted: the append-only trigger allows it
-- because this function opens the reset window for its own transaction.
-- Reports are not touched here; the caller removes the reports it created.

create function public.reset_molecule_signal(p_molecule_id uuid)
returns table (alerts integer, events integer, signals integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n_alerts integer;
  n_events integer;
  n_signals integer;
begin
  perform set_config('rupturewatch.allow_event_reset', 'on', true);

  delete from public.alerts a
   using public.signal_events e
   where a.signal_event_id = e.id and e.molecule_id = p_molecule_id;
  get diagnostics n_alerts = row_count;

  delete from public.signal_events where molecule_id = p_molecule_id;
  get diagnostics n_events = row_count;

  delete from public.signals where molecule_id = p_molecule_id;
  get diagnostics n_signals = row_count;

  perform set_config('rupturewatch.allow_event_reset', 'off', true);
  return query select n_alerts, n_events, n_signals;
end;
$$;

revoke all on function public.reset_molecule_signal(uuid) from public, anon, authenticated;
grant execute on function public.reset_molecule_signal(uuid) to service_role;

update public.system_meta set schema_version = 9, updated_at = now();
