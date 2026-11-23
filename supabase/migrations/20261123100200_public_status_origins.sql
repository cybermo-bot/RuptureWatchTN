-- 0019 Session 5, track B: public_molecule_status also says where the data behind a shown
-- level comes from (official_source, tester, simulated), so a simulated "confirmée" always
-- carries its badge on the public pages (CLAUDE.md rule 4). Still no count and no rule.

drop function public.public_molecule_status(uuid);

create function public.public_molecule_status(p_molecule_id uuid)
returns table (level text, since timestamptz, origins jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select sig.level, sig.since, sig.evidence
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
           s.since,
           s.evidence
    from s
  )
  select shown.level,
         case when shown.level = 'none' then null else shown.since end,
         case
           when shown.level = 'none' then '[]'::jsonb
           else coalesce(app.shown_evidence(shown.evidence) -> 'origins', '[]'::jsonb)
         end
  from shown
  union all
  select 'none', null, '[]'::jsonb
  where not exists (select 1 from s)
$$;

revoke all on function public.public_molecule_status(uuid) from public;
grant execute on function public.public_molecule_status(uuid) to anon, authenticated, service_role;

update public.system_meta set schema_version = 19, updated_at = now();
