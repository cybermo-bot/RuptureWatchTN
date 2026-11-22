-- 0008 Session 2: the pharmacy flow and the live signal.
-- Levels are still decided by lib/signal (evaluate). This migration stores the results
-- atomically, gives pharmacies their own impact as counts, and onboards testers.

-- The caller's organisation origin, for the reports insert policy. --------------------------
create function app.current_organisation_origin()
returns public.data_origin
language sql
stable
security definer
set search_path = ''
as $$
  select o.origin
  from public.profiles p
  join public.organisations o on o.id = p.organisation_id
  where p.user_id = (select auth.uid())
$$;

revoke all on function app.current_organisation_origin() from public;
grant execute on function app.current_organisation_origin() to authenticated, service_role;

-- Reports: origin must be the reporting organisation's own origin. --------------------------
-- A demo pharmacy (simulated) cannot file a tester report, and a tester cannot file a simulated one.
drop policy "reports: pharmacy inserts its own" on public.reports;

create policy "reports: pharmacy inserts its own"
  on public.reports for insert
  to authenticated
  with check (
    organisation_id = (select app.current_organisation_id())
    and (select app.current_organisation_type()) = 'pharmacy'
    and governorate_code = (select app.current_governorate_code())
    and channel = 'web'
    and origin = (select app.current_organisation_origin())
    and reported_at between now() - interval '5 minutes' and now() + interval '1 minute'
  );

-- report_impact: what a pharmacy's report added to, nationally. ----------------------------
-- Distinct pharmacies with a valid "not delivered" report in the window (the caller included),
-- and the number of their governorates. Below 3 pharmacies the count is '<3' and the number
-- of governorates is withheld, since together they would reveal 1 versus 2.
-- Same counting as governorate_counts; window and delay are passed from lib/signal/params.ts.
create function public.report_impact(
  p_molecule_id uuid,
  p_window_days integer default 14,
  p_min_undelivered_hours integer default 72,
  p_at timestamptz default now()
)
returns table (pharmacies text, governorates integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type public.organisation_type := app.current_organisation_type();
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
  n_pharmacies bigint;
  n_governorates bigint;
begin
  if not is_service and (caller_type is null or caller_type <> 'pharmacy') then
    raise exception 'report_impact: not allowed for this role' using errcode = '42501';
  end if;
  if p_window_days not between 1 and 365 or p_min_undelivered_hours not between 0 and 720 then
    raise exception 'report_impact: parameter out of range' using errcode = '22023';
  end if;

  select count(distinct r.organisation_id), count(distinct r.governorate_code)
    into n_pharmacies, n_governorates
  from public.reports r
  where r.molecule_id = p_molecule_id
    and r.kind = 'not_delivered'
    and r.ordered_at is not null
    and r.reported_at <= p_at
    and r.reported_at > p_at - make_interval(days => p_window_days)
    and r.reported_at - r.ordered_at >= make_interval(hours => p_min_undelivered_hours);

  if n_pharmacies < 3 then
    return query select '<3'::text, null::integer;
  else
    return query select n_pharmacies::text, n_governorates::integer;
  end if;
end;
$$;

revoke all on function public.report_impact(uuid, integer, integer, timestamptz) from public, anon;
grant execute on function public.report_impact(uuid, integer, integer, timestamptz) to authenticated, service_role;

-- apply_signal_evaluation: store one evaluation atomically, with optimistic concurrency. -----
-- The caller (lib/signals/recompute.ts, service role) read the signal row as
-- (p_expected_level, p_expected_updated_at), or found none (both null). The row is written
-- only if it is still exactly what was read; otherwise nothing happens, applied = false, and
-- the caller reloads and evaluates again. A level change appends one signal_events row and,
-- when p_alert, one alert per organisation concerned, in the same transaction.
create function public.apply_signal_evaluation(
  p_molecule_id uuid,
  p_expected_level public.signal_level,
  p_expected_updated_at timestamptz,
  p_level public.signal_level,
  p_since timestamptz,
  p_rule text,
  p_evidence jsonb,
  p_at timestamptz,
  p_alert boolean
)
returns table (applied boolean, event_id bigint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_from public.signal_level := coalesce(p_expected_level, 'none');
  v_event_id bigint;
begin
  if (p_expected_level is null) <> (p_expected_updated_at is null) then
    raise exception 'apply_signal_evaluation: expected level and updated_at go together' using errcode = '22023';
  end if;

  if p_expected_level is null then
    insert into public.signals (molecule_id, level, since, rule, evidence, updated_at)
    values (p_molecule_id, p_level, p_since, p_rule, p_evidence, clock_timestamp())
    on conflict (molecule_id) do nothing;
  else
    update public.signals
       set level = p_level, since = p_since, rule = p_rule, evidence = p_evidence,
           updated_at = clock_timestamp()
     where molecule_id = p_molecule_id
       and level = p_expected_level
       and updated_at = p_expected_updated_at;
  end if;

  if not found then
    return query select false, null::bigint;
    return;
  end if;

  if p_level <> v_from then
    insert into public.signal_events (molecule_id, from_level, to_level, rule, evidence, at)
    values (p_molecule_id, v_from, p_level, p_rule, p_evidence, p_at)
    returning id into v_event_id;

    if p_alert then
      insert into public.alerts (organisation_id, signal_event_id, channel, sent_at)
      select o.id, v_event_id, 'web', p_at
      from public.organisations o
      where o.type in ('wholesaler', 'hospital_pharmacy', 'coordinator')
         or (o.type = 'pharmacy' and exists (
               select 1 from public.followed_molecules f
               where f.organisation_id = o.id and f.molecule_id = p_molecule_id));
    end if;
  end if;

  return query select true, v_event_id;
end;
$$;

revoke all on function public.apply_signal_evaluation(uuid, public.signal_level, timestamptz, public.signal_level, timestamptz, text, jsonb, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.apply_signal_evaluation(uuid, public.signal_level, timestamptz, public.signal_level, timestamptz, text, jsonb, timestamptz, boolean) to service_role;

-- Alerts: an organisation marks its own alerts read. Only read_at can change. ---------------
create policy "alerts: own organisation marks read"
  on public.alerts for update
  to authenticated
  using (organisation_id = (select app.current_organisation_id()))
  with check (organisation_id = (select app.current_organisation_id()));

grant update (read_at) on public.alerts to authenticated;

-- Tester pharmacies. ------------------------------------------------------------------------
-- Real pharmacists testing the prototype. Nothing about them is stored but a governorate:
-- the display name is "Pharmacie testeuse n° N, <gouvernorat>" from a sequence.
create sequence public.tester_pharmacy_number;
revoke all on sequence public.tester_pharmacy_number from public, anon, authenticated;
grant usage on sequence public.tester_pharmacy_number to service_role;

-- p_name_template comes from messages/fr.json, with {n} and {governorate}.
create function public.create_tester_pharmacy(
  p_user_id uuid,
  p_governorate_code text,
  p_name_template text
)
returns table (organisation_id uuid, display_name text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_gov_name text;
  v_name text;
  v_org uuid;
begin
  select g.name_fr into v_gov_name from public.governorates g where g.code = p_governorate_code;
  if v_gov_name is null then
    raise exception 'create_tester_pharmacy: unknown governorate' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles p where p.user_id = p_user_id) then
    raise exception 'create_tester_pharmacy: user already has a profile' using errcode = '23505';
  end if;

  v_name := replace(replace(p_name_template, '{n}', nextval('public.tester_pharmacy_number')::text),
                    '{governorate}', v_gov_name);

  insert into public.organisations (type, display_name, governorate_code, origin)
  values ('pharmacy', v_name, p_governorate_code, 'tester')
  returning id into v_org;

  insert into public.profiles (user_id, organisation_id, role)
  values (p_user_id, v_org, 'pharmacist');

  return query select v_org, v_name;
end;
$$;

revoke all on function public.create_tester_pharmacy(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_tester_pharmacy(uuid, text, text) to service_role;

-- Molecule search: a query that matches a DCI leads to the molecule first. -----------------
-- Calling a pg_trgm function loads the module, so its setting below is a known parameter.
-- Without it, a fresh session treats the setting as an unknown placeholder, which Supabase refuses.
select extensions.word_similarity('a', 'a');

create function public.search_molecules(q text)
returns table (id uuid, name text, medicines integer, score real)
language sql
stable
set search_path = ''
set pg_trgm.word_similarity_threshold = 0.4
as $$
  with input as (
    select
      app.normalize(left(coalesce(q, ''), 100)) as v,
      replace(replace(replace(app.normalize(left(coalesce(q, ''), 100)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as prefix
  )
  select
    mol.id,
    mol.name,
    (select count(*) from public.medicines m where m.molecule_id = mol.id)::integer,
    greatest(
      extensions.word_similarity(i.v, mol.name_norm),
      case when mol.name_norm like i.prefix then 1 else 0 end
    )::real as score
  from public.molecules mol
  cross join input i
  where char_length(i.v) >= 2
    and (i.v operator(extensions.<%) mol.name_norm or mol.name_norm like i.prefix)
  order by score desc, mol.name_norm
  limit 5
$$;

revoke all on function public.search_molecules(text) from public;
grant execute on function public.search_molecules(text) to anon, authenticated, service_role;

-- Live updates: signals and alerts go out on Supabase Realtime (row-level security applies).
-- The publication exists on Supabase only, not in the test database.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.signals, public.alerts;
  end if;
end;
$$;

update public.system_meta set schema_version = 8, updated_at = now();
