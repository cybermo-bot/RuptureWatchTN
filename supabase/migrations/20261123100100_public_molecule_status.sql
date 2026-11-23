-- 0018 Session 5, track B: what the public may know about a medicine, and the prescriber's
-- access to the counts by governorate.

-- public_molecule_status ---------------------------------------------------------------------
-- The rumour check. Anyone may call it. It answers only:
--   'confirmed' with its since,
--   'cleared'   with its since, and only when the medicine was confirmed before it cleared
--               (a "levée" after "probable" would tell the public that a lower level existed),
--   'none'      for every other case: no signal, watch, likely, a levée below confirmed.
-- Never a count, a rule or a level below "confirmée" (CLAUDE.md rule 10).
create function public.public_molecule_status(p_molecule_id uuid)
returns table (level text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select sig.level, sig.since
    from public.signals sig
    where sig.molecule_id = p_molecule_id
  ),
  last_clearing as (
    select e.from_level
    from public.signal_events e
    where e.molecule_id = p_molecule_id and e.to_level = 'cleared'
    order by e.at desc, e.id desc
    limit 1
  ),
  shown as (
    select case
             when s.level = 'confirmed' then 'confirmed'
             when s.level = 'cleared' and (select from_level from last_clearing) = 'confirmed' then 'cleared'
             else 'none'
           end as level,
           s.since
    from s
  )
  select shown.level, case when shown.level = 'none' then null else shown.since end
  from shown
  union all
  select 'none', null
  where not exists (select 1 from s)
$$;

revoke all on function public.public_molecule_status(uuid) from public;
grant execute on function public.public_molecule_status(uuid) to anon, authenticated, service_role;

-- governorate_counts: an explicit list of the roles that receive the counts. -----------------
-- Until now every signed-in role but the pharmacy passed. From here only the roles named
-- below: wholesalers, hospital pharmacies, the coordination unit and prescribers. A role
-- added later gets nothing until it is named here.
create or replace function public.governorate_counts(
  p_molecule_id uuid,
  p_window_days integer default 14,
  p_min_undelivered_hours integer default 72,
  p_at timestamptz default now()
)
returns table (governorate_code text, governorate_name text, pharmacies text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type text := app.current_organisation_type()::text;
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
begin
  if not is_service and (caller_type is null or caller_type not in ('wholesaler', 'hospital_pharmacy', 'coordinator', 'prescriber')) then
    raise exception 'governorate_counts: not allowed for this role' using errcode = '42501';
  end if;
  if p_window_days not between 1 and 365 or p_min_undelivered_hours not between 0 and 720 then
    raise exception 'governorate_counts: parameter out of range' using errcode = '22023';
  end if;

  return query
  with counted as (
    select r.governorate_code as code, count(distinct r.organisation_id) as n
    from public.reports r
    where r.molecule_id = p_molecule_id
      and r.kind = 'not_delivered'
      and r.ordered_at is not null
      and r.reported_at <= p_at
      and r.reported_at > p_at - make_interval(days => p_window_days)
      and r.reported_at - r.ordered_at >= make_interval(hours => p_min_undelivered_hours)
    group by r.governorate_code
  )
  select
    c.code,
    g.name_fr,
    case when c.n < 3 then '<3' else c.n::text end
  from counted c
  join public.governorates g on g.code = c.code
  -- Suppressed cells are ordered by code only, so the order never reveals 1 versus 2.
  order by case when c.n < 3 then 0 else c.n end desc, c.code;
end;
$$;

update public.system_meta set schema_version = 18, updated_at = now();
