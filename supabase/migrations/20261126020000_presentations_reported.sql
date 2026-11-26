-- Pilot-3 item 2: which presentations of a molecule pharmacies report.
--
-- presentations_reported: for the coordination unit, the Pharmacie centrale and hospital
-- pharmacies. Over the last 14 days, per product named on a "not delivered" report: its label,
-- its brand and the number of distinct pharmacies, shown as '<3' below 3. Never an
-- organisation, a governorate or a time. Pharmacies, prescribers, wholesalers and anonymous
-- visitors are refused (pharmacies stay out of counts, session-5 decision).
--
-- presentations_reported_public: for the public medicine page, only while the level is
-- « confirmée » on non-simulated data (like public_arrival): product names only, no counts.
--
-- The level stays per molecule: lib/signal and the signals table are unchanged.

create index reports_molecule_medicine_time on public.reports (molecule_id, medicine_id, reported_at desc)
  where medicine_id is not null;

create function public.presentations_reported(p_molecule_id uuid)
returns table (medicine_id uuid, label text, brand text, pharmacies jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type text := app.current_organisation_type()::text;
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
begin
  if not is_service and (caller_type is null or caller_type not in ('coordinator', 'central_pharmacy', 'hospital_pharmacy')) then
    raise exception 'presentations_reported: not allowed for this role' using errcode = '42501';
  end if;
  return query
    select m.id, m.label, m.brand, app.shown_count(to_jsonb(counted.n))
    from (
      select r.medicine_id as id, count(distinct r.organisation_id) as n
      from public.reports r
      where r.molecule_id = p_molecule_id
        and r.medicine_id is not null
        and r.kind = 'not_delivered'
        and r.reported_at >= now() - interval '14 days'
      group by r.medicine_id
    ) counted
    join public.medicines m on m.id = counted.id
    -- Most reported first; the rows shown as '<3' keep the catalogue order, so their order
    -- never tells 1 from 2.
    order by case when counted.n >= 3 then counted.n else 0 end desc, m.brand, m.label;
end;
$$;

revoke all on function public.presentations_reported(uuid) from public, anon;
grant execute on function public.presentations_reported(uuid) to authenticated, service_role;

create function public.presentations_reported_public(p_molecule_id uuid)
returns table (medicine_id uuid, label text, brand text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.label, m.brand
  from public.signals s
  join public.reports r on r.molecule_id = s.molecule_id
  join public.medicines m on m.id = r.medicine_id
  where s.molecule_id = p_molecule_id
    and s.level = 'confirmed'
    and not (coalesce(app.shown_evidence(s.evidence) -> 'origins', '[]'::jsonb) ? 'simulated')
    and r.medicine_id is not null
    and r.kind = 'not_delivered'
    and r.origin <> 'simulated'
    and r.reported_at >= now() - interval '14 days'
  group by m.id, m.label, m.brand
  order by m.brand, m.label
$$;

revoke all on function public.presentations_reported_public(uuid) from public;
grant execute on function public.presentations_reported_public(uuid) to anon, authenticated, service_role;

update public.system_meta set schema_version = 27, updated_at = now();
