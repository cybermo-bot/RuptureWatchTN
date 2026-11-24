-- 0023 Session 6, part 8 item 5: public_molecule_status also says when the shown status was last
-- evaluated (signals.updated_at, set by apply_signal_evaluation on every evaluation, including
-- the daily recompute), so the public page can say "Mis à jour il y a …".
-- Only for a shown level ("confirmée", or "levée" after a confirmation): for "none" it stays
-- null, so the time never hints that something is happening below "confirmée" (rule 10).
-- Still no count and no rule.

drop function public.public_molecule_status(uuid);

create function public.public_molecule_status(p_molecule_id uuid)
returns table (level text, since timestamptz, origins jsonb, evaluated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select sig.level, sig.since, sig.evidence, sig.updated_at
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
           s.evidence,
           s.updated_at
    from s
  )
  select shown.level,
         case when shown.level = 'none' then null else shown.since end,
         case
           when shown.level = 'none' then '[]'::jsonb
           else coalesce(app.shown_evidence(shown.evidence) -> 'origins', '[]'::jsonb)
         end,
         case when shown.level = 'none' then null else shown.updated_at end
  from shown
  union all
  select 'none', null, '[]'::jsonb, null
  where not exists (select 1 from s)
$$;

revoke all on function public.public_molecule_status(uuid) from public;
grant execute on function public.public_molecule_status(uuid) to anon, authenticated, service_role;

update public.system_meta set schema_version = 23, updated_at = now();
