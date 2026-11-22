-- 0011 Session 4, fix 2: signals reach the app only with display counts.
--
-- Until now a signed-in user could select signals.evidence and signal_events.evidence
-- through the API and read the exact number behind "moins de 3" (1 or 2). From here:
-- - authenticated keeps select on the columns that carry no count (level, since, rule,
--   times), so Realtime still tells the app that a row changed;
-- - evidence is read only through the three functions below, which return pharmacy counts
--   1 and 2 as '<3', and withhold the number of governorates below 3 pharmacies, since
--   "<3 pharmacies in 2 governorates" would reveal exactly 2.
-- The stored evidence stays exact, for the service role and the audit of each decision.

-- One count as shown: 0 stays 0, 1 and 2 become '<3', 3 and more stay as they are. ---------
-- Same rule as displayCount() in lib/signal/governorates.ts (SMALL_CELL_LIMIT = 3).
create function app.shown_count(v jsonb)
returns jsonb
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when v is null or jsonb_typeof(v) <> 'number' then to_jsonb(0)
    when (v #>> '{}')::numeric > 0 and (v #>> '{}')::numeric < 3 then to_jsonb('<3'::text)
    else v
  end
$$;

-- Evidence as the app may read it. Built key by key, so a key added to the stored evidence
-- later is never passed on without being decided here first.
create function app.shown_evidence(e jsonb)
returns jsonb
language sql
immutable
parallel safe
set search_path = ''
as $$
  select jsonb_build_object(
    'pharmacies14d', app.shown_count(e -> 'pharmacies14d'),
    'governorates14d',
      case
        when app.shown_count(e -> 'pharmacies14d') = to_jsonb('<3'::text) then 'null'::jsonb
        else coalesce(e -> 'governorates14d', to_jsonb(0))
      end,
    'pharmacies7d', app.shown_count(e -> 'pharmacies7d'),
    'deliveredAgainPharmacies', app.shown_count(e -> 'deliveredAgainPharmacies'),
    'ignoredTooEarly', app.shown_count(e -> 'ignoredTooEarly'),
    'lastNotDeliveredAt', coalesce(e -> 'lastNotDeliveredAt', 'null'::jsonb),
    'notices', coalesce(e -> 'notices', '[]'::jsonb)
  )
$$;

revoke all on function app.shown_count(jsonb) from public;
revoke all on function app.shown_evidence(jsonb) from public;
grant execute on function app.shown_count(jsonb) to authenticated, service_role;
grant execute on function app.shown_evidence(jsonb) to authenticated, service_role;

-- No direct read of the exact evidence. -----------------------------------------------------
revoke select on public.signals from authenticated;
grant select (molecule_id, level, since, rule, updated_at) on public.signals to authenticated;

revoke select on public.signal_events from authenticated;
grant select (id, molecule_id, from_level, to_level, rule, at) on public.signal_events to authenticated;

-- signals_view: current signals, with display counts. ------------------------------------
-- Any signed-in organisation (pharmacies included) may see levels and their explanation,
-- as before. p_molecule_ids null: every molecule with a signal row.
create function public.signals_view(p_molecule_ids uuid[] default null)
returns table (
  molecule_id uuid,
  molecule_name text,
  level public.signal_level,
  since timestamptz,
  rule text,
  evidence jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.molecule_id, m.name, s.level, s.since, s.rule, app.shown_evidence(s.evidence), s.updated_at
  from public.signals s
  join public.molecules m on m.id = s.molecule_id
  where p_molecule_ids is null or s.molecule_id = any (p_molecule_ids)
$$;

revoke all on function public.signals_view(uuid[]) from public, anon;
grant execute on function public.signals_view(uuid[]) to authenticated, service_role;

-- signal_events_view: the log of level changes, newest first, with display counts. -------
create function public.signal_events_view(p_molecule_id uuid default null, p_limit integer default 200)
returns table (
  id bigint,
  molecule_id uuid,
  molecule_name text,
  from_level public.signal_level,
  to_level public.signal_level,
  rule text,
  evidence jsonb,
  at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.molecule_id, m.name, e.from_level, e.to_level, e.rule, app.shown_evidence(e.evidence), e.at
  from public.signal_events e
  join public.molecules m on m.id = e.molecule_id
  where p_molecule_id is null or e.molecule_id = p_molecule_id
  order by e.at desc, e.id desc
  limit least(greatest(coalesce(p_limit, 200), 1), 1000)
$$;

revoke all on function public.signal_events_view(uuid, integer) from public, anon;
grant execute on function public.signal_events_view(uuid, integer) to authenticated, service_role;

-- my_alerts: the caller's organisation's alerts, with the event that caused each one. ----
create function public.my_alerts(p_limit integer default 50)
returns table (
  id uuid,
  sent_at timestamptz,
  read_at timestamptz,
  molecule_id uuid,
  molecule_name text,
  from_level public.signal_level,
  to_level public.signal_level,
  rule text,
  evidence jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.sent_at, a.read_at, e.molecule_id, m.name, e.from_level, e.to_level, e.rule,
         app.shown_evidence(e.evidence)
  from public.alerts a
  join public.signal_events e on e.id = a.signal_event_id
  join public.molecules m on m.id = e.molecule_id
  where a.organisation_id = (select app.current_organisation_id())
  order by a.sent_at desc, a.id
  limit least(greatest(coalesce(p_limit, 50), 1), 500)
$$;

revoke all on function public.my_alerts(integer) from public, anon;
grant execute on function public.my_alerts(integer) to authenticated, service_role;

update public.system_meta set schema_version = 11, updated_at = now();
