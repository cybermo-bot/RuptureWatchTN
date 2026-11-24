-- 0024 Session 6, part 8 item 6: the public status of a medicine over time, for a 90-day strip
-- on its public page. Only what the public may know (rule 10): "confirmée", "levée" after a
-- confirmation, otherwise "none" ("Aucune rupture confirmée"). The level changes are mapped to
-- those three, then collapsed: a row only where the public level changes, so a change below
-- "confirmée" (watch, probable) leaves no trace, not even its time. No count, no rule.
-- The rows inside the window, plus the last change before it (the level at the window start).

create function public.public_molecule_history(p_molecule_id uuid, p_days integer default 90)
returns table (at timestamptz, level text)
language sql
stable
security definer
set search_path = ''
as $$
  with mapped as (
    select e.at, e.id,
           case
             when e.to_level = 'confirmed' then 'confirmed'
             when e.to_level = 'cleared' and e.from_level = 'confirmed' then 'cleared'
             else 'none'
           end as level
    from public.signal_events e
    where e.molecule_id = p_molecule_id
  ),
  changes as (
    select m.at, m.id, m.level, lag(m.level, 1, 'none') over (order by m.at, m.id) as previous
    from mapped m
  ),
  public_changes as (
    select c.at, c.id, c.level from changes c where c.level <> c.previous
  ),
  bounds as (
    select now() - make_interval(days => least(greatest(coalesce(p_days, 90), 1), 365)) as start
  ),
  before_window as (
    select pc.id
    from public_changes pc, bounds b
    where pc.at <= b.start
    order by pc.at desc, pc.id desc
    limit 1
  )
  select pc.at, pc.level
  from public_changes pc, bounds b
  where pc.at > b.start or pc.id in (select id from before_window)
  order by pc.at, pc.id
$$;

revoke all on function public.public_molecule_history(uuid, integer) from public;
grant execute on function public.public_molecule_history(uuid, integer) to anon, authenticated, service_role;

update public.system_meta set schema_version = 24, updated_at = now();
