-- "Levée" holds against a foreign notice from before it (session 5, part 4).
-- lib/signal/evaluate.ts no longer lets a notice published before the last levée raise a
-- medicine on its own. It needs the time of that levée after "levée" itself has expired, when
-- signals.since is no longer it: signals.cleared_at keeps it, written by the service with the level.

alter table public.signals add column cleared_at timestamptz;

comment on column public.signals.cleared_at is
  'When the medicine last became "levée" (from evaluate().clearedAt). A foreign notice published before it does not raise the level alone.';

-- Existing rows: the last change to "levée" in the event log.
update public.signals s
   set cleared_at = (select max(e.at) from public.signal_events e
                      where e.molecule_id = s.molecule_id and e.to_level = 'cleared');

-- apply_signal_evaluation with p_cleared_at. Same body as in 20261122000800_pharmacy_flow.sql,
-- plus the column. The nine-argument version stays until the code that passes p_cleared_at is
-- deployed, so the site keeps working between this migration and that deploy; the next
-- migration drops it.
create function public.apply_signal_evaluation(
  p_molecule_id uuid,
  p_expected_level public.signal_level,
  p_expected_updated_at timestamptz,
  p_level public.signal_level,
  p_since timestamptz,
  p_rule text,
  p_evidence jsonb,
  p_at timestamptz,
  p_alert boolean,
  p_cleared_at timestamptz
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
    insert into public.signals (molecule_id, level, since, rule, evidence, cleared_at, updated_at)
    values (p_molecule_id, p_level, p_since, p_rule, p_evidence, p_cleared_at, clock_timestamp())
    on conflict (molecule_id) do nothing;
  else
    update public.signals
       set level = p_level, since = p_since, rule = p_rule, evidence = p_evidence,
           cleared_at = p_cleared_at, updated_at = clock_timestamp()
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

revoke all on function public.apply_signal_evaluation(uuid, public.signal_level, timestamptz, public.signal_level, timestamptz, text, jsonb, timestamptz, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_signal_evaluation(uuid, public.signal_level, timestamptz, public.signal_level, timestamptz, text, jsonb, timestamptz, boolean, timestamptz) to service_role;
