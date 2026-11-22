-- 0013 Session 4: where a signal's data comes from, and the public status of a medicine.
--
-- 1. The stored evidence now carries `origins`: the distinct origins (official_source, tester,
--    simulated) of the reports and notices the evaluation read. Screens show them as badges, so
--    a level reached with simulated reports never appears without "Simulé" (CLAUDE.md rule 4).
--    app.shown_evidence passes them on.
-- 2. public_status(molecule_id): what anyone, signed in or not, may know about a medicine's
--    level: whether a shortage is confirmed, since when, and the origins behind it. Nothing
--    below "confirmée", no count, no score (rule 10). Used by the public panel of /vues and by
--    track B's public medicine page.

create or replace function app.shown_evidence(e jsonb)
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
    'notices', coalesce(e -> 'notices', '[]'::jsonb),
    'origins',
      case when jsonb_typeof(e -> 'origins') = 'array' then e -> 'origins' else '[]'::jsonb end
  )
$$;

create function public.public_status(p_molecule_id uuid)
returns table (confirmed boolean, since timestamptz, origins jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select s.level = 'confirmed',
         case when s.level = 'confirmed' then s.since end,
         case when s.level = 'confirmed' then app.shown_evidence(s.evidence) -> 'origins' else '[]'::jsonb end
  from public.signals s
  where s.molecule_id = p_molecule_id
  union all
  -- A molecule with no signal row reads the same as one below "confirmée".
  select false, null, '[]'::jsonb
  where not exists (select 1 from public.signals s where s.molecule_id = p_molecule_id)
$$;

revoke all on function public.public_status(uuid) from public;
grant execute on function public.public_status(uuid) to anon, authenticated, service_role;

update public.system_meta set schema_version = 13, updated_at = now();
